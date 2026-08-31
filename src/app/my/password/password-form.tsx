"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePasswordAction, type ResetState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function PasswordForm() {
  const [state, action] = useActionState<ResetState, FormData>(changePasswordAction, {});

  if (state.ok) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <p className="mt-3 font-extrabold">{state.message}</p>
        <Link href="/my" className="btn-brand mt-5 inline-flex">내 질문으로</Link>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <label className="field-label" htmlFor="current">현재(임시) 비밀번호</label>
        <input id="current" name="current" type="password" required className="field-input" placeholder="문자로 받은 임시 비밀번호" />
      </div>
      <div>
        <label className="field-label" htmlFor="next">새 비밀번호</label>
        <input id="next" name="next" type="password" required minLength={6} className="field-input" placeholder="6자 이상" />
      </div>
      <div>
        <label className="field-label" htmlFor="confirm">새 비밀번호 확인</label>
        <input id="confirm" name="confirm" type="password" required minLength={6} className="field-input" placeholder="한 번 더 입력" />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <SubmitButton className="btn-brand w-full">비밀번호 변경</SubmitButton>
    </form>
  );
}
