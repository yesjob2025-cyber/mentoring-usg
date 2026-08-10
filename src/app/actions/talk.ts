"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  applyTalk,
  cancelTalk,
  createSlotReservation,
  cancelSlotReservation,
} from "@/lib/repo";
import type { TalkTrack } from "@/lib/types";

export type TalkActionState = { error?: string; ok?: boolean };

export type SlotActionState = { error?: string; ok?: boolean };

// 시간대 예약 (날짜 → 희망 멘토링 → 시간). 학생 로그인 필요.
export async function reserveSlotAction(input: {
  date: string;
  time: string;
  track: string;
  topic: string;
}): Promise<SlotActionState> {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) {
    return { error: "예약하려면 학생 계정으로 로그인해 주세요." };
  }
  if (!input?.date || !input?.time || !input?.track) {
    return { error: "날짜·희망 멘토링·시간을 모두 선택해 주세요." };
  }
  const res = await createSlotReservation(session.uid, {
    date: input.date,
    time: input.time,
    track: input.track as TalkTrack,
    topic: input.topic || "",
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/talk-concert");
  return { ok: true };
}

export async function cancelSlotAction(id: string): Promise<SlotActionState> {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) {
    return { error: "로그인이 필요합니다." };
  }
  if (!id) return { error: "잘못된 요청입니다." };
  const res = await cancelSlotReservation(id, session.uid);
  if (!res.ok) return { error: res.error };
  revalidatePath("/talk-concert");
  return { ok: true };
}

// 토크콘서트 회차 예약 (학생 로그인 필요)
export async function reserveTalkAction(
  _prev: TalkActionState,
  formData: FormData
): Promise<TalkActionState> {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) {
    return { error: "예약하려면 학생 계정으로 로그인해 주세요." };
  }
  const sessionId = String(formData.get("sessionId") || "");
  if (!sessionId) return { error: "잘못된 요청입니다." };
  const res = await applyTalk(sessionId, session.uid);
  if (!res.ok) return { error: res.error };
  revalidatePath("/talk-concert");
  return { ok: true };
}

// 예약 취소
export async function cancelTalkAction(
  _prev: TalkActionState,
  formData: FormData
): Promise<TalkActionState> {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) {
    return { error: "로그인이 필요합니다." };
  }
  const sessionId = String(formData.get("sessionId") || "");
  if (!sessionId) return { error: "잘못된 요청입니다." };
  const res = await cancelTalk(sessionId, session.uid);
  if (!res.ok) return { error: res.error };
  revalidatePath("/talk-concert");
  return { ok: true };
}
