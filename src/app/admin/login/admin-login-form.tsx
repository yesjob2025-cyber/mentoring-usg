"use client";

import { useActionState } from "react";
import { adminLoginAction, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function AdminLoginForm() {
  const [state, action] = useActionState<FormState, FormData>(adminLoginAction, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="field-label" htmlFor="username">
          관리자 아이디
        </label>
        <input id="username" name="username" required className="field-input" placeholder="pnu-admin" />
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
    </form>
  );
}
