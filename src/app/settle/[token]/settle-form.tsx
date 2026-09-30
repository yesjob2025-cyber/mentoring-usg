"use client";

import { useState, useTransition } from "react";
import { confirmSettlementAction } from "@/app/actions/settle";

export function SettleForm({
  token,
  confirmed,
  count,
}: {
  token: string;
  confirmed: boolean;
  count: number;
}) {
  const [done, setDone] = useState(confirmed);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!window.confirm(`답변 ${count}건을 확인하시겠습니까? 확인 후에는 이 건수로 지급 처리됩니다.`)) return;
    setErr(null);
    startTransition(async () => {
      const res = await confirmSettlementAction(token);
      if (res.error) setErr(res.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-xl bg-emerald-50 p-5 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <p className="mt-2 font-extrabold text-emerald-800">확인 완료</p>
        <p className="mt-1 text-sm text-emerald-700">
          확인해 주셔서 감사합니다. 확인하신 건수를 기준으로 답변 비용을 지급해 드립니다.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={confirm} disabled={pending} className="btn-brand w-full py-3 text-base">
        {pending ? "처리 중…" : `✓ 답변 ${count}건 확인합니다`}
      </button>
      {err && <p className="mt-3 text-center text-sm text-red-600">{err}</p>}
    </div>
  );
}
