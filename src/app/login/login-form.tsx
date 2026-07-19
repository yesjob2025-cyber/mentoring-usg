"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="field-label" htmlFor="email">
          이메일
        </label>
        <input id="email" name="email" type="email" required className="field-input" placeholder="you@univ.ac.kr" />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          비밀번호
        </label>
        <input id="password" name="password" type="password" required className="field-input" placeholder="••••••••" />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <SubmitButton className="btn-primary w-full">로그인</SubmitButton>
      <p className="text-center text-xs text-ink-muted">
        데모 계정: student1@pknu.ac.kr / test1234
      </p>
    </form>
  );
}
