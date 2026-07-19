"use client";

import { useActionState } from "react";
import { signupAction, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

export function SignupForm() {
  const [state, action] = useActionState<FormState, FormData>(signupAction, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="field-label" htmlFor="code">
          학교 접속코드 <span className="text-brand-500">*</span>
        </label>
        <input
          id="code"
          name="code"
          required
          className="field-input font-mono uppercase tracking-wider"
          placeholder="예: PNU2025"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="name">
            이름 <span className="text-brand-500">*</span>
          </label>
          <input id="name" name="name" required className="field-input" placeholder="홍길동" />
        </div>
        <div>
          <label className="field-label" htmlFor="studentNo">
            학번
          </label>
          <input id="studentNo" name="studentNo" className="field-input" placeholder="202012345" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="department">
            학과
          </label>
          <input id="department" name="department" className="field-input" placeholder="기계공학과" />
        </div>
        <div>
          <label className="field-label" htmlFor="phone">
            휴대폰 (카톡 알림용)
          </label>
          <input id="phone" name="phone" className="field-input" placeholder="010-1234-5678" />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="email">
          이메일 <span className="text-brand-500">*</span>
        </label>
        <input id="email" name="email" type="email" required className="field-input" placeholder="you@univ.ac.kr" />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          비밀번호 <span className="text-brand-500">*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          className="field-input"
          placeholder="6자 이상"
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <SubmitButton className="btn-brand w-full">가입하고 시작하기</SubmitButton>
    </form>
  );
}
