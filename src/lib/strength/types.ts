/**
 * 일 강점 진단 — 도메인 타입
 *
 * 개인 성향(긍정·경청·꼼꼼)이 아니라 **일하는 방식(Work Style)** 관점에서
 * 6개 유형 × 유형별 4개 "무기"(강점 행동)로 자신을 정의하고,
 * 그 무기에 맞는 사례·경험을 붙여 입사서류 전략까지 만드는 흐름을 위한 타입.
 */

export type WorkTypeId = "plan" | "act" | "admin" | "comm" | "solve" | "improve";

export interface WorkType {
  id: WorkTypeId;
  /** 기획형, 실행형 … */
  name: string;
  /** 한 줄 정의 (원자료 기준) */
  tagline: string;
  emoji: string;
  /** 이 유형이 조직에서 만들어내는 가치 */
  value: string;
  /** 일하는 장면 이미지 — "이 사람은 회사에서 이렇게 보인다" */
  scenes: string[];
  /** 이 유형이 특히 강하게 먹히는 직무 */
  fitJobs: string[];
  /** 서류·면접에서 쓰기 좋은 키워드 */
  keywords: string[];
  /** 과하면 이렇게 읽힌다 — 보완 서술용 */
  overuse: string;
  /** 이 유형이 대체로 함께 쓰면 좋은 보조 유형 */
  pairsWith: WorkTypeId[];
}

export interface WeaponCase {
  /** 어떤 상황(학교/알바/동아리/대외활동/프로젝트) */
  context: string;
  /** 그 상황에서 이 무기를 쓴 행동 */
  action: string;
  /** 결과·수치 표현 예시 */
  result: string;
}

export interface Weapon {
  id: string;
  typeId: WorkTypeId;
  /** [트렌드 포착] 처럼 대괄호 안에 있던 이름 */
  name: string;
  /** 원자료 문장 (…하는 무기) */
  headline: string;
  /** 일의 관점에서 다시 쓴 정의 */
  definition: string;
  /** 이미지화 — 실제 회사에서 이 무기가 발휘되는 장면 */
  scene: string;
  /** 이 무기가 직접적으로 요구되는 직무 */
  jobFit: string[];
  /** 내 경험을 끌어내는 질문 */
  evidencePrompts: string[];
  /** 대학생 수준에서 실제로 있을 법한 사례 */
  cases: WeaponCase[];
  /** 서류에 쓰기 좋은 행동 동사 */
  actionVerbs: string[];
  /** 성과를 수치로 바꾸는 힌트 */
  metricHints: string[];
  /** 이력서 한 줄 요약 템플릿 */
  resumeLine: string;
  /** 자기소개서 문단 뼈대 */
  coverLetterSkeleton: string;
  /** 이 무기를 적으면 따라오는 면접 질문 */
  interviewQuestions: string[];
}

/** 진단 1단계 — 무기별 행동 문항(리커트) */
export interface LikertItem {
  id: string;
  weaponId: string;
  typeId: WorkTypeId;
  text: string;
}

/** 진단 2단계 — 상황형 문항(6지선다, 유형 판별) */
export interface SituationItem {
  id: string;
  situation: string;
  options: { typeId: WorkTypeId; text: string }[];
}

/** 외부 검사(MBTI/DISC/홀랜드) 결과를 일 유형 성향으로 옮긴 값 */
export type TypeWeights = Partial<Record<WorkTypeId, number>>;

export interface ExternalInput {
  /** ENFP 등 4글자 */
  mbti?: string;
  /** D/I/S/C 주 유형 */
  disc?: "D" | "I" | "S" | "C";
  /** 홀랜드(직업적성) 코드 상위 2개 */
  holland?: string[];
  /** 그 밖의 검사 결과 메모 (강점검사·직업선호도 등) */
  memo?: string;
  /** 외부 검사 결과를 종합 점수에 반영할지 */
  reflect: boolean;
}

export interface ScoreResult {
  /** 0~100 */
  typeScores: Record<WorkTypeId, number>;
  weaponScores: Record<string, number>;
  rankedTypes: WorkTypeId[];
  rankedWeapons: string[];
}

/** 경험 정리(STAR) */
export interface ExperienceEntry {
  id: string;
  weaponId: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  /** 숫자로 바꾼 성과 */
  metric: string;
}

export interface StrengthState {
  version: 1;
  /** likert item id -> 1~5 */
  likert: Record<string, number>;
  /** situation item id -> 선택한 유형 */
  situation: Record<string, WorkTypeId>;
  external: ExternalInput;
  /** 사용자가 확정한 대표 무기 3개 */
  pickedWeapons: string[];
  /** 사용자가 확정한 대표 유형(비우면 진단 1위) */
  pickedType?: WorkTypeId;
  experiences: ExperienceEntry[];
  /** 6단계 전략에서 지원 회사/직무 맥락 */
  target: { company: string; job: string };
  updatedAt: string;
}
