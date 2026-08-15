import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { FestZoneKey } from "./types";

// ─────────────────────────────────────────────────────────────
// JOB FESTIVAL 전용 세션 (멘토링 플랫폼 세션과 분리)
//  - 참가자 패스 : fest_pass    { vid }
//  - 부스 스태프 : fest_staff   { zone, boothId, boothName }
//  - 운영 관리자 : fest_admin   { admin: true }
// ─────────────────────────────────────────────────────────────

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-insecure-secret-change-me-please-32c"
);

const PASS_COOKIE = "fest_pass";
const STAFF_COOKIE = "fest_staff";
const ADMIN_COOKIE = "fest_admin";

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

async function sign(payload: Record<string, unknown>, exp: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret);
}

async function read<T>(name: string): Promise<T | null> {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as T;
  } catch {
    return null;
  }
}

// ── 참가자 패스 ──────────────────────────────────────────────
export interface PassSession {
  vid: string;
}

export async function createPassSession(visitorId: string) {
  const token = await sign({ vid: visitorId }, "30d");
  (await cookies()).set(PASS_COOKIE, token, { ...baseCookie, maxAge: 60 * 60 * 24 * 30 });
}

export async function getPassSession(): Promise<PassSession | null> {
  return read<PassSession>(PASS_COOKIE);
}

export async function destroyPassSession() {
  (await cookies()).delete(PASS_COOKIE);
}

// ── 부스 스태프 ──────────────────────────────────────────────
export interface StaffSession {
  zone: FestZoneKey | "entry";
  boothId: string;
  boothName: string;
  boothNo: string;
}

export async function createStaffSession(s: StaffSession) {
  const token = await sign({ ...s }, "2d");
  (await cookies()).set(STAFF_COOKIE, token, { ...baseCookie, maxAge: 60 * 60 * 48 });
}

export async function getStaffSession(): Promise<StaffSession | null> {
  return read<StaffSession>(STAFF_COOKIE);
}

export async function destroyStaffSession() {
  (await cookies()).delete(STAFF_COOKIE);
}

// ── 운영 관리자 ──────────────────────────────────────────────
export async function createAdminSession() {
  const token = await sign({ admin: true }, "1d");
  (await cookies()).set(ADMIN_COOKIE, token, { ...baseCookie, maxAge: 60 * 60 * 24 });
}

export async function isFestAdmin(): Promise<boolean> {
  const s = await read<{ admin?: boolean }>(ADMIN_COOKIE);
  return Boolean(s?.admin);
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
