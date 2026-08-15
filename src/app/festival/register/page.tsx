import type { Metadata } from "next";
import { PageHero } from "@/components/festival/page-hero";
import { FestLink } from "@/components/festival/fest-link";
import { listJobs } from "@/lib/festival/repo";
import { INTEREST_INDUSTRIES } from "@/lib/festival/recommend";
import { FEST } from "@/lib/festival/config";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "사전등록",
  description: "2026 김해 JOB FESTIVAL 사전등록 — 입장 QR 발급 및 관심 부스 사전 매칭",
};

export default async function RegisterPage() {
  const jobs = await listJobs();

  return (
    <>
      <PageHero
        eyebrow="Pre-registration"
        title="사전등록 · 입장 QR 발급"
        description={`${FEST.dateLabel} ${FEST.timeLabel} · 사전등록하면 현장 대기 없이 바로 입장하고, 관심 직무에 맞는 부스를 자동으로 추천받습니다.`}
      />

      <div className="fest-container grid gap-8 py-10 lg:grid-cols-[1.6fr_1fr] sm:py-14">
        <div className="fest-card p-6 sm:p-8">
          <RegisterForm jobs={jobs} industries={INTEREST_INDUSTRIES} />
        </div>

        <aside className="space-y-5">
          <div className="fest-card p-5">
            <p className="text-sm font-extrabold text-fest-navy">사전등록하면 좋은 점</p>
            <ul className="mt-3 space-y-2.5 text-sm text-fest-ink/85">
              <li>· 현장 등록 대기 없이 QR 로 바로 입장</li>
              <li>· 관심 직무 기반 기업·부스 자동 추천 (사전 매칭)</li>
              <li>· 온라인 입사지원 → 현장 면접 시간 직접 선택</li>
              <li>· 부스 참여 스탬프 자동 적립 · 경품 응모</li>
              <li>· 참여 이력과 지원 현황을 마이페이지에서 확인</li>
            </ul>
          </div>

          <div className="fest-card p-5">
            <p className="text-sm font-extrabold text-fest-navy">이미 등록하셨나요?</p>
            <p className="mt-2 text-sm text-fest-muted">
              이름과 연락처로 입장권을 다시 불러올 수 있습니다.
            </p>
            <FestLink href="/pass/find" className="fest-btn-outline fest-btn-sm mt-3 w-full">
              내 입장권 찾기
            </FestLink>
          </div>

          <div className="rounded-2xl bg-fest-navy p-5 text-white">
            <p className="text-sm font-extrabold">현장 등록도 가능합니다</p>
            <p className="mt-2 text-sm text-white/75">
              당일 종합안내부스에서 현장 등록 후 QR 을 발급받을 수 있습니다. 다만 사전 매칭과
              면접 우선 배정은 사전등록자에게 먼저 제공됩니다.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
