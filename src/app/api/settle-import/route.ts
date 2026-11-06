import { NextResponse } from "next/server";
import { all, insert, remove } from "@/lib/data";
import { newToken } from "@/lib/crypto";
import type { Mentor, SettlementConfirmation } from "@/lib/types";

// 2026-10-31 확정 정산 명단(운영자 엑셀 기준) → 처리현황 반영
//  /api/settle-import?secret=<SEED_SECRET>            → 미리보기(dry-run)
//  /api/settle-import?secret=<SEED_SECRET>&commit=1   → 기존 정산행 초기화 후 확정명단으로 반영
const AS_OF = "2026-10-31";

// 건당 5,000원 · 답변 3건 이상 확정 명단 (총 44명 / 447건 / 2,235,000원)
const FINAL_LIST: { name: string; phone: string; count: number; amount: number }[] = [
  { name: "이승은", phone: "010-7434-0175", count: 36, amount: 180000 },
  { name: "이유손", phone: "010-2359-6226", count: 33, amount: 165000 },
  { name: "이유경", phone: "010-7232-8396", count: 32, amount: 160000 },
  { name: "육진태", phone: "010-4567-5076", count: 30, amount: 150000 },
  { name: "신호선", phone: "010-8747-2745", count: 19, amount: 95000 },
  { name: "황예원", phone: "010-5581-0151", count: 19, amount: 95000 },
  { name: "강예슬", phone: "010-8875-0801", count: 18, amount: 90000 },
  { name: "추용호", phone: "010-6479-5955", count: 16, amount: 80000 },
  { name: "김우현", phone: "010-6863-3788", count: 15, amount: 75000 },
  { name: "김도엽", phone: "010-2702-1211", count: 14, amount: 70000 },
  { name: "염정호", phone: "010-3340-1291", count: 14, amount: 70000 },
  { name: "김수연", phone: "010-7389-5547", count: 14, amount: 70000 },
  { name: "김결", phone: "010-2492-6181", count: 10, amount: 50000 },
  { name: "손성민", phone: "010-4110-6135", count: 10, amount: 50000 },
  { name: "정우근", phone: "010-9808-9317", count: 10, amount: 50000 },
  { name: "정혜수", phone: "010-5317-0278", count: 9, amount: 45000 },
  { name: "장병찬", phone: "010-6541-3288", count: 9, amount: 45000 },
  { name: "김장욱", phone: "010-3182-4816", count: 9, amount: 45000 },
  { name: "신현주", phone: "010-2485-2596", count: 9, amount: 45000 },
  { name: "배성림", phone: "010-8616-7829", count: 8, amount: 40000 },
  { name: "강현창", phone: "010-2971-1757", count: 8, amount: 40000 },
  { name: "김준표", phone: "010-4493-1493", count: 7, amount: 35000 },
  { name: "노준수", phone: "010-6425-5142", count: 7, amount: 35000 },
  { name: "송채연", phone: "010-3534-4684", count: 7, amount: 35000 },
  { name: "임세훈", phone: "010-8560-0585", count: 6, amount: 30000 },
  { name: "이정현", phone: "010-7139-9363", count: 6, amount: 30000 },
  { name: "함웅식", phone: "010-9672-8800", count: 6, amount: 30000 },
  { name: "임하얀", phone: "010-9274-9295", count: 6, amount: 30000 },
  { name: "배지은", phone: "010-4955-6491", count: 5, amount: 25000 },
  { name: "전현규", phone: "010-4795-9295", count: 5, amount: 25000 },
  { name: "유태정", phone: "010-4679-1396", count: 5, amount: 25000 },
  { name: "이원준", phone: "010-3442-2631", count: 5, amount: 25000 },
  { name: "이영주", phone: "010-2718-4160", count: 4, amount: 20000 },
  { name: "박정환", phone: "010-9069-3469", count: 4, amount: 20000 },
  { name: "남지수", phone: "010-7255-4062", count: 4, amount: 20000 },
  { name: "김종우", phone: "010-5592-7729", count: 4, amount: 20000 },
  { name: "배상운", phone: "010-3574-0115", count: 3, amount: 15000 },
  { name: "정윤경", phone: "010-9392-2758", count: 3, amount: 15000 },
  { name: "황재윤", phone: "010-9566-9454", count: 3, amount: 15000 },
  { name: "정현린", phone: "010-4536-8098", count: 3, amount: 15000 },
  { name: "구한서", phone: "010-2047-7221", count: 3, amount: 15000 },
  { name: "이충근", phone: "010-5501-4431", count: 3, amount: 15000 },
  { name: "이준영", phone: "010-7402-1112", count: 3, amount: 15000 },
  { name: "노경용", phone: "010-6218-3711", count: 3, amount: 15000 },
];

const digits = (s: string) => (s || "").replace(/[^0-9]/g, "");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const commit = url.searchParams.get("commit") === "1";

  const [mentors, existing] = await Promise.all([
    all<Mentor>("mentors"),
    all<SettlementConfirmation>("settlements"),
  ]);
  // 전화번호 → 멘토 매핑 (회사·mentorId 보강)
  const byPhone = new Map<string, Mentor>();
  for (const m of mentors) {
    const d = digits(m.kakaoPhone || "");
    if (d) byPhone.set(d, m);
  }

  // 기존 지급완료 상태 보존 (전화번호 기준)
  const paidByPhone = new Map<string, string | undefined>();
  for (const e of existing) paidByPhone.set(digits(e.phone), e.paidAt);

  const planned = FINAL_LIST.map((it) => {
    const m = byPhone.get(digits(it.phone));
    return {
      name: it.name,
      phone: it.phone,
      count: it.count,
      amount: it.amount,
      company: m?.company ?? "",
      mentorId: m?.id ?? "",
      matched: Boolean(m),
      paidAt: paidByPhone.get(digits(it.phone)),
    };
  });

  const totalAmount = planned.reduce((s, r) => s + r.amount, 0);
  const totalCount = planned.reduce((s, r) => s + r.count, 0);
  const unmatched = planned.filter((r) => !r.matched).map((r) => `${r.name}(${r.phone})`);

  if (!commit) {
    return NextResponse.json({
      dryRun: true,
      note: "미리보기입니다. 실제 반영은 &commit=1. (기존 정산행을 초기화하고 확정명단으로 교체합니다)",
      asOf: AS_OF,
      mentors: planned.length,
      totalCount,
      totalAmount,
      unmatchedToDbMentor: unmatched,
      preview: planned.slice(0, 50).map((r) => ({ name: r.name, company: r.company, count: r.count, amount: r.amount })),
    });
  }

  // 기존 정산행 전체 삭제 후 확정명단 삽입
  for (const e of existing) await remove("settlements", "token", e.token);
  const now = new Date().toISOString();
  let inserted = 0;
  for (const r of planned) {
    await insert("settlements", {
      token: newToken(),
      mentorId: r.mentorId,
      mentorName: r.name,
      company: r.company,
      phone: r.phone,
      asOf: AS_OF,
      answerCount: r.count,
      payAmount: r.amount,
      confirmedAt: null,
      paidAt: r.paidAt ?? null, // 기존 지급완료 상태 승계
      createdAt: now,
    });
    inserted += 1;
  }

  return NextResponse.json({
    committed: true,
    asOf: AS_OF,
    inserted,
    totalCount,
    totalAmount,
    unmatchedToDbMentor: unmatched,
  });
}
