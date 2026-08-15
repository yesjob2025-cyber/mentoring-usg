// ─────────────────────────────────────────────────────────────
// 2026 김해 JOB FESTIVAL — 도메인 타입
// ─────────────────────────────────────────────────────────────

export type FestZoneKey = "company" | "job" | "promo" | "side";
export type FestCourseKey = "job" | "career";

/** 채용 포지션 (기업 문서에 내장) */
export interface FestPosition {
  id: string;
  title: string; // 모집 직무명
  jobCategory: string; // 직무관 직무 카테고리 id (연계)
  employmentType: string; // 정규직 / 계약직 / 인턴 / 채용연계형
  headcount: number;
  experience: string; // 신입 / 경력 / 무관
  salary?: string;
  requirements: string[];
  preferred: string[];
}

/** 기업관 — 참가 기업 */
export interface FestCompany {
  id: string;
  boothNo: string; // A-01
  name: string;
  industry: string; // 제조 / IT / 물류 ...
  scale: string; // 중소기업 / 중견기업 / 강소기업 ...
  location: string;
  employees: string;
  logoText: string; // 로고 대체 이니셜
  summary: string;
  description: string;
  products: string[];
  welfare: string[];
  homepage?: string;
  positions: FestPosition[];
  /** 현장 면접 운영 여부 */
  onSiteInterview: boolean;
  courses: FestCourseKey[]; // 추천 코스
  tags: string[]; // 매칭 키워드
  featured: boolean;
  order: number;
}

/** 직무관 — 직무 부스 */
export interface FestJobBooth {
  id: string;
  boothNo: string;
  name: string; // 직무명
  category: string; // 계열 (경영·사무 / 생산·기술 / IT ...)
  summary: string;
  description: string;
  tasks: string[]; // 주요 업무
  skills: string[]; // 필요 역량
  certificates: string[]; // 관련 자격
  careerPath: string[]; // 커리어 경로
  salaryRange: string;
  outlook: string; // 전망
  mentorTitle: string; // 상담 현직자 소개 (예: 제조 대기업 생산관리 8년차)
  programs: string[]; // 부스 운영 프로그램
  relatedCompanyIds: string[];
  tags: string[];
  order: number;
}

/** 홍보관 — 기관/단체 */
export interface FestPromo {
  id: string;
  boothNo: string;
  name: string;
  category: string; // 공공기관 / 대학 / 취업지원 / 창업 / 정책
  summary: string;
  description: string;
  services: string[]; // 제공 서비스
  targets: string[]; // 지원 대상
  contact?: string;
  homepage?: string;
  tags: string[];
  order: number;
}

/** 부대행사 프로그램 */
export interface FestSideEvent {
  id: string;
  boothNo: string;
  title: string;
  category: string; // 컨설팅 / 체험 / 이벤트 / 공연 / 상담
  place: string;
  summary: string;
  description: string;
  /** 운영 시간 (상시면 ["10:00-17:00"]) */
  timeSlots: string[];
  capacity: number; // 0 = 제한 없음
  needReserve: boolean;
  notes: string[];
  courses: FestCourseKey[];
  tags: string[];
  order: number;
}

/** 참가자(방문객) — 사전등록 시 생성, QR 발급 */
export interface FestVisitor {
  id: string;
  code: string; // 6자리 현장 확인 코드
  token: string; // QR 토큰 (URL 에 삽입)
  name: string;
  phone: string;
  email?: string;
  visitorType: string; // 대학생 / 졸업예정자 / 구직자 / 재직자 / 기타
  school?: string;
  major?: string;
  grade?: string;
  course: FestCourseKey;
  interestJobs: string[]; // 직무 부스 id
  interestIndustries: string[]; // 산업 키워드
  agreePrivacy: boolean;
  agreeMarketing: boolean;
  registeredAt: string;
  enteredAt?: string; // 현장 입장 체크 시각
  exitedAt?: string; // 퇴장 체크 시각
}

/** 부스 체크인 (입장 / 각 부스별 참여) */
export interface FestCheckin {
  id: string;
  visitorId: string;
  visitorName: string;
  /** entry = 입장 게이트, exit = 퇴장 게이트, 그 외는 각 관 */
  zone: FestZoneKey | "entry" | "exit";
  boothId: string; // entry/exit 은 "gate"
  boothName: string;
  at: string;
  staffNote?: string;
}

/** 입사지원 */
export type FestApplicationStatus =
  | "submitted" // 접수
  | "reviewing" // 서류검토
  | "interview" // 면접확정
  | "done" // 면접완료
  | "passed" // 합격
  | "rejected"; // 불합격

export interface FestApplication {
  id: string;
  visitorId: string;
  companyId: string;
  companyName: string;
  positionId: string;
  positionTitle: string;
  name: string;
  phone: string;
  email: string;
  school?: string;
  major?: string;
  grade?: string;
  careerType: string; // 신입 / 경력
  intro: string; // 자기소개
  strength: string; // 지원 동기 및 강점
  portfolioUrl?: string;
  status: FestApplicationStatus;
  appliedAt: string;
  memo?: string;
}

/** 기업별 현장 면접 슬롯 */
export interface FestInterviewSlot {
  id: string;
  companyId: string;
  time: string; // "10:30"
  durationMin: number;
  capacity: number;
  place: string; // 면접 부스 위치
}

/** 확정된 면접 일정 */
export interface FestInterview {
  id: string;
  applicationId: string;
  slotId: string;
  companyId: string;
  companyName: string;
  visitorId: string;
  visitorName: string;
  time: string;
  place: string;
  status: "confirmed" | "done" | "canceled" | "noshow";
  createdAt: string;
}

/** 스탬프 완주 기록 */
export interface FestStampAward {
  id: string;
  visitorId: string;
  code: string; // 완주 확인 코드
  awardedAt: string;
  redeemed: boolean;
}

/** 만족도 설문 */
export interface FestSurvey {
  id: string;
  visitorId: string;
  overall: number; // 1-5
  booth: number;
  program: number;
  operation: number;
  recommend: number; // 1-10 (NPS)
  helpful: string[]; // 도움된 프로그램
  comment?: string;
  submittedAt: string;
}

export interface FestivalDatabase {
  festCompanies: FestCompany[];
  festJobs: FestJobBooth[];
  festPromos: FestPromo[];
  festEvents: FestSideEvent[];
  festVisitors: FestVisitor[];
  festCheckins: FestCheckin[];
  festApplications: FestApplication[];
  festInterviewSlots: FestInterviewSlot[];
  festInterviews: FestInterview[];
  festStamps: FestStampAward[];
  festSurveys: FestSurvey[];
}
