"use client";

import { useActionState, useState } from "react";
import { bookInterviewAction, type FestFormState } from "../actions";

export interface SlotOption {
  id: string;
  time: string;
  place: string;
  remaining: number;
}

export function InterviewPicker({
  applicationId,
  slots,
  currentSlotId,
}: {
  applicationId: string;
  slots: SlotOption[];
  currentSlotId?: string;
}) {
  const [state, action] = useActionState<FestFormState, FormData>(bookInterviewAction, {});
  const [selected, setSelected] = useState(currentSlotId ?? "");

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="slotId" value={selected} />

      <p className="text-xs font-bold text-fest-muted">현장 면접 시간 선택</p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {slots.map((slot) => {
          const disabled = slot.remaining <= 0 && slot.id !== currentSlotId;
          const active = selected === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              disabled={disabled}
              onClick={() => setSelected(slot.id)}
              className={`rounded-xl border px-2 py-2 text-sm font-bold transition ${
                active
                  ? "border-fest-blue bg-fest-blue text-white"
                  : disabled
                    ? "cursor-not-allowed border-fest-line bg-fest-bg text-fest-muted line-through"
                    : "border-fest-line bg-white text-fest-ink hover:border-fest-blue/50 hover:bg-fest-sky"
              }`}
            >
              {slot.time}
              <span className="mt-0.5 block text-[10px] font-semibold opacity-80">
                {slot.remaining > 0 ? `${slot.remaining}석` : "마감"}
              </span>
            </button>
          );
        })}
      </div>

      {state.error && (
        <p className="mt-3 text-sm font-bold text-fest-coral">{state.error}</p>
      )}
      {state.message && (
        <p className="mt-3 text-sm font-bold text-fest-emerald">{state.message}</p>
      )}

      <button type="submit" disabled={!selected} className="fest-btn-primary fest-btn-sm mt-3">
        {currentSlotId ? "면접 시간 변경" : "면접 시간 확정"}
      </button>
    </form>
  );
}
