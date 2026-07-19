import "server-only";
import { db, commit } from "./store";
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
} from "./types";

const nowIso = () => new Date().toISOString();

// ── 학교 ─────────────────────────────────────────────────
export function listSchools(): School[] {
  return db().schools.map((s) => ({ ...s }));
}
export function getSchoolByCode(code: string): School | undefined {
  const c = code.trim().toUpperCase();
  return db().schools.find((s) => s.code.toUpperCase() === c);
}
export function getSchoolById(id: string): School | undefined {
  return db().schools.find((s) => s.id === id);
}
export function verifyAdmin(username: string, password: string): School | undefined {
  const s = db().schools.find((x) => x.adminUsername === username.trim());
  if (!s) return undefined;
  return verifyPassword(password, s.adminPasswordHash) ? s : undefined;
}

// ── 사용자 ───────────────────────────────────────────────
export function getUserByEmail(email: string): User | undefined {
  const e = email.trim().toLowerCase();
  return db().users.find((u) => u.email.toLowerCase() === e);
}
export function getUserById(id: string): User | undefined {
  return db().users.find((u) => u.id === id);
}
export function listUsersBySchool(schoolId: string): User[] {
  return db().users.filter((u) => u.schoolId === schoolId && u.role === "student");
}

export function createStudent(input: {
  schoolId: string;
  name: string;
  email: string;
  password: string;
  studentNo?: string;
  department?: string;
  phone?: string;
}): { ok: true; user: User } | { ok: false; error: string } {
  if (getUserByEmail(input.email)) return { ok: false, error: "이미 가입된 이메일입니다." };
  const user: User = {
    id: newId("usr"),
    role: "student",
    schoolId: input.schoolId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    studentNo: input.studentNo?.trim(),
    department: input.department?.trim(),
    phone: input.phone?.trim(),
    createdAt: nowIso(),
    lastActiveAt: nowIso(),
    questionCount: 0,
  };
  commit((d) => {
    d.users.push(user);
    d.activity.push({
      id: newId("ev"),
      schoolId: input.schoolId,
      userId: user.id,
      type: "signup",
      at: nowIso(),
    });
  });
  return { ok: true, user };
}

export function authenticateStudent(email: string, password: string): User | undefined {
  const u = getUserByEmail(email);
  if (!u || u.role !== "student") return undefined;
  if (!verifyPassword(password, u.passwordHash)) return undefined;
  return u;
}

export function touchActivity(userId: string) {
  commit((d) => {
    const u = d.users.find((x) => x.id === userId);
    if (u) u.lastActiveAt = nowIso();
  });
}

// ── 멘토 ─────────────────────────────────────────────────
export function listMentors(): Mentor[] {
  return db().mentors.filter((m) => m.active);
}
export function getMentorById(id: string): Mentor | undefined {
  return db().mentors.find((m) => m.id === id);
}
export function getMentorsByIds(ids: string[]): Mentor[] {
  const set = new Set(ids);
  return db().mentors.filter((m) => set.has(m.id));
}

/**
 * 테마 선택(산업/직무/기업/유형/전공)으로 멘토 추천.
 * 선택된 각 차원과 매칭되면 가중치 합산 → 점수순 정렬.
 */
export function recommendMentors(
  refs: QuestionThemeRefs,
  limit = 30
): { mentor: Mentor; score: number; matched: ThemeKind[] }[] {
  const weights: Record<ThemeKind, number> = {
    company: 5,
    job: 4,
    industry: 3,
    type: 2,
    major: 2,
  };
  const selected = Object.entries(refs).filter(([, v]) => !!v) as [ThemeKind, string][];

  const scored = listMentors().map((mentor) => {
    let score = 0;
    const matched: ThemeKind[] = [];
    for (const [kind, val] of selected) {
      if (mentor.tags[kind]?.includes(val)) {
        score += weights[kind];
        matched.push(kind);
      }
    }
    // 동점 보정: 참여도/답변수 소폭 반영
    const tiebreak = mentor.participationScore / 1000 + mentor.answerCount / 5000;
    return { mentor, score: score + tiebreak, matched, rawScore: score };
  });

  const hasSelection = selected.length > 0;
  const filtered = hasSelection ? scored.filter((s) => s.rawScore > 0) : scored;
  filtered.sort((a, b) => b.score - a.score);
  return filtered.slice(0, limit).map(({ mentor, score, matched }) => ({ mentor, score, matched }));
}

/** featured 멘토(토크콘서트 후보) */
export function featuredMentors(limit = 8): Mentor[] {
  return listMentors()
    .filter((m) => m.featured)
    .sort((a, b) => b.participationScore - a.participationScore)
    .slice(0, limit);
}

// ── 질문 ─────────────────────────────────────────────────
export function createQuestion(input: {
  author: User;
  scope: "individual" | "broadcast";
  category: ThemeKind | "mentor";
  themeRefs: QuestionThemeRefs;
  title: string;
  body: string;
  targetMentorIds: string[];
  isPublic: boolean;
}): { question: Question; tokens: { token: string; mentorId: string }[] } {
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
  const tokens = input.targetMentorIds.map((mentorId) => ({
    token: newToken(),
    mentorId,
  }));
  commit((d) => {
    d.questions.push(q);
    tokens.forEach((t) =>
      d.answerTokens.push({
        token: t.token,
        questionId: q.id,
        mentorId: t.mentorId,
        used: false,
        createdAt: nowIso(),
      })
    );
    const u = d.users.find((x) => x.id === input.author.id);
    if (u) u.questionCount += 1;
    d.activity.push({
      id: newId("ev"),
      schoolId: input.author.schoolId,
      userId: input.author.id,
      type: "question",
      at: nowIso(),
    });
  });
  return { question: q, tokens };
}

export function listPublicQuestions(filter?: {
  category?: ThemeKind | "mentor";
  themeId?: string;
  mentorId?: string;
}): Question[] {
  let qs = db().questions.filter((q) => q.isPublic);
  if (filter?.category) qs = qs.filter((q) => q.category === filter.category);
  if (filter?.themeId)
    qs = qs.filter((q) => Object.values(q.themeRefs).includes(filter.themeId!));
  if (filter?.mentorId) qs = qs.filter((q) => q.targetMentorIds.includes(filter.mentorId!));
  return qs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listQuestionsByUser(userId: string): Question[] {
  return db()
    .questions.filter((q) => q.authorUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getQuestion(id: string): Question | undefined {
  return db().questions.find((q) => q.id === id);
}

export function likeQuestion(id: string) {
  commit((d) => {
    const q = d.questions.find((x) => x.id === id);
    if (q) q.likes += 1;
  });
}

// ── 답변 ─────────────────────────────────────────────────
export function listAnswers(questionId: string): Answer[] {
  return db()
    .answers.filter((a) => a.questionId === questionId)
    .sort((a, b) => b.likes - a.likes || a.createdAt.localeCompare(b.createdAt));
}

export function getAnswerToken(token: string) {
  return db().answerTokens.find((t) => t.token === token);
}

export function submitAnswerByToken(
  token: string,
  body: string
): { ok: true; answer: Answer; question: Question } | { ok: false; error: string } {
  const t = getAnswerToken(token);
  if (!t) return { ok: false, error: "유효하지 않은 답변 링크입니다." };
  if (t.used) return { ok: false, error: "이미 답변이 제출된 링크입니다." };
  const mentor = getMentorById(t.mentorId);
  const question = getQuestion(t.questionId);
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
  commit((d) => {
    d.answers.push(answer);
    const tk = d.answerTokens.find((x) => x.token === token);
    if (tk) tk.used = true;
    const q = d.questions.find((x) => x.id === question.id);
    if (q) q.status = "answered";
    const m = d.mentors.find((x) => x.id === mentor.id);
    if (m) m.answerCount += 1;
  });
  return { ok: true, answer, question };
}

export function likeAnswer(id: string) {
  commit((d) => {
    const a = d.answers.find((x) => x.id === id);
    if (a) a.likes += 1;
  });
}

/** 답변 채택 → 내부 정산 원장 기록(차등 지급) */
export function adoptAnswer(answerId: string, amount: number, grade: string) {
  commit((d) => {
    const a = d.answers.find((x) => x.id === answerId);
    if (!a) return;
    a.adopted = true;
    a.payoutAmount = amount;
    d.payouts.push({
      id: newId("pay"),
      mentorId: a.mentorId,
      mentorName: a.mentorName,
      answerId: a.id,
      questionId: a.questionId,
      amount,
      reason: `우수 답변 채택 (${grade})`,
      createdAt: nowIso(),
    });
    const q = d.questions.find((x) => x.id === a.questionId);
    if (q) q.status = "closed";
  });
}

// ── 우수 질문/답변 ───────────────────────────────────────
export function topQuestions(limit = 5): Question[] {
  return db()
    .questions.filter((q) => q.isPublic)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit);
}
export function topAnswers(limit = 5): Answer[] {
  return db()
    .answers.slice()
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit);
}

// ── 토크콘서트 ───────────────────────────────────────────
export function listTalkSessions(): TalkSession[] {
  return db().talkSessions.slice();
}
export function applyTalk(sessionId: string, userId: string): { ok: boolean; error?: string } {
  return commit((d) => {
    const s = d.talkSessions.find((x) => x.id === sessionId);
    if (!s) return { ok: false, error: "세션을 찾을 수 없습니다." };
    if (!s.applicantUserIds.includes(userId)) s.applicantUserIds.push(userId);
    return { ok: true };
  });
}

/** 학교 소속 학생 질문에 대해 채택된 답변의 정산 원장 */
export function schoolPayouts(schoolId: string) {
  const d = db();
  const schoolQuestionIds = new Set(
    d.questions.filter((q) => q.schoolId === schoolId).map((q) => q.id)
  );
  return d.payouts
    .filter((p) => schoolQuestionIds.has(p.questionId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── 관리자 대시보드 집계 ─────────────────────────────────
export function schoolStats(schoolId: string) {
  const d = db();
  const students = d.users.filter((u) => u.schoolId === schoolId && u.role === "student");
  const schoolQuestions = d.questions.filter((q) => q.schoolId === schoolId);
  const answeredIds = new Set(d.answers.map((a) => a.questionId));
  const now = Date.now();
  const onlineWindowMs = 15 * 60 * 1000; // 15분 이내 활동 = 온라인
  const online = students.filter((u) => now - new Date(u.lastActiveAt).getTime() < onlineWindowMs);

  const questionsByCategory: Record<string, number> = {};
  for (const q of schoolQuestions) {
    questionsByCategory[q.category] = (questionsByCategory[q.category] || 0) + 1;
  }

  return {
    school: d.schools.find((s) => s.id === schoolId),
    totalStudents: students.length,
    onlineNow: online.length,
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
        questionCount: u.questionCount,
        lastActiveAt: u.lastActiveAt,
        online: now - new Date(u.lastActiveAt).getTime() < onlineWindowMs,
      }))
      .sort((a, b) => b.questionCount - a.questionCount),
    recentQuestions: schoolQuestions
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10),
  };
}
