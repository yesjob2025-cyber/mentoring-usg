import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Database } from "./types";
import { buildSeed } from "./seed";

// ─────────────────────────────────────────────────────────────
// 개발/데모용 JSON 파일 스토어.
// 외부 서비스 없이 즉시 구동됩니다. 프로덕션에서는 Supabase 로 교체.
// (src/lib/repo.ts 의 함수들이 이 스토어를 사용 → 교체 지점 명확)
//
// 서버리스(Vercel 등)는 작업 디렉터리가 읽기전용이므로 os.tmpdir() 를 사용.
// tmp 는 인스턴스 수명 동안만 유지되는 휘발성 저장소라 데모용으로만 적합하며,
// 실서비스 영속화는 Supabase 로 전환해야 함(README 참고).
// ─────────────────────────────────────────────────────────────

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), "yesjob-data")
  : path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

type Cache = { db: Database | null };
// HMR/요청 간 유지되도록 globalThis 에 캐시 (서버리스 warm 인스턴스에서도 유지)
const g = globalThis as unknown as { __yesjobStore?: Cache };
if (!g.__yesjobStore) g.__yesjobStore = { db: null };
const cache = g.__yesjobStore;

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // 읽기전용 FS — 메모리 캐시로만 동작
  }
}

function load(): Database {
  if (cache.db) return cache.db;
  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      cache.db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Database;
      return cache.db;
    } catch {
      // 손상 시 재시드
    }
  }
  cache.db = buildSeed();
  persist();
  return cache.db;
}

export function persist() {
  if (!cache.db) return;
  ensureDir();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cache.db, null, 2), "utf8");
  } catch {
    // 읽기전용 FS(서버리스) — 파일 저장 실패해도 메모리 캐시로 계속 동작
  }
}

/** 현재 DB(가변 객체) 반환 */
export function db(): Database {
  return load();
}

/** 뮤테이션 후 저장 */
export function commit<T>(fn: (d: Database) => T): T {
  const d = load();
  const result = fn(d);
  persist();
  return result;
}

/** 강제 재시드 (스크립트/관리용) */
export function reseed(): Database {
  cache.db = buildSeed();
  persist();
  return cache.db;
}
