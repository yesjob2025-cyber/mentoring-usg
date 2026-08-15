import "server-only";
import { headers } from "next/headers";

const FESTIVAL_HOSTS = (
  process.env.FESTIVAL_HOSTS || "jobfestival.co.kr,www.jobfestival.co.kr"
)
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/**
 * 축제 페이지의 경로 prefix.
 *  - jobfestival.co.kr  → ""          (예: /companies)
 *  - 그 외 도메인        → "/festival" (예: /festival/companies)
 */
export async function festBase(): Promise<string> {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
  return FESTIVAL_HOSTS.includes(host) ? "" : "/festival";
}

/** 서버 액션의 redirect 등에서 사용 */
export async function festPath(path: string): Promise<string> {
  const base = await festBase();
  return `${base}${path}` || "/";
}

/** QR 에 넣을 절대 URL */
export async function festAbsolute(path: string): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "jobfestival.co.kr";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = FESTIVAL_HOSTS.includes(host.split(":")[0].toLowerCase()) ? "" : "/festival";
  return `${proto}://${host}${base}${path}`;
}
