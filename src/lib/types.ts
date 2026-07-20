// ─────────────────────────────────────────────────────────────
// 도메인 타입
// ─────────────────────────────────────────────────────────────

export type ThemeKind = "industry" | "job" | "company" | "type" | "major";

/** 테마 항목 (산업/직무/기업/유형/전공 공통) */
export interface ThemeItem {
  id: string;
  name: string;
  kind: ThemeKind;
  /** 선택형 그룹핑(예: 전공 계열) */
  group?: string;
}

/** 멘토 태그: 어떤 테마에 답변 가능한지 */
export interface MentorTags {
  industry: string[]; // industry item ids
  job: string[];
  company: string[]; // 기업 item id (본인 소속 포함)
  type: string[]; // 기업유형
  major: string[]; // 전공 계열
}

export interface Mentor {
  id: string;
  name: string;
  company: string; // 소속 기업 표기
  title: string; // 직책/직무
  years: number; // 경력 연차
  education: string; // 학력
  summary: string; // 한 줄 소개
  career: string[]; // 주요 경력사항
  mentoringAreas: string[]; // 주요 멘토링 영역
  tags: MentorTags;
  kakaoPhone?: string; // 알림톡 수신 번호 (마스킹 저장 권장)
  answerCount: number;
  avgResponseHours: number;
  participationScore: number; // 답변 참여도 0-100
  active: boolean;
  featured?: boolean; // 토크콘서트 대표 멘토 여부
}

export interface School {
  id: string;
  name: string;
  code: string; // 회원가입 접속 코드
  region?: string;
  adminUsername: string;
  adminPasswordHash: string;
  createdAt: string;
}

export type UserRole = "student" | "admin";

export interface User {
  id: string;
  role: UserRole;
  schoolId: string;
  name: string;
  studentNo?: string;
  department?: string;
  grade?: string; // 학년 (선택)
  gender?: string; // 성별 (선택)
  phone?: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastActiveAt: string;
  questionCount: number;
}

export type QuestionScope = "individual" | "broadcast";

export interface QuestionThemeRefs {
  industry?: string;
  job?: string;
  company?: string;
  type?: string;
  major?: string;
}

export interface Question {
  id: string;
  authorUserId: string;
  authorName: string; // 표시용(익명 옵션 대비)
  schoolId: string;
  scope: QuestionScope; // 개별 / 전체(broadcast)
  category: ThemeKind | "mentor"; // 게시판 분류
  themeRefs: QuestionThemeRefs;
  title: string;
  body: string;
  targetMentorIds: string[]; // 발송 대상 멘토
  isPublic: boolean; // 전체 공개 여부
  status: "open" | "answered" | "closed";
  likes: number;
  createdAt: string;
}

export interface Answer {
  id: string;
  questionId: string;
  mentorId: string;
  mentorName: string;
  body: string;
  createdAt: string;
  likes: number;
  adopted: boolean; // 채택 여부
  payoutAmount: number; // 채택 시 차등 지급액(내부 정산 기록)
}

/** 멘토가 로그인 없이 답변할 수 있는 토큰 링크 */
export interface AnswerToken {
  token: string;
  questionId: string;
  mentorId: string;
  used: boolean;
  createdAt: string;
}

/** 내부 정산 원장 (실 송금 없음) */
export interface PayoutRecord {
  id: string;
  mentorId: string;
  mentorName: string;
  answerId: string;
  questionId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

/** 접속/활동 이벤트 (관리자 대시보드용) */
export interface ActivityEvent {
  id: string;
  schoolId: string;
  userId: string;
  type: "login" | "signup" | "question" | "like";
  at: string;
}

export type TalkTrack = "IT분야" | "공학" | "인문상경" | "보건복지" | "디자인" | "기타" | "공공";

export interface TalkSession {
  id: string;
  date: string; // YYYY-MM-DD
  slot: number; // 1..5
  track: TalkTrack;
  topic: string; // 세부 주제(직무)
  mentorName?: string; // 섭외 확정 시 입력
  company?: string;
  zoomUrl?: string; // Zoom 연동 후 세팅
  capacity: number;
  applicantUserIds: string[];
  status: "planned" | "confirmed" | "done";
}

export interface Database {
  schools: School[];
  users: User[];
  mentors: Mentor[];
  questions: Question[];
  answers: Answer[];
  answerTokens: AnswerToken[];
  payouts: PayoutRecord[];
  activity: ActivityEvent[];
  talkSessions: TalkSession[];
}
