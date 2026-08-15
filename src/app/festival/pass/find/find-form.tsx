"use client";

import { useActionState } from "react";
import { findPassAction, type FestFormState } from "../../actions";

export function FindPassForm() {
  const [state, action] = useActionState<FestFormState, FormData>(findPassAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="fest-label" htmlFor="find-name">
          이름
        </label>
        <input id="find-name" name="name" required className="fest-input" placeholder="홍길동" />
      </div>
      <div>
        <label className="fest-label" htmlFor="find-phone">
          휴대전화
        </label>
        <input
          id="find-phone"
          name="phone"
          required
          inputMode="tel"
          className="fest-input"
          placeholder="010-1234-5678"
        />
      </div>
      {state.error && (
        <p className="rounded-xl border border-fest-coral/30 bg-red-50 px-4 py-3 text-sm font-bold text-fest-coral">
          {state.error}
        </p>
      )}
      <button type="submit" className="fest-btn-primary w-full">
        입장권 불러오기
      </button>
    </form>
  );
}
