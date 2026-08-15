import { NextResponse, type NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────
// jobfestival.co.kr 도메인 연결
//  이 앱은 두 서비스를 함께 서빙한다.
//   - mentoring 도메인  → 기존 멘토링 플랫폼 (/)
//   - jobfestival.co.kr → 2026 김해 JOB FESTIVAL (/festival/*)
//  축제 도메인으로 들어오면 경로 앞에 /festival 을 붙여 rewrite 하므로
//  방문자에게는 https://jobfestival.co.kr/companies 처럼 깔끔한 주소가 보인다.
//  (링크는 FestLink 가 도메인에 맞춰 자동으로 prefix 를 붙인다)
// ─────────────────────────────────────────────────────────────

const FESTIVAL_HOSTS = (
  process.env.FESTIVAL_HOSTS || "jobfestival.co.kr,www.jobfestival.co.kr"
)
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function isFestivalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return FESTIVAL_HOSTS.includes(host.split(":")[0].toLowerCase());
}

export function middleware(req: NextRequest) {
  if (!isFestivalHost(req.headers.get("host"))) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/festival") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/festival" : `/festival${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
