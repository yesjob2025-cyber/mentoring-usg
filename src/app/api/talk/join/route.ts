import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { recordTalkJoin } from "@/lib/repo";
import { TALK_TEST_SESSION_ID } from "@/lib/talk-config";

// 화상 교육장 입장 기록 → 출석 id 반환
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let sessionId = "";
  try {
    ({ sessionId } = await req.json());
  } catch {
    /* ignore */
  }
  // 테스트 회차만 허용
  if (sessionId !== TALK_TEST_SESSION_ID) {
    return NextResponse.json({ error: "not-open" }, { status: 403 });
  }
  try {
    const row = await recordTalkJoin({
      sessionId,
      userId: session.uid,
      userName: session.name || "학생",
      schoolId: session.schoolId,
    });
    return NextResponse.json({ attendanceId: row.id });
  } catch (e) {
    // talk_attendance 테이블 미생성 등 — 화상 참여 자체는 막지 않음
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
