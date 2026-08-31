"use client";

import { useState } from "react";
import { useActionState } from "react";
import { loginAction, resetPasswordAction, type FormState, type ResetState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  const [showReset, setShowReset] = useState(false);
  const [resetState, resetAction] = useActionState<ResetState, FormData>(resetPasswordAction, {});

  return (
    <div>
      <form action={action} className="mt-6 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
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
      </form>

      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => setShowReset((v) => !v)}
          className="text-sm text-ink-muted underline hover:text-ink-soft"
        >
          비밀번호를 잊으셨나요?
        </button>
      </div>

      {showReset && (
        <div className="mt-3 rounded-xl border border-ink-line bg-cream-50 p-4">
          <p className="text-sm font-semibold">비밀번호 재설정</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            가입한 이메일을 입력하면 등록된 휴대폰 번호로 임시 비밀번호를 문자로 보내드립니다.
          </p>
          {resetState.ok ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              ✓ {resetState.message}
            </p>
          ) : (
            <form action={resetAction} className="mt-3 space-y-2">
              <input
                name="email"
                type="email"
                required
                className="field-input"
                placeholder="가입한 이메일"
              />
              {resetState.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{resetState.error}</p>
              )}
              <SubmitButton className="btn-outline w-full">임시 비밀번호 문자 받기</SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
