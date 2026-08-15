import "server-only";
import type { FestCompany, FestJobBooth, FestPromo, FestSideEvent, FestVisitor } from "./types";
import { listCompanies, listEvents, listJobs, listPromos } from "./repo";

// ─────────────────────────────────────────────────────────────
// 사전 매칭 / 현장 자동 추천
//  사전등록 시 고른 "관심 직무 + 관심 산업 + 참여 코스" 를 기준으로
//  기업관·직무관·홍보관·부대행사 부스를 점수화해 추천한다.
// ─────────────────────────────────────────────────────────────

export interface Reco<T> {
  item: T;
  score: number;
  reasons: string[];
}

function overlap(a: string[], b: string[]): string[] {
  const set = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => set.has(x.toLowerCase()));
}

function scoreCompany(
  company: FestCompany,
  visitor: FestVisitor,
  jobNameById: Map<string, string>
): Reco<FestCompany> {
  let score = 0;
  const reasons: string[] = [];

  const matchedPositions = company.positions.filter((p) =>
    visitor.interestJobs.includes(p.jobCategory)
  );
  if (matchedPositions.length) {
    score += 5 * matchedPositions.length;
    const names = matchedPositions
      .map((p) => jobNameById.get(p.jobCategory) ?? p.title)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    reasons.push(`관심 직무 채용 중 · ${names.join(", ")}`);
  }

  const ind = overlap(company.tags.concat(company.industry), visitor.interestIndustries);
  if (ind.length) {
    score += 3 * ind.length;
    reasons.push(`관심 분야 일치 · ${ind.join(", ")}`);
  }

  if (company.courses.includes(visitor.course)) {
    score += 2;
  }
  if (company.featured) score += 1;
  if (company.onSiteInterview && visitor.course === "job") {
    score += 2;
    reasons.push("현장 면접 운영 기업");
  }

  return { item: company, score, reasons };
}

function scoreJob(job: FestJobBooth, visitor: FestVisitor): Reco<FestJobBooth> {
  let score = 0;
  const reasons: string[] = [];

  if (visitor.interestJobs.includes(job.id)) {
    score += 8;
    reasons.push("사전등록에서 선택한 관심 직무");
  }
  const ind = overlap(job.tags, visitor.interestIndustries);
  if (ind.length) {
    score += 2 * ind.length;
    reasons.push(`관심 분야 연관 · ${ind.join(", ")}`);
  }
  if (visitor.course === "career") score += 1;
  return { item: job, score, reasons };
}

function scoreEvent(event: FestSideEvent, visitor: FestVisitor): Reco<FestSideEvent> {
  let score = 0;
  const reasons: string[] = [];
  if (event.courses.includes(visitor.course)) {
    score += 3;
    reasons.push(`${visitor.course === "job" ? "JOB" : "Career"} 코스 추천 프로그램`);
  }
  const ind = overlap(event.tags, visitor.interestIndustries);
  if (ind.length) score += ind.length;
  if (event.needReserve) score += 1;
  return { item: event, score, reasons };
}

function scorePromo(promo: FestPromo, visitor: FestVisitor): Reco<FestPromo> {
  let score = 1;
  const reasons: string[] = [];
  const t = promo.tags.join(" ");
  if (visitor.course === "job" && /취업지원|공공|채용정보|재취업/.test(t)) {
    score += 3;
    reasons.push("구직 단계에 바로 도움되는 기관");
  }
  if (visitor.course === "career" && /대학|진로|청년정책|직업교육/.test(t)) {
    score += 3;
    reasons.push("진로 탐색 단계 추천 기관");
  }
  if (promo.name.includes(visitor.school ?? "___")) {
    score += 4;
    reasons.push("소속 대학 부스");
  }
  const ind = overlap(promo.tags, visitor.interestIndustries);
  if (ind.length) score += ind.length;
  return { item: promo, score, reasons };
}

export interface RecommendationSet {
  companies: Reco<FestCompany>[];
  jobs: Reco<FestJobBooth>[];
  promos: Reco<FestPromo>[];
  events: Reco<FestSideEvent>[];
}

export async function recommendFor(
  visitor: FestVisitor,
  limit = 3
): Promise<RecommendationSet> {
  const [companies, jobs, promos, events] = await Promise.all([
    listCompanies(),
    listJobs(),
    listPromos(),
    listEvents(),
  ]);
  const jobNameById = new Map(jobs.map((j) => [j.id, j.name]));

  const top = <T>(list: Reco<T>[]) =>
    list.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);

  return {
    companies: top(companies.map((x) => scoreCompany(x, visitor, jobNameById))),
    jobs: top(jobs.map((x) => scoreJob(x, visitor))),
    promos: top(promos.map((x) => scorePromo(x, visitor))),
    events: top(events.map((x) => scoreEvent(x, visitor))),
  };
}

/** 관심 분야 선택지 (사전등록 폼) */
export const INTEREST_INDUSTRIES = [
  "제조",
  "자동차",
  "기계",
  "전기",
  "화학",
  "식품",
  "의료기기",
  "바이오",
  "IT",
  "데이터",
  "물류",
  "유통",
  "건설",
  "복지",
  "공공",
  "마케팅",
] as const;
