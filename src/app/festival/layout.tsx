import type { Metadata } from "next";
import { FestBaseProvider } from "@/components/festival/fest-link";
import { FestHeader } from "@/components/festival/fest-header";
import { FestFooter } from "@/components/festival/fest-footer";
import { festBase } from "@/lib/festival/base";
import { getPassSession } from "@/lib/festival/session";
import { FEST } from "@/lib/festival/config";

export const metadata: Metadata = {
  title: {
    default: `${FEST.title} | ${FEST.dateLabel}`,
    template: `%s | ${FEST.title}`,
  },
  description: `${FEST.tagline} — ${FEST.dateLabel} ${FEST.timeLabel}, 기업관·직무관·홍보관·부대행사. ${FEST.hostLine}`,
  openGraph: {
    title: FEST.title,
    description: `${FEST.dateLabel} ${FEST.timeLabel} · 기업관 / 직무관 / 홍보관 / 부대행사`,
    siteName: FEST.title,
    locale: "ko_KR",
    type: "website",
  },
};

export default async function FestivalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [base, pass] = await Promise.all([festBase(), getPassSession()]);
  return (
    <FestBaseProvider base={base}>
      <div className="fest-shell flex min-h-screen flex-col">
        <FestHeader hasPass={Boolean(pass?.vid)} />
        <main className="flex-1">{children}</main>
        <FestFooter />
      </div>
    </FestBaseProvider>
  );
}
