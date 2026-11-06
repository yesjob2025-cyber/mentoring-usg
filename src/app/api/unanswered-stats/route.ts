import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { listSchools } from "@/lib/repo";
import type { AnswerToken, Mentor, Question } from "@/lib/types";

// 미승인 멘토의 누락(미답변) 답변 집계
//  /api/unanswered-stats?secret=<SEED_SECRET>
const COMMON = "01085536027";
const isUnapproved = (m?: Mentor) => {
  const d = (m?.kakaoPhone || "").replace(/[^0-9]/g, "");
  return !d || d === COMMON;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }

  const [tokens, mentors, questions, schools] = await Promise.all([
    all<AnswerToken>("answerTokens"),
    all<Mentor>("mentors"),
    all<Question>("questions"),
    listSchools(),
  ]);
  const mById = new Map(mentors.map((m) => [m.id, m]));
  const qById = new Map(questions.map((q) => [q.id, q]));
  const schoolName = new Map(schools.map((s) => [s.id, s.name]));

  const unapprovedMentors = mentors.filter(isUnapproved);

  // 미답변 토큰 중 '미승인 멘토' 건
  const missing = tokens.filter((t) => !t.used && isUnapproved(mById.get(t.mentorId)));

  const mentorsWithMissing = new Set(missing.map((t) => t.mentorId));
  const byMentor: Record<string, number> = {};
  const bySchool: Record<string, number> = {};
  for (const t of missing) {
    const m = mById.get(t.mentorId);
    byMentor[m?.name ?? t.mentorId] = (byMentor[m?.name ?? t.mentorId] ?? 0) + 1;
    const q = qById.get(t.questionId);
    const sn = q ? schoolName.get(q.schoolId) ?? q.schoolId : "(질문없음)";
    bySchool[sn] = (bySchool[sn] ?? 0) + 1;
  }

  // 참고: 승인 멘토 미답변 건
  const approvedMissing = tokens.filter((t) => !t.used && !isUnapproved(mById.get(t.mentorId))).length;

  const topMentors = Object.entries(byMentor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, n]) => ({ mentor: name, missing: n }));

  return NextResponse.json({
    unapprovedMentorsTotal: unapprovedMentors.length, // 전체 미승인 멘토 수
    unapprovedMentorsWithMissing: mentorsWithMissing.size, // 그 중 누락 답변 있는 멘토 수
    missingAnswers: missing.length, // 미승인 멘토 누락 답변(미답변) 건수
    approvedUnanswered: approvedMissing, // (참고) 승인 멘토 미답변 건수
    bySchool: Object.fromEntries(Object.entries(bySchool).sort((a, b) => b[1] - a[1])),
    topMentors,
  });
}
