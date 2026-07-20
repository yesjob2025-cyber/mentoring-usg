"use client";

import { useActionState } from "react";
import { signupAction, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

const GRADES = ["1학년", "2학년", "3학년", "4학년", "졸업"];
const GENDERS = ["남", "여"];

export function SignupForm({ schoolNames }: { schoolNames: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(signupAction, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="schoolName">
            학교 <span className="text-brand-500">*</span>
          </label>
          <select id="schoolName" name="schoolName" required defaultValue="" className="field-input">
            <option value="" disabled>
              학교 선택
            </option>
            {schoolNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="code">
            학교 접속코드 <span className="text-brand-500">*</span>
          </label>
          <input
            id="code"
            name="code"
            required
            className="field-input font-mono uppercase tracking-wider"
            placeholder="예: PKNU4939"
          />
        </div>
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
            휴대폰 (카톡·문자 알림용)
          </label>
          <input id="phone" name="phone" className="field-input" placeholder="010-1234-5678" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="grade">
            학년 <span className="text-ink-muted">(선택)</span>
          </label>
          <select id="grade" name="grade" defaultValue="" className="field-input">
            <option value="">선택 안 함</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="gender">
            성별 <span className="text-ink-muted">(선택)</span>
          </label>
          <select id="gender" name="gender" defaultValue="" className="field-input">
            <option value="">선택 안 함</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
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
