// 클라이언트로 전달 가능한 안전 타입 (연락처 등 민감정보 제외)
import type { Mentor, ThemeKind } from "./types";

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

export function toPublicMentor(m: Mentor): PublicMentor {
  return {
    id: m.id,
    name: m.name,
    company: m.company,
    title: m.title,
    years: m.years,
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
