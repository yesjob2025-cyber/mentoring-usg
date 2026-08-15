import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "부울경 연합 현직자 멘토링 | 실시간 Q&A · 온라인 토크콘서트",
    template: "%s | 부울경 연합 현직자 멘토링",
  },
  description:
    "산업·직무·유형·전공별 현직자 멘토 추천과 실시간 Q&A, 온라인 직무 토크콘서트. 부울경 연합 현직자 온라인 멘토링 플랫폼.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
