import "server-only";
import { all, one, insert, insertMany, patch } from "./data";
import { newId, newToken, hashPassword, verifyPassword } from "./crypto";
import type {
  Mentor,
  Question,
  Answer,
  School,
  User,
  QuestionThemeRefs,
  ThemeKind,
  TalkSession,
  AnswerToken,
  PayoutRecord,
  ActivityEvent,
} from "./types";

const nowIso = () => new Date().toISOString();

// ── 학교 ─────────────────────────────────────────────────
export async function listSchools(): Promise<School[]> {
  return all<School>("schools");
}
export async function getSchoolByCode(code: string): Promise<School | undefined> {
  const c = code.trim().toUpperCase();
  const rows = await all<School>("schools");
  return rows.find((s) => s.code.toUpperCase() === c);
}
export async function getSchoolById(id: string): Promise<School | undefined> {
  return one<School>("schools", "id", id);
}
export async function verifyAdmin(username: string, password: string): Promise<School | undefined> {
  const rows = await all<School>("schools");
  const s = rows.find((x) => x.adminUsername === username.trim());
  if (!s) return undefined;
  return verifyPassword(password, s.adminPasswordHash) ? s : undefined;
}

// ── 사용자 ───────────────────────────────────────────────
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const e = email.trim().toLowerCase();
  const rows = await all<User>("users");
  return rows.find((u) => u.email.toLowerCase() === e);
}
export async function getUserById(id: string): Promise<User | undefined> {
  return one<User>("users", "id", id);
}
export async function listUsersBySchool(schoolId: string): Promise<User[]> {
  const rows = await all<User>("users");
  return rows.filter((u) => u.schoolId === schoolId && u.role === "student");
}

export async function createStudent(input: {
  schoolId: string;
  name: string;
  email: string;
  password: string;
  studentNo?: string;
  department?: string;
  grade?: string;
  gender?: string;
  phone?: string;
}): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  if (await getUserByEmail(input.email)) return { ok: false, error: "이미 가입된 이메일입니다." };
  const user: User = {
    id: newId("usr"),
    role: "student",
    schoolId: input.schoolId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    studentNo: input.studentNo?.trim(),
    department: input.department?.trim(),
    grade: input.grade?.trim() || undefined,
    gender: input.gender?.trim() || undefined,
    phone: input.phone?.trim(),
    createdAt: nowIso(),
    lastActiveAt: nowIso(),
    questionCount: 0,
  };
  await insert("users", user as unknown as Record<string, unknown>);
  await insert("activity", {
    id: newId("ev"),
    schoolId: input.schoolId,
    userId: user.id,
    type: "signup",
    at: nowIso(),
  } satisfies ActivityEvent as unknown as Record<string, unknown>);
  return { ok: true, user };
}

export async function authenticateStudent(email: string, password: string): Promise<User | undefined> {
  const u = await getUserByEmail(email);
  if (!u || u.role !== "student") return undefined;
  if (!verifyPassword(password, u.passwordHash)) return undefined;
  return u;
}

export async function touchActivity(userId: string): Promise<void> {
  await patch("users", "id", userId, { lastActiveAt: nowIso() });
}

// ── 멘토 ─────────────────────────────────────────────────
export async function listMentors(): Promise<Mentor[]> {
  const rows = await all<Mentor>("mentors");
  return rows.filter((m) => m.active);
}
export async function getMentorById(id: string): Promise<Mentor | undefined> {
  return one<Mentor>("mentors", "id", id);
}
export async function getMentorsByIds(ids: string[]): Promise<Mentor[]> {
  const set = new Set(ids);
  const rows = await all<Mentor>("mentors");
  return rows.filter((m) => set.has(m.id));
}

/** 테마 선택으로 멘토 추천 (기업 제외: 산업/직무/유형/전공) */
export async function recommendMentors(
  refs: QuestionThemeRefs,
  limit = 30
): Promise<{ mentor: Mentor; score: number; matched: ThemeKind[] }[]> {
  const weights: Record<ThemeKind, number> = {
    company: 5,
    job: 4,
    industry: 3,
    type: 2,
    major: 2,
  };
  const selected = Object.entries(refs).filter(([, v]) => !!v) as [ThemeKind, string][];
  const mentors = await listMentors();

  const scored = mentors.map((mentor) => {
    let score = 0;
    const matched: ThemeKind[] = [];
    for (const [kind, val] of selected) {
      if (mentor.tags[kind]?.includes(val)) {
        score += weights[kind];
        matched.push(kind);
      }
    }
    const tiebreak = mentor.participationScore / 1000 + mentor.answerCount / 5000;
    return { mentor, score: score + tiebreak, matched, rawScore: score };
  });

  const hasSelection = selected.length > 0;
  const filtered = hasSelection ? scored.filter((s) => s.rawScore > 0) : scored;
  filtered.sort((a, b) => b.score - a.score);
  return filtered.slice(0, limit).map(({ mentor, score, matched }) => ({ mentor, score, matched }));
}

export async function featuredMentors(limit = 8): Promise<Mentor[]> {
  const mentors = await listMentors();
  return mentors
    .filter((m) => m.featured)
    .sort((a, b) => b.participationScore - a.participationScore)
    .slice(0, limit);
}

// ── 질문 ─────────────────────────────────────────────────
export async function createQuestion(input: {
  author: User;
  scope: "individual" | "broadcast";
  category: ThemeKind | "mentor";
  themeRefs: QuestionThemeRefs;
  title: string;
  body: string;
  targetMentorIds: string[];
  isPublic: boolean;
}): Promise<{ question: Question; tokens: { token: string; mentorId: string }[] }> {
  const q: Question = {
    id: newId("q"),
    authorUserId: input.author.id,
    authorName: input.author.name,
    schoolId: input.author.schoolId,
    scope: input.scope,
    category: input.category,
    themeRefs: input.themeRefs,
    title: input.title.trim(),
    body: input.body.trim(),
    targetMentorIds: input.targetMentorIds,
    isPublic: input.isPublic,
    status: "open",
    likes: 0,
    createdAt: nowIso(),
  };
  const tokens = input.targetMentorIds.map((mentorId) => ({ token: newToken(), mentorId }));

  await insert("questions", q as unknown as Record<string, unknown>);
  await insertMany(
    "answerTokens",
    tokens.map(
      (t) =>
        ({
          token: t.token,
          questionId: q.id,
          mentorId: t.mentorId,
          used: false,
          createdAt: nowIso(),
        }) satisfies AnswerToken as unknown as Record<string, unknown>
    )
  );
  // 작성자 questionCount +1 (데모 스토어에 없는 세션 폴백 사용자는 스킵)
  const u = await getUserById(input.author.id);
  if (u) await patch("users", "id", u.id, { questionCount: u.questionCount + 1 });
  await insert("activity", {
    id: newId("ev"),
    schoolId: input.author.schoolId,
    userId: input.author.id,
    type: "question",
    at: nowIso(),
  } satisfies ActivityEvent as unknown as Record<string, unknown>);

  return { question: q, tokens };
}

export async function listPublicQuestions(filter?: {
  category?: ThemeKind | "mentor";
  themeId?: string;
  mentorId?: string;
}): Promise<Question[]> {
  let qs = (await all<Question>("questions")).filter((q) => q.isPublic);
  if (filter?.category) qs = qs.filter((q) => q.category === filter.category);
  if (filter?.themeId) qs = qs.filter((q) => Object.values(q.themeRefs).includes(filter.themeId!));
  if (filter?.mentorId) qs = qs.filter((q) => q.targetMentorIds.includes(filter.mentorId!));
  return qs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listQuestionsByUser(userId: string): Promise<Question[]> {
  const rows = await all<Question>("questions");
  return rows
    .filter((q) => q.authorUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getQuestion(id: string): Promise<Question | undefined> {
  return one<Question>("questions", "id", id);
}

export async function likeQuestion(id: string): Promise<void> {
  const q = await getQuestion(id);
  if (q) await patch("questions", "id", id, { likes: q.likes + 1 });
}

// ── 답변 ─────────────────────────────────────────────────
export async function listAnswers(questionId: string): Promise<Answer[]> {
  const rows = await all<Answer>("answers");
  return rows
    .filter((a) => a.questionId === questionId)
    .sort((a, b) => b.likes - a.likes || a.createdAt.localeCompare(b.createdAt));
}

export async function getAnswerToken(token: string): Promise<AnswerToken | undefined> {
  return one<AnswerToken>("answerTokens", "token", token);
}

/** 질문별 답변 수 (게시판/내 질문 목록에서 단일 조회로 집계) */
export async function answerCountByQuestion(): Promise<Map<string, number>> {
  const rows = await all<Answer>("answers");
  const m = new Map<string, number>();
  for (const a of rows) m.set(a.questionId, (m.get(a.questionId) ?? 0) + 1);
  return m;
}

/** 질문의 멘토별 답변 링크 (관리자 수동 발송·테스트용) */
export async function answerLinksForQuestion(questionId: string) {
  const tokens = (await all<AnswerToken>("answerTokens")).filter((t) => t.questionId === questionId);
  const mentors = await all<Mentor>("mentors");
  const byId = new Map(mentors.map((m) => [m.id, m]));
  return tokens.map((t) => {
    const m = byId.get(t.mentorId);
    return {
      token: t.token,
      mentorId: t.mentorId,
      mentorName: m?.name ?? "멘토",
      kakaoPhone: m?.kakaoPhone,
      used: t.used,
    };
  });
}

export async function submitAnswerByToken(
  token: string,
  body: string
): Promise<{ ok: true; answer: Answer; question: Question } | { ok: false; error: string }> {
  const t = await getAnswerToken(token);
  if (!t) return { ok: false, error: "유효하지 않은 답변 링크입니다." };
  if (t.used) return { ok: false, error: "이미 답변이 제출된 링크입니다." };
  const mentor = await getMentorById(t.mentorId);
  const question = await getQuestion(t.questionId);
  if (!mentor || !question) return { ok: false, error: "질문 정보를 찾을 수 없습니다." };

  const answer: Answer = {
    id: newId("a"),
    questionId: question.id,
    mentorId: mentor.id,
    mentorName: mentor.name,
    body: body.trim(),
    createdAt: nowIso(),
    likes: 0,
    adopted: false,
    payoutAmount: 0,
  };
  await insert("answers", answer as unknown as Record<string, unknown>);
  await patch("answerTokens", "token", token, { used: true });
  await patch("questions", "id", question.id, { status: "answered" });
  await patch("mentors", "id", mentor.id, { answerCount: mentor.answerCount + 1 });
  return { ok: true, answer, question };
}

export async function likeAnswer(id: string): Promise<void> {
  const rows = await all<Answer>("answers");
  const a = rows.find((x) => x.id === id);
  if (a) await patch("answers", "id", id, { likes: a.likes + 1 });
}

/** 답변 채택 → 내부 정산 원장 기록(차등 지급) */
export async function adoptAnswer(answerId: string, amount: number, grade: string): Promise<void> {
  const rows = await all<Answer>("answers");
  const a = rows.find((x) => x.id === answerId);
  if (!a) return;
  await patch("answers", "id", answerId, { adopted: true, payoutAmount: amount });
  await insert("payouts", {
    id: newId("pay"),
    mentorId: a.mentorId,
    mentorName: a.mentorName,
    answerId: a.id,
    questionId: a.questionId,
    amount,
    reason: `우수 답변 채택 (${grade})`,
    createdAt: nowIso(),
  } satisfies PayoutRecord as unknown as Record<string, unknown>);
  await patch("questions", "id", a.questionId, { status: "closed" });
}

// ── 우수 질문/답변 ───────────────────────────────────────
export async function topQuestions(limit = 5): Promise<Question[]> {
  const rows = await all<Question>("questions");
  return rows
    .filter((q) => q.isPublic)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit);
}

// ── 토크콘서트 ───────────────────────────────────────────
export async function listTalkSessions(): Promise<TalkSession[]> {
  return all<TalkSession>("talkSessions");
}
export async function applyTalk(
  sessionId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const s = await one<TalkSession>("talkSessions", "id", sessionId);
  if (!s) return { ok: false, error: "세션을 찾을 수 없습니다." };
  if (!s.applicantUserIds.includes(userId)) {
    await patch("talkSessions", "id", sessionId, {
      applicantUserIds: [...s.applicantUserIds, userId],
    });
  }
  return { ok: true };
}

/** 학교 소속 학생 질문에 대해 채택된 답변의 정산 원장 */
export async function schoolPayouts(schoolId: string): Promise<PayoutRecord[]> {
  const questions = await all<Question>("questions");
  const schoolQuestionIds = new Set(
    questions.filter((q) => q.schoolId === schoolId).map((q) => q.id)
  );
  const payouts = await all<PayoutRecord>("payouts");
  return payouts
    .filter((p) => schoolQuestionIds.has(p.questionId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── 관리자 대시보드 집계 ─────────────────────────────────
export async function schoolStats(schoolId: string) {
  const [allUsers, allQuestions, allAnswers, school] = await Promise.all([
    all<User>("users"),
    all<Question>("questions"),
    all<Answer>("answers"),
    getSchoolById(schoolId),
  ]);
  const students = allUsers.filter((u) => u.schoolId === schoolId && u.role === "student");
  const schoolQuestions = allQuestions.filter((q) => q.schoolId === schoolId);
  const answeredIds = new Set(allAnswers.map((a) => a.questionId));
  const now = Date.now();
  const onlineWindowMs = 15 * 60 * 1000;
  const isOnline = (u: User) => now - new Date(u.lastActiveAt).getTime() < onlineWindowMs;

  const questionsByCategory: Record<string, number> = {};
  for (const q of schoolQuestions) {
    questionsByCategory[q.category] = (questionsByCategory[q.category] || 0) + 1;
  }

  return {
    school,
    totalStudents: students.length,
    onlineNow: students.filter(isOnline).length,
    totalQuestions: schoolQuestions.length,
    answeredQuestions: schoolQuestions.filter((q) => answeredIds.has(q.id)).length,
    openQuestions: schoolQuestions.filter((q) => !answeredIds.has(q.id)).length,
    questionsByCategory,
    students: students
      .map((u) => ({
        id: u.id,
        name: u.name,
        department: u.department,
        studentNo: u.studentNo,
        grade: u.grade,
        gender: u.gender,
        questionCount: u.questionCount,
        lastActiveAt: u.lastActiveAt,
        online: isOnline(u),
      }))
      .sort((a, b) => b.questionCount - a.questionCount),
    recentQuestions: schoolQuestions
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10),
  };
}
