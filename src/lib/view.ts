// 클라이언트로 전달 가능한 안전 타입 (연락처 등 민감정보 제외)
import type { Mentor, ThemeKind } from "./types";
import { maskName } from "./mask";

export interface PublicMentor {
  id: string;
  name: string;
  company: string;
  title: string;
  years: number;
  education: string;
  summary: string;
  career: string[];
  mentoringAreas: string[];
  answerCount: number;
  avgResponseHours: number;
  participationScore: number;
  featured?: boolean;
  tags: {
    industry: string[];
    job: string[];
    company: string[];
    type: string[];
    major: string[];
  };
}

// 최초 입사연도(startYear)가 있으면 매년 자동 증가하는 연차를 계산.
// 예) 2019년 입사 → 2026년엔 8년차. 없으면 기존 years 사용.
export function effectiveYears(m: { years: number; startYear?: number }): number {
  const thisYear = new Date().getFullYear();
  if (m.startYear && m.startYear >= 1970 && m.startYear <= thisYear) {
    return Math.max(1, thisYear - m.startYear + 1);
  }
  return m.years;
}

export function toPublicMentor(m: Mentor): PublicMentor {
  return {
    id: m.id,
    name: maskName(m.name),
    company: m.company,
    title: m.title,
    years: effectiveYears(m),
    education: m.education,
    summary: m.summary,
    career: m.career,
    mentoringAreas: m.mentoringAreas,
    answerCount: m.answerCount,
    avgResponseHours: m.avgResponseHours,
    participationScore: m.participationScore,
    featured: m.featured,
    tags: m.tags,
  };
}

export interface RecommendedMentor {
  mentor: PublicMentor;
  score: number;
  matched: ThemeKind[];
}
