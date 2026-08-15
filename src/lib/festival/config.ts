// ─────────────────────────────────────────────────────────────
// 2026 김해 JOB FESTIVAL — 행사 기본 정보
//  운영 정보가 바뀌면 이 파일만 수정하면 전 페이지에 반영됩니다.
// ─────────────────────────────────────────────────────────────

export const FEST = {
  title: "2026 김해 JOB FESTIVAL",
  titleShort: "김해 JOB FESTIVAL",
  edition: "2026",
  tagline: "기업과 청년이 만나는 하루, 김해에서 커리어가 시작됩니다",
  date: "2026-09-10",
  dateLabel: "2026년 9월 10일 (목)",
  dateShort: "9.10 THU",
  timeLabel: "10:00 ~ 17:00",
  openTime: "10:00",
  closeTime: "17:00",
  venue: "김해시 일원",
  venueDetail: "김해 JOB FESTIVAL 행사장 (세부 장소 확정 후 공지)",
  host: ["김해시"],
  organizers: ["인제대학교", "가야대학교", "영산대학교", "김해대학교"],
  hostLine: "주최 : 김해시 · 인제대 · 가야대 · 영산대 · 김해대",
  siteUrl: "https://jobfestival.co.kr",
  contact: {
    phone: "055-000-0000",
    email: "help@jobfestival.co.kr",
  },
} as const;

/** 4개 관 구성 */
export const ZONES = [
  {
    key: "company",
    name: "기업관",
    href: "/companies",
    color: "sky",
    summary: "지역 우수기업 현장 채용 상담 · 즉석 면접",
    detail: "기업 상세 소개 확인 → 온라인 입사지원 → 현장 면접 일정 확정까지 한 번에.",
  },
  {
    key: "job",
    name: "직무관",
    href: "/jobs",
    color: "violet",
    summary: "직무별 현직자 상담 · 직무 이해 프로그램",
    detail: "내가 갈 직무가 실제로 무슨 일을 하는지, 어떤 역량이 필요한지 확인하세요.",
  },
  {
    key: "promo",
    name: "홍보관",
    href: "/promos",
    color: "emerald",
    summary: "취업지원기관 · 공공기관 정책 안내",
    detail: "청년정책, 훈련과정, 창업·정착 지원까지 한자리에서 상담받을 수 있습니다.",
  },
  {
    key: "side",
    name: "부대행사",
    href: "/events",
    color: "amber",
    summary: "이력서 사진 · 컨설팅 · 체험 · 이벤트",
    detail: "취업준비에 바로 쓰이는 실속 프로그램과 참여 이벤트를 운영합니다.",
  },
] as const;

export type ZoneKey = (typeof ZONES)[number]["key"];

export function zoneName(key: ZoneKey): string {
  return ZONES.find((z) => z.key === key)?.name ?? key;
}

/** 참여 코스 */
export const COURSES = [
  {
    key: "job",
    name: "JOB 코스",
    subtitle: "바로 취업하고 싶은 참가자",
    color: "sky",
    target: "졸업예정자 · 구직자 · 이직 준비자",
    steps: [
      "사전등록 후 관심 기업·직무 선택",
      "입장 QR 발급 → 현장 입장 체크",
      "관심 기업 부스 상담 (자동 추천 3곳 우선)",
      "온라인 입사지원서 제출 → 현장 면접 일정 확정",
      "면접 참여 → 스탬프 적립 → 만족도 설문",
    ],
    benefit: "사전 매칭 기업 우선 면접 · 현장 채용 연계",
  },
  {
    key: "career",
    name: "Career 코스",
    subtitle: "진로·직무를 탐색하는 참가자",
    color: "violet",
    target: "재학생 (1~3학년) · 진로 탐색자",
    steps: [
      "사전등록 후 관심 직무 선택",
      "입장 QR 발급 → 현장 입장 체크",
      "직무관에서 현직자 직무 상담",
      "홍보관에서 정책·훈련과정 상담",
      "부대행사 참여 → 스탬프 적립 → 만족도 설문",
    ],
    benefit: "직무 진단 · 진로 로드맵 · 이력서 컨설팅 우선 배정",
  },
] as const;

export type CourseKey = (typeof COURSES)[number]["key"];

export function courseName(key?: string): string {
  return COURSES.find((c) => c.key === key)?.name ?? "미선택";
}

/** 스탬프 이벤트 — 4개 관을 모두 돌면 완주 */
export const STAMP_GOAL = 4;

export const STAMP_MISSIONS = [
  { zone: "company", label: "기업관 부스 상담 1회" },
  { zone: "job", label: "직무관 직무 상담 1회" },
  { zone: "promo", label: "홍보관 기관 상담 1회" },
  { zone: "side", label: "부대행사 참여 1회" },
] as const;

export const STAMP_REWARD =
  "4개 관 스탬프 완주 시 경품 응모 + 기념품 증정 (종합안내부스에서 완주 코드 제시)";

/** 현장 부스 운영 스태프 공용 PIN (운영 시 환경변수로 교체) */
export const STAFF_PIN = process.env.FEST_STAFF_PIN || "2026";

/** 운영 관리자 비밀번호 */
export const FEST_ADMIN_PASSWORD = process.env.FEST_ADMIN_PASSWORD || "kimhae2026!";
