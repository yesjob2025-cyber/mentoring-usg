import type { ExternalInput, TypeWeights, WorkTypeId } from "./types";
import { WORK_TYPE_IDS, WORK_TYPE_MAP } from "./catalog";

/**
 * 이미 받아본 검사(MBTI·DISC·홀랜드 직업적성)를 **일 강점 유형 언어로 번역**한다.
 * 검사 결과를 그대로 쓰면 "저는 ENFP라 사람을 좋아합니다" 수준에서 끝나므로,
 * 여기서는 반드시 '일터에서의 행동'으로 옮겨 적는다.
 */

export interface ExternalProfile {
  code: string;
  label: string;
  /** 일 관점 번역 — 서류에 그대로 옮겨 쓸 수 있는 표현 */
  translation: string;
  weights: TypeWeights;
}

export const MBTI_PROFILES: ExternalProfile[] = [
  {
    code: "ISTJ",
    label: "현실적인 관리자",
    translation: "정해진 기준과 기록으로 일을 굴러가게 만드는 사람 — 일터에서는 정확성과 납기 준수로 신뢰를 얻습니다.",
    weights: { admin: 1, improve: 0.5, plan: 0.3 },
  },
  {
    code: "ISFJ",
    label: "성실한 조력자",
    translation: "맡은 범위를 빈틈없이 지키며 주변을 챙기는 사람 — 지원·관리 업무에서 사고를 막는 역할을 합니다.",
    weights: { admin: 1, comm: 0.6, solve: 0.3 },
  },
  {
    code: "INFJ",
    label: "통찰형 기획자",
    translation: "사람과 맥락을 함께 읽어 방향을 잡는 사람 — 기획과 조율이 동시에 필요한 일에서 강합니다.",
    weights: { plan: 0.8, comm: 0.7 },
  },
  {
    code: "INTJ",
    label: "전략 설계자",
    translation: "목표에서 거꾸로 구조를 짜는 사람 — 장기 과제의 기준과 계획을 세우는 일에 맞습니다.",
    weights: { plan: 1, improve: 0.6 },
  },
  {
    code: "ISTP",
    label: "현장 해결사",
    translation: "말보다 손이 먼저 움직여 문제를 처리하는 사람 — 돌발 상황과 현장 대응에서 진가가 납니다.",
    weights: { solve: 1, improve: 0.6, act: 0.5 },
  },
  {
    code: "ISFP",
    label: "유연한 실무자",
    translation: "분위기와 상황에 맞춰 조용히 일을 맞춰가는 사람 — 고객 접점과 협업에서 마찰을 줄입니다.",
    weights: { comm: 0.8, solve: 0.5 },
  },
  {
    code: "INFP",
    label: "의미 중심 기획자",
    translation: "'왜 하는지'가 분명할 때 몰입하는 사람 — 메시지·콘셉트를 만드는 일에서 힘이 납니다.",
    weights: { comm: 0.8, plan: 0.6 },
  },
  {
    code: "INTP",
    label: "구조 분석가",
    translation: "원리를 파고들어 더 나은 방식을 찾는 사람 — 분석과 개선 과제에 잘 맞습니다.",
    weights: { plan: 0.9, improve: 0.8 },
  },
  {
    code: "ESTP",
    label: "돌파형 실행가",
    translation: "상황이 복잡해도 일단 움직여 결과를 만드는 사람 — 영업·현장에서 성과가 빠르게 드러납니다.",
    weights: { act: 1, solve: 0.8 },
  },
  {
    code: "ESFP",
    label: "현장 소통가",
    translation: "사람들 사이에서 에너지를 만드는 사람 — 고객 응대와 분위기 주도에서 강합니다.",
    weights: { comm: 0.9, act: 0.7 },
  },
  {
    code: "ENFP",
    label: "아이디어 촉진자",
    translation: "새 판을 벌이고 사람을 끌어들이는 사람 — 기획 초기와 대외 협업에서 추진력이 됩니다.",
    weights: { act: 0.8, comm: 0.8, plan: 0.5 },
  },
  {
    code: "ENTP",
    label: "혁신 제안가",
    translation: "기존 방식에 의문을 던지고 대안을 내는 사람 — 개선·신사업 과제에서 두각을 냅니다.",
    weights: { improve: 0.9, plan: 0.8 },
  },
  {
    code: "ESTJ",
    label: "추진형 관리자",
    translation: "기준을 세우고 사람을 움직여 마감을 지키는 사람 — 운영·관리 조직에서 신뢰를 얻습니다.",
    weights: { admin: 0.9, act: 0.8, plan: 0.4 },
  },
  {
    code: "ESFJ",
    label: "관계형 운영자",
    translation: "사람 사이의 일이 매끄럽게 돌아가게 만드는 사람 — 고객·내부 조율 업무에 맞습니다.",
    weights: { comm: 1, admin: 0.6 },
  },
  {
    code: "ENFJ",
    label: "설득형 리더",
    translation: "사람을 설득해 함께 움직이게 만드는 사람 — 교육·영업·조직 관리에서 성과를 냅니다.",
    weights: { comm: 1, act: 0.6, plan: 0.4 },
  },
  {
    code: "ENTJ",
    label: "목표 지향 리더",
    translation: "목표를 정하고 자원을 배치해 끝까지 밀어붙이는 사람 — 기획과 실행을 동시에 요구하는 자리에 맞습니다.",
    weights: { plan: 1, act: 0.9 },
  },
];

export const DISC_PROFILES: ExternalProfile[] = [
  {
    code: "D",
    label: "주도형 (Dominance)",
    translation: "결과와 속도를 우선하는 스타일 — 목표가 서면 바로 실행에 옮기고 위기에서 결정을 내립니다.",
    weights: { act: 1, solve: 0.7, plan: 0.4 },
  },
  {
    code: "I",
    label: "사교형 (Influence)",
    translation: "사람을 통해 일을 푸는 스타일 — 설득·홍보·관계 형성이 필요한 업무에서 힘을 냅니다.",
    weights: { comm: 1, act: 0.7 },
  },
  {
    code: "S",
    label: "안정형 (Steadiness)",
    translation: "꾸준함과 협조로 일을 유지하는 스타일 — 반복 업무의 품질과 팀 안정에 기여합니다.",
    weights: { admin: 0.8, comm: 0.7 },
  },
  {
    code: "C",
    label: "신중형 (Conscientiousness)",
    translation: "정확성과 근거를 중시하는 스타일 — 검수·분석·기준 수립 업무에서 실수를 줄입니다.",
    weights: { admin: 1, plan: 0.7, improve: 0.6 },
  },
];

export const HOLLAND_PROFILES: ExternalProfile[] = [
  {
    code: "R",
    label: "현실형 (Realistic)",
    translation: "직접 다루고 만들며 문제를 해결하는 유형 — 현장·설비·운영 업무와 잘 맞습니다.",
    weights: { solve: 0.8, admin: 0.6, improve: 0.6 },
  },
  {
    code: "I",
    label: "탐구형 (Investigative)",
    translation: "원인과 근거를 따지는 유형 — 분석·기획·품질 업무에서 강점이 드러납니다.",
    weights: { plan: 1, improve: 0.6 },
  },
  {
    code: "A",
    label: "예술형 (Artistic)",
    translation: "표현과 콘셉트로 차별화를 만드는 유형 — 브랜딩·콘텐츠·기획 업무에 맞습니다.",
    weights: { plan: 0.8, comm: 0.5 },
  },
  {
    code: "S",
    label: "사회형 (Social)",
    translation: "사람을 돕고 가르치는 데서 성과를 내는 유형 — 교육·상담·고객 업무에 맞습니다.",
    weights: { comm: 1, solve: 0.4 },
  },
  {
    code: "E",
    label: "진취형 (Enterprising)",
    translation: "설득하고 주도해 성과를 만드는 유형 — 영업·기획·창업 분야에서 힘을 냅니다.",
    weights: { act: 1, comm: 0.7, plan: 0.5 },
  },
  {
    code: "C",
    label: "관습형 (Conventional)",
    translation: "규칙과 데이터를 정확히 다루는 유형 — 회계·총무·관리 업무에 적합합니다.",
    weights: { admin: 1, improve: 0.5 },
  },
];

export const MBTI_CODES = MBTI_PROFILES.map((p) => p.code);

function findProfile(list: ExternalProfile[], code?: string) {
  if (!code) return undefined;
  return list.find((p) => p.code === code.toUpperCase());
}

export function externalProfiles(input: ExternalInput): ExternalProfile[] {
  const out: ExternalProfile[] = [];
  const mbti = findProfile(MBTI_PROFILES, input.mbti);
  if (mbti) out.push(mbti);
  const disc = findProfile(DISC_PROFILES, input.disc);
  if (disc) out.push(disc);
  for (const h of input.holland ?? []) {
    const p = findProfile(HOLLAND_PROFILES, h);
    if (p) out.push(p);
  }
  return out;
}

/** 외부 검사들을 합쳐 0~100 스케일의 유형 성향 벡터로 변환 */
export function externalTypeScores(input: ExternalInput): Record<WorkTypeId, number> | null {
  const profiles = externalProfiles(input);
  if (profiles.length === 0) return null;

  const sum = {} as Record<WorkTypeId, number>;
  for (const id of WORK_TYPE_IDS) sum[id] = 0;
  for (const p of profiles) {
    for (const [k, v] of Object.entries(p.weights)) {
      sum[k as WorkTypeId] += v ?? 0;
    }
  }
  const max = Math.max(...WORK_TYPE_IDS.map((id) => sum[id]), 0.0001);
  const out = {} as Record<WorkTypeId, number>;
  for (const id of WORK_TYPE_IDS) out[id] = Math.round((sum[id] / max) * 100);
  return out;
}

/** "검사 결과 ↔ 진단 결과"를 비교해 서류에 쓸 한 줄 코멘트를 만든다 */
export function crossComment(
  externalTop: WorkTypeId | null,
  diagnosedTop: WorkTypeId,
): string {
  if (!externalTop) {
    return "외부 검사 결과를 입력하면 진단 결과와 교차 확인할 수 있습니다.";
  }
  const ex = WORK_TYPE_MAP[externalTop];
  const di = WORK_TYPE_MAP[diagnosedTop];
  if (externalTop === diagnosedTop) {
    return `검사 결과와 행동 진단이 모두 ${di.name}으로 일치합니다. 서류에서 "${di.tagline}"이라는 표현을 자신 있게 밀고 가도 됩니다.`;
  }
  return `검사 결과는 ${ex.name} 성향, 실제 행동 진단은 ${di.name}으로 나왔습니다. 이런 경우 서류에는 **행동 진단(${di.name})**을 중심에 두고, ${ex.name}은 보조 강점으로 덧붙이면 설득력이 높아집니다. (성향은 ${ex.name}이지만 실제 상황에서는 ${di.name}으로 움직였다는 사례가 있으면 가장 좋습니다.)`;
}
