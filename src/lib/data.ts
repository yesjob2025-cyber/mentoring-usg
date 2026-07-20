import "server-only";
import type { Database } from "./types";
import { hasSupabase, supabase } from "./supabase";
import { db, persist } from "./store";

// ─────────────────────────────────────────────────────────────
// 데이터 접근 추상화
//  - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 있으면 → Supabase(영구)
//  - 없으면 → 로컬 JSON 스토어(데모)
//  repo.ts 는 이 저수준 API 만 사용 → 백엔드 교체 지점이 여기 하나로 모임
// ─────────────────────────────────────────────────────────────

export type Collection = keyof Database; // schools | users | mentors | ...

// Database 컬렉션명 → Supabase 테이블명
const TABLE: Record<Collection, string> = {
  schools: "schools",
  users: "users",
  mentors: "mentors",
  questions: "questions",
  answers: "answers",
  answerTokens: "answer_tokens",
  payouts: "payouts",
  activity: "activity",
  talkSessions: "talk_sessions",
};

export const usingSupabase = hasSupabase;

export async function all<T = Record<string, unknown>>(c: Collection): Promise<T[]> {
  if (hasSupabase) {
    const { data, error } = await supabase().from(TABLE[c]).select("*").limit(5000);
    if (error) throw new Error(`[data.all ${c}] ${error.message}`);
    return (data ?? []) as T[];
  }
  return (db()[c] as unknown as T[]).map((x) => ({ ...(x as object) })) as T[];
}

export async function one<T = Record<string, unknown>>(
  c: Collection,
  idField: string,
  idValue: string
): Promise<T | undefined> {
  if (hasSupabase) {
    const { data, error } = await supabase()
      .from(TABLE[c])
      .select("*")
      .eq(idField, idValue)
      .maybeSingle();
    if (error) throw new Error(`[data.one ${c}] ${error.message}`);
    return (data ?? undefined) as T | undefined;
  }
  const rows = db()[c] as unknown as Record<string, unknown>[];
  return rows.find((r) => r[idField] === idValue) as T | undefined;
}

export async function insert(c: Collection, row: Record<string, unknown>): Promise<void> {
  if (hasSupabase) {
    const { error } = await supabase().from(TABLE[c]).insert(row);
    if (error) throw new Error(`[data.insert ${c}] ${error.message}`);
    return;
  }
  (db()[c] as unknown as Record<string, unknown>[]).push(row);
  persist();
}

export async function insertMany(c: Collection, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  if (hasSupabase) {
    // 대량 삽입은 청크로
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase().from(TABLE[c]).insert(rows.slice(i, i + 500));
      if (error) throw new Error(`[data.insertMany ${c}] ${error.message}`);
    }
    return;
  }
  (db()[c] as unknown as Record<string, unknown>[]).push(...rows);
  persist();
}

export async function patch(
  c: Collection,
  idField: string,
  idValue: string,
  changes: Record<string, unknown>
): Promise<void> {
  if (hasSupabase) {
    const { error } = await supabase().from(TABLE[c]).update(changes).eq(idField, idValue);
    if (error) throw new Error(`[data.patch ${c}] ${error.message}`);
    return;
  }
  const rows = db()[c] as unknown as Record<string, unknown>[];
  const row = rows.find((r) => r[idField] === idValue);
  if (row) Object.assign(row, changes);
  persist();
}

export async function clear(c: Collection): Promise<void> {
  if (hasSupabase) {
    const idField = c === "answerTokens" ? "token" : "id";
    const { error } = await supabase().from(TABLE[c]).delete().neq(idField, "__never_matches__");
    if (error) throw new Error(`[data.clear ${c}] ${error.message}`);
    return;
  }
  (db()[c] as unknown[]).length = 0;
  persist();
}

export async function count(c: Collection): Promise<number> {
  if (hasSupabase) {
    const { count: n, error } = await supabase()
      .from(TABLE[c])
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(`[data.count ${c}] ${error.message}`);
    return n ?? 0;
  }
  return (db()[c] as unknown[]).length;
}
