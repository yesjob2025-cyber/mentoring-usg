import "server-only";
import { all, one, insert, insertMany, patch, remove } from "./data";
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
  TalkAttendance,
  TalkReservation,
  TalkTrack,
  AnswerToken,
  PayoutRecord,
  ActivityEvent,
} from "./types";
import { TALK_TIME_SLOTS, TALK_MAX_PER_DAY } from "./talk-config";

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
/** 목록 화면에서 작성자 식별(이름·학번)을 한 번에 조회하기 위한 맵 */
export async function userIdentityMap(): Promise<Map<string, { name: string; studentNo?: string }>> {
  const rows = await all<User>("users");
  return new Map(rows.map((u) => [u.id, { name: u.name, studentNo: u.studentNo }]));
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

// 질문은 항상 공개 → 모든 질문을 게시판에 노출 (isPublic 은 작성자 이름 공개 여부일 뿐)
export async function listPublicQuestions(filter?: {
  category?: ThemeKind | "mentor";
  themeId?: string;
  mentorId?: string;
}): Promise<Question[]> {
  let qs = await all<Question>("questions");
  if (filter?.category) qs = qs.filter((q) => q.category === filter.category);
  if (filter?.themeId) qs = qs.filter((q) => Object.values(q.themeRefs).includes(filter.themeId!));
  if (filter?.mentorId) qs = qs.filter((q) => q.targetMentorIds.includes(filter.mentorId!));
  return qs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listQuestionsBySchool(schoolId: string): Promise<Question[]> {
  const rows = await all<Question>("questions");
  return rows
    .filter((q) => q.schoolId === schoolId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

// ── 삭제 (전체 관리자 전용) ───────────────────────────────
/** 답변 1건 삭제 + 관련 정산 제거, 남은 답변 없으면 질문 상태 복구 */
export async function deleteAnswer(answerId: string): Promise<void> {
  const answers = await all<Answer>("answers");
  const target = answers.find((a) => a.id === answerId);
  if (!target) return;
  await remove("answers", "id", answerId);
  // 관련 정산 기록 제거
  const payouts = await all<PayoutRecord>("payouts");
  for (const p of payouts.filter((p) => p.answerId === answerId)) {
    await remove("payouts", "id", p.id);
  }
  // 사용된 답변 토큰 재사용 방지를 위해 그대로 두되, 질문 상태 정리
  const remaining = answers.filter((a) => a.questionId === target.questionId && a.id !== answerId);
  if (remaining.length === 0) {
    await patch("questions", "id", target.questionId, { status: "open" });
  }
}

/** 질문 1건 삭제 + 관련 답변·토큰·정산 모두 제거 */
export async function deleteQuestion(questionId: string): Promise<void> {
  const [answers, tokens, payouts] = await Promise.all([
    all<Answer>("answers"),
    all<AnswerToken>("answerTokens"),
    all<PayoutRecord>("payouts"),
  ]);
  for (const a of answers.filter((a) => a.questionId === questionId)) {
    await remove("answers", "id", a.id);
  }
  for (const t of tokens.filter((t) => t.questionId === questionId)) {
    await remove("answerTokens", "token", t.token);
  }
  for (const p of payouts.filter((p) => p.questionId === questionId)) {
    await remove("payouts", "id", p.id);
  }
  await remove("questions", "id", questionId);
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
  return rows.sort((a, b) => b.likes - a.likes).slice(0, limit);
}

// ── 토크콘서트 ───────────────────────────────────────────
export async function listTalkSessions(): Promise<TalkSession[]> {
  return all<TalkSession>("talkSessions");
}
export async function getTalkSession(id: string): Promise<TalkSession | undefined> {
  return one<TalkSession>("talkSessions", "id", id);
}
export async function applyTalk(
  sessionId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const s = await one<TalkSession>("talkSessions", "id", sessionId);
  if (!s) return { ok: false, error: "세션을 찾을 수 없습니다." };
  const applicants = s.applicantUserIds ?? [];
  if (applicants.includes(userId)) return { ok: true };
  if (applicants.length >= s.capacity) {
    return { ok: false, error: "이 회차의 신청이 마감되었습니다." };
  }
  await patch("talkSessions", "id", sessionId, {
    applicantUserIds: [...applicants, userId],
  });
  return { ok: true };
}
export async function cancelTalk(
  sessionId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const s = await one<TalkSession>("talkSessions", "id", sessionId);
  if (!s) return { ok: false, error: "세션을 찾을 수 없습니다." };
  const applicants = s.applicantUserIds ?? [];
  if (applicants.includes(userId)) {
    await patch("talkSessions", "id", sessionId, {
      applicantUserIds: applicants.filter((id) => id !== userId),
    });
  }
  return { ok: true };
}
/** 특정 학생이 신청한 토크콘서트 회차 */
export async function listTalkReservations(userId: string): Promise<TalkSession[]> {
  const rows = await all<TalkSession>("talkSessions");
  return rows
    .filter((s) => (s.applicantUserIds ?? []).includes(userId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot);
}

// ── 토크콘서트 시간대 예약 (날짜 → 희망 멘토링 → 시간) ──────
/** 학생 본인의 예약 전체 */
export async function listSlotReservationsByUser(
  userId: string
): Promise<TalkReservation[]> {
  const rows = await all<TalkReservation>("talkReservations");
  return rows
    .filter((r) => r.userId === userId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

/** 전체 예약 (학교 관리자·본사용) */
export async function listAllSlotReservations(): Promise<TalkReservation[]> {
  const rows = await all<TalkReservation>("talkReservations");
  return rows.sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
  );
}

/** 특정 학교의 예약 (학교 관리자용) */
export async function listSlotReservationsBySchool(
  schoolId: string
): Promise<TalkReservation[]> {
  const rows = await all<TalkReservation>("talkReservations");
  return rows
    .filter((r) => r.schoolId === schoolId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

/** 예약 생성. 규칙: 시간대(19/20/21시) 유효 · 하루 최대 3개 · 같은 시간대 중복 X · 같은 멘토링 중복 X */
export async function createSlotReservation(
  userId: string,
  input: { date: string; time: string; track: TalkTrack; topic: string }
): Promise<{ ok: boolean; error?: string; reservation?: TalkReservation }> {
  if (!(TALK_TIME_SLOTS as readonly string[]).includes(input.time)) {
    return { ok: false, error: "잘못된 시간대입니다." };
  }
  const user = await getUserById(userId);
  if (!user) return { ok: false, error: "로그인 정보를 확인할 수 없습니다." };

  const mine = (await all<TalkReservation>("talkReservations")).filter(
    (r) => r.userId === userId && r.date === input.date
  );
  if (mine.length >= TALK_MAX_PER_DAY) {
    return { ok: false, error: `하루 최대 ${TALK_MAX_PER_DAY}개까지 예약할 수 있습니다.` };
  }
  if (mine.some((r) => r.time === input.time)) {
    return { ok: false, error: "이미 같은 시간대에 예약한 멘토링이 있습니다." };
  }
  if (mine.some((r) => r.track === input.track && r.topic === input.topic)) {
    return { ok: false, error: "이미 예약한 멘토링입니다." };
  }

  const reservation: TalkReservation = {
    id: newId("res"),
    userId,
    userName: user.name,
    studentNo: user.studentNo,
    schoolId: user.schoolId,
    date: input.date,
    time: input.time,
    track: input.track,
    topic: input.topic,
    createdAt: nowIso(),
  };
  await insert("talkReservations", reservation as unknown as Record<string, unknown>);
  return { ok: true, reservation };
}

/** 예약 취소 (본인 것만) */
export async function cancelSlotReservation(
  id: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const r = await one<TalkReservation>("talkReservations", "id", id);
  if (!r) return { ok: true };
  if (r.userId !== userId) return { ok: false, error: "본인 예약만 취소할 수 있습니다." };
  await remove("talkReservations", "id", id);
  return { ok: true };
}

// ── 화상 교육장 출석 로그 ─────────────────────────────────
/** 입장 기록 생성 → 출석 id 반환 */
export async function recordTalkJoin(input: {
  sessionId: string;
  userId: string;
  userName: string;
  schoolId: string;
}): Promise<TalkAttendance> {
  const row: TalkAttendance = {
    id: newId("att"),
    sessionId: input.sessionId,
    userId: input.userId,
    userName: input.userName,
    schoolId: input.schoolId,
    joinedAt: nowIso(),
  };
  await insert("talkAttendance", row as unknown as Record<string, unknown>);
  return row;
}
/** 퇴장 기록 (해당 출석 행에 leftAt 기록, 소유자 확인) */
export async function recordTalkLeave(attendanceId: string, userId: string): Promise<void> {
  const row = await one<TalkAttendance>("talkAttendance", "id", attendanceId);
  if (!row || row.userId !== userId || row.leftAt) return;
  await patch("talkAttendance", "id", attendanceId, { leftAt: nowIso() });
}
/** 회차별 출석 로그 (관리자용, 선택적 학교 필터) */
export async function listTalkAttendance(
  sessionId: string,
  schoolId?: string
): Promise<TalkAttendance[]> {
  const rows = await all<TalkAttendance>("talkAttendance");
  return rows
    .filter((r) => r.sessionId === sessionId && (!schoolId || r.schoolId === schoolId))
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
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

// ── 전체(연합) 관리자 집계 ───────────────────────────────
export async function globalStats() {
  const [allUsers, allQuestions, allAnswers, schools] = await Promise.all([
    all<User>("users"),
    all<Question>("questions"),
    all<Answer>("answers"),
    all<School>("schools"),
  ]);
  const students = allUsers.filter((u) => u.role === "student");
  const answeredIds = new Set(allAnswers.map((a) => a.questionId));
  const now = Date.now();
  const onlineWindowMs = 15 * 60 * 1000;
  const isOnline = (u: User) => now - new Date(u.lastActiveAt).getTime() < onlineWindowMs;

  const perSchool = schools
    .map((sc) => {
      const sStudents = students.filter((u) => u.schoolId === sc.id);
      const sQuestions = allQuestions.filter((q) => q.schoolId === sc.id);
      return {
        id: sc.id,
        name: sc.name,
        code: sc.code,
        region: sc.region,
        students: sStudents.length,
        online: sStudents.filter(isOnline).length,
        questions: sQuestions.length,
        answered: sQuestions.filter((q) => answeredIds.has(q.id)).length,
      };
    })
    .sort((a, b) => b.students - a.students || a.name.localeCompare(b.name));

  return {
    schoolCount: schools.length,
    totalStudents: students.length,
    onlineNow: students.filter(isOnline).length,
    totalQuestions: allQuestions.length,
    answeredQuestions: allQuestions.filter((q) => answeredIds.has(q.id)).length,
    perSchool,
    schoolNameById: new Map(schools.map((s) => [s.id, s.name])),
  };
}

/** 멘토별 질문 발송/답변 현황 (전체 관리자용) */
export async function mentorQnaStats() {
  const [tokens, answers, mentors] = await Promise.all([
    all<AnswerToken>("answerTokens"),
    all<Answer>("answers"),
    all<Mentor>("mentors"),
  ]);
  const mentorById = new Map(mentors.map((m) => [m.id, m]));

  const received = new Map<string, number>();
  for (const t of tokens) received.set(t.mentorId, (received.get(t.mentorId) ?? 0) + 1);

  const answered = new Map<string, number>();
  const lastAt = new Map<string, string>();
  for (const a of answers) {
    answered.set(a.mentorId, (answered.get(a.mentorId) ?? 0) + 1);
    const prev = lastAt.get(a.mentorId);
    if (!prev || a.createdAt > prev) lastAt.set(a.mentorId, a.createdAt);
  }

  const rows = [...received.entries()].map(([mid, recv]) => {
    const m = mentorById.get(mid);
    const ans = answered.get(mid) ?? 0;
    return {
      id: mid,
      name: m?.name ?? "(삭제된 멘토)",
      company: m?.company ?? "",
      title: m?.title ?? "",
      received: recv,
      answered: ans,
      pending: Math.max(0, recv - ans),
      answerRate: recv ? Math.round((ans / recv) * 100) : 0,
      lastAnsweredAt: lastAt.get(mid),
    };
  });
  rows.sort((a, b) => b.pending - a.pending || b.received - a.received || b.answered - a.answered);

  return {
    rows,
    totalReceived: tokens.length,
    totalAnswered: answers.length,
    activeMentors: answered.size,
    answerRate: tokens.length ? Math.round((answers.length / tokens.length) * 100) : 0,
  };
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
