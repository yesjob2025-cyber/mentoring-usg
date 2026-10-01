import { NextResponse } from "next/server";
import { sendInviteLms } from "@/lib/messaging";
import {
  initSettlements,
  getSettlement,
  SETTLE_ASOF_DEFAULT,
} from "@/lib/settlements";

// 멘토별 질의응답 답변 건수 정산 확인 링크 생성·발송
//  /api/settle-init?secret=<SEED_SECRET>                 → 미리보기(dry-run)
//  /api/settle-init?secret=<SEED_SECRET>&send=1          → 확인 링크 문자 발송
//  &asof=2026-09-30   기준일(기본 9/30)
//  &reset=1           기존 정산행 전체 삭제 후 재생성
//  &force=1           이미 확인/발송한 멘토에게도 재발송
//  &name=홍길동        특정 멘토만
const SITE = "https://mentoring-usg.kr";

function buildMsg(name: string, count: number, asOf: string, token: string): string {
  const [, m, d] = asOf.split("-");
  const md = `${Number(m)}/${Number(d)}`;
  return (
    `[부울경 멘토링] 질의응답 답변 정산 확인 안내\n\n` +
    `${name} 멘토님, ${md} 기준 멘토링 질의응답 답변 ${count}건이 확인되었습니다.\n` +
    `아래 링크에서 건수 확인 후 «확인» 버튼을 눌러주시면 답변 비용 지급 처리해 드립니다.\n\n` +
    `· 확인: ${SITE}/settle/${token}\n\n` +
    `※ 건수가 실제와 다르면 «확인»을 누르지 마시고, 이 문자로 회신(또는 010-8553-6027로 문자)해 주세요.\n\n` +
    `그동안 소중한 답변에 참여해 주셔서 감사합니다.`
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const asOf = (url.searchParams.get("asof") || SETTLE_ASOF_DEFAULT).trim();
  const doSend = url.searchParams.get("send") === "1";
  const reset = url.searchParams.get("reset") === "1";
  const force = url.searchParams.get("force") === "1";
  const nameFilter = (url.searchParams.get("name") || "").trim();

  const init = await initSettlements({ asOf, reset, nameFilter: nameFilter || undefined });

  const totalAnswers = init.rows.reduce((s, r) => s + r.answerCount, 0);
  const withPhone = init.rows.filter((r) => r.approved).length;
  const noPhone = init.rows.filter((r) => !r.approved).length;
  const alreadyConfirmed = init.rows.filter((r) => r.confirmedAt).length;

  // 발송 대상: 실번호 보유 + (미확인 or force)
  const sendTargets = init.rows.filter((r) => r.approved && r.token && (force || !r.confirmedAt));

  if (!doSend) {
    return NextResponse.json({
      dryRun: true,
      note: "미리보기입니다. 실제 발송은 &send=1. (asof/reset/force/name 지원)",
      asOf,
      eligibleMentors: init.eligibleMentors,
      totalAnswers,
      withPhone,
      noPhone,
      alreadyConfirmed,
      willSend: sendTargets.length,
      sampleMessage: buildMsg("홍길동", 3, asOf, "SAMPLE_TOKEN"),
      preview: init.rows.slice(0, 40).map((r) => ({
        mentor: r.mentorName,
        company: r.company,
        answers: r.answerCount,
        phone: r.approved ? r.phone : "(미승인·발송제외)",
        confirmed: Boolean(r.confirmedAt),
      })),
    });
  }

  let sent = 0;
  const failures: { mentor: string; detail?: string }[] = [];
  for (const r of sendTargets) {
    const s = await getSettlement(r.token!);
    if (!s) continue;
    const res = await sendInviteLms(
      s.phone,
      "[부울경 멘토링] 답변 정산 확인 안내",
      buildMsg(s.mentorName, s.answerCount, s.asOf, s.token)
    );
    if (res.ok) sent += 1;
    else failures.push({ mentor: s.mentorName, detail: res.detail });
  }

  return NextResponse.json({
    dryRun: false,
    asOf,
    eligibleMentors: init.eligibleMentors,
    candidates: sendTargets.length,
    sent,
    failed: failures.length,
    failures: failures.slice(0, 20),
  });
}
