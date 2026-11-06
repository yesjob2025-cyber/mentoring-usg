import { NextResponse } from "next/server";
import { all, insert } from "@/lib/data";
import { listSchools } from "@/lib/repo";
import { newToken } from "@/lib/crypto";
import type { Answer, AnswerToken, Mentor, MentorTags, Question, QuestionThemeRefs, User } from "@/lib/types";

// 미승인 멘토의 미답변 질문 → 유사 분야 '승인 멘토'에게 재배정(대신 답변)
//  /api/reassign?secret=<SEED_SECRET>&school=경성            → 매칭 플랜(미리보기)
//  /api/reassign?secret=<SEED_SECRET>&school=경성&assign=1   → 유사 멘토에게 답변 토큰 생성(링크 발급)
// 유사도: 원 멘토(학생이 고른)의 분야 태그 기준 + 질문 태그 가산 + 분산(부하 패널티)
const SITE = "https://mentoring-usg.kr";
const COMMON = "01085536027";

const isApproved = (m?: Mentor) => {
  const d = (m?.kakaoPhone || "").replace(/[^0-9]/g, "");
  return Boolean(d) && d !== COMMON;
};

const W = { company: 5, job: 4, industry: 3, type: 2, major: 2 } as const;
const KINDS = ["company", "job", "industry", "type", "major"] as const;

// 후보 멘토 태그 vs 원 멘토 태그 겹침 점수
function tagSim(a: MentorTags, b?: MentorTags): number {
  if (!b) return 0;
  let s = 0;
  for (const k of KINDS) {
    const bs = new Set(b[k] || []);
    if ((a[k] || []).some((x) => bs.has(x))) s += W[k];
  }
  return s;
}
// 후보 멘토 태그 vs 질문 themeRefs 가산
function refMatch(a: MentorTags, refs?: QuestionThemeRefs): number {
  if (!refs) return 0;
  let s = 0;
  for (const k of KINDS) {
    const v = refs[k];
    if (v && (a[k] || []).includes(v)) s += W[k];
  }
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const allScope = url.searchParams.get("all") === "1"; // 전체 학교
  const schoolQ = (url.searchParams.get("school") || "").trim();
  if (!allScope && !schoolQ) return NextResponse.json({ error: "school 파라미터 필요 (또는 all=1)" }, { status: 400 });
  const doAssign = url.searchParams.get("assign") === "1";
  const singleOnly = url.searchParams.get("single") === "1"; // 1명 멘토에게만 보낸 질문만

  const schools = await listSchools();
  const schoolName = new Map(schools.map((s) => [s.id, s.name]));
  let school: { id: string; name: string } | undefined;
  if (!allScope) {
    const found =
      schools.find((s) => s.code?.toUpperCase() === schoolQ.toUpperCase()) ||
      schools.find((s) => s.name.includes(schoolQ));
    if (!found) return NextResponse.json({ error: `학교를 찾을 수 없습니다: ${schoolQ}` }, { status: 404 });
    school = found;
  }

  const [questions, tokens, mentors, users, answers] = await Promise.all([
    all<Question>("questions"),
    all<AnswerToken>("answerTokens"),
    all<Mentor>("mentors"),
    all<User>("users"),
    all<Answer>("answers"),
  ]);
  const qById = new Map(questions.map((q) => [q.id, q]));
  const mById = new Map(mentors.map((m) => [m.id, m]));
  const uById = new Map(users.map((u) => [u.id, u]));
  const answeredQ = new Set(answers.map((a) => a.questionId)); // 이미 답변된 질문(운영사무국 포함)

  // 질문별 이미 토큰 보유 멘토 집합(중복 배정 방지)
  const tokenMentorsByQ = new Map<string, Set<string>>();
  for (const t of tokens) {
    (tokenMentorsByQ.get(t.questionId) ?? tokenMentorsByQ.set(t.questionId, new Set()).get(t.questionId)!).add(t.mentorId);
  }

  // 대상: (해당 학교) · 미승인 멘토 · 미답변 토큰 · 질문에 아직 답변 없음
  const targets = tokens.filter((t) => {
    if (t.used) return false;
    const q = qById.get(t.questionId);
    if (!q) return false;
    if (!allScope && q.schoolId !== school!.id) return false;
    if (answeredQ.has(t.questionId)) return false; // 이미 답변된 질문 제외
    if (singleOnly && (tokenMentorsByQ.get(t.questionId)?.size ?? 0) > 1) return false; // 여러 멘토 선택 질문 제외
    return !isApproved(mById.get(t.mentorId));
  });

  const approvedPool = mentors.filter((m) => isApproved(m));
  const load = new Map<string, number>(); // 멘토별 배정 수(분산용)
  const LOAD_PENALTY = 0.6;

  const rows = [];
  for (const t of targets) {
    const q = qById.get(t.questionId)!;
    const orig = mById.get(t.mentorId);
    const u = uById.get(q.authorUserId);
    const already = tokenMentorsByQ.get(q.id) ?? new Set();

    // 유사도 = 원 멘토 분야 태그 겹침 + 질문 태그 가산 (분야 겹침 없으면 후보 제외)
    const scored = approvedPool
      .filter((m) => m.id !== t.mentorId && !already.has(m.id))
      .map((m) => ({ m, base: tagSim(m.tags, orig?.tags) + refMatch(m.tags, q.themeRefs) }))
      .filter((x) => x.base > 0)
      .sort((a, b) => b.base - a.base);

    // 분산: 동점/근접 후보 중 적게 배정된 멘토 우선
    const pick =
      scored
        .map((x) => ({ m: x.m, s: x.base - LOAD_PENALTY * (load.get(x.m.id) ?? 0) }))
        .sort((a, b) => b.s - a.s)[0]?.m ?? undefined;

    let answerLink = "";
    if (pick) {
      load.set(pick.id, (load.get(pick.id) ?? 0) + 1);
      if (doAssign) {
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
    }

    rows.push({
      school: schoolName.get(q.schoolId) ?? q.schoolId,
      student: u?.name ?? q.authorName,
      questionTitle: q.title,
      questionId: q.id,
      category: q.category,
      originalMentor: orig?.name ?? "(삭제된 멘토)",
      originalCompany: orig?.company ?? "",
      suggestedMentor: pick?.name ?? "(유사 분야 승인 멘토 없음)",
      suggestedCompany: pick?.company ?? "",
      matched: Boolean(pick),
      altCandidates: scored.filter((x) => x.m.id !== pick?.id).slice(0, 3).map((x) => `${x.m.name}(${x.m.company})`),
      ...(doAssign ? { answerLink } : {}),
    });
  }

  const noMatch = rows.filter((r) => !r.matched).length;
  const assigned = doAssign ? rows.filter((r) => r.matched).length : 0;

  // 대체 멘토별 배정 수 (분산 확인용)
  const bySubstitute: Record<string, number> = {};
  for (const r of rows) if (r.matched) bySubstitute[r.suggestedMentor] = (bySubstitute[r.suggestedMentor] ?? 0) + 1;

  return NextResponse.json({
    scope: allScope ? "전체 학교" : school!.name,
    mode: doAssign ? "assign(토큰 생성)" : "plan(미리보기)",
    totalUnanswered: rows.length,
    matched: rows.length - noMatch,
    noMatch,
    substituteCount: Object.keys(bySubstitute).length,
    bySubstitute: Object.fromEntries(Object.entries(bySubstitute).sort((a, b) => b[1] - a[1])),
    ...(doAssign ? { assignedTokens: assigned } : {}),
    rows,
  });
}
