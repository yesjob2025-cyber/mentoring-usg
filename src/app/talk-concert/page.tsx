import type { Metadata } from "next";
import Link from "next/link";
import { listTalkSessions, listSlotReservationsByUser } from "@/lib/repo";
import type { TalkSession } from "@/lib/types";
import { getSession } from "@/lib/session";
import { TALK_TEST_SESSION_ID, TALK_TIME_SLOTS } from "@/lib/talk-config";
import { ReservationPlanner } from "./reservation-planner";

export const metadata: Metadata = {
  title: "온라인 토크콘서트",
  description: "8/24~9/3, 45명 현직자 릴레이 온라인 직무 토크콘서트 · 자체 화상 교육장",
};

const TRACK_STYLE: Record<string, string> = {
  IT분야: "bg-blue-50 text-blue-700 border-blue-200",
  공학: "bg-emerald-50 text-emerald-700 border-emerald-200",
  인문상경: "bg-brand-50 text-brand-500 border-brand-200",
  보건복지: "bg-purple-50 text-purple-700 border-purple-200",
  공공: "bg-ink/5 text-ink-soft border-ink-line",
};

function weekday(dateStr: string) {
  return ["일", "월", "화", "수", "목", "금", "토"][new Date(dateStr).getDay()];
}

// 기존 데이터에 "19:00 · 주제" 형태로 시간이 접두된 경우 시간 부분 제거
// (5개 계열 동시 진행이라 회차별 시간 구분이 없음)
function topicText(raw: string): string {
  const parts = raw.split(" · ");
  if (parts.length > 1 && /^\d{1,2}:\d{2}$/.test(parts[0].trim())) {
    return parts.slice(1).join(" · ");
  }
  return raw;
}

export default async function TalkConcertPage() {
  const sessions = await listTalkSessions();

  const byDate = new Map<string, TalkSession[]>();
  for (const s of sessions) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dates = [...byDate.keys()].sort();

  // 예약 위저드용 데이터
  const auth = await getSession();
  const isStudent = auth?.role === "student" && !!auth.uid;
  const reservations = isStudent ? await listSlotReservationsByUser(auth.uid!) : [];
  const schedule = dates.map((date) => ({
    date,
    weekday: weekday(date),
    mentorings: byDate
      .get(date)!
      .sort((a, b) => a.slot - b.slot)
      .map((s) => ({ track: s.track, topic: topicText(s.topic) })),
  }));

  return (
    <div className="container-page py-10">
      {/* Hero */}
      <section className="rounded-2xl2 bg-ink px-6 py-12 text-cream-50 sm:px-10">
        <span className="chip border-cream-200/30 bg-white/10 text-brand-300">② 온라인 토크콘서트</span>
        <h1 className="mt-4 text-3xl font-black sm:text-4xl">
          45명 현직자 릴레이<br />온라인 직무 토크콘서트
        </h1>
        <p className="mt-4 max-w-xl text-cream-200/80">
          매일 5명씩 9일간, 현장 실제 업무 이야기와 취업 노하우를 나눕니다. 사이트에서 바로 열리는
          자체 화상 교육장에서 직무 멘토 특강(30분)과 자유 간담회(30분)로 진행됩니다.
        </p>
        <dl className="mt-8 flex flex-wrap gap-8">
          <div>
            <dt className="text-sm text-cream-200/70">기간</dt>
            <dd className="text-lg font-extrabold">8.24 ~ 9.3</dd>
          </div>
          <div>
            <dt className="text-sm text-cream-200/70">회차</dt>
            <dd className="text-lg font-extrabold">총 45회 (9일 × 5회)</dd>
          </div>
          <div>
            <dt className="text-sm text-cream-200/70">시간</dt>
            <dd className="text-lg font-extrabold">19:00 ~ 22:00</dd>
          </div>
          <div>
            <dt className="text-sm text-cream-200/70">방식</dt>
            <dd className="text-lg font-extrabold">자체 화상 교육장</dd>
          </div>
        </dl>
      </section>

      {/* 진행 방식 */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <span className="chip-brand">직무 멘토 특강 · 30분</span>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>• 현장 실제 업무 이야기 / 하루 일과·업무 패턴</li>
            <li>• 주요 업무 수행 과정과 필요 역량 (기술·지식·태도)</li>
            <li>• 취업준비 노하우 / 채용전형 분석 / 면접 경험담</li>
          </ul>
        </div>
        <div className="card p-6">
          <span className="chip-brand">자유 간담회 · 30분</span>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>• 실시간 질문 및 답변 (직무 중심, 전담 사회자 진행)</li>
            <li>• 입사서류·면접 등 테마별 질문과 경험담 공유</li>
            <li>• 멘토링을 통해 나온 질문·답변은 사이트에 정리 업로드</li>
          </ul>
        </div>
      </section>

      {/* 예약 */}
      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">토크콘서트 예약</h2>
        <p className="mt-1 text-ink-muted">
          희망하는 날짜 → 멘토링 → 시간을 선택해 예약하세요. 시간대별로 1개씩, 하루 최대 3개까지
          참여할 수 있습니다.
        </p>
        <div className="mt-6">
          <ReservationPlanner
            schedule={schedule}
            timeSlots={[...TALK_TIME_SLOTS]}
            reservations={reservations}
            isLoggedIn={isStudent}
          />
        </div>
      </section>

      {/* 일정표 */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">토크콘서트 일정</h2>
          <span className="badge bg-amber-50 text-amber-700">멘토 섭외 진행 중</span>
        </div>
        <p className="mt-1 text-ink-muted">
          매일 19:00~22:00, 5개 계열(IT분야·공학·인문상경·보건복지·공공)이 동시에 진행됩니다. 섭외
          일정에 따라 멘토가 순차 공개됩니다.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dates.map((date) => {
            const items = byDate.get(date)!.sort((a, b) => a.slot - b.slot);
            return (
              <div key={date} className="card p-5">
                <div className="flex items-center justify-between border-b border-ink-line pb-3">
                  <p className="font-extrabold">
                    {date.slice(5).replace("-", ".")}{" "}
                    <span className="text-ink-muted">({weekday(date)})</span>
                  </p>
                  <span className="text-xs text-ink-muted">5개 계열 동시 · 19:00~22:00</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {items.map((s) => {
                    const topic = topicText(s.topic);
                    const isTest = s.id === TALK_TEST_SESSION_ID;
                    return (
                      <li key={s.id} className="flex items-center gap-2 text-sm">
                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${
                            TRACK_STYLE[s.track] ?? "bg-ink/5 text-ink-soft border-ink-line"
                          }`}
                        >
                          {s.track}
                        </span>
                        <span className="truncate text-ink-soft">{topic}</span>
                        {isTest && (
                          <Link
                            href={`/talk-concert/room/${s.id}`}
                            className="ml-auto shrink-0 rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-600"
                          >
                            🔴 테스트 입장
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* 자체 화상 교육장 안내 */}
      <section className="mt-12 rounded-2xl border border-ink-line bg-cream-100 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-extrabold">자체 화상 교육장 (Zoom 불필요)</h3>
            <p className="mt-1 max-w-xl text-sm text-ink-soft">
              별도 프로그램 설치나 Zoom 계정 없이, 사이트 안에서 바로 화상 교육장이 열립니다. 브라우저에서
              카메라·마이크 권한만 허용하면 되고, 참가 학생들이 같은 방에서 멘토 특강과 실시간 간담회에
              참여합니다. 지금은 <b>테스트 회차 1개</b>만 입장할 수 있으며, 입장·퇴장 기록은 학교 관리자
              대시보드에 출석 로그로 남습니다.
            </p>
          </div>
          <span className="badge bg-emerald-50 text-emerald-700">브라우저에서 바로 참여</span>
        </div>
      </section>

      <section className="mt-10 text-center">
        <p className="text-ink-soft">토크콘서트 전, 실시간 Q&A로 먼저 궁금증을 해소해 보세요.</p>
        <Link href="/qna" className="btn-brand mt-4">
          실시간 Q&A 바로가기
        </Link>
      </section>
    </div>
  );
}
