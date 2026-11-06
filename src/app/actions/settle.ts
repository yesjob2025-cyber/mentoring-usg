"use server";

import { getSession } from "@/lib/session";
import { confirmSettlement, setPaid } from "@/lib/settlements";
import { revalidatePath } from "next/cache";

export type SettleState = { ok?: boolean; already?: boolean; error?: string };

// 멘토가 정산 건수 확인 (공개 링크, 토큰 기반)
export async function confirmSettlementAction(token: string): Promise<SettleState> {
  if (!token) return { error: "잘못된 접근입니다." };
  const r = await confirmSettlement(token);
  if (!r.ok) return { error: r.error };
  return { ok: true, already: r.alreadyConfirmed };
}

// 운영자 지급완료 처리 토글 (관리자 전용)
export async function setPaidAction(token: string, paid: boolean): Promise<SettleState> {
  const session = await getSession();
  if (!session || session.role !== "superadmin") return { error: "권한이 없습니다." };
  const r = await setPaid(token, paid);
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/settlements");
  return { ok: true };
}
