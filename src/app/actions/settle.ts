"use server";

import { confirmSettlement } from "@/lib/settlements";

export type SettleState = { ok?: boolean; already?: boolean; error?: string };

// 멘토가 정산 건수 확인 (공개 링크, 토큰 기반)
export async function confirmSettlementAction(token: string): Promise<SettleState> {
  if (!token) return { error: "잘못된 접근입니다." };
  const r = await confirmSettlement(token);
  if (!r.ok) return { error: r.error };
  return { ok: true, already: r.alreadyConfirmed };
}
