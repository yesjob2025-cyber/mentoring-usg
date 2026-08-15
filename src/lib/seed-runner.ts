import "server-only";
import { buildSeed } from "./seed";
import { buildFestivalSeed } from "./festival/seed";
import { count, insertMany, clear, usingSupabase, type Collection } from "./data";

// 멘토만 교체 (학교·학생·질문 데이터는 보존)
export async function reseedMentors(): Promise<{ reseeded: string; count: number }> {
  const d = buildSeed();
  await clear("mentors");
  await insertMany("mentors", d.mentors as unknown as Record<string, unknown>[]);
  return { reseeded: "mentors", count: d.mentors.length };
}

// JOB FESTIVAL 부스 데이터만 채우기 (참가자·지원 데이터는 보존)
export async function reseedFestival(
  force = false
): Promise<{ seeded: boolean; reason?: string; counts?: Record<string, number> }> {
  if (!usingSupabase) return { seeded: false, reason: "json-backend-auto-seeds" };
  if (!force && (await count("festCompanies")) > 0) {
    return { seeded: false, reason: "already-seeded" };
  }

  const d = buildFestivalSeed() as unknown as Record<string, unknown[]>;
  const booths: Collection[] = [
    "festCompanies",
    "festJobs",
    "festPromos",
    "festEvents",
    "festInterviewSlots",
  ];
  const counts: Record<string, number> = {};
  for (const c of booths) {
    const rows = d[c] as unknown as Record<string, unknown>[];
    if (force) await clear(c);
    await insertMany(c, rows);
    counts[c] = rows.length;
  }
  return { seeded: true, counts };
}

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
    "talkAttendance",
    "festCompanies",
    "festJobs",
    "festPromos",
    "festEvents",
    "festInterviewSlots",
  ];
  const counts: Record<string, number> = {};
  for (const c of order) {
    const rows = d[c] as unknown as Record<string, unknown>[];
    await insertMany(c, rows);
    counts[c] = rows.length;
  }
  return { seeded: true, counts };
}
