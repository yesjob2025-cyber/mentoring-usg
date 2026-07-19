import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Database } from "./types";
import { buildSeed } from "./seed";

// ─────────────────────────────────────────────────────────────
// 개발/데모용 JSON 파일 스토어.
// 외부 서비스 없이 즉시 구동됩니다. 프로덕션에서는 Supabase 로 교체.
// (src/lib/repo.ts 의 함수들이 이 스토어를 사용 → 교체 지점 명확)
// ─────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

type Cache = { db: Database | null };
// HMR/요청 간 유지되도록 globalThis 에 캐시
const g = globalThis as unknown as { __yesjobStore?: Cache };
if (!g.__yesjobStore) g.__yesjobStore = { db: null };
const cache = g.__yesjobStore;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
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
  fs.writeFileSync(DB_FILE, JSON.stringify(cache.db, null, 2), "utf8");
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
