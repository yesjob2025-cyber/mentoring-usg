import "server-only";
import { buildSeed } from "./seed";
import { count, insertMany, usingSupabase, type Collection } from "./data";

// Supabase 가 비어 있으면 시드 데이터를 채운다. (JSON 백엔드는 store 가 자동 시드하므로 불필요)
export async function seedIfEmpty(
  force = false
): Promise<{ seeded: boolean; reason?: string; counts?: Record<string, number> }> {
  if (!usingSupabase) return { seeded: false, reason: "json-backend-auto-seeds" };

  if (!force) {
    const existing = await count("schools");
    if (existing > 0) return { seeded: false, reason: "already-seeded" };
  }

  const d = buildSeed();
  const order: Collection[] = [
    "schools",
    "mentors",
    "users",
    "questions",
    "answers",
    "answerTokens",
    "payouts",
    "activity",
    "talkSessions",
  ];
  const counts: Record<string, number> = {};
  for (const c of order) {
    const rows = d[c] as unknown as Record<string, unknown>[];
    await insertMany(c, rows);
    counts[c] = rows.length;
  }
  return { seeded: true, counts };
}
