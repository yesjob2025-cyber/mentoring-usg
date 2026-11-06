import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { listSchools } from "@/lib/repo";
import type { AnswerToken, Mentor, Question, User, School } from "@/lib/types";

// 특정 학교의 '미승인 멘토 + 미답변' 질문과 답변 작성 링크 목록
//  /api/unanswered-links?secret=<SEED_SECRET>&school=경성   → 경성대 기준
//  &school 은 학교명 일부 또는 코드
const SITE = "https://mentoring-usg.kr";
const COMMON = "01085536027"; // 미승인 멘토 공통번호

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const schoolQ = (url.searchParams.get("school") || "").trim();
  if (!schoolQ) return NextResponse.json({ error: "school 파라미터 필요 (학교명 일부 또는 코드)" }, { status: 400 });
  const singleOnly = url.searchParams.get("single") === "1"; // 1명 멘토에게만 보낸 질문만

  const schools = await listSchools();
  const school =
    schools.find((s) => s.code?.toUpperCase() === schoolQ.toUpperCase()) ||
    schools.find((s: School) => s.name.includes(schoolQ));
  if (!school) return NextResponse.json({ error: `학교를 찾을 수 없습니다: ${schoolQ}` }, { status: 404 });

  const [questions, tokens, mentors, users] = await Promise.all([
    all<Question>("questions"),
    all<AnswerToken>("answerTokens"),
    all<Mentor>("mentors"),
    all<User>("users"),
  ]);
  const qById = new Map(questions.map((q) => [q.id, q]));
  const mById = new Map(mentors.map((m) => [m.id, m]));
  const uById = new Map(users.map((u) => [u.id, u]));

  // 질문별 총 선택 멘토 수 (여러 멘토 선택 질문 판별용)
  const mentorCountByQ = new Map<string, number>();
  for (const t of tokens) mentorCountByQ.set(t.questionId, (mentorCountByQ.get(t.questionId) ?? 0) + 1);

  const isUnapproved = (m?: Mentor) => {
    const d = (m?.kakaoPhone || "").replace(/[^0-9]/g, "");
    return !d || d === COMMON;
  };

  let multiExcluded = 0;
  const rows = [];
  for (const t of tokens) {
    if (t.used) continue; // 미답변만
    const q = qById.get(t.questionId);
    if (!q || q.schoolId !== school.id) continue; // 해당 학교만
    const m = mById.get(t.mentorId);
    if (!isUnapproved(m)) continue; // 미승인 멘토만
    if (singleOnly && (mentorCountByQ.get(t.questionId) ?? 0) > 1) { multiExcluded += 1; continue; }
    const u = uById.get(q.authorUserId);
    rows.push({
      student: u?.name ?? q.authorName,
      studentNo: u?.studentNo ?? "",
      questionTitle: q.title,
      questionId: q.id,
      mentor: m?.name ?? "(삭제된 멘토)",
      mentorCompany: m?.company ?? "",
      answerLink: `${SITE}/answer/${t.token}`,
    });
  }

  // 멘토별 집계
  const byMentor: Record<string, number> = {};
  for (const r of rows) byMentor[r.mentor] = (byMentor[r.mentor] ?? 0) + 1;

  rows.sort((a, b) => a.mentor.localeCompare(b.mentor) || a.student.localeCompare(b.student));

  return NextResponse.json({
    school: school.name,
    schoolCode: school.code,
    singleOnly,
    multiExcluded,
    totalUnanswered: rows.length,
    mentorCount: Object.keys(byMentor).length,
    byMentor,
    rows,
  });
}
