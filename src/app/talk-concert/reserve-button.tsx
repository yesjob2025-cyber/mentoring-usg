"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { reserveTalkAction, cancelTalkAction, type TalkActionState } from "@/app/actions/talk";

function Pending({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "처리 중…" : label}
    </button>
  );
}

export function ReserveButton({
  sessionId,
  reserved,
  isFull,
  isLoggedIn,
}: {
  sessionId: string;
  reserved: boolean;
  isFull: boolean;
  isLoggedIn: boolean;
}) {
  const [reserveState, reserve] = useActionState<TalkActionState, FormData>(reserveTalkAction, {});
  const [cancelState, cancel] = useActionState<TalkActionState, FormData>(cancelTalkAction, {});
  const error = reserveState.error || cancelState.error;

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="btn-outline px-3 py-1.5 text-xs"
        title="로그인 후 예약할 수 있습니다"
      >
        로그인 후 예약
      </Link>
    );
  }

  if (reserved) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={`/talk-concert/room/${sessionId}`}
          className="btn-brand px-3 py-1.5 text-xs"
        >
          입장하기
        </Link>
        <form action={cancel}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <Pending label="예약취소" className="text-xs text-ink-muted underline hover:text-ink-soft" />
        </form>
      </div>
    );
  }

  if (isFull) {
    return (
      <button disabled className="btn-outline cursor-not-allowed px-3 py-1.5 text-xs opacity-60">
        신청 마감
      </button>
    );
  }

  return (
    <form action={reserve} className="flex flex-col items-end gap-1">
      <input type="hidden" name="sessionId" value={sessionId} />
      <Pending label="예약하기" className="btn-brand px-3 py-1.5 text-xs" />
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </form>
  );
}
