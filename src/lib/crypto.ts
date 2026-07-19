import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from "node:crypto";

/** scrypt 기반 비밀번호 해시 (salt:hash 형태) */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const hash = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  if (keyBuf.length !== hash.length) return false;
  return timingSafeEqual(hash, keyBuf);
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}
