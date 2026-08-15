import type { Metadata } from "next";
import { PageHero } from "@/components/festival/page-hero";
import { listCompanies } from "@/lib/festival/repo";
import { CompanyExplorer } from "./company-explorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "기업관",
  description: "2026 김해 JOB FESTIVAL 참가 기업 전체 리스트 · 채용 직무 · 현장 면접 운영 정보",
};

export default async function CompaniesPage() {
  const companies = await listCompanies();
  const totalHiring = companies.reduce(
    (sum, c) => sum + c.positions.reduce((s, p) => s + p.headcount, 0),
    0
  );
  const interviewing = companies.filter((c) => c.onSiteInterview).length;

  return (
    <>
      <PageHero
        eyebrow="Zone A · 기업관"
        title="참가 기업 전체보기"
        description="기업 상세 소개를 확인하고 온라인 입사지원서를 제출한 뒤, 현장 면접 시간까지 직접 선택할 수 있습니다."
      >
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-white/50">참가기업</dt>
            <dd className="mt-0.5 text-xl font-black">{companies.length}개사</dd>
          </div>
          <div>
            <dt className="text-white/50">채용 예정 인원</dt>
            <dd className="mt-0.5 text-xl font-black">{totalHiring}명</dd>
          </div>
          <div>
            <dt className="text-white/50">현장 면접 운영</dt>
            <dd className="mt-0.5 text-xl font-black">{interviewing}개사</dd>
          </div>
        </dl>
      </PageHero>

      <div className="fest-container py-10 sm:py-14">
        <CompanyExplorer companies={companies} />
      </div>
    </>
  );
}
