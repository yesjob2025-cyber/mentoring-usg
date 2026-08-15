import type { Metadata } from "next";
import { PageHero } from "@/components/festival/page-hero";
import { FestLink } from "@/components/festival/fest-link";
import { FEST, ZONES } from "@/lib/festival/config";
import { listCompanies, listEvents, listJobs, listPromos } from "@/lib/festival/repo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "행사안내",
  description: "2026 김해 JOB FESTIVAL 행사 개요, 운영 시간표, 행사장 구성 안내",
};

const TIMETABLE = [
  { time: "10:00", title: "행사장 개장 · 입장 체크 시작", note: "종합안내부스에서 현장 등록 가능" },
  { time: "10:30", title: "전 부스 운영 시작", note: "기업관 · 직무관 · 홍보관 · 부대행사" },
  { time: "11:00", title: "취업 특강 1부 — 지역 기업이 원하는 인재", note: "메인 스테이지" },
  { time: "11:00", title: "기업관 현장 면접 시작", note: "사전 예약자 우선 (30분 단위)" },
  { time: "12:00", title: "청년 문화 공연 · 버스킹", note: "메인 스테이지 (점심시간 운영)" },
  { time: "13:00", title: "오후 프로그램 재개 · 면접 2부", note: "13:00~16:30" },
  { time: "15:00", title: "취업 특강 2부", note: "메인 스테이지" },
  { time: "16:30", title: "스탬프 적립 마감", note: "완주 코드 발급 마감" },
  { time: "16:40", title: "경품 추첨 · 시상", note: "메인 스테이지" },
  { time: "17:00", title: "행사 종료 · 퇴장 체크", note: "만족도 설문 참여" },
];

export default async function AboutPage() {
  const [companies, jobs, promos, events] = await Promise.all([
    listCompanies(),
    listJobs(),
    listPromos(),
    listEvents(),
  ]);
  const counts: Record<string, number> = {
    company: companies.length,
    job: jobs.length,
    promo: promos.length,
    side: events.length,
  };

  return (
    <>
      <PageHero
        eyebrow="About"
        title={FEST.title}
        description={FEST.tagline}
      >
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <dt className="text-xs text-white/55">일시</dt>
            <dd className="mt-1 text-lg font-black">{FEST.dateLabel}</dd>
            <dd className="text-sm text-fest-lime">{FEST.timeLabel}</dd>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <dt className="text-xs text-white/55">장소</dt>
            <dd className="mt-1 text-lg font-black">{FEST.venue}</dd>
            <dd className="text-sm text-white/60">{FEST.venueDetail}</dd>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <dt className="text-xs text-white/55">참가 대상</dt>
            <dd className="mt-1 text-lg font-black">누구나 (무료)</dd>
            <dd className="text-sm text-white/60">대학생 · 구직자 · 재직자 · 시민</dd>
          </div>
        </dl>
      </PageHero>

      <div className="fest-container space-y-16 py-12 sm:py-16">
        <section>
          <p className="fest-eyebrow">Overview</p>
          <h2 className="fest-section-title mt-2">행사 개요</h2>
          <div className="fest-card mt-6 overflow-hidden">
            <dl className="divide-y divide-fest-line text-sm">
              {[
                { k: "사업명", v: FEST.title },
                { k: "일시", v: `${FEST.dateLabel} ${FEST.timeLabel}` },
                { k: "장소", v: FEST.venueDetail },
                { k: "구성", v: ZONES.map((z) => z.name).join(" / ") },
                { k: "주최", v: FEST.host.join(", ") },
                { k: "주관", v: FEST.organizers.join(", ") },
                { k: "참가비", v: "무료 (사전등록 권장)" },
                { k: "문의", v: `${FEST.contact.phone} · ${FEST.contact.email}` },
              ].map((row) => (
                <div key={row.k} className="grid grid-cols-[100px_1fr] gap-4 px-5 py-4 sm:px-6">
                  <dt className="font-bold text-fest-muted">{row.k}</dt>
                  <dd className="font-semibold text-fest-ink">{row.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section>
          <p className="fest-eyebrow">Zones</p>
          <h2 className="fest-section-title mt-2">행사장 구성</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {ZONES.map((zone) => (
              <FestLink key={zone.key} href={zone.href} className="fest-card-hover p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-fest-navy">{zone.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-fest-blue">{zone.summary}</p>
                    <p className="mt-2 text-sm text-fest-muted">{zone.detail}</p>
                  </div>
                  <span className="shrink-0 rounded-xl bg-fest-bg px-3 py-2 text-center">
                    <span className="block text-lg font-black text-fest-navy">
                      {counts[zone.key]}
                    </span>
                    <span className="block text-[10px] font-bold text-fest-muted">부스</span>
                  </span>
                </div>
              </FestLink>
            ))}
          </div>
        </section>

        <section>
          <p className="fest-eyebrow">Timetable</p>
          <h2 className="fest-section-title mt-2">당일 운영 시간표</h2>
          <p className="mt-2 text-sm text-fest-muted">세부 일정은 현장 사정에 따라 조정될 수 있습니다.</p>
          <ol className="mt-6 space-y-2">
            {TIMETABLE.map((row, i) => (
              <li
                key={`${row.time}-${i}`}
                className="fest-card flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-4"
              >
                <span className="w-16 shrink-0 text-sm font-black text-fest-blue">{row.time}</span>
                <span className="flex-1 text-sm font-extrabold text-fest-navy">{row.title}</span>
                <span className="text-xs text-fest-muted">{row.note}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="fest-card p-6 text-center sm:p-10">
          <h2 className="text-2xl font-black text-fest-navy">지금 사전등록하세요</h2>
          <p className="mt-2 text-sm text-fest-muted">
            1분이면 끝나는 등록으로 입장 QR·사전 매칭·면접 우선 배정까지 받을 수 있습니다.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <FestLink href="/register" className="fest-btn-primary">
              사전등록 하기
            </FestLink>
            <FestLink href="/guide" className="fest-btn-outline">
              참여방법 보기
            </FestLink>
          </div>
        </section>
      </div>
    </>
  );
}
