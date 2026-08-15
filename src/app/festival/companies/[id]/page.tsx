import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FestLink } from "@/components/festival/fest-link";
import {
  getCompany,
  listApplications,
  listJobs,
  listCompanies,
  slotAvailability,
} from "@/lib/festival/repo";
import { getPassSession } from "@/lib/festival/session";
import { FEST } from "@/lib/festival/config";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  submitted: "접수완료",
  reviewing: "서류검토중",
  interview: "면접확정",
  done: "면접완료",
  passed: "합격",
  rejected: "불합격",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompany(id);
  return {
    title: company ? `${company.name} | 기업관` : "기업관",
    description: company?.summary,
  };
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const [jobs, slots, pass, allCompanies] = await Promise.all([
    listJobs(),
    slotAvailability(company.id),
    getPassSession(),
    listCompanies(),
  ]);
  const myApps = pass?.vid ? await listApplications(pass.vid) : [];
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const related = allCompanies.filter(
    (c) => c.id !== company.id && c.industry === company.industry
  );
  const totalHiring = company.positions.reduce((s, p) => s + p.headcount, 0);
  const openSlots = slots.filter((s) => s.remaining > 0).length;

  return (
    <>
      <section className="border-b border-fest-line bg-fest-navy text-white">
        <div className="fest-container py-12 sm:py-14">
          <FestLink href="/companies" className="text-sm font-bold text-white/60 hover:text-white">
            ← 기업관 전체보기
          </FestLink>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-base font-black">
                {company.logoText}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="fest-chip border-transparent bg-white/15 text-white">
                    부스 {company.boothNo}
                  </span>
                  <span className="fest-chip border-transparent bg-white/15 text-white">
                    {company.industry}
                  </span>
                  <span className="fest-chip border-transparent bg-white/15 text-white">
                    {company.scale}
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  {company.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-white/75">{company.summary}</p>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm">
              <p className="text-white/55">채용 예정</p>
              <p className="mt-0.5 text-2xl font-black">{totalHiring}명</p>
              <p className="mt-3 text-white/55">현장 면접</p>
              <p className="mt-0.5 font-bold">
                {company.onSiteInterview ? `잔여 ${openSlots}개 시간` : "미운영 (상담만)"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="fest-container grid gap-8 py-10 lg:grid-cols-[1.7fr_1fr] sm:py-14">
        <div className="space-y-8">
          {/* 기업 소개 */}
          <section className="fest-card p-6">
            <h2 className="text-lg font-extrabold text-fest-navy">기업 소개</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fest-ink/85">
              {company.description}
            </p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold text-fest-muted">주요 제품 · 서비스</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {company.products.map((p) => (
                    <span key={p} className="fest-chip">
                      {p}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-fest-muted">복리후생</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {company.welfare.map((w) => (
                    <span key={w} className="fest-chip">
                      {w}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-fest-muted">소재지</dt>
                <dd className="mt-1 text-sm font-semibold">{company.location}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-fest-muted">기업 규모</dt>
                <dd className="mt-1 text-sm font-semibold">
                  {company.scale} · {company.employees}
                </dd>
              </div>
            </dl>
          </section>

          {/* 모집 직무 */}
          <section>
            <h2 className="text-lg font-extrabold text-fest-navy">
              모집 직무 <span className="text-fest-blue">{company.positions.length}</span>
            </h2>
            <div className="mt-4 space-y-4">
              {company.positions.map((position) => {
                const applied = myApps.find(
                  (a) => a.companyId === company.id && a.positionId === position.id
                );
                const job = jobById.get(position.jobCategory);
                return (
                  <div key={position.id} className="fest-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-extrabold text-fest-navy">
                          {position.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="fest-chip-blue">{position.employmentType}</span>
                          <span className="fest-chip">{position.experience}</span>
                          <span className="fest-chip">{position.headcount}명</span>
                          {position.salary && <span className="fest-chip">{position.salary}</span>}
                        </div>
                      </div>
                      {applied ? (
                        <span className="fest-chip border-fest-emerald/30 bg-emerald-50 text-fest-emerald">
                          {STATUS_LABEL[applied.status] ?? applied.status}
                        </span>
                      ) : (
                        <FestLink
                          href={`/companies/${company.id}/apply?position=${position.id}`}
                          className="fest-btn-primary fest-btn-sm"
                        >
                          입사지원
                        </FestLink>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold text-fest-muted">자격 요건</p>
                        <ul className="mt-1.5 space-y-1 text-sm text-fest-ink/85">
                          {position.requirements.map((r) => (
                            <li key={r}>· {r}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-fest-muted">우대 사항</p>
                        <ul className="mt-1.5 space-y-1 text-sm text-fest-ink/85">
                          {position.preferred.map((r) => (
                            <li key={r}>· {r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {job && (
                      <FestLink
                        href={`/jobs/${job.id}`}
                        className="mt-4 inline-block text-sm font-bold text-fest-blue hover:underline"
                      >
                        직무관에서 &lsquo;{job.name}&rsquo; 자세히 보기 →
                      </FestLink>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 현장 면접 일정 */}
          {company.onSiteInterview && (
            <section className="fest-card p-6">
              <h2 className="text-lg font-extrabold text-fest-navy">현장 면접 시간표</h2>
              <p className="mt-2 text-sm text-fest-muted">
                입사지원서를 제출하면 아래 시간 중 하나를 선택해 면접을 확정할 수 있습니다.
                (행사 당일 {FEST.dateLabel})
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {slots.map((slot) => (
                  <li
                    key={slot.id}
                    className={`rounded-xl border px-3 py-2.5 text-center text-sm font-bold ${
                      slot.remaining > 0
                        ? "border-fest-blue/25 bg-fest-sky text-fest-blue"
                        : "border-fest-line bg-fest-bg text-fest-muted line-through"
                    }`}
                  >
                    {slot.time}
                    <span className="mt-0.5 block text-[10px] font-semibold">
                      {slot.remaining > 0 ? `${slot.remaining}석` : "마감"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* 사이드 */}
        <aside className="space-y-5">
          <div className="fest-card sticky top-20 p-5">
            <p className="text-sm font-extrabold text-fest-navy">현장 방문 안내</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-fest-muted">부스 위치</dt>
                <dd className="font-bold">기업관 {company.boothNo}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fest-muted">운영 시간</dt>
                <dd className="font-bold">{FEST.timeLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fest-muted">현장 면접</dt>
                <dd className="font-bold">{company.onSiteInterview ? "운영" : "미운영"}</dd>
              </div>
            </dl>

            {company.homepage && (
              <a
                href={company.homepage}
                target="_blank"
                rel="noreferrer"
                className="fest-btn-outline fest-btn-sm mt-4 w-full"
              >
                기업 홈페이지
              </a>
            )}
            <FestLink
              href={`/companies/${company.id}/apply`}
              className="fest-btn-primary mt-2 w-full"
            >
              입사지원 하기
            </FestLink>
            {!pass?.vid && (
              <p className="mt-3 text-center text-xs text-fest-muted">
                사전등록 후 지원하면 지원 현황과 면접 일정을 한 곳에서 관리할 수 있습니다.
              </p>
            )}
          </div>

          {related.length > 0 && (
            <div className="fest-card p-5">
              <p className="text-sm font-extrabold text-fest-navy">같은 산업 기업</p>
              <ul className="mt-3 space-y-2">
                {related.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <FestLink
                      href={`/companies/${c.id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-fest-line px-3 py-2.5 text-sm font-bold hover:border-fest-blue/40 hover:bg-fest-sky"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="shrink-0 text-xs text-fest-muted">{c.boothNo}</span>
                    </FestLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
