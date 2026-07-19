import { NextResponse } from "next/server";
import { count, usingSupabase, type Collection } from "@/lib/data";

// DB 진단: /api/diag/db?secret=<SEED_SECRET>
// 각 테이블에 count 를 시도해 연결/테이블 상태를 개별 확인.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }

  const collections: Collection[] = [
    "schools",
    "users",
    "mentors",
    "questions",
    "answers",
    "answerTokens",
    "payouts",
    "activity",
    "talkSessions",
  ];

  const tables: Record<string, string> = {};
  for (const c of collections) {
    try {
      const n = await count(c);
      tables[c] = `ok (${n} rows)`;
    } catch (e) {
      tables[c] = `ERROR: ${(e as Error).message}`;
    }
  }

  return NextResponse.json({
    backend: usingSupabase ? "supabase" : "json",
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_URL_host: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "")
        .replace(/^https?:\/\//, "")
        .split(".")[0]
        .slice(0, 8),
    },
    tables,
  });
}
