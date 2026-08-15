import type { Metadata } from "next";
import { PageHero } from "@/components/festival/page-hero";
import { listJobs } from "@/lib/festival/repo";
import { JobExplorer } from "./job-explorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "직무관",
  description: "직무별 현직자 상담 부스 전체 리스트 — 주요 업무, 필요 역량, 커리어 경로 안내",
};

export default async function JobsPage() {
  const jobs = await listJobs();
  const categories = Array.from(new Set(jobs.map((j) => j.category)));

  return (
    <>
      <PageHero
        eyebrow="Zone B · 직무관"
        title="직무 전체보기"
        description="'이 직무가 실제로 무슨 일을 하는지' 현직자에게 직접 물어보세요. 직무별 주요 업무·필요 역량·커리어 경로를 정리했습니다."
      >
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-white/50">직무 부스</dt>
            <dd className="mt-0.5 text-xl font-black">{jobs.length}개</dd>
          </div>
          <div>
            <dt className="text-white/50">직무 계열</dt>
            <dd className="mt-0.5 text-xl font-black">{categories.length}개</dd>
          </div>
          <div>
            <dt className="text-white/50">상담 방식</dt>
            <dd className="mt-0.5 text-xl font-black">현직자 1:1</dd>
          </div>
        </dl>
      </PageHero>

      <div className="fest-container py-10 sm:py-14">
        <JobExplorer jobs={jobs} />
      </div>
    </>
  );
}
