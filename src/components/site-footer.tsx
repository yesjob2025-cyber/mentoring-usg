import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-line bg-cream-100">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm font-black text-brand-300">
              부
            </span>
            <span className="text-lg font-extrabold">부울경 연합 현직자 멘토링</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
            지역 정주형 부울경 연합 현직자 온라인 멘토링 플랫폼.
            <br />
            현직자 직무 멘토링과 실시간 질의응답을 동시에.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold text-ink">프로그램</p>
          <ul className="space-y-2 text-ink-muted">
            <li>
              <Link href="/qna" className="hover:text-ink">
                실시간 Q&A
              </Link>
            </li>
            <li>
              <Link href="/questions" className="hover:text-ink">
                질문 게시판
              </Link>
            </li>
            <li>
              <Link href="/talk-concert" className="hover:text-ink">
                온라인 토크콘서트
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold text-ink">이용안내</p>
          <ul className="space-y-2 text-ink-muted">
            <li>
              <Link href="/signup" className="hover:text-ink">
                학교 접속코드로 회원가입
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="hover:text-ink">
                학교 관리자 로그인
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-bold text-ink">운영기관 · 문의</p>
          <p className="font-semibold text-ink-soft">주식회사 예스잡</p>
          <p className="mt-1 leading-relaxed text-ink-muted">
            부산광역시 사상구 학감대로 275 701호
          </p>
          <ul className="mt-3 space-y-2 text-ink-muted">
            <li>
              <a
                href="mailto:yes1@yesjob.kr?subject=%5B%EB%B6%80%EC%9A%B8%EA%B2%BD%20%EB%A9%98%ED%86%A0%EB%A7%81%5D%20%EB%AC%B8%EC%9D%98"
                className="inline-flex items-center gap-1.5 hover:text-ink"
              >
                <span aria-hidden>✉️</span> 이메일 문의 (yes1@yesjob.kr)
              </a>
            </li>
            <li>
              <a
                href="sms:01085536027"
                className="inline-flex items-center gap-1.5 hover:text-ink"
              >
                <span aria-hidden>💬</span> 문자 문의 (010-8553-6027)
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-muted sm:flex-row">
          <p>© {new Date().getFullYear()} 주식회사 예스잡. 부울경 연합 현직자 온라인 멘토링.</p>
          <p>실시간 Q&A · 온라인 직무 토크콘서트</p>
        </div>
      </div>
    </footer>
  );
}
