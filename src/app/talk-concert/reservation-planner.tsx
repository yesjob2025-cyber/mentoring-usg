"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { reserveSlotAction, cancelSlotAction } from "@/app/actions/talk";
import { slotLabel, TALK_MAX_PER_DAY } from "@/lib/talk-config";

export interface Mentoring {
  track: string;
  topic: string;
}
export interface ScheduleDay {
  date: string;
  weekday: string;
  mentorings: Mentoring[];
}
export interface Resv {
  id: string;
  date: string;
  time: string;
  track: string;
  topic: string;
}

const TRACK_STYLE: Record<string, string> = {
  IT분야: "border-blue-200 bg-blue-50 text-blue-700",
  공학: "border-emerald-200 bg-emerald-50 text-emerald-700",
  인문상경: "border-brand-200 bg-brand-50 text-brand-500",
  보건복지: "border-purple-200 bg-purple-50 text-purple-700",
  공공: "border-ink-line bg-ink/5 text-ink-soft",
};

export function ReservationPlanner({
  schedule,
  timeSlots,
  reservations,
  isLoggedIn,
}: {
  schedule: ScheduleDay[];
  timeSlots: string[];
  reservations: Resv[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(schedule[0]?.date ?? "");
  const [pickTrack, setPickTrack] = useState<Mentoring | null>(null);
  const [pickTime, setPickTime] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const day = schedule.find((d) => d.date === date);
  const dayResv = useMemo(
    () => reservations.filter((r) => r.date === date).sort((a, b) => a.time.localeCompare(b.time)),
    [reservations, date]
  );
  const takenTimes = new Set(dayResv.map((r) => r.time));
  const reservedKey = new Set(dayResv.map((r) => `${r.track}|${r.topic}`));
  const dayFull = dayResv.length >= TALK_MAX_PER_DAY;
  const zoomGuideHref = `/talk-concert/zoom/${date}`;

  function reset() {
    setPickTrack(null);
    setPickTime("");
  }

  function confirm() {
    if (!pickTrack || !pickTime) return;
    setErr(null);
    startTransition(async () => {
      const res = await reserveSlotAction({
        date,
        time: pickTime,
        track: pickTrack.track,
        topic: pickTrack.topic,
      });
      if (res.error) setErr(res.error);
      else {
        reset();
        router.refresh();
      }
    });
  }

  function cancel(id: string) {
    setErr(null);
    startTransition(async () => {
      const res = await cancelSlotAction(id);
      if (res.error) setErr(res.error);
      else router.refresh();
    });
  }

  if (!isLoggedIn) {
    return (
      <div className="card p-6 text-center">
        <p className="text-ink-soft">토크콘서트 예약은 학생 로그인 후 이용할 수 있습니다.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/login" className="btn-brand">로그인</Link>
          <Link href="/signup" className="btn-outline">회원가입</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* 단계 안내 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink-line bg-cream-100 px-5 py-3 text-sm font-semibold">
        <span className="text-ink-soft"><b className="text-brand-500">①</b> 날짜</span>
        <span className="text-ink-muted">›</span>
        <span className="text-ink-soft"><b className="text-brand-500">②</b> 희망 멘토링</span>
        <span className="text-ink-muted">›</span>
        <span className="text-ink-soft"><b className="text-brand-500">③</b> 시간</span>
        <span className="ml-auto text-xs font-normal text-ink-muted">
          시간대 중복 불가 · 하루 최대 {TALK_MAX_PER_DAY}개 · 1시간 단위
        </span>
      </div>

      <div className="p-5">
        {/* ① 날짜 */}
        <p className="field-label">① 날짜 선택</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {schedule.map((d) => {
            const cnt = reservations.filter((r) => r.date === d.date).length;
            const active = d.date === date;
            return (
              <button
                key={d.date}
                onClick={() => {
                  setDate(d.date);
                  reset();
                  setErr(null);
                }}
                className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                  active
                    ? "border-ink bg-ink text-cream-50"
                    : "border-ink-line bg-white text-ink-soft hover:border-brand-300"
                }`}
              >
                {d.date.slice(5).replace("-", ".")}
                <span className={`ml-1 text-xs font-medium ${active ? "text-cream-200/80" : "text-ink-muted"}`}>
                  ({d.weekday})
                </span>
                {cnt > 0 && (
                  <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 내 예약 현황 (선택 날짜) */}
        <div className="mt-5 rounded-xl border border-ink-line bg-cream-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">
              {date.slice(5).replace("-", ".")} 내 예약{" "}
              <span className="text-brand-500">{dayResv.length}</span>
              <span className="text-ink-muted">/{TALK_MAX_PER_DAY}</span>
            </p>
            {dayResv.length > 0 && (
              <Link
                href={zoomGuideHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2D8CFF] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2478e0]"
              >
                🎥 Zoom 접속 안내
              </Link>
            )}
          </div>
          {dayResv.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">아직 예약이 없습니다. 아래에서 희망 멘토링과 시간을 선택하세요.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dayResv.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                  <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-bold text-cream-50">
                    {slotLabel(r.time)}
                  </span>
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${
                      TRACK_STYLE[r.track] ?? "border-ink-line bg-ink/5 text-ink-soft"
                    }`}
                  >
                    {r.track}
                  </span>
                  <span className="truncate text-ink-soft">{r.topic}</span>
                  <Link
                    href={zoomGuideHref}
                    className="ml-auto shrink-0 rounded-full bg-[#2D8CFF] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#2478e0]"
                  >
                    🎥 접속
                  </Link>
                  <button
                    onClick={() => cancel(r.id)}
                    disabled={pending}
                    className="shrink-0 text-xs text-ink-muted underline hover:text-red-600"
                  >
                    취소
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {dayFull ? (
          <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            이 날짜는 최대 {TALK_MAX_PER_DAY}개 예약을 모두 사용했습니다. 다른 날짜를 선택하거나 예약을 취소하세요.
          </p>
        ) : (
          <>
            {/* ② 희망 멘토링 */}
            <p className="field-label mt-6">② 희망 멘토링 선택</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {day?.mentorings.map((m) => {
                const already = reservedKey.has(`${m.track}|${m.topic}`);
                const active = pickTrack?.track === m.track && pickTrack?.topic === m.topic;
                return (
                  <button
                    key={`${m.track}-${m.topic}`}
                    disabled={already}
                    onClick={() => {
                      setPickTrack(m);
                      setPickTime("");
                      setErr(null);
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      already
                        ? "cursor-not-allowed border-ink-line bg-cream-100 opacity-60"
                        : active
                          ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
                          : "border-ink-line bg-white hover:border-brand-300"
                    }`}
                  >
                    <span
                      className={`inline-block rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${
                        TRACK_STYLE[m.track] ?? "border-ink-line bg-ink/5 text-ink-soft"
                      }`}
                    >
                      {m.track}
                    </span>
                    <p className="mt-1.5 text-sm font-bold text-ink">{m.topic}</p>
                    {already && <p className="mt-0.5 text-[11px] font-semibold text-brand-500">예약됨</p>}
                  </button>
                );
              })}
            </div>

            {/* ③ 시간 */}
            <p className="field-label mt-6">③ 시간 선택 <span className="text-ink-muted">(1시간 단위)</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {timeSlots.map((t) => {
                const taken = takenTimes.has(t);
                const active = pickTime === t;
                return (
                  <button
                    key={t}
                    disabled={taken || !pickTrack}
                    onClick={() => setPickTime(t)}
                    title={taken ? "이미 예약한 시간대입니다" : undefined}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                      taken
                        ? "cursor-not-allowed border-ink-line bg-cream-100 text-ink-muted line-through"
                        : active
                          ? "border-brand-400 bg-brand-500 text-white"
                          : !pickTrack
                            ? "cursor-not-allowed border-ink-line bg-white text-ink-muted opacity-60"
                            : "border-ink-line bg-white text-ink-soft hover:border-brand-300"
                    }`}
                  >
                    {slotLabel(t)}
                    {taken && <span className="ml-1 text-[11px]">예약됨</span>}
                  </button>
                );
              })}
            </div>

            {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

            <button
              onClick={confirm}
              disabled={pending || !pickTrack || !pickTime}
              className="btn-brand mt-5 w-full sm:w-auto"
            >
              {pending
                ? "예약 중…"
                : pickTrack && pickTime
                  ? `${slotLabel(pickTime)} · ${pickTrack.track} 예약하기`
                  : "희망 멘토링과 시간을 선택하세요"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
