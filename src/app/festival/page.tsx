import { FestLink } from "@/components/festival/fest-link";
import { FEST, ZONES, COURSES, STAMP_REWARD } from "@/lib/festival/config";
import { listCompanies, listEvents, listJobs, listPromos } from "@/lib/festival/repo";

export const dynamic = "force-dynamic";

const ZONE_STYLE: Record<string, { badge: string; bar: string }> = {
  company: { badge: "bg-fest-sky text-fest-blue", bar: "bg-fest-blue" },
  job: { badge: "bg-violet-50 text-fest-violet", bar: "bg-fest-violet" },
  promo: { badge: "bg-emerald-50 text-fest-emerald", bar: "bg-fest-emerald" },
  side: { badge: "bg-amber-50 text-[#B77400]", bar: "bg-fest-amber" },
};

export default async function FestivalHome() {
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
  const hiring = companies.reduce(
    (sum, c) => sum + c.positions.reduce((s, p) => s + p.headcount, 0),
    0
  );

  return (
    <>
      {/* ── 히어로 ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-fest-navy text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-fest-blue/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-fest-violet/25 blur-3xl"
        />
        <div className="fest-container relative py-16 sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-fest-lime" />
            {FEST.hostLine}
          </span>

          <h1 className="mt-6 text-4xl font-black leading-[1.12] tracking-tight sm:text-6xl">
            2026 김해
            <br />
            <span className="bg-gradient-to-r from-fest-lime via-fest-blue2 to-white bg-clip-text text-transparent">
              JOB FESTIVAL
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">{FEST.tagline}</p>

          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-white/50">일시</dt>
              <dd className="mt-1 text-lg font-extrabold">
                {FEST.dateLabel} <span className="text-fest-lime">{FEST.timeLabel}</span>
              </dd>
            </div>
            <div>
              <dt className="text-white/50">장소</dt>
              <dd className="mt-1 text-lg font-extrabold">{FEST.venue}</dd>
            </div>
            <div>
              <dt className="text-white/50">참가비</dt>
              <dd className="mt-1 text-lg font-extrabold">무료 (사전등록 권장)</dd>
            </div>
          </dl>

          <div className="mt-9 flex flex-wrap gap-3">
            <FestLink href="/register" className="fest-btn bg-fest-lime text-fest-navy hover:bg-[#a5dd3d]">
              사전등록하고 입장 QR 받기
            </FestLink>
            <FestLink
              href="/guide"
              className="fest-btn border border-white/30 bg-white/5 text-white hover:bg-white/15"
            >
              참여방법 안내
            </FestLink>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "참가기업", value: `${companies.length}개사` },
              { label: "채용 예정", value: `${hiring}명` },
              { label: "직무 부스", value: `${jobs.length}개` },
              { label: "부대 프로그램", value: `${events.length}개` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs text-white/55">{s.label}</p>
                <p className="mt-1 text-2xl font-black">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4개 관 구성 ──────────────────────────────────── */}
      <section className="fest-container py-16 sm:py-20">
        <p className="fest-eyebrow">Zones</p>
        <h2 className="fest-section-title mt-2">4개 관, 하루 만에 끝내는 취업 준비</h2>
        <p className="mt-3 max-w-2xl text-sm text-fest-muted sm:text-base">
          기업관에서 실제 채용까지, 직무관에서 진로 방향까지. 관심사에 따라 코스를 골라
          움직이면 됩니다.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ZONES.map((zone) => {
            const style = ZONE_STYLE[zone.key];
            return (
              <FestLink
                key={zone.key}
                href={zone.href}
                className="fest-card-hover group relative overflow-hidden p-6"
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${style.bar}`} />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`fest-chip ${style.badge} border-transparent`}>
                      {zone.name}
                    </span>
                    <h3 className="mt-3 text-xl font-extrabold text-fest-navy">{zone.summary}</h3>
                    <p className="mt-2 text-sm text-fest-muted">{zone.detail}</p>
                  </div>
                  <span className="shrink-0 rounded-xl bg-fest-bg px-3 py-2 text-center">
                    <span className="block text-lg font-black text-fest-navy">
                      {counts[zone.key]}
                    </span>
                    <span className="block text-[10px] font-bold text-fest-muted">부스</span>
                  </span>
                </div>
                <p className="mt-5 text-sm font-bold text-fest-blue group-hover:underline">
                  전체 보기 →
                </p>
              </FestLink>
            );
          })}
        </div>
      </section>

      {/* ── 참여 코스 ────────────────────────────────────── */}
      <section className="border-y border-fest-line bg-white py-16 sm:py-20">
        <div className="fest-container">
          <p className="fest-eyebrow">Course</p>
          <h2 className="fest-section-title mt-2">나에게 맞는 코스를 고르세요</h2>
          <p className="mt-3 text-sm text-fest-muted sm:text-base">
            사전등록에서 코스를 선택하면, 입장 시 코스에 맞는 부스를 자동으로 추천해 드립니다.
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {COURSES.map((course) => (
              <div key={course.key} className="fest-card p-6">
                <div className="flex items-center gap-3">
                  <span
                    className={`fest-chip border-transparent ${
                      course.key === "job"
                        ? "bg-fest-sky text-fest-blue"
                        : "bg-violet-50 text-fest-violet"
                    }`}
                  >
                    {course.name}
                  </span>
                  <span className="text-sm font-bold text-fest-muted">{course.subtitle}</span>
                </div>
                <p className="mt-4 text-sm font-bold text-fest-ink">추천 대상 · {course.target}</p>
                <ol className="mt-4 space-y-2.5">
                  {course.steps.map((step, i) => (
                    <li key={step} className="flex gap-3 text-sm text-fest-ink/90">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${
                          course.key === "job" ? "bg-fest-blue" : "bg-fest-violet"
                        }`}
                      >
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <p className="mt-5 rounded-xl bg-fest-bg px-4 py-3 text-sm font-bold text-fest-navy">
                  혜택 · {course.benefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 현장 이용 흐름 ───────────────────────────────── */}
      <section className="fest-container py-16 sm:py-20">
        <p className="fest-eyebrow">How it works</p>
        <h2 className="fest-section-title mt-2">QR 하나로 입장부터 스탬프까지</h2>

        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "사전등록 · QR 발급",
              d: "이름·연락처와 관심 직무를 입력하면 입장 QR이 즉시 발급됩니다.",
            },
            {
              n: "02",
              t: "현장 입장 체크",
              d: "입구에서 QR을 보여주면 입장이 기록되고 맞춤 부스가 자동 추천됩니다.",
            },
            {
              n: "03",
              t: "부스별 참여 체크",
              d: "부스에서 QR을 찍을 때마다 참여가 기록되고 스탬프가 쌓입니다.",
            },
            {
              n: "04",
              t: "입사지원 · 면접",
              d: "기업관에서 온라인 지원서를 내고 현장 면접 시간을 직접 선택합니다.",
            },
            {
              n: "05",
              t: "스탬프 완주",
              d: "4개 관을 모두 참여하면 완주 코드가 발급되어 경품에 응모할 수 있습니다.",
            },
            {
              n: "06",
              t: "만족도 · 마무리",
              d: "설문을 제출하면 참여 이력과 지원 현황이 마이페이지에 정리됩니다.",
            },
          ].map((step) => (
            <li key={step.n} className="fest-card p-5">
              <span className="text-xs font-black tracking-widest text-fest-blue">{step.n}</span>
              <h3 className="mt-2 text-base font-extrabold text-fest-navy">{step.t}</h3>
              <p className="mt-1.5 text-sm text-fest-muted">{step.d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-fest-blue/20 bg-fest-sky p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-sm font-black text-fest-blue">스탬프 이벤트</p>
            <p className="mt-1.5 text-sm font-semibold text-fest-navy">{STAMP_REWARD}</p>
          </div>
          <FestLink href="/guide" className="fest-btn-primary fest-btn-sm mt-4 sm:mt-0">
            이벤트 자세히 보기
          </FestLink>
        </div>
      </section>

      {/* ── 주요 기업 미리보기 ───────────────────────────── */}
      <section className="border-t border-fest-line bg-white py-16 sm:py-20">
        <div className="fest-container">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="fest-eyebrow">Companies</p>
              <h2 className="fest-section-title mt-2">이런 기업이 기다립니다</h2>
            </div>
            <FestLink href="/companies" className="fest-btn-outline fest-btn-sm shrink-0">
              기업관 전체보기
            </FestLink>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.slice(0, 6).map((company) => (
              <FestLink
                key={company.id}
                href={`/companies/${company.id}`}
                className="fest-card-hover p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fest-navy text-xs font-black text-white">
                    {company.logoText}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-fest-navy">
                      {company.name}
                    </p>
                    <p className="text-xs text-fest-muted">
                      {company.industry} · {company.scale}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-fest-ink/80">{company.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {company.positions.slice(0, 3).map((p) => (
                    <span key={p.id} className="fest-chip">
                      {p.title} {p.headcount}명
                    </span>
                  ))}
                </div>
              </FestLink>
            ))}
          </div>
        </div>
      </section>

      {/* ── 주최/주관 ────────────────────────────────────── */}
      <section className="fest-container py-16">
        <div className="fest-card px-6 py-8 text-center">
          <p className="fest-eyebrow">Hosted by</p>
          <p className="mt-3 text-lg font-extrabold text-fest-navy">{FEST.host.join(" · ")}</p>
          <p className="mt-1 text-sm text-fest-muted">주관 · {FEST.organizers.join(" · ")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[...FEST.host, ...FEST.organizers].map((org) => (
              <span key={org} className="fest-chip">
                {org}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <FestLink href="/register" className="fest-btn-primary">
              사전등록 바로가기
            </FestLink>
            <FestLink href="/about" className="fest-btn-outline">
              행사 안내 보기
            </FestLink>
          </div>
        </div>
      </section>
    </>
  );
}
