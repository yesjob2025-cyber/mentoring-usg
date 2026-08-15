import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/festival/page-hero";
import { festPath } from "@/lib/festival/base";
import { isFestAdmin } from "@/lib/festival/session";
import { FestAdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "운영 관리자 로그인",
  robots: { index: false, follow: false },
};

export default async function FestAdminLoginPage() {
  if (await isFestAdmin()) redirect(await festPath("/admin"));

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="운영 관리자 로그인"
        description="사전등록·입장·부스 참여·지원 현황을 실시간으로 확인할 수 있습니다."
      />
      <div className="fest-container py-10 sm:py-14">
        <div className="mx-auto max-w-sm">
          <div className="fest-card p-6 sm:p-8">
            <FestAdminLoginForm />
          </div>
        </div>
      </div>
    </>
  );
}
