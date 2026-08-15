"use client";

import { useActionState } from "react";
import { checkinByTokenAction, type ScanState } from "../../actions";

export function TokenCheckin({
  token,
  boothName,
  boothNo,
}: {
  token: string;
  boothName: string;
  boothNo: string;
}) {
  const [state, action, pending] = useActionState<ScanState, FormData>(checkinByTokenAction, {});

  return (
    <div>
      <form action={action}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" disabled={pending} className="fest-btn-primary w-full">
          {pending ? "처리 중…" : `[${boothNo}] ${boothName} 참여 체크인`}
        </button>
      </form>

      {(state.ok || state.error) && (
        <div
          className={`mt-4 rounded-2xl border p-5 ${
            state.error
              ? "border-fest-coral/30 bg-red-50"
              : state.duplicated
                ? "border-amber-300/50 bg-amber-50"
                : "border-fest-emerald/30 bg-emerald-50"
          }`}
        >
          {state.error ? (
            <p className="text-sm font-bold text-fest-coral">{state.error}</p>
          ) : (
            <>
              <p className="text-base font-black text-fest-navy">{state.message}</p>
              <p className="mt-2 text-sm font-bold text-fest-muted">
                스탬프 {state.stampCollected} / {state.stampGoal}
                {state.stampCompleted && ` · 완주 코드 ${state.awardCode}`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
