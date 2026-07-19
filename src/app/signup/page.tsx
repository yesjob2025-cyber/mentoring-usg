import Link from "next/link";
import type { Metadata } from "next";
import { listSchools } from "@/lib/repo";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  const schools = listSchools().map((s) => ({ name: s.name, code: s.code, region: s.region }));
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-lg">
        <div className="card p-8">
          <h1 className="text-2xl font-extrabold">학교 접속코드로 회원가입</h1>
          <p className="mt-1 text-sm text-ink-muted">
            학교별로 발급된 접속코드가 있어야 가입할 수 있습니다. 코드는 소속 학교 담당 부서에서
            안내받으세요.
          </p>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-ink-muted">
            이미 회원이신가요?{" "}
            <Link href="/login" className="font-semibold text-brand-500 hover:underline">
              로그인
            </Link>
          </p>
        </div>

        <details className="card mt-4 p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-ink-soft">
            데모 학교 접속코드 (프로토타입 확인용)
          </summary>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {schools.map((s) => (
              <li key={s.code} className="flex items-center justify-between rounded-lg bg-cream-100 px-3 py-1.5">
                <span className="text-ink-soft">
                  {s.name} <span className="text-ink-muted">· {s.region}</span>
                </span>
                <code className="rounded bg-white px-2 py-0.5 font-mono text-xs text-brand-500">
                  {s.code}
                </code>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
