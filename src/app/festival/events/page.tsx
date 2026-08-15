import type { Metadata } from "next";
import { PageHero } from "@/components/festival/page-hero";
import { FestLink } from "@/components/festival/fest-link";
import { listEvents } from "@/lib/festival/repo";
import { FEST, STAMP_REWARD } from "@/lib/festival/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "부대행사",
  description: "이력서 사진, 컨설팅, AI 모의면접, 특강, 스탬프 이벤트 등 부대행사 전체 프로그램",
};

const CATEGORY_STYLE: Record<string, string> = {
  체험: "border-fest-blue/25 bg-fest-sky text-fest-blue",
  컨설팅: "border-fest-violet/25 bg-violet-50 text-fest-violet",
  상담: "border-fest-emerald/25 bg-emerald-50 text-fest-emerald",
  특강: "border-amber-300/40 bg-amber-50 text-[#B77400]",
  이벤트: "border-fest-coral/25 bg-red-50 text-fest-coral",
  공연: "border-fest-line bg-fest-bg text-fest-muted",
};

export default async function EventsPage() {
  const events = await listEvents();
  const reserveCount = events.filter((e) => e.needReserve).length;

  return (
    <>
      <PageHero
        eyebrow="Zone D · 부대행사"
        title="부대행사 전체보기"
        description="이력서 사진부터 AI 모의면접, 취업 특강까지. 취업 준비에 바로 쓰이는 프로그램을 무료로 운영합니다."
      >
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-white/50">프로그램</dt>
            <dd className="mt-0.5 text-xl font-black">{events.length}개</dd>
          </div>
          <div>
            <dt className="text-white/50">사전 예약 권장</dt>
            <dd className="mt-0.5 text-xl font-black">{reserveCount}개</dd>
          </div>
          <div>
            <dt className="text-white/50">운영 시간</dt>
            <dd className="mt-0.5 text-xl font-black">{FEST.timeLabel}</dd>
          </div>
        </dl>
      </PageHero>

      <div className="fest-container py-10 sm:py-14">
        <div className="rounded-2xl border border-fest-blue/20 bg-fest-sky p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <p className="text-sm font-bold text-fest-navy">
            <span className="text-fest-blue">스탬프 이벤트</span> · {STAMP_REWARD}
          </p>
          <FestLink href="/guide" className="fest-btn-primary fest-btn-sm mt-3 shrink-0 sm:mt-0">
            참여방법 보기
          </FestLink>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="fest-card flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`fest-chip ${CATEGORY_STYLE[event.category] ?? "border-fest-line"}`}
                  >
                    {event.category}
                  </span>
                  <h2 className="mt-2.5 text-lg font-extrabold text-fest-navy">{event.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-fest-blue">{event.summary}</p>
                </div>
                <span className="fest-chip shrink-0">{event.boothNo}</span>
              </div>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-fest-ink/85">
                {event.description}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-fest-bg px-3.5 py-2.5">
                  <dt className="text-xs text-fest-muted">운영 시간</dt>
                  <dd className="mt-0.5 font-bold">{event.timeSlots.join(" / ")}</dd>
                </div>
                <div className="rounded-xl bg-fest-bg px-3.5 py-2.5">
                  <dt className="text-xs text-fest-muted">장소</dt>
                  <dd className="mt-0.5 font-bold">{event.place}</dd>
                </div>
                <div className="rounded-xl bg-fest-bg px-3.5 py-2.5">
                  <dt className="text-xs text-fest-muted">정원</dt>
                  <dd className="mt-0.5 font-bold">
                    {event.capacity > 0 ? `${event.capacity}명` : "제한 없음"}
                  </dd>
                </div>
                <div className="rounded-xl bg-fest-bg px-3.5 py-2.5">
                  <dt className="text-xs text-fest-muted">예약</dt>
                  <dd className="mt-0.5 font-bold">
                    {event.needReserve ? "사전등록자 우선" : "현장 참여"}
                  </dd>
                </div>
              </dl>

              {event.notes.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {event.notes.map((n) => (
                    <li key={n} className="fest-chip">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
