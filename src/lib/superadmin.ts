import "server-only";

// 부울경 연합 전체 관리자 계정.
// 기본값을 두되, 운영 시 SUPER_ADMIN_USERNAME / SUPER_ADMIN_PASSWORD 환경변수로 덮어쓸 수 있음.
export const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || "usg-admin";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "Buulgyeong@2025!";

export function isSuperAdmin(username: string, password: string): boolean {
  return username.trim() === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD;
}
