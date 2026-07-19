import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/seed-runner";

// 보호된 시드 엔드포인트: /api/seed?secret=... [&force=1]
// SEED_SECRET 환경변수와 일치해야 실행. Supabase 를 시드 데이터로 채운다.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const force = url.searchParams.get("force") === "1";

  if (!process.env.SEED_SECRET) {
    return NextResponse.json({ error: "SEED_SECRET 미설정" }, { status: 400 });
  }
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await seedIfEmpty(force);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
