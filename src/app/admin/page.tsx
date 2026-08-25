import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  schoolStats,
  globalStats,
  listTalkAttendance,
  getTalkSession,
  listQuestionsBySchool,
  userIdentityMap,
  answerCountByQuestion,
  mentorQnaStats,
  listSlotReservationsBySchool,
  listAllSlotReservations,
  listSchools,
  listStudents,
} from "@/lib/repo";
import { themeMeta } from "@/lib/taxonomy";
import { formatKST, formatKSTDate } from "@/lib/format";
import { TALK_TEST_SESSION_ID } from "@/lib/talk-config";
import { TALK_SCHEDULE, weekday as talkWeekday } from "@/lib/talk-schedule";
import type { ThemeKind, TalkAttendance, TalkReservation } from "@/lib/types";
import { SchoolQuestions, type SchoolQuestionRow } from "./school-questions";
import { MentorQna, type MentorQnaRow } from "./mentor-qna";
import { TalkReservations, type ResRow } from "./talk-reservations";
import { StudentRoster, type StudentRow } from "./student-roster";
import type { User } from "@/lib/types";

async function buildStudentRows(students: User[], withSchool: boolean): Promise<StudentRow[]> {
  const schoolName = new Map<string, string>();
  if (withSchool) for (const s of await listSchools()) schoolName.set(s.id, s.name);
  return students.map((u) => ({
    id: u.id,
    name: u.name,
    studentNo: u.studentNo ?? "",
    school: withSchool ? schoolName.get(u.schoolId) ?? u.schoolId : "",
    department: u.department ?? "",
    grade: u.grade ?? "",
    gender: u.gender ?? "",
    phone: u.phone ?? "",
    email: u.email,
    joinedAt: formatKSTDate(u.createdAt),
    questionCount: u.questionCount ?? 0,
  }));
}

// (date|topic) → 기업명 (예약에 저장 안 된 회사명을 일정표에서 보강)
const COMPANY_BY_SLOT = new Map<string, string>(
  TALK_SCHEDULE.flatMap((d) => d.slots.map((s) => [`${d.date}|${s.topic}`, s.company] as const))
);

async function buildResRows(
  reservations: TalkReservation[],
  withSchool: boolean
): Promise<ResRow[]> {
  const schoolName = new Map<string, string>();
  if (withSchool) {
    for (const s of await listSchools()) schoolName.set(s.id, s.name);
  }
  return reservations.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.userName,
    studentNo: r.studentNo ?? "",
    school: withSchool ? schoolName.get(r.schoolId) ?? r.schoolId : "",
    date: r.date,
    weekday: talkWeekday(r.date),
    time: r.time,
    topic: r.topic,
    company: COMPANY_BY_SLOT.get(`${r.date}|${r.topic}`) ?? "",
    track: r.track,
  }));
}

export const metadata: Metadata = { title: "관리자 대시보드" };

function categoryLabel(key: string) {
  if (key === "mentor") return "멘토";
  return themeMeta[key as ThemeKind]?.short ?? key;
}

function durationLabel(a: TalkAttendance): string {
  if (!a.leftAt) return "참여 중";
  const mins = Math.max(0, Math.round((new Date(a.leftAt).getTime() - new Date(a.joinedAt).getTime()) / 60000));
  if (mins < 60) return `${mins}분`;
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/admin/login");
  }
  if (session.role === "superadmin") return <SuperAdminDashboard />;

  const stats = await schoolStats(session.schoolId);
  const school = stats.school;

  // 학교 질문 전체 (이름·학번 포함, 검색용)
  const [schoolQuestions, identities, answerCounts] = await Promise.all([
    listQuestionsBySchool(session.schoolId),
    userIdentityMap(),
    answerCountByQuestion(),
  ]);
  const questionRows: SchoolQuestionRow[] = schoolQuestions.map((q) => ({
    id: q.id,
    title: q.title,
    body: q.body,
    authorName: q.authorName,
    studentNo: identities.get(q.authorUserId)?.studentNo ?? "",
    date: formatKSTDate(q.createdAt),
    answered: answerCounts.get(q.id) ?? 0,
    anonymous: !q.isPublic,
  }));

  // 화상 교육장 테스트 출석 로그 (테이블 미생성 시에도 대시보드는 정상 표시)
  let attendance: TalkAttendance[] = [];
  let testTalkTopic = "";
  try {
    const [rows, talk] = await Promise.all([
      listTalkAttendance(TALK_TEST_SESSION_ID, session.schoolId),
      getTalkSession(TALK_TEST_SESSION_ID),
    ]);
    attendance = rows;
    if (talk) testTalkTopic = talk.topic.split(" · ").pop() ?? talk.topic;
  } catch {
    attendance = [];
  }
  const attendUnique = new Set(attendance.map((a) => a.userId)).size;

  // 토크콘서트 예약 (우리 학교)
  let talkResRows: ResRow[] = [];
  try {
    talkResRows = await buildResRows(await listSlotReservationsBySchool(session.schoolId), false);
  } catch {
    talkResRows = [];
  }

  // 등록 학생 명단 (우리 학교)
  const studentRows = await buildStudentRows(await listStudents(session.schoolId), false);

  const answerRate =
    stats.totalQuestions > 0
      ? Math.round((stats.answeredQuestions / stats.totalQuestions) * 100)
      : 0;
  const catEntries = Object.entries(stats.questionsByCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...catEntries.map(([, v]) => v));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip-brand">학교 관리자</span>
          <h1 className="mt-3 text-3xl font-black">{school?.name} 대시보드</h1>
          <p className="mt-1 text-ink-soft">참여 현황과 질문 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="rounded-xl border border-ink-line bg-white px-4 py-3 text-sm">
          <p className="text-ink-muted">학교 접속코드</p>
          <p className="font-mono text-lg font-extrabold tracking-wider text-brand-500">
            {school?.code}
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="가입 학생" value={stats.totalStudents} unit="명" />
        <Kpi label="현재 접속 중" value={stats.onlineNow} unit="명" accent />
        <Kpi label="총 질문" value={stats.totalQuestions} unit="건" />
        <Kpi label="답변 완료" value={stats.answeredQuestions} unit="건" />
        <Kpi label="답변률" value={answerRate} unit="%" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* 항목별 질문 분포 */}
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-extrabold">항목별 질문 현황</h2>
          {catEntries.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">아직 질문이 없습니다.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {catEntries.map(([key, count]) => (
                <li key={key} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-sm font-semibold text-ink-soft">
                    {categoryLabel(key)}
                  </span>
                  <div className="h-6 flex-1 overflow-hidden rounded-full bg-cream-200">
                    <div
                      className="flex h-full items-center justify-end rounded-full bg-brand-300 pr-2 text-xs font-bold text-ink"
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 온라인 접속 현황 요약 */}
        <section className="card p-6">
          <h2 className="text-lg font-extrabold">접속 현황</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="현재 온라인" value={`${stats.onlineNow}명`} />
            <Row label="미답변 질문" value={`${stats.openQuestions}건`} />
            <Row label="답변 완료" value={`${stats.answeredQuestions}건`} />
          </div>
          <p className="mt-4 text-xs text-ink-muted">* 온라인 기준: 최근 15분 이내 활동.</p>
        </section>
      </div>

      {/* 학생 목록 */}
      <section className="mt-8 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-line p-5">
          <h2 className="text-lg font-extrabold">학생 참여 현황</h2>
          <span className="text-sm text-ink-muted">{stats.students.length}명</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-left text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">상태</th>
                <th className="px-5 py-3 font-semibold">이름</th>
                <th className="px-5 py-3 font-semibold">학과</th>
                <th className="px-5 py-3 font-semibold">학년</th>
                <th className="px-5 py-3 font-semibold">성별</th>
                <th className="px-5 py-3 font-semibold">학번</th>
                <th className="px-5 py-3 text-right font-semibold">질문 수</th>
                <th className="px-5 py-3 font-semibold">최근 접속</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-line">
              {stats.students.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-ink-muted">
                    아직 가입한 학생이 없습니다.
                  </td>
                </tr>
              )}
              {stats.students.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        s.online ? "text-emerald-600" : "text-ink-muted"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          s.online ? "bg-emerald-500" : "bg-ink-line"
                        }`}
                      />
                      {s.online ? "온라인" : "오프라인"}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold">{s.name}</td>
                  <td className="px-5 py-3 text-ink-soft">{s.department ?? "-"}</td>
                  <td className="px-5 py-3 text-ink-soft">{s.grade ?? "-"}</td>
                  <td className="px-5 py-3 text-ink-soft">{s.gender ?? "-"}</td>
                  <td className="px-5 py-3 text-ink-soft">{s.studentNo ?? "-"}</td>
                  <td className="px-5 py-3 text-right font-bold">{s.questionCount}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatKST(s.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 화상 교육장 출석 로그 (테스트) */}
      <section className="mt-8 card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-line p-5">
          <div>
            <h2 className="text-lg font-extrabold">화상 교육장 출석 로그</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              테스트 회차{testTalkTopic ? ` · ${testTalkTopic}` : ""} · 우리 학교 학생 기준
            </p>
          </div>
          <span className="text-sm text-ink-muted">
            참여 {attendUnique}명 · 기록 {attendance.length}건
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-left text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">이름</th>
                <th className="px-5 py-3 font-semibold">입장</th>
                <th className="px-5 py-3 font-semibold">퇴장</th>
                <th className="px-5 py-3 font-semibold">참여 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-line">
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-ink-muted">
                    아직 화상 교육장 입장 기록이 없습니다.
                  </td>
                </tr>
              )}
              {attendance.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-semibold">{a.userName}</td>
                  <td className="px-5 py-3 text-ink-soft">{formatKST(a.joinedAt)}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {a.leftAt ? formatKST(a.leftAt) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-semibold ${
                        a.leftAt ? "text-ink-soft" : "text-emerald-600"
                      }`}
                    >
                      {durationLabel(a)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 토크콘서트 예약 현황 (우리 학교) */}
      <TalkReservations rows={talkResRows} />

      {/* 등록 학생 명단 (우리 학교) */}
      <StudentRoster rows={studentRows} />

      {/* 학교 질문 전체 (이름·학번 + 검색) */}
      <SchoolQuestions questions={questionRows} />
    </div>
  );
}

async function SuperAdminDashboard() {
  const g = await globalStats();
  const answerRate =
    g.totalQuestions > 0 ? Math.round((g.answeredQuestions / g.totalQuestions) * 100) : 0;

  // 전체 화상 교육장 출석 로그 (모든 학교)
  let attendance: TalkAttendance[] = [];
  let testTalkTopic = "";
  try {
    const [rows, talk] = await Promise.all([
      listTalkAttendance(TALK_TEST_SESSION_ID),
      getTalkSession(TALK_TEST_SESSION_ID),
    ]);
    attendance = rows;
    if (talk) testTalkTopic = talk.topic.split(" · ").pop() ?? talk.topic;
  } catch {
    attendance = [];
  }
  const attendUnique = new Set(attendance.map((a) => a.userId)).size;

  // 토크콘서트 예약 (전 학교, 학교별)
  let talkResRows: ResRow[] = [];
  try {
    talkResRows = await buildResRows(await listAllSlotReservations(), true);
  } catch {
    talkResRows = [];
  }

  // 등록 학생 명단 (전 학교)
  const studentRows = await buildStudentRows(await listStudents(), true);

  // 멘토 질문·답변 현황
  const mentorQ = await mentorQnaStats();
  const mentorRows: MentorQnaRow[] = mentorQ.rows.map((r) => ({
    id: r.id,
    name: r.name,
    company: r.company,
    title: r.title,
    received: r.received,
    answered: r.answered,
    pending: r.pending,
    answerRate: r.answerRate,
    lastAnswered: r.lastAnsweredAt ? formatKSTDate(r.lastAnsweredAt) : "",
  }));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip-brand">전체 관리자</span>
          <h1 className="mt-3 text-3xl font-black">부울경 연합 전체 대시보드</h1>
          <p className="mt-1 text-ink-soft">참여 {g.schoolCount}개교의 현황을 한눈에 확인하세요.</p>
        </div>
      </div>

      {/* KPI */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="참여 학교" value={g.schoolCount} unit="개교" />
        <Kpi label="가입 학생" value={g.totalStudents} unit="명" />
        <Kpi label="현재 접속 중" value={g.onlineNow} unit="명" accent />
        <Kpi label="총 질문" value={g.totalQuestions} unit="건" />
        <Kpi label="답변률" value={answerRate} unit="%" />
      </div>

      {/* 학교별 현황 */}
      <section className="mt-8 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-line p-5">
          <h2 className="text-lg font-extrabold">학교별 현황</h2>
          <span className="text-sm text-ink-muted">{g.perSchool.length}개교</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-left text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">학교</th>
                <th className="px-5 py-3 font-semibold">지역</th>
                <th className="px-5 py-3 text-right font-semibold">가입 학생</th>
                <th className="px-5 py-3 text-right font-semibold">접속 중</th>
                <th className="px-5 py-3 text-right font-semibold">질문</th>
                <th className="px-5 py-3 text-right font-semibold">답변 완료</th>
                <th className="px-5 py-3 font-semibold">접속코드</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-line">
              {g.perSchool.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-semibold">{s.name}</td>
                  <td className="px-5 py-3 text-ink-soft">{s.region ?? "-"}</td>
                  <td className="px-5 py-3 text-right font-bold">{s.students}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={s.online > 0 ? "font-bold text-emerald-600" : "text-ink-muted"}>
                      {s.online}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-ink-soft">{s.questions}</td>
                  <td className="px-5 py-3 text-right text-ink-soft">{s.answered}</td>
                  <td className="px-5 py-3 font-mono text-xs tracking-wider text-brand-500">
                    {s.code}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 멘토 질문·답변 요약 KPI */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="발송 질문" value={mentorQ.totalReceived} unit="건" />
        <Kpi label="답변 완료" value={mentorQ.totalAnswered} unit="건" />
        <Kpi label="멘토 답변률" value={mentorQ.answerRate} unit="%" accent />
        <Kpi label="답변 참여 멘토" value={mentorQ.activeMentors} unit="명" />
      </div>

      {/* 멘토 질문·답변 현황 (검색) */}
      <MentorQna rows={mentorRows} />

      {/* 토크콘서트 예약 현황 (학교별) */}
      <TalkReservations rows={talkResRows} showSchool />

      {/* 등록 학생 명단 (전 학교) */}
      <StudentRoster rows={studentRows} showSchool />

      {/* 화상 교육장 출석 로그 (전체) */}
      <section className="mt-8 card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-line p-5">
          <div>
            <h2 className="text-lg font-extrabold">화상 교육장 출석 로그</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              테스트 회차{testTalkTopic ? ` · ${testTalkTopic}` : ""} · 전체 학교
            </p>
          </div>
          <span className="text-sm text-ink-muted">
            참여 {attendUnique}명 · 기록 {attendance.length}건
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100 text-left text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">이름</th>
                <th className="px-5 py-3 font-semibold">학교</th>
                <th className="px-5 py-3 font-semibold">입장</th>
                <th className="px-5 py-3 font-semibold">퇴장</th>
                <th className="px-5 py-3 font-semibold">참여 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-line">
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-muted">
                    아직 화상 교육장 입장 기록이 없습니다.
                  </td>
                </tr>
              )}
              {attendance.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-semibold">{a.userName}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {g.schoolNameById.get(a.schoolId) ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{formatKST(a.joinedAt)}</td>
                  <td className="px-5 py-3 text-ink-soft">{a.leftAt ? formatKST(a.leftAt) : "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-semibold ${
                        a.leftAt ? "text-ink-soft" : "text-emerald-600"
                      }`}
                    >
                      {durationLabel(a)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div className={`card p-5 ${accent ? "ring-2 ring-brand-300" : ""}`}>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-black">
        {value.toLocaleString()}
        <span className="ml-1 text-base font-semibold text-ink-muted">{unit}</span>
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
