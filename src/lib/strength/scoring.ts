import type { ScoreResult, StrengthState, WorkTypeId } from "./types";
import { WORK_TYPE_IDS } from "./catalog";
import { WEAPONS, weaponsOfType } from "./weapons";
import { LIKERT_ITEMS, SITUATION_ITEMS } from "./questions";
import { externalTypeScores } from "./external";

/** 외부 검사 반영 비중 — 본인 행동 진단이 주(80%), 검사 결과는 보정(20%) */
const EXTERNAL_WEIGHT = 0.2;
/** 상황형 문항이 유형 점수에서 차지하는 비중 */
const SITUATION_WEIGHT = 0.3;

export function likertProgress(state: StrengthState) {
  const done = LIKERT_ITEMS.filter((i) => state.likert[i.id]).length;
  return { done, total: LIKERT_ITEMS.length };
}

export function situationProgress(state: StrengthState) {
  const done = SITUATION_ITEMS.filter((i) => state.situation[i.id]).length;
  return { done, total: SITUATION_ITEMS.length };
}

export function isDiagnosisComplete(state: StrengthState) {
  const l = likertProgress(state);
  const s = situationProgress(state);
  return l.done === l.total && s.done === s.total;
}

/** 리커트 1~5 → 0~100 */
function toPct(v: number | undefined) {
  if (!v) return 0;
  return ((v - 1) / 4) * 100;
}

export function computeScores(state: StrengthState): ScoreResult {
  // 1) 무기 점수
  const weaponScores: Record<string, number> = {};
  for (const item of LIKERT_ITEMS) {
    weaponScores[item.weaponId] = Math.round(toPct(state.likert[item.id]));
  }
  for (const w of WEAPONS) {
    if (weaponScores[w.id] === undefined) weaponScores[w.id] = 0;
  }

  // 2) 유형 기본 점수 = 소속 무기 4개 평균
  const base = {} as Record<WorkTypeId, number>;
  for (const id of WORK_TYPE_IDS) {
    const ws = weaponsOfType(id);
    base[id] = ws.reduce((sum, w) => sum + (weaponScores[w.id] ?? 0), 0) / ws.length;
  }

  // 3) 상황형 문항 반영
  const picks = {} as Record<WorkTypeId, number>;
  for (const id of WORK_TYPE_IDS) picks[id] = 0;
  let answered = 0;
  for (const item of SITUATION_ITEMS) {
    const chosen = state.situation[item.id];
    if (chosen) {
      picks[chosen] += 1;
      answered += 1;
    }
  }
  const situationPct = {} as Record<WorkTypeId, number>;
  for (const id of WORK_TYPE_IDS) {
    situationPct[id] = answered ? (picks[id] / answered) * 100 : 0;
  }

  const blended = {} as Record<WorkTypeId, number>;
  for (const id of WORK_TYPE_IDS) {
    blended[id] = answered
      ? base[id] * (1 - SITUATION_WEIGHT) + situationPct[id] * SITUATION_WEIGHT
      : base[id];
  }

  // 4) 외부 검사 보정 (사용자가 반영을 선택한 경우에만)
  const ext = state.external.reflect ? externalTypeScores(state.external) : null;
  const typeScores = {} as Record<WorkTypeId, number>;
  for (const id of WORK_TYPE_IDS) {
    const v = ext ? blended[id] * (1 - EXTERNAL_WEIGHT) + ext[id] * EXTERNAL_WEIGHT : blended[id];
    typeScores[id] = Math.round(v);
  }

  const rankedTypes = [...WORK_TYPE_IDS].sort((a, b) => typeScores[b] - typeScores[a]);

  // 5) 무기 순위 — 무기 점수 위주, 동점은 소속 유형 점수로 정렬
  const rankedWeapons = [...WEAPONS]
    .map((w) => ({
      id: w.id,
      key: (weaponScores[w.id] ?? 0) * 0.85 + typeScores[w.typeId] * 0.15,
    }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.id);

  return { typeScores, weaponScores, rankedTypes, rankedWeapons };
}

/** 진단 전 상태(모두 0)인지 */
export function hasAnyAnswer(state: StrengthState) {
  return Object.keys(state.likert).length > 0 || Object.keys(state.situation).length > 0;
}

/** 대표 유형 — 사용자가 직접 고른 값이 있으면 그것을, 없으면 1위 */
export function primaryType(state: StrengthState, score: ScoreResult): WorkTypeId {
  return state.pickedType ?? score.rankedTypes[0];
}

/** 보조 유형 — 대표 유형 다음으로 높은 유형 */
export function secondaryType(state: StrengthState, score: ScoreResult): WorkTypeId {
  const p = primaryType(state, score);
  return score.rankedTypes.find((t) => t !== p) ?? score.rankedTypes[1];
}

/** 확정 무기 — 사용자가 고른 3개, 없으면 상위 3개 */
export function effectiveWeapons(state: StrengthState, score: ScoreResult): string[] {
  if (state.pickedWeapons.length > 0) return state.pickedWeapons;
  return score.rankedWeapons.slice(0, 3);
}
