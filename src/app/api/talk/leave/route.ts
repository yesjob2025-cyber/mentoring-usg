import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { recordTalkLeave } from "@/lib/repo";

// 화상 교육장 퇴장 기록 (sendBeacon 지원: text 본문 허용)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let attendanceId = "";
  try {
    const raw = await req.text();
    if (raw) attendanceId = (JSON.parse(raw).attendanceId as string) || "";
  } catch {
    /* ignore */
  }
  if (!attendanceId) return NextResponse.json({ ok: true });
  try {
    await recordTalkLeave(attendanceId, session.uid);
  } catch {
    /* 로그 실패해도 무시 */
  }
  return NextResponse.json({ ok: true });
}
