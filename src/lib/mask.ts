// 이름 마스킹: 홍길동 → 홍*동, 김민 → 김*, 남궁민수 → 남**수
export function maskName(name: string): string {
  const n = (name ?? "").trim();
  if (n.length <= 1) return n;
  if (n.length === 2) return n[0] + "*";
  return n[0] + "*".repeat(n.length - 2) + n[n.length - 1];
}
