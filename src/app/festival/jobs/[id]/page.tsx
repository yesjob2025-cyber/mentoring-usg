import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FestLink } from "@/components/festival/fest-link";
import { getJob, listCompanies, listJobs } from "@/lib/festival/repo";
import { FEST } from "@/lib/festival/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  return {
    title: job ? `${job.name} | 직무관` : "직무관",
    description: job?.summary,
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const [companies, jobs] = await Promise.all([listCompanies(), listJobs()]);
  const hiring = companies.filter((c) =>
    c.positions.some((p) => p.jobCategory === job.id)
  );
  const sameCategory = jobs.filter((j) => j.category === job.category && j.id !== job.id);

  return (
    <>
      <section className="border-b border-fest-line bg-fest-navy text-white">
        <div className="fest-container py-12 sm:py-14">
          <FestLink href="/jobs" className="text-sm font-bold text-white/60 hover:text-white">
            ← 직무관 전체보기
          </FestLink>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="fest-chip border-transparent bg-white/15 text-white">
              부스 {job.boothNo}
            </span>
            <span className="fest-chip border-transparent bg-white/15 text-white">
              {job.category}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{job.name}</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75 sm:text-base">{job.summary}</p>
        </div>
      </section>

      <div className="fest-container grid gap-8 py-10 lg:grid-cols-[1.7fr_1fr] sm:py-14">
        <div className="space-y-6">
          <section className="fest-card p-6">
            <h2 className="text-lg font-extrabold text-fest-navy">직무 소개</h2>
            <p className="mt-3 text-sm leading-relaxed text-fest-ink/85">{job.description}</p>
          </section>

          <section className="fest-card p-6">
            <h2 className="text-lg font-extrabold text-fest-navy">주요 업무</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {job.tasks.map((t) => (
                <li
                  key={t}
                  className="rounded-xl border border-fest-line px-4 py-3 text-sm font-semibold text-fest-ink/85"
                >
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div className="fest-card p-6">
              <h2 className="text-base font-extrabold text-fest-navy">필요 역량</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.skills.map((s) => (
                  <span key={s} className="fest-chip-blue">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="fest-card p-6">
              <h2 className="text-base font-extrabold text-fest-navy">관련 자격</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.certificates.map((s) => (
                  <span key={s} className="fest-chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="fest-card p-6">
            <h2 className="text-lg font-extrabold text-fest-navy">커리어 경로</h2>
            <ol className="mt-4 flex flex-wrap items-center gap-2">
              {job.careerPath.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="rounded-xl border border-fest-violet/25 bg-violet-50 px-3.5 py-2 text-sm font-bold text-fest-violet">
                    {step}
                  </span>
                  {i < job.careerPath.length - 1 && (
                    <span className="text-fest-muted">→</span>
                  )}
                </li>
              ))}
            </ol>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-fest-bg px-4 py-3">
                <dt className="text-xs font-bold text-fest-muted">초임 수준</dt>
                <dd className="mt-1 text-sm font-extrabold text-fest-navy">{job.salaryRange}</dd>
              </div>
              <div className="rounded-xl bg-fest-bg px-4 py-3">
                <dt className="text-xs font-bold text-fest-muted">전망</dt>
                <dd className="mt-1 text-sm font-extrabold text-fest-navy">{job.outlook}</dd>
              </div>
            </dl>
          </section>

          {hiring.length > 0 && (
            <section className="fest-card p-6">
              <h2 className="text-lg font-extrabold text-fest-navy">
                이 직무를 채용하는 참가 기업
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {hiring.map((c) => (
                  <li key={c.id}>
                    <FestLink
                      href={`/companies/${c.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-fest-line px-4 py-3 hover:border-fest-blue/40 hover:bg-fest-sky"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-extrabold text-fest-navy">
                          {c.name}
                        </span>
                        <span className="block text-xs text-fest-muted">{c.industry}</span>
                      </span>
                      <span className="fest-chip shrink-0">{c.boothNo}</span>
                    </FestLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <div className="fest-card sticky top-20 p-5">
            <p className="text-sm font-extrabold text-fest-navy">부스 운영 안내</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-fest-muted">위치</dt>
                <dd className="font-bold">직무관 {job.boothNo}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fest-muted">운영 시간</dt>
                <dd className="font-bold">{FEST.timeLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fest-muted">상담</dt>
                <dd className="font-bold">현직자 1:1</dd>
              </div>
            </dl>
            <p className="mt-4 rounded-xl bg-fest-bg px-4 py-3 text-xs font-bold text-fest-navy">
              {job.mentorTitle}
            </p>
            <p className="mt-3 text-xs font-bold text-fest-muted">부스 운영 프로그램</p>
            <ul className="mt-2 space-y-1.5 text-sm text-fest-ink/85">
              {job.programs.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
            <FestLink href="/register" className="fest-btn-primary mt-4 w-full">
              사전등록하고 상담 예약
            </FestLink>
          </div>

          {sameCategory.length > 0 && (
            <div className="fest-card p-5">
              <p className="text-sm font-extrabold text-fest-navy">같은 계열 직무</p>
              <ul className="mt-3 space-y-2">
                {sameCategory.slice(0, 5).map((j) => (
                  <li key={j.id}>
                    <FestLink
                      href={`/jobs/${j.id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-fest-line px-3 py-2.5 text-sm font-bold hover:border-fest-violet/40 hover:bg-violet-50"
                    >
                      <span className="truncate">{j.name}</span>
                      <span className="shrink-0 text-xs text-fest-muted">{j.boothNo}</span>
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
