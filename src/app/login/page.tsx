import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-2xl font-extrabold">로그인</h1>
          <p className="mt-1 text-sm text-ink-muted">
            부울경 연합 현직자 멘토링에 오신 것을 환영합니다.
          </p>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-ink-muted">
            아직 회원이 아니신가요?{" "}
            <Link href="/signup" className="font-semibold text-brand-500 hover:underline">
              학교 접속코드로 회원가입
            </Link>
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-ink-muted">
          학교 관리자이신가요?{" "}
          <Link href="/admin/login" className="font-semibold hover:underline">
            관리자 로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
