import type { Metadata } from "next";
import Link from "next/link";
import { listSlotReservationsByUser } from "@/lib/repo";
import { getSession } from "@/lib/session";
import { TALK_TIME_SLOTS } from "@/lib/talk-config";
import { TALK_SCHEDULE, zoomFor, weekday } from "@/lib/talk-schedule";
import { profileIdByName } from "@/lib/talk-profiles";
import { ReservationPlanner } from "./reservation-planner";

export const metadata: Metadata = {
  title: "온라인 토크콘서트",
  description: "8/24~9/3, 45명 현직자 릴레이 온라인 직무 토크콘서트 · Zoom 화상 진행",
};

const TRACK_STYLE: Record<string, string> = {
  IT분야: "bg-blue-50 text-blue-700 border-blue-200",
  공학: "bg-emerald-50 text-emerald-700 border-emerald-200",
  인문상경: "bg-brand-50 text-brand-500 border-brand-200",
  기타: "bg-purple-50 text-purple-700 border-purple-200",
  공공: "bg-ink/5 text-ink-soft border-ink-line",
};

export default async function TalkConcertPage() {
  const auth = await getSession();
  const isStudent = auth?.role === "student" && !!auth.uid;
  const [reservations, profileIds] = await Promise.all([
    isStudent ? listSlotReservationsByUser(auth.uid!) : Promise.resolve([]),
    profileIdByName(),
  ]);
  const schedule = TALK_SCHEDULE.map((d) => ({
    date: d.date,
    weekday: weekday(d.date),
    mentorings: d.slots.map((s) => ({ track: s.track, topic: s.topic, company: s.company })),
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
          매일 5명씩 9일간, 현장 실제 업무 이야기와 취업 노하우를 나눕니다. Zoom 화상으로 직무 멘토
          특강(30분)과 자유 간담회(30분)로 진행됩니다.
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
            <dd className="text-lg font-extrabold">Zoom 화상</dd>
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

      {/* 일정표 (날짜 클릭 → Zoom 접속 안내) */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">토크콘서트 일정</h2>
          <span className="badge bg-amber-50 text-amber-700">멘토 섭외 진행 중</span>
        </div>
        <p className="mt-1 text-ink-muted">
          매일 19:00~22:00, 5개 계열이 동시에 진행됩니다. 각 슬롯은 <b className="text-ink-soft">직무 · 기업</b>으로
          표기되며, 프로필이 등록된 멘토는 눌러서 확인할 수 있습니다. <span className="text-ink-muted">(점선 = 변동 가능)</span>
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TALK_SCHEDULE.map((day) => {
            const ready = Boolean(zoomFor(day.date)?.link);
            return (
              <div key={day.date} className="card p-5">
                <div className="flex items-center justify-between border-b border-ink-line pb-3">
                  <p className="font-extrabold">
                    {day.date.slice(5).replace("-", ".")}{" "}
                    <span className="text-ink-muted">({weekday(day.date)})</span>
                  </p>
                  <Link
                    href={`/talk-concert/zoom/${day.date}`}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                      ready
                        ? "bg-[#2D8CFF] text-white hover:bg-[#2478e0]"
                        : "bg-ink/5 text-ink-soft hover:bg-ink/10"
                    }`}
                  >
                    {ready ? "🎥 Zoom 접속" : "접속 안내"}
                  </Link>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {day.slots.map((s) => {
                    const label = s.company ? `${s.topic} · ${s.company}` : s.topic;
                    const pid = s.mentor ? profileIds[s.mentor] : undefined;
                    const inner = (
                      <>
                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${
                            TRACK_STYLE[s.track] ?? "bg-ink/5 text-ink-soft border-ink-line"
                          }`}
                        >
                          {s.track}
                        </span>
                        <span className="truncate">{label}</span>
                        {!s.confirmed && (
                          <span className="shrink-0 text-[10px] font-semibold text-amber-600">변동</span>
                        )}
                      </>
                    );
                    const base = `flex items-center gap-2 rounded-md px-1.5 py-1 text-sm ${
                      s.confirmed ? "text-ink-soft" : "text-ink-muted border border-dashed border-ink-line"
                    }`;
                    return (
                      <li key={`${s.topic}-${s.company}`}>
                        {pid ? (
                          <Link href={`/mentors/${pid}`} className={`${base} transition hover:bg-cream-100`}>
                            {inner}
                          </Link>
                        ) : (
                          <div className={base}>{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <Link
                  href={`/talk-concert/zoom/${day.date}`}
                  className="mt-3 block text-right text-xs font-semibold text-brand-500 hover:underline"
                >
                  Zoom 접속 안내 →
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Zoom 참여 안내 */}
      <section className="mt-12 rounded-2xl border border-ink-line bg-cream-100 p-6 sm:p-8">
        <h3 className="text-lg font-extrabold">Zoom 참여 안내</h3>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">
          해당 날짜 카드를 누르면 Zoom 링크·회의 ID·암호와 참여 방법이 안내됩니다. 원활한 진행을 위해
          아래를 지켜주세요.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          <li className="rounded-lg bg-white p-3 text-sm text-ink-soft">🎥 <b>화면 ON</b> — 비디오를 켜고 참여</li>
          <li className="rounded-lg bg-white p-3 text-sm text-ink-soft">🏷️ <b>대화명</b> — «학교 + 이름» (예: 부산대 홍길동)</li>
          <li className="rounded-lg bg-white p-3 text-sm text-ink-soft">💬 <b>질문</b> — 채팅창으로 남기기</li>
        </ul>
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
