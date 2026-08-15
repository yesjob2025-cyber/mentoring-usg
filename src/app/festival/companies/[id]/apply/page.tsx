import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/festival/page-hero";
import { FestLink } from "@/components/festival/fest-link";
import { getCompany, getVisitor, listApplications } from "@/lib/festival/repo";
import { getPassSession } from "@/lib/festival/session";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "입사지원",
};

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const company = await getCompany(id);
  if (!company) notFound();

  const pass = await getPassSession();
  const visitor = pass?.vid ? await getVisitor(pass.vid) : undefined;
  const applied = visitor ? await listApplications(visitor.id) : [];
  const alreadyHere = applied.filter((a) => a.companyId === company.id);
  const positionParam = typeof sp.position === "string" ? sp.position : undefined;

  return (
    <>
      <PageHero
        eyebrow={`기업관 ${company.boothNo}`}
        title={`${company.name} 입사지원`}
        description={company.summary}
      />

      <div className="fest-container grid gap-8 py-10 lg:grid-cols-[1.6fr_1fr] sm:py-14">
        <div className="fest-card p-6 sm:p-8">
          {visitor ? (
            <ApplyForm company={company} visitor={visitor} defaultPositionId={positionParam} />
          ) : (
            <div className="py-10 text-center">
              <p className="text-lg font-extrabold text-fest-navy">
                사전등록 후 지원할 수 있습니다
              </p>
              <p className="mt-2 text-sm text-fest-muted">
                사전등록하면 지원 현황과 현장 면접 일정을 한 곳에서 관리할 수 있습니다.
                (약 1분 소요)
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <FestLink href="/register" className="fest-btn-primary">
                  사전등록 하기
                </FestLink>
                <FestLink href="/pass/find" className="fest-btn-outline">
                  이미 등록했어요
                </FestLink>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          {alreadyHere.length > 0 && (
            <div className="fest-card p-5">
              <p className="text-sm font-extrabold text-fest-navy">이미 지원한 직무</p>
              <ul className="mt-3 space-y-2 text-sm">
                {alreadyHere.map((a) => (
                  <li key={a.id} className="rounded-xl bg-fest-sky px-3 py-2 font-bold text-fest-blue">
                    {a.positionTitle}
                  </li>
                ))}
              </ul>
              <FestLink href="/pass" className="fest-btn-outline fest-btn-sm mt-3 w-full">
                지원 현황 보기
              </FestLink>
            </div>
          )}

          <div className="fest-card p-5">
            <p className="text-sm font-extrabold text-fest-navy">지원 후 진행 순서</p>
            <ol className="mt-3 space-y-2.5 text-sm text-fest-ink/85">
              <li>1. 온라인 지원서 제출</li>
              <li>2. 마이페이지에서 현장 면접 시간 선택</li>
              <li>3. 행사 당일 기업관 {company.boothNo} 방문</li>
              <li>4. 면접 진행 · 참여 스탬프 적립</li>
              <li>5. 전형 결과는 기업에서 개별 통보</li>
            </ol>
          </div>

          <div className="fest-card p-5">
            <p className="text-sm font-extrabold text-fest-navy">개인정보 안내</p>
            <p className="mt-2 text-xs leading-relaxed text-fest-muted">
              지원서에 입력한 정보는 지원 기업의 채용 검토 목적으로만 제공되며, 행사 종료 후
              1년 이내 파기됩니다. 기업은 전형 목적 외로 정보를 사용할 수 없습니다.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
