import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// ─────────────────────────────────────────────────────────────
// 쿠키 기반 세션 (jose JWT 서명)
//  - 학생 세션: { uid, schoolId, role: "student" }
//  - 관리자 세션: { schoolId, role: "admin" }
// ─────────────────────────────────────────────────────────────

const COOKIE = "yesjob_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-insecure-secret-change-me-please-32c"
);

export interface SessionData {
  role: "student" | "admin";
  uid?: string; // student user id
  schoolId: string;
  name?: string;
}

export async function createSession(data: SessionData) {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}
