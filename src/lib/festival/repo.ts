import "server-only";
import { all, one, insert, patch, remove } from "../data";
import { newId, newToken } from "../crypto";
import type {
  FestApplication,
  FestApplicationStatus,
  FestCheckin,
  FestCompany,
  FestInterview,
  FestInterviewSlot,
  FestJobBooth,
  FestPromo,
  FestSideEvent,
  FestStampAward,
  FestSurvey,
  FestVisitor,
  FestZoneKey,
  FestCourseKey,
} from "./types";
import { STAMP_GOAL } from "./config";

// ─────────────────────────────────────────────────────────────
// JOB FESTIVAL 데이터 접근 계층
// ─────────────────────────────────────────────────────────────

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

// ── 부스 조회 ────────────────────────────────────────────────

export async function listCompanies(): Promise<FestCompany[]> {
  return (await all<FestCompany>("festCompanies")).sort(byOrder);
}

export async function getCompany(id: string): Promise<FestCompany | undefined> {
  return one<FestCompany>("festCompanies", "id", id);
}

export async function listJobs(): Promise<FestJobBooth[]> {
  return (await all<FestJobBooth>("festJobs")).sort(byOrder);
}

export async function getJob(id: string): Promise<FestJobBooth | undefined> {
  return one<FestJobBooth>("festJobs", "id", id);
}

export async function listPromos(): Promise<FestPromo[]> {
  return (await all<FestPromo>("festPromos")).sort(byOrder);
}

export async function getPromo(id: string): Promise<FestPromo | undefined> {
  return one<FestPromo>("festPromos", "id", id);
}

export async function listEvents(): Promise<FestSideEvent[]> {
  return (await all<FestSideEvent>("festEvents")).sort(byOrder);
}

export async function getEvent(id: string): Promise<FestSideEvent | undefined> {
  return one<FestSideEvent>("festEvents", "id", id);
}

/** 관 + 부스 id → 부스 이름 (체크인 기록용) */
export async function findBooth(
  zone: FestZoneKey | "entry",
  boothId: string
): Promise<{ name: string; boothNo: string } | undefined> {
  if (zone === "entry") return { name: "입장 게이트", boothNo: "GATE" };
  if (zone === "company") {
    const x = await getCompany(boothId);
    return x && { name: x.name, boothNo: x.boothNo };
  }
  if (zone === "job") {
    const x = await getJob(boothId);
    return x && { name: x.name, boothNo: x.boothNo };
  }
  if (zone === "promo") {
    const x = await getPromo(boothId);
    return x && { name: x.name, boothNo: x.boothNo };
  }
  const x = await getEvent(boothId);
  return x && { name: x.title, boothNo: x.boothNo };
}

/** 모든 부스를 한 목록으로 (스태프 로그인용) */
export async function listAllBooths(): Promise<
  { zone: FestZoneKey | "entry"; id: string; name: string; boothNo: string }[]
> {
  const [companies, jobs, promos, events] = await Promise.all([
    listCompanies(),
    listJobs(),
    listPromos(),
    listEvents(),
  ]);
  return [
    { zone: "entry" as const, id: "gate", name: "입장 게이트 (종합안내)", boothNo: "GATE" },
    ...companies.map((x) => ({ zone: "company" as const, id: x.id, name: x.name, boothNo: x.boothNo })),
    ...jobs.map((x) => ({ zone: "job" as const, id: x.id, name: x.name, boothNo: x.boothNo })),
    ...promos.map((x) => ({ zone: "promo" as const, id: x.id, name: x.name, boothNo: x.boothNo })),
    ...events.map((x) => ({ zone: "side" as const, id: x.id, name: x.title, boothNo: x.boothNo })),
  ];
}

// ── 참가자 ───────────────────────────────────────────────────

function sixDigit(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  visitorType: string;
  school?: string;
  major?: string;
  grade?: string;
  course: FestCourseKey;
  interestJobs: string[];
  interestIndustries: string[];
  agreePrivacy: boolean;
  agreeMarketing: boolean;
}

export async function registerVisitor(input: RegisterInput): Promise<FestVisitor> {
  const existing = await findVisitorByPhone(input.phone);
  if (existing) {
    // 재등록 시 최신 정보로 갱신하고 기존 QR 을 유지한다.
    const updated: FestVisitor = { ...existing, ...input };
    await patch("festVisitors", "id", existing.id, { ...input });
    return updated;
  }

  const visitors = await all<FestVisitor>("festVisitors");
  let code = sixDigit();
  let guard = 0;
  while (visitors.some((v) => v.code === code) && guard++ < 50) code = sixDigit();

  const visitor: FestVisitor = {
    id: newId("fv"),
    code,
    token: newToken(),
    registeredAt: new Date().toISOString(),
    ...input,
  };
  await insert("festVisitors", visitor as unknown as Record<string, unknown>);
  return visitor;
}

export async function getVisitor(id: string): Promise<FestVisitor | undefined> {
  return one<FestVisitor>("festVisitors", "id", id);
}

export async function getVisitorByToken(token: string): Promise<FestVisitor | undefined> {
  return one<FestVisitor>("festVisitors", "token", token);
}

export async function getVisitorByCode(code: string): Promise<FestVisitor | undefined> {
  return one<FestVisitor>("festVisitors", "code", code.trim());
}

export async function findVisitorByPhone(phone: string): Promise<FestVisitor | undefined> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  const visitors = await all<FestVisitor>("festVisitors");
  return visitors.find((v) => v.phone.replace(/\D/g, "") === digits);
}

export async function listVisitors(): Promise<FestVisitor[]> {
  return (await all<FestVisitor>("festVisitors")).sort((a, b) =>
    b.registeredAt.localeCompare(a.registeredAt)
  );
}

/** QR 스캔 문자열(URL 또는 토큰 또는 6자리 코드) → 참가자 */
export async function resolveVisitor(raw: string): Promise<FestVisitor | undefined> {
  const value = raw.trim();
  if (!value) return undefined;
  const fromUrl = value.match(/\/p\/([A-Za-z0-9_-]{6,})/)?.[1];
  const key = fromUrl ?? value;
  if (/^\d{6}$/.test(key)) return getVisitorByCode(key);
  return (await getVisitorByToken(key)) ?? (await getVisitorByCode(key));
}

// ── 체크인 / 스탬프 ──────────────────────────────────────────

export async function listCheckins(visitorId: string): Promise<FestCheckin[]> {
  const rows = await all<FestCheckin>("festCheckins");
  return rows
    .filter((c) => c.visitorId === visitorId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function listAllCheckins(): Promise<FestCheckin[]> {
  return (await all<FestCheckin>("festCheckins")).sort((a, b) => b.at.localeCompare(a.at));
}

export interface CheckinResult {
  ok: boolean;
  duplicated: boolean;
  visitor: FestVisitor;
  checkin?: FestCheckin;
  stamp: StampProgress;
  awarded?: FestStampAward;
}

export async function checkIn(
  visitor: FestVisitor,
  zone: FestZoneKey | "entry" | "exit",
  boothId: string,
  boothName: string,
  staffNote?: string
): Promise<CheckinResult> {
  const existing = await listCheckins(visitor.id);
  const dup = existing.some((c) => c.zone === zone && c.boothId === boothId);

  let checkin: FestCheckin | undefined;
  if (!dup) {
    checkin = {
      id: newId("fk"),
      visitorId: visitor.id,
      visitorName: visitor.name,
      zone,
      boothId,
      boothName,
      at: new Date().toISOString(),
      staffNote,
    };
    await insert("festCheckins", checkin as unknown as Record<string, unknown>);
  }

  if (zone === "entry" && !visitor.enteredAt) {
    const at = checkin?.at ?? new Date().toISOString();
    await patch("festVisitors", "id", visitor.id, { enteredAt: at });
    visitor = { ...visitor, enteredAt: at };
  }
  if (zone === "exit") {
    const at = checkin?.at ?? new Date().toISOString();
    await patch("festVisitors", "id", visitor.id, { exitedAt: at });
    visitor = { ...visitor, exitedAt: at };
  }

  const stamp = await stampProgress(visitor.id);
  let awarded: FestStampAward | undefined;
  if (stamp.completed) awarded = await ensureStampAward(visitor.id);

  return { ok: true, duplicated: dup, visitor, checkin, stamp, awarded };
}

export interface StampProgress {
  zones: Record<FestZoneKey, number>;
  collected: number;
  goal: number;
  completed: boolean;
}

export async function stampProgress(visitorId: string): Promise<StampProgress> {
  const checkins = await listCheckins(visitorId);
  const zones: Record<FestZoneKey, number> = { company: 0, job: 0, promo: 0, side: 0 };
  for (const c of checkins) {
    if (c.zone === "entry" || c.zone === "exit") continue;
    zones[c.zone] += 1;
  }
  const collected = (Object.keys(zones) as FestZoneKey[]).filter((z) => zones[z] > 0).length;
  return { zones, collected, goal: STAMP_GOAL, completed: collected >= STAMP_GOAL };
}

export async function getStampAward(visitorId: string): Promise<FestStampAward | undefined> {
  const rows = await all<FestStampAward>("festStamps");
  return rows.find((s) => s.visitorId === visitorId);
}

export async function ensureStampAward(visitorId: string): Promise<FestStampAward> {
  const existing = await getStampAward(visitorId);
  if (existing) return existing;
  const award: FestStampAward = {
    id: newId("fst"),
    visitorId,
    code: `KH${sixDigit()}`,
    awardedAt: new Date().toISOString(),
    redeemed: false,
  };
  await insert("festStamps", award as unknown as Record<string, unknown>);
  return award;
}

export async function redeemStamp(
  code: string
): Promise<{ award?: FestStampAward; alreadyRedeemed: boolean }> {
  const rows = await all<FestStampAward>("festStamps");
  const award = rows.find((s) => s.code === code.trim().toUpperCase());
  if (!award) return { alreadyRedeemed: false };
  if (award.redeemed) return { award, alreadyRedeemed: true };
  await patch("festStamps", "id", award.id, { redeemed: true });
  return { award: { ...award, redeemed: true }, alreadyRedeemed: false };
}

// ── 입사지원 ─────────────────────────────────────────────────

export interface ApplyInput {
  visitorId: string;
  companyId: string;
  positionId: string;
  name: string;
  phone: string;
  email: string;
  school?: string;
  major?: string;
  grade?: string;
  careerType: string;
  intro: string;
  strength: string;
  portfolioUrl?: string;
}

export async function applyToCompany(input: ApplyInput): Promise<FestApplication> {
  const company = await getCompany(input.companyId);
  if (!company) throw new Error("기업 정보를 찾을 수 없습니다.");
  const position = company.positions.find((p) => p.id === input.positionId);
  if (!position) throw new Error("모집 직무를 찾을 수 없습니다.");

  const mine = await listApplications(input.visitorId);
  const dup = mine.find(
    (a) => a.companyId === input.companyId && a.positionId === input.positionId
  );
  if (dup) return dup;

  const app: FestApplication = {
    id: newId("fa"),
    visitorId: input.visitorId,
    companyId: company.id,
    companyName: company.name,
    positionId: position.id,
    positionTitle: position.title,
    name: input.name,
    phone: input.phone,
    email: input.email,
    school: input.school,
    major: input.major,
    grade: input.grade,
    careerType: input.careerType,
    intro: input.intro,
    strength: input.strength,
    portfolioUrl: input.portfolioUrl,
    status: "submitted",
    appliedAt: new Date().toISOString(),
  };
  await insert("festApplications", app as unknown as Record<string, unknown>);
  return app;
}

export async function listApplications(visitorId: string): Promise<FestApplication[]> {
  const rows = await all<FestApplication>("festApplications");
  return rows
    .filter((a) => a.visitorId === visitorId)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}

export async function listApplicationsByCompany(companyId: string): Promise<FestApplication[]> {
  const rows = await all<FestApplication>("festApplications");
  return rows
    .filter((a) => a.companyId === companyId)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}

export async function listAllApplications(): Promise<FestApplication[]> {
  return (await all<FestApplication>("festApplications")).sort((a, b) =>
    b.appliedAt.localeCompare(a.appliedAt)
  );
}

export async function getApplication(id: string): Promise<FestApplication | undefined> {
  return one<FestApplication>("festApplications", "id", id);
}

export async function setApplicationStatus(id: string, status: FestApplicationStatus) {
  await patch("festApplications", "id", id, { status });
}

// ── 면접 일정 ────────────────────────────────────────────────

export async function listSlots(companyId: string): Promise<FestInterviewSlot[]> {
  const rows = await all<FestInterviewSlot>("festInterviewSlots");
  return rows.filter((s) => s.companyId === companyId).sort((a, b) => a.time.localeCompare(b.time));
}

export async function listInterviews(visitorId: string): Promise<FestInterview[]> {
  const rows = await all<FestInterview>("festInterviews");
  return rows
    .filter((i) => i.visitorId === visitorId && i.status !== "canceled")
    .sort((a, b) => a.time.localeCompare(b.time));
}

export async function listAllInterviews(): Promise<FestInterview[]> {
  const rows = await all<FestInterview>("festInterviews");
  return rows.filter((i) => i.status !== "canceled").sort((a, b) => a.time.localeCompare(b.time));
}

export async function getInterviewByApplication(
  applicationId: string
): Promise<FestInterview | undefined> {
  const rows = await all<FestInterview>("festInterviews");
  return rows.find((i) => i.applicationId === applicationId && i.status !== "canceled");
}

export interface SlotAvailability extends FestInterviewSlot {
  taken: number;
  remaining: number;
}

export async function slotAvailability(companyId: string): Promise<SlotAvailability[]> {
  const [slots, interviews] = await Promise.all([
    listSlots(companyId),
    all<FestInterview>("festInterviews"),
  ]);
  const active = interviews.filter((i) => i.status !== "canceled");
  return slots.map((s) => {
    const taken = active.filter((i) => i.slotId === s.id).length;
    return { ...s, taken, remaining: Math.max(0, s.capacity - taken) };
  });
}

export async function bookInterview(
  applicationId: string,
  slotId: string
): Promise<FestInterview> {
  const app = await getApplication(applicationId);
  if (!app) throw new Error("지원서를 찾을 수 없습니다.");

  const slots = await slotAvailability(app.companyId);
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) throw new Error("면접 시간을 찾을 수 없습니다.");
  if (slot.remaining <= 0) throw new Error("이미 마감된 시간입니다. 다른 시간을 선택해 주세요.");

  // 같은 참가자가 같은 시간에 다른 면접이 있으면 차단
  const mine = await listInterviews(app.visitorId);
  if (mine.some((i) => i.time === slot.time && i.applicationId !== applicationId)) {
    throw new Error("같은 시간에 다른 기업 면접이 잡혀 있습니다.");
  }

  // 기존 예약이 있으면 교체
  const prev = await getInterviewByApplication(applicationId);
  if (prev) await remove("festInterviews", "id", prev.id);

  const visitor = await getVisitor(app.visitorId);
  const interview: FestInterview = {
    id: newId("fi"),
    applicationId,
    slotId: slot.id,
    companyId: app.companyId,
    companyName: app.companyName,
    visitorId: app.visitorId,
    visitorName: visitor?.name ?? app.name,
    time: slot.time,
    place: slot.place,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
  await insert("festInterviews", interview as unknown as Record<string, unknown>);
  await setApplicationStatus(applicationId, "interview");
  return interview;
}

export async function cancelInterview(interviewId: string) {
  const rows = await all<FestInterview>("festInterviews");
  const interview = rows.find((i) => i.id === interviewId);
  if (!interview) return;
  await remove("festInterviews", "id", interviewId);
  await setApplicationStatus(interview.applicationId, "submitted");
}

// ── 만족도 설문 ──────────────────────────────────────────────

export interface SurveyInput {
  visitorId: string;
  overall: number;
  booth: number;
  program: number;
  operation: number;
  recommend: number;
  helpful: string[];
  comment?: string;
}

export async function submitSurvey(input: SurveyInput): Promise<FestSurvey> {
  const existing = await getSurvey(input.visitorId);
  if (existing) {
    await patch("festSurveys", "id", existing.id, {
      ...input,
      submittedAt: new Date().toISOString(),
    });
    return { ...existing, ...input, submittedAt: new Date().toISOString() };
  }
  const survey: FestSurvey = {
    id: newId("fsv"),
    submittedAt: new Date().toISOString(),
    ...input,
  };
  await insert("festSurveys", survey as unknown as Record<string, unknown>);
  return survey;
}

export async function getSurvey(visitorId: string): Promise<FestSurvey | undefined> {
  const rows = await all<FestSurvey>("festSurveys");
  return rows.find((s) => s.visitorId === visitorId);
}

export async function listSurveys(): Promise<FestSurvey[]> {
  return all<FestSurvey>("festSurveys");
}
