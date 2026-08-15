import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { festPath } from "@/lib/festival/base";
import { getStaffSession } from "@/lib/festival/session";
import { listAllCheckins } from "@/lib/festival/repo";
import { formatKST } from "@/lib/format";
import { staffLogoutAction } from "../../actions";
import { Scanner } from "./scanner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "부스 체크인",
  robots: { index: false, follow: false },
};

export default async function StaffScanPage() {
  const staff = await getStaffSession();
  if (!staff) redirect(await festPath("/staff"));

  const all = await listAllCheckins();
  const mine = all.filter((c) => c.boothId === staff.boothId).slice(0, 20);

  return (
    <div className="fest-container py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="fest-eyebrow">Staff check-in</p>
          <h1 className="mt-1 text-2xl font-black text-fest-navy">부스 체크인</h1>
        </div>
        <form action={staffLogoutAction}>
          <button type="submit" className="fest-btn-ghost fest-btn-sm">
            부스 변경
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Scanner boothName={staff.boothName} boothNo={staff.boothNo} />

        <div className="fest-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-fest-navy">최근 체크인</p>
            <span className="fest-chip">누적 {all.filter((c) => c.boothId === staff.boothId).length}건</span>
          </div>
          {mine.length === 0 ? (
            <p className="mt-6 rounded-xl bg-fest-bg px-4 py-10 text-center text-sm text-fest-muted">
              아직 체크인 기록이 없습니다.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-fest-line">
              {mine.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm font-bold text-fest-navy">{c.visitorName}</span>
                  <span className="text-xs text-fest-muted">{formatKST(c.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
