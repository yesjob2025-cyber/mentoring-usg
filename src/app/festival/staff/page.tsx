import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/festival/page-hero";
import { festPath } from "@/lib/festival/base";
import { getStaffSession } from "@/lib/festival/session";
import { listAllBooths } from "@/lib/festival/repo";
import { StaffLoginForm } from "./staff-login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "부스 운영자 체크인",
  robots: { index: false, follow: false },
};

export default async function StaffPage() {
  const staff = await getStaffSession();
  if (staff) redirect(await festPath("/staff/scan"));

  const booths = await listAllBooths();

  return (
    <>
      <PageHero
        eyebrow="Staff"
        title="부스 운영자 체크인"
        description="담당 부스를 선택하고 운영 PIN 을 입력하면, 참가자 QR 을 스캔해 참여를 기록할 수 있습니다."
      />
      <div className="fest-container py-10 sm:py-14">
        <div className="mx-auto max-w-md">
          <div className="fest-card p-6 sm:p-8">
            <StaffLoginForm booths={booths} />
          </div>
          <div className="fest-card mt-5 p-5 text-sm text-fest-muted">
            <p className="font-bold text-fest-navy">운영 안내</p>
            <ul className="mt-2 space-y-1.5">
              <li>· 한 기기에서 한 부스만 로그인됩니다. (48시간 유지)</li>
              <li>· 같은 참가자가 같은 부스에 다시 오면 중복으로 안내되며 기록은 1건만 남습니다.</li>
              <li>· 카메라 스캔이 어려운 경우 참가자의 6자리 코드를 직접 입력하세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
