import { NextResponse } from "next/server";
import { sendTestMessage, messagingProvider } from "@/lib/messaging";

// 진단: /api/diag/sms?secret=<SEED_SECRET>&to=01012345678
// 현재 provider 로 실제 발송을 1건 시도하고, 알리고 원본 응답을 그대로 반환.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const to =
    url.searchParams.get("to") ||
    process.env.TEST_REDIRECT_PHONE ||
    process.env.ALIGO_SENDER ||
    "";
  if (!to) return NextResponse.json({ error: "to 파라미터 또는 TEST_REDIRECT_PHONE 필요" }, { status: 400 });

  const result = await sendTestMessage(to);
  return NextResponse.json({ configuredProvider: messagingProvider, requestedTo: to, ...result });
}
