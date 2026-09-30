import { all, one, patch, insert, remove } from "./data";
import { newToken } from "./crypto";
import type { Answer, Mentor, SettlementConfirmation } from "./types";

// 정산 기준일 기본값 (9/30 기준 답변 완료 건수)
export const SETTLE_ASOF_DEFAULT = "2026-09-30";
// 미승인 멘토 공통 수신번호 (개별 발송 불가 → 지급 대상 제외)
const COMMON = "01085536027";

// 기준일(포함) 마지막 시각 (KST 23:59:59)
function cutoffMs(asOf: string): number {
  return Date.parse(`${asOf}T23:59:59+09:00`);
}

/** 기준일까지 멘토별 답변 완료 건수 + 마지막 답변 시각 */
export async function answerCountsAsOf(
  asOf: string
): Promise<Map<string, { count: number; lastAt: string }>> {
  const answers = await all<Answer>("answers");
  const cut = cutoffMs(asOf);
  const m = new Map<string, { count: number; lastAt: string }>();
  for (const a of answers) {
    if (!a.mentorId) continue;
    const t = Date.parse(a.createdAt);
    if (Number.isFinite(t) && t > cut) continue; // 기준일 이후 답변은 제외
    const cur = m.get(a.mentorId) ?? { count: 0, lastAt: "" };
    cur.count += 1;
    if (!cur.lastAt || a.createdAt > cur.lastAt) cur.lastAt = a.createdAt;
    m.set(a.mentorId, cur);
  }
  return m;
}

export async function listSettlements(): Promise<SettlementConfirmation[]> {
  return all<SettlementConfirmation>("settlements");
}

export async function getSettlement(
  token: string
): Promise<SettlementConfirmation | undefined> {
  return one<SettlementConfirmation>("settlements", "token", token);
}

/** 멘토가 '확인' 클릭 → confirmedAt 기록 (이미 확인 시 그대로 유지) */
export async function confirmSettlement(
  token: string
): Promise<{ ok: true; alreadyConfirmed: boolean } | { ok: false; error: string }> {
  const row = await getSettlement(token);
  if (!row) return { ok: false, error: "유효하지 않은 링크입니다." };
  if (row.confirmedAt) return { ok: true, alreadyConfirmed: true };
  await patch("settlements", "token", token, { confirmedAt: new Date().toISOString() });
  return { ok: true, alreadyConfirmed: false };
}

export interface InitResult {
  asOf: string;
  eligibleMentors: number; // 기준일까지 1건 이상 답변한 멘토
  rows: SettlementRowView[];
}

export interface SettlementRowView {
  token?: string;
  mentorId: string;
  mentorName: string;
  company: string;
  phone: string; // 실번호 or "" (미승인)
  answerCount: number;
  approved: boolean; // 실번호 보유(발송 가능)
  confirmedAt?: string;
  created: boolean; // 이번에 새로 생성/갱신됨
}

/**
 * 기준일 스냅샷으로 정산 대상 행을 생성/갱신.
 *  - 멘토별 답변건수 계산 → 답변 1건 이상인 멘토마다 settlement 행 확보(토큰)
 *  - 기존 행이 있으면 건수/스냅샷만 갱신(확인 여부는 유지)
 *  - reset=true 면 기존 행 전체 삭제 후 재생성
 */
export async function initSettlements(opts: {
  asOf: string;
  reset?: boolean;
  nameFilter?: string;
}): Promise<InitResult> {
  const { asOf, reset, nameFilter } = opts;
  const [counts, mentors, existing] = await Promise.all([
    answerCountsAsOf(asOf),
    all<Mentor>("mentors"),
    all<SettlementConfirmation>("settlements"),
  ]);
  const mentorById = new Map(mentors.map((m) => [m.id, m]));

  if (reset) {
    for (const r of existing) await remove("settlements", "token", r.token);
    existing.length = 0;
  }
  const byMentor = new Map(existing.map((r) => [r.mentorId, r]));

  const rows: SettlementRowView[] = [];
  for (const [mentorId, { count }] of counts) {
    const mentor = mentorById.get(mentorId);
    if (!mentor) continue;
    if (nameFilter && mentor.name !== nameFilter) continue;
    const phoneRaw = (mentor.kakaoPhone || "").replace(/[^0-9]/g, "");
    const approved = Boolean(phoneRaw) && phoneRaw !== COMMON;

    const prior = byMentor.get(mentorId);
    let token = prior?.token;
    let created = false;
    if (!prior) {
      token = newToken();
      await insert("settlements", {
        token,
        mentorId,
        mentorName: mentor.name,
        company: mentor.company ?? "",
        phone: approved ? mentor.kakaoPhone! : "",
        asOf,
        answerCount: count,
        createdAt: new Date().toISOString(),
      });
      created = true;
    } else if (prior.answerCount !== count || prior.asOf !== asOf) {
      // 스냅샷 갱신 (확인 여부는 유지)
      await patch("settlements", "token", prior.token, {
        answerCount: count,
        asOf,
        company: mentor.company ?? "",
        phone: approved ? mentor.kakaoPhone! : "",
      });
      created = true;
    }
    rows.push({
      token,
      mentorId,
      mentorName: mentor.name,
      company: mentor.company ?? "",
      phone: approved ? mentor.kakaoPhone! : "",
      answerCount: count,
      approved,
      confirmedAt: prior?.confirmedAt,
      created,
    });
  }
  rows.sort((a, b) => b.answerCount - a.answerCount);
  return { asOf, eligibleMentors: rows.length, rows };
}
