import type { Metadata } from "next";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = { title: "학교 관리자 로그인" };

export default function AdminLoginPage() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <span className="chip-brand">학교 관리자</span>
          <h1 className="mt-3 text-2xl font-extrabold">관리자 로그인</h1>
          <p className="mt-1 text-sm text-ink-muted">
            학교별 참여 현황·질문 현황 대시보드에 접근합니다.
          </p>
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
