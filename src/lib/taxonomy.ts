import type { ThemeItem, ThemeKind } from "./types";

// 제안서 "산업 / 직무 테마 구성" 기준 분류 데이터
// ── 산업 (14) ─────────────────────────────────────────────
const INDUSTRIES = [
  "자동차",
  "반도체",
  "IT서비스",
  "전기전자",
  "항공/방산",
  "제약바이오",
  "식품",
  "물류/유통",
  "보건의료",
  "에너지",
  "금융",
  "방송/미디어",
  "디자인",
  "건설/교통",
];

// ── 직무 (28) ─────────────────────────────────────────────
const JOBS = [
  "인사총무",
  "마케팅",
  "회계세무",
  "사업기획",
  "영업",
  "SW개발",
  "IT인프라",
  "UI/UX",
  "AI/데이터",
  "기계설계",
  "전기설계",
  "생산관리",
  "품질관리",
  "구매",
  "연구개발",
  "안전관리",
  "금융상담",
  "전문의료",
  "헬스케어",
  "콘텐츠기획",
  "디자인",
  "매장관리",
  "사회복지",
  "브랜드",
  "고객서비스",
  "컨설팅",
  "해외영업",
  "행정지원",
];

// ── 기업유형 (6) ──────────────────────────────────────────
const COMPANY_TYPES = [
  "대기업",
  "공기업/공공기관",
  "중견기업",
  "중소기업",
  "외국계",
  "스타트업",
];

// ── 전공 계열 (6) ─────────────────────────────────────────
const MAJORS = [
  "이공계열",
  "인문·상경계열",
  "IT·컴퓨터",
  "보건·의료복지",
  "디자인·예술",
  "기타",
];

// ── 대표 참여 기업 (제안서 "지역 대표 기업 참여 유도") ────────
const COMPANIES = [
  "삼성전자",
  "삼성SDS",
  "삼성전기",
  "LG전자",
  "LG CNS",
  "LG디스플레이",
  "SK하이닉스",
  "SK텔레콤",
  "SK네트웍스",
  "SK플라즈마",
  "일진전기",
  "한국인삼공사",
  "앰버서더 호텔 그룹",
  "호텔신라",
  "네이버",
  "카카오",
  "당근마켓",
  "우아한형제들",
  "토스",
  "미디어젠",
  "현대자동차",
  "기아자동차",
  "르노코리아",
  "GM",
  "닛산자동차",
  "윌로펌프",
  "화승코퍼레이션",
  "넥센",
  "ASML",
  "대학병원",
  "다이소",
  "올리브영",
  "농협",
  "우리은행",
  "풀무원푸드앤컬쳐",
  "대웅제약",
  "볼보그룹",
  "한화에어로스페이스",
  "한화오션",
  "이랜드그룹",
  "스타벅스",
];

function build(kind: ThemeKind, prefix: string, names: string[]): ThemeItem[] {
  return names.map((name, i) => ({ id: `${prefix}-${i + 1}`, name, kind }));
}

export const industries = build("industry", "ind", INDUSTRIES);
export const jobs = build("job", "job", JOBS);
export const companyTypes = build("type", "type", COMPANY_TYPES);
export const majors = build("major", "maj", MAJORS);
export const companies = build("company", "co", COMPANIES);

export const taxonomy = {
  industry: industries,
  job: jobs,
  company: companies,
  type: companyTypes,
  major: majors,
} as const;

export const themeMeta: Record<
  ThemeKind,
  { label: string; short: string; desc: string; icon: string }
> = {
  industry: {
    label: "산업",
    short: "산업",
    desc: "다양한 기업·직무 관점에서 말하는 산업 트렌드, 현황, 뉴스",
    icon: "🏭",
  },
  job: {
    label: "직무",
    short: "직무",
    desc: "다른 산업·기업의 다양한 관점의 직무 이야기",
    icon: "🧑‍💼",
  },
  company: {
    label: "기업",
    short: "기업",
    desc: "관심 기업 현직자의 실무와 조직 이야기",
    icon: "🏢",
  },
  type: {
    label: "유형",
    short: "유형",
    desc: "대기업·공기업·중견기업 등 기업유형별 특징과 조직 환경",
    icon: "🗂️",
  },
  major: {
    label: "전공",
    short: "전공",
    desc: "전공 분야에 맞는 커리어·진로 고민과 방향 제시",
    icon: "🎓",
  },
};

const allItems: ThemeItem[] = [
  ...industries,
  ...jobs,
  ...companyTypes,
  ...majors,
  ...companies,
];

const byId = new Map(allItems.map((t) => [t.id, t]));

export function themeName(id?: string): string | undefined {
  if (!id) return undefined;
  return byId.get(id)?.name;
}

export function themeById(id: string): ThemeItem | undefined {
  return byId.get(id);
}

export function itemsOf(kind: ThemeKind): ThemeItem[] {
  return taxonomy[kind];
}
