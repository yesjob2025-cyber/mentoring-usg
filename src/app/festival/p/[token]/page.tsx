import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FestLink } from "@/components/festival/fest-link";
import { getVisitorByToken, stampProgress } from "@/lib/festival/repo";
import { getStaffSession } from "@/lib/festival/session";
import { courseName, FEST, STAMP_MISSIONS } from "@/lib/festival/config";
import { TokenCheckin } from "./token-checkin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "참가자 확인",
  robots: { index: false, follow: false },
};

const ZONE_LABEL: Record<string, string> = {
  company: "기업관",
  job: "직무관",
  promo: "홍보관",
  side: "부대행사",
};

/** 참가자 QR 을 스캔했을 때 열리는 페이지 (부스 운영자용) */
export default async function TokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visitor = await getVisitorByToken(token);
  if (!visitor) notFound();

  const [staff, stamp] = await Promise.all([getStaffSession(), stampProgress(visitor.id)]);

  return (
    <div className="fest-container py-10 sm:py-14">
      <div className="mx-auto max-w-md space-y-5">
        <div className="fest-card p-6">
          <p className="fest-eyebrow">Visitor</p>
          <h1 className="mt-2 text-2xl font-black text-fest-navy">{visitor.name}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="fest-chip-blue">{courseName(visitor.course)}</span>
            <span className="fest-chip">{visitor.visitorType}</span>
            {visitor.school && <span className="fest-chip">{visitor.school}</span>}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-fest-bg px-3.5 py-2.5">
              <dt className="text-xs text-fest-muted">확인 코드</dt>
              <dd className="mt-0.5 font-black tracking-widest text-fest-navy">{visitor.code}</dd>
            </div>
            <div className="rounded-xl bg-fest-bg px-3.5 py-2.5">
              <dt className="text-xs text-fest-muted">입장</dt>
              <dd className="mt-0.5 font-bold">{visitor.enteredAt ? "완료" : "입장 전"}</dd>
            </div>
          </dl>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {STAMP_MISSIONS.map((m) => {
              const done = stamp.zones[m.zone] > 0;
              return (
                <div
                  key={m.zone}
                  className={`rounded-xl border-2 p-2 text-center text-[11px] font-extrabold ${
                    done
                      ? "border-fest-blue bg-fest-sky text-fest-blue"
                      : "border-dashed border-fest-line text-fest-muted"
                  }`}
                >
                  {done ? "✓" : "○"}
                  <span className="mt-0.5 block">{ZONE_LABEL[m.zone]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {staff ? (
          <div className="fest-card p-6">
            <p className="text-sm font-extrabold text-fest-navy">부스 체크인</p>
            <p className="mt-1 text-xs text-fest-muted">
              현재 로그인된 부스로 참여를 기록합니다.
            </p>
            <div className="mt-4">
              <TokenCheckin
                token={visitor.token}
                boothName={staff.boothName}
                boothNo={staff.boothNo}
              />
            </div>
            <FestLink href="/staff/scan" className="fest-btn-outline fest-btn-sm mt-3 w-full">
              연속 스캔 화면으로
            </FestLink>
          </div>
        ) : (
          <div className="fest-card p-6 text-center">
            <p className="text-sm font-bold text-fest-navy">
              부스 운영자는 로그인 후 체크인할 수 있습니다.
            </p>
            <p className="mt-1.5 text-xs text-fest-muted">
              {FEST.title} 운영 PIN 으로 담당 부스에 로그인해 주세요.
            </p>
            <FestLink href="/staff" className="fest-btn-primary mt-4 w-full">
              부스 운영자 로그인
            </FestLink>
          </div>
        )}
      </div>
    </div>
  );
}
