"use client";

import { useActionState } from "react";
import { redeemStampAction, type FestFormState } from "../actions";

export function RedeemForm() {
  const [state, action] = useActionState<FestFormState, FormData>(redeemStampAction, {});
  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2">
        <input
          name="code"
          className="fest-input font-mono uppercase tracking-widest"
          placeholder="KH123456"
          aria-label="스탬프 완주 코드"
        />
        <button type="submit" className="fest-btn-primary shrink-0">
          확인
        </button>
      </div>
      {state.error && <p className="text-sm font-bold text-fest-coral">{state.error}</p>}
      {state.message && <p className="text-sm font-bold text-fest-emerald">{state.message}</p>}
    </form>
  );
}
