import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "비밀번호 변경" };

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) redirect("/login");

  return (
    <div className="container-page max-w-md py-12">
      <Link href="/my" className="text-sm text-ink-muted hover:text-ink-soft">← 내 질문으로</Link>
      <h1 className="mt-4 text-2xl font-black">비밀번호 변경</h1>
      <p className="mt-1 text-sm text-ink-soft">
        임시 비밀번호로 로그인하셨다면, 여기서 사용할 비밀번호로 변경해 주세요.
      </p>
      <div className="mt-6">
        <PasswordForm />
      </div>
    </div>
  );
}
