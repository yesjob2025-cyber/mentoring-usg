import Link from "next/link";
import type { SessionData } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";

const NAV = [
  { href: "/strength", label: "일 강점 진단" },
  { href: "/qna", label: "실시간 Q&A" },
  { href: "/questions", label: "질문 게시판" },
  { href: "/talk-concert", label: "토크콘서트" },
];

export function SiteHeader({ session }: { session: SessionData | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-line/70 bg-cream/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink text-sm font-black text-brand-300">
              부
            </span>
            <span className="text-base font-extrabold leading-tight tracking-tight sm:text-lg">
              부울경 연합 <span className="text-brand-400">현직자 멘토링</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              {session.role === "admin" || session.role === "superadmin" ? (
                <Link href="/admin" className="btn-ghost hidden sm:inline-flex">
                  관리자 대시보드
                </Link>
              ) : (
                <Link href="/my" className="btn-ghost hidden sm:inline-flex">
                  내 질문
                </Link>
              )}
              <span className="hidden text-sm text-ink-muted sm:inline">
                {session.name ?? "관리자"}님
              </span>
              <form action={logoutAction}>
                <button className="btn-outline" type="submit">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                로그인
              </Link>
              <Link href="/signup" className="btn-brand">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
