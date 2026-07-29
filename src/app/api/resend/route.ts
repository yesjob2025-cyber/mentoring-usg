import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { getMentorById, getQuestion } from "@/lib/repo";
import { notifyMentorNewQuestion } from "@/lib/messaging";
import type { AnswerToken, Mentor, Question } from "@/lib/types";

// 미답변 승인멘토 질문 재발송
//  /api/resend?secret=<SEED_SECRET>            → 미리보기(dry-run, 발송 안 함)
//  /api/resend?secret=<SEED_SECRET>&send=1     → 실제 재발송
//
// 대상: 아직 답변하지 않은(token.used=false) 답변 토큰 중,
//       멘토가 존재하고 '승인 멘토'(실번호 등록 = 공통번호가 아님)인 건.
const COMMON = "01085536027"; // 미승인 멘토 공통 수신번호(발송 제외)

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const doSend = url.searchParams.get("send") === "1";

  const [tokens, mentors, questions] = await Promise.all([
    all<AnswerToken>("answerTokens"),
    all<Mentor>("mentors"),
    all<Question>("questions"),
  ]);
  const mentorById = new Map(mentors.map((m) => [m.id, m]));
  const questionById = new Map(questions.map((q) => [q.id, q]));

  const skipped = { answered: 0, orphanMentor: 0, orphanQuestion: 0, unapproved: 0 };
  const targets: { token: string; mentorName: string; phone: string; questionTitle: string }[] = [];

  for (const t of tokens) {
    if (t.used) { skipped.answered += 1; continue; }
    const mentor = mentorById.get(t.mentorId);
    const question = questionById.get(t.questionId);
    if (!mentor) { skipped.orphanMentor += 1; continue; }
    if (!question) { skipped.orphanQuestion += 1; continue; }
    const phone = (mentor.kakaoPhone || "").replace(/[^0-9]/g, "");
    if (!phone || phone === COMMON) { skipped.unapproved += 1; continue; } // 미승인(공통번호) 제외
    targets.push({
      token: t.token,
      mentorName: mentor.name,
      phone: mentor.kakaoPhone!,
      questionTitle: question.title,
    });
  }

  if (!doSend) {
    return NextResponse.json({
      dryRun: true,
      note: "미리보기입니다. 실제 발송하려면 &send=1 을 붙이세요. (TEST_REDIRECT_PHONE 가 설정돼 있으면 전부 그 번호로 갑니다)",
      candidates: targets.length,
      skipped,
      preview: targets.slice(0, 30),
    });
  }

  let sent = 0;
  const failures: { mentorName: string; detail?: string }[] = [];
  for (const g of targets) {
    const mentor = mentorById.get(
      tokens.find((t) => t.token === g.token)!.mentorId
    )!;
    const question = questionById.get(
      tokens.find((t) => t.token === g.token)!.questionId
    )!;
    const res = await notifyMentorNewQuestion(mentor, question, g.token);
    if (res.ok) sent += 1;
    else failures.push({ mentorName: g.mentorName, detail: res.detail });
  }

  return NextResponse.json({
    dryRun: false,
    candidates: targets.length,
    sent,
    failed: failures.length,
    failures: failures.slice(0, 20),
    skipped,
  });
}
