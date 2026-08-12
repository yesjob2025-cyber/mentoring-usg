import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  TALK_SCHEDULE,
  zoomFor,
  weekday,
  CONCERT_TIME,
  JOIN_RULES,
} from "@/lib/talk-schedule";

export const metadata: Metadata = { title: "토크콘서트 화상 접속 안내" };

const TRACK_STYLE: Record<string, string> = {
  IT분야: "bg-blue-50 text-blue-700 border-blue-200",
  공학: "bg-emerald-50 text-emerald-700 border-emerald-200",
  인문상경: "bg-brand-50 text-brand-500 border-brand-200",
  기타: "bg-purple-50 text-purple-700 border-purple-200",
  공공: "bg-ink/5 text-ink-soft border-ink-line",
};

export default async function ZoomGuidePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const day = TALK_SCHEDULE.find((d) => d.date === date);
  if (!day) notFound();

  const zoom = zoomFor(date);
  const ready = Boolean(zoom?.link);
  const md = date.slice(5).replace("-", "월 ") + "일";

  return (
    <div className="container-page max-w-2xl py-10">
      <Link href="/talk-concert" className="text-sm text-ink-muted hover:text-ink-soft">
        ← 토크콘서트 일정으로
      </Link>

      <div className="mt-4 card overflow-hidden">
        {/* 헤더 */}
        <div className="bg-ink px-6 py-8 text-cream-50">
          <span className="chip border-cream-200/30 bg-white/10 text-brand-300">온라인 토크콘서트</span>
          <h1 className="mt-3 text-2xl font-black">
            {md} ({weekday(date)}) 화상 접속
          </h1>
          <p className="mt-1 text-cream-200/80">{CONCERT_TIME} · 5개 계열 동시 진행</p>
        </div>

        <div className="p-6">
          {/* 오늘의 분야 */}
          <p className="field-label">이 날의 분야</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {day.slots.map((s) => (
              <span
                key={`${s.topic}-${s.company}`}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                  TRACK_STYLE[s.track] ?? "border-ink-line bg-ink/5 text-ink-soft"
                }`}
              >
                {s.topic}
                {s.company && <span className="font-medium opacity-70"> · {s.company}</span>}
              </span>
            ))}
          </div>

          {/* Zoom 접속 */}
          <div className="mt-6 rounded-xl border border-ink-line bg-cream-100 p-5">
            {ready ? (
              <>
                <a
                  href={zoom!.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2D8CFF] px-4 py-3.5 text-base font-bold text-white transition hover:bg-[#2478e0]"
                >
                  🎥 ZOOM 화상 교육장 접속하기
                </a>
                <dl className="mt-4 space-y-2 text-sm">
                  <InfoRow label="회의 ID" value={zoom!.id || "—"} mono />
                  <InfoRow label="암호(PW)" value={zoom!.pw || "—"} mono />
                  {zoom!.host && <InfoRow label="안내 멘토" value={zoom!.host} />}
                </dl>
              </>
            ) : (
              <div className="text-center">
                <p className="font-bold text-ink-soft">Zoom 링크 준비 중</p>
                <p className="mt-1 text-sm text-ink-muted">접속 정보가 곧 등록됩니다. 조금만 기다려 주세요.</p>
              </div>
            )}
          </div>

          {/* 참여 안내 */}
          <div className="mt-6">
            <p className="field-label">참여 안내 (꼭 지켜주세요)</p>
            <ul className="mt-2 space-y-2">
              {JOIN_RULES.map((r, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-white p-3 text-sm text-ink-soft">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-center text-xs text-ink-muted">
            문의: 이메일 yes1@yesjob.kr
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink-line/60 pt-2 first:border-0 first:pt-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`font-bold ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
