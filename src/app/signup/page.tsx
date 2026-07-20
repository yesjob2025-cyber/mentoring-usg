import Link from "next/link";
import type { Metadata } from "next";
import { listSchools } from "@/lib/repo";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage() {
  // 학교 "이름"만 전달 (접속코드는 노출하지 않음)
  const schoolNames = (await listSchools())
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b, "ko"));

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-lg">
        <div className="card p-8">
          <h1 className="text-2xl font-extrabold">학교 접속코드로 회원가입</h1>
          <p className="mt-1 text-sm text-ink-muted">
            학교별로 발급된 접속코드가 있어야 가입할 수 있습니다. 코드는 소속 학교 담당 부서에서
            안내받으세요.
          </p>
          <SignupForm schoolNames={schoolNames} />
          <p className="mt-6 text-center text-sm text-ink-muted">
            이미 회원이신가요?{" "}
            <Link href="/login" className="font-semibold text-brand-500 hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
