"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { applyTalk, cancelTalk } from "@/lib/repo";

export type TalkActionState = { error?: string; ok?: boolean };

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
