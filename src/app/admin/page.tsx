import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { schoolStats, schoolPayouts, listTalkAttendance, getTalkSession } from "@/lib/repo";
import { themeMeta } from "@/lib/taxonomy";
import { formatKST, formatKSTDate } from "@/lib/format";
import { TALK_TEST_SESSION_ID } from "@/lib/talk-config";
import type { ThemeKind, TalkAttendance } from "@/lib/types";

export const metadata: Metadata = { title: "학교 관리자 대시보드" };

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
  if (!session || session.role !== "admin") redirect("/admin/login");

  const [stats, payouts] = await Promise.all([
    schoolStats(session.schoolId),
    schoolPayouts(session.schoolId),
  ]);
  const school = stats.school;

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
  const answerRate =
    stats.totalQuestions > 0
      ? Math.round((stats.answeredQuestions / stats.totalQuestions) * 100)
      : 0;
  const catEntries = Object.entries(stats.questionsByCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...catEntries.map(([, v]) => v));
  const totalPayout = payouts.reduce((s, p) => s + p.amount, 0);

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
            <Row label="채택·정산 건수" value={`${payouts.length}건`} />
            <Row label="정산 총액(내부)" value={`${totalPayout.toLocaleString()}원`} />
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            * 온라인 기준: 최근 15분 이내 활동. 정산은 실제 송금 없이 내부 기록입니다.
          </p>
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

      {/* 최근 질문 + 정산 */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-extrabold">최근 질문</h2>
          <ul className="mt-4 space-y-2">
            {stats.recentQuestions.length === 0 && (
              <li className="text-sm text-ink-muted">질문이 없습니다.</li>
            )}
            {stats.recentQuestions.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/questions/${q.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-cream-100"
                >
                  <span className="truncate text-sm font-medium">{q.title}</span>
                  <span className="ml-2 shrink-0 text-xs text-ink-muted">
                    {formatKSTDate(q.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-extrabold">채택·정산 원장</h2>
          <p className="mt-1 text-xs text-ink-muted">우수 답변 채택 시 멘토 차등 지급 기록</p>
          <ul className="mt-4 space-y-2">
            {payouts.length === 0 && <li className="text-sm text-ink-muted">정산 내역이 없습니다.</li>}
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-cream-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{p.mentorName} 멘토</p>
                  <p className="text-xs text-ink-muted">{p.reason}</p>
                </div>
                <span className="font-bold text-brand-500">{p.amount.toLocaleString()}원</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
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
