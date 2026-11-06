import { NextResponse } from "next/server";
import { all, insert } from "@/lib/data";
import { listSchools, recommendMentors } from "@/lib/repo";
import { newToken } from "@/lib/crypto";
import type { AnswerToken, Mentor, Question, User } from "@/lib/types";

// 미승인 멘토의 미답변 질문 → 유사 분야 '승인 멘토'에게 재배정(대신 답변)
//  /api/reassign?secret=<SEED_SECRET>&school=경성            → 매칭 플랜(미리보기)
//  /api/reassign?secret=<SEED_SECRET>&school=경성&assign=1   → 유사 멘토에게 답변 토큰 생성(링크 발급)
// (assign 은 토큰/링크만 생성. 멘토에게 알림 발송은 별도)
const SITE = "https://mentoring-usg.kr";
const COMMON = "01085536027";

const isApproved = (m?: Mentor) => {
  const d = (m?.kakaoPhone || "").replace(/[^0-9]/g, "");
  return Boolean(d) && d !== COMMON;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const schoolQ = (url.searchParams.get("school") || "").trim();
  if (!schoolQ) return NextResponse.json({ error: "school 파라미터 필요" }, { status: 400 });
  const doAssign = url.searchParams.get("assign") === "1";

  const schools = await listSchools();
  const school =
    schools.find((s) => s.code?.toUpperCase() === schoolQ.toUpperCase()) ||
    schools.find((s) => s.name.includes(schoolQ));
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

  // 질문별 이미 토큰 보유 멘토 집합(중복 배정 방지)
  const tokenMentorsByQ = new Map<string, Set<string>>();
  for (const t of tokens) {
    (tokenMentorsByQ.get(t.questionId) ?? tokenMentorsByQ.set(t.questionId, new Set()).get(t.questionId)!).add(t.mentorId);
  }

  // 대상: 해당 학교 · 미승인 멘토 · 미답변 토큰
  const targets = tokens.filter((t) => {
    if (t.used) return false;
    const q = qById.get(t.questionId);
    if (!q || q.schoolId !== school.id) return false;
    return !isApproved(mById.get(t.mentorId));
  });

  const rows = [];
  for (const t of targets) {
    const q = qById.get(t.questionId)!;
    const orig = mById.get(t.mentorId);
    const u = uById.get(q.authorUserId);
    const already = tokenMentorsByQ.get(q.id) ?? new Set();

    // 유사 분야 승인 멘토 랭킹 → 이미 배정/미승인 제외
    const rec = await recommendMentors(q.themeRefs, 20);
    const cands = rec
      .map((r) => r.mentor)
      .filter((m) => isApproved(m) && !already.has(m.id));
    const pick = cands[0];

    let answerLink = "";
    if (doAssign && pick) {
      const tok = newToken();
      await insert("answerTokens", {
        token: tok,
        questionId: q.id,
        mentorId: pick.id,
        used: false,
        createdAt: new Date().toISOString(),
      });
      already.add(pick.id);
      answerLink = `${SITE}/answer/${tok}`;
    }

    rows.push({
      student: u?.name ?? q.authorName,
      questionTitle: q.title,
      questionId: q.id,
      category: q.category,
      originalMentor: orig?.name ?? "(삭제된 멘토)",
      suggestedMentor: pick?.name ?? "(유사 분야 승인 멘토 없음)",
      suggestedCompany: pick?.company ?? "",
      matched: Boolean(pick),
      altCandidates: cands.slice(1, 4).map((m) => `${m.name}(${m.company})`),
      ...(doAssign ? { answerLink } : {}),
    });
  }

  const noMatch = rows.filter((r) => !r.matched).length;
  const assigned = doAssign ? rows.filter((r) => r.matched).length : 0;

  return NextResponse.json({
    school: school.name,
    mode: doAssign ? "assign(토큰 생성)" : "plan(미리보기)",
    totalUnanswered: rows.length,
    matched: rows.length - noMatch,
    noMatch,
    ...(doAssign ? { assignedTokens: assigned } : {}),
    rows,
  });
}
