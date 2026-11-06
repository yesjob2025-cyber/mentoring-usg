import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { listSchools } from "@/lib/repo";
import type { AnswerToken, Mentor, Question, User } from "@/lib/types";

// 미답변 질문 내용 검토용 (의미없음/연락처·만남 요구 등 선별)
//  /api/question-review?secret=<SEED_SECRET>&school=경성&single=1   → 특정 학교·미승인 멘토
//  /api/question-review?secret=<SEED_SECRET>&all=1                  → 전체 학교·전체 멘토
//  &flagged=1  의심 건만
const COMMON = "01085536027";
const isUnapproved = (m?: Mentor) => {
  const d = (m?.kakaoPhone || "").replace(/[^0-9]/g, "");
  return !d || d === COMMON;
};

// 자동 의심 플래그
const PHONE_RE = /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/;
const CONTACT_KW = ["연락처", "전화번호", "전화 ", "번호 ", "카톡", "카카오", "오픈채팅", "만나", "만남", "뵙", "커피챗", "커피 ", "식사", "이메일", "메일 ", "인스타", "디엠", "dm", "따로 연락", "개인적으로", "연락 부탁", "연락주", "연락 주"];
const GREET_RE = /^(안녕하세요|안녕|하이|hi|hello|테스트|test|ㅎㅇ|ㅎㅇㅎㅇ|ㅈㄱㄴ|ㅇㅇ)[\s!.~]*$/i;

function flagOf(title: string, body: string): "test" | "greeting" | "contact" | "short" | "" {
  const t = (title || "").trim();
  const b = (body || "").trim();
  const full = `${t} ${b}`;
  // 연락처·만남 요구
  if (PHONE_RE.test(full)) return "contact";
  if (CONTACT_KW.some((k) => full.includes(k))) return "contact";
  // 테스트/무의미 (내용이 있어도 테스트임을 밝힌 경우)
  if (/테스트|^test\b/i.test(full) && /(답장|답변|무시|확인용|안\s?하셔도|안하셔도|테스트\s*질문|테스트\s*입니다|테스트\s*중)/.test(full)) return "test";
  if (/테스트\s*질문/.test(full)) return "test";
  // 인사만
  if (GREET_RE.test(t) && b.length < 10) return "greeting";
  // 거의 내용 없음
  if ((t + b).replace(/\s/g, "").length < 6) return "short";
  return "";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const allScope = url.searchParams.get("all") === "1"; // 전체 학교·전체 멘토
  const schoolQ = (url.searchParams.get("school") || "").trim();
  if (!allScope && !schoolQ) return NextResponse.json({ error: "school 파라미터 필요 (또는 all=1)" }, { status: 400 });
  const singleOnly = url.searchParams.get("single") === "1";
  const flaggedOnly = url.searchParams.get("flagged") === "1"; // 의심 건만

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

  const [questions, tokens, mentors, users] = await Promise.all([
    all<Question>("questions"),
    all<AnswerToken>("answerTokens"),
    all<Mentor>("mentors"),
    all<User>("users"),
  ]);
  const qById = new Map(questions.map((q) => [q.id, q]));
  const mById = new Map(mentors.map((m) => [m.id, m]));
  const uById = new Map(users.map((u) => [u.id, u]));
  const mentorCountByQ = new Map<string, number>();
  for (const t of tokens) mentorCountByQ.set(t.questionId, (mentorCountByQ.get(t.questionId) ?? 0) + 1);

  // 질문 단위로 집계(중복 토큰 제거)
  const seen = new Set<string>();
  const rows = [];
  for (const t of tokens) {
    if (t.used) continue;
    const q = qById.get(t.questionId);
    if (!q) continue;
    if (!allScope) {
      if (q.schoolId !== school!.id) continue;
      if (!isUnapproved(mById.get(t.mentorId))) continue;
    }
    if (singleOnly && (mentorCountByQ.get(t.questionId) ?? 0) > 1) continue;
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    const u = uById.get(q.authorUserId);
    const flag = flagOf(q.title, q.body ?? "");
    if (flaggedOnly && !flag) continue;
    rows.push({
      questionId: q.id,
      school: schoolName.get(q.schoolId) ?? q.schoolId,
      student: u?.name ?? q.authorName,
      title: q.title,
      body: flag ? (q.body ?? "") : (q.body ?? "").slice(0, 300), // 의심 건은 전체 본문
      flag, // "" = 정상, test/greeting/short/contact = 의심
    });
  }

  const byFlag: Record<string, number> = { test: 0, greeting: 0, short: 0, contact: 0, ok: 0 };
  for (const r of rows) byFlag[r.flag || "ok"] += 1;
  const bySchoolFlagged: Record<string, number> = {};
  for (const r of rows) if (r.flag) bySchoolFlagged[r.school] = (bySchoolFlagged[r.school] ?? 0) + 1;
  rows.sort((a, b) => (a.flag ? 0 : 1) - (b.flag ? 0 : 1)); // 의심 먼저

  return NextResponse.json({
    scope: allScope ? "전체 학교·전체 멘토" : `${school!.name}·미승인 멘토`,
    totalQuestions: rows.length,
    flaggedTotal: rows.filter((r) => r.flag).length,
    byFlag,
    bySchoolFlagged,
    legend: { test: "테스트/무의미", greeting: "인사만", short: "내용 거의 없음", contact: "연락처·만남 요구 의심", ok: "정상" },
    rows,
  });
}
