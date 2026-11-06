import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { answerCountsAsOf } from "@/lib/settlements";
import type { Mentor, SettlementConfirmation } from "@/lib/types";

// 특정 기준일까지 멘토별 답변 건수 현황(읽기 전용 — 정산행 변경 없음)
//  /api/settle-stats?secret=<SEED_SECRET>                        → 10/31 기준
//  &asof=2026-10-31   기준일(기본 10/31)
//  &since=2026-09-30  직전 정산 기준일(이 날 이후 증가분 표시)
const COMMON = "01085536027";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const asOf = (url.searchParams.get("asof") || "2026-10-31").trim();
  const since = (url.searchParams.get("since") || "2026-09-30").trim();

  const [counts, prev, mentors, settlements] = await Promise.all([
    answerCountsAsOf(asOf),
    answerCountsAsOf(since),
    all<Mentor>("mentors"),
    all<SettlementConfirmation>("settlements"),
  ]);
  const mentorById = new Map(mentors.map((m) => [m.id, m]));
  const confirmedByMentor = new Map(
    settlements.map((s) => [s.mentorId, Boolean(s.confirmedAt)])
  );

  const rows = [...counts.entries()]
    .map(([mentorId, { count }]) => {
      const m = mentorById.get(mentorId);
      const phoneRaw = (m?.kakaoPhone || "").replace(/[^0-9]/g, "");
      const approved = Boolean(phoneRaw) && phoneRaw !== COMMON;
      const prevCount = prev.get(mentorId)?.count ?? 0;
      return {
        mentor: m?.name ?? mentorId,
        company: m?.company ?? "",
        total: count, // asOf 누적
        prev: prevCount, // since 기준 누적
        delta: count - prevCount, // since 이후 증가분
        phone: approved ? m!.kakaoPhone! : "(미승인·발송제외)",
        approved,
        prevConfirmed: confirmedByMentor.get(mentorId) ?? false, // 직전 정산 확인 여부
      };
    })
    .sort((a, b) => b.total - a.total);

  const totalAnswers = rows.reduce((s, r) => s + r.total, 0);
  const prevTotal = rows.reduce((s, r) => s + r.prev, 0);
  const deltaTotal = totalAnswers - prevTotal;
  const withPhone = rows.filter((r) => r.approved).length;

  return NextResponse.json({
    asOf,
    since,
    eligibleMentors: rows.length,
    totalAnswers, // asOf 누적 총 답변
    prevTotal, // since 기준 누적 총 답변
    deltaTotal, // since 이후 신규 답변(증가분)
    mentorsWithNew: rows.filter((r) => r.delta > 0).length,
    withPhone,
    noPhone: rows.length - withPhone,
    rows,
  });
}
