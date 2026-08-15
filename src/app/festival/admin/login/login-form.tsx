"use client";

import { useActionState } from "react";
import { festAdminLoginAction, type FestFormState } from "../../actions";

export function FestAdminLoginForm() {
  const [state, action] = useActionState<FestFormState, FormData>(festAdminLoginAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="fest-label" htmlFor="password">
          운영 관리자 비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="fest-input"
          placeholder="••••••••"
        />
      </div>
      {state.error && (
        <p className="rounded-xl border border-fest-coral/30 bg-red-50 px-4 py-3 text-sm font-bold text-fest-coral">
          {state.error}
        </p>
      )}
      <button type="submit" className="fest-btn-primary w-full">
        로그인
      </button>
    </form>
  );
}
