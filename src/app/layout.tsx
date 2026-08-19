import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSession } from "@/lib/session";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mting.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "부울경 연합 현직자 멘토링 | 실시간 Q&A · 온라인 토크콘서트",
    template: "%s | 부울경 연합 현직자 멘토링",
  },
  description:
    "산업·직무·유형·전공별 현직자 멘토 추천과 실시간 Q&A, 온라인 직무 토크콘서트. 부울경 연합 현직자 온라인 멘토링 플랫폼.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <div className="flex min-h-screen flex-col">
          <SiteHeader session={session} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
