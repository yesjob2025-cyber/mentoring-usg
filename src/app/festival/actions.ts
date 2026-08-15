"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { festPath } from "@/lib/festival/base";
import {
  applyToCompany,
  bookInterview,
  cancelInterview,
  checkIn,
  findBooth,
  findVisitorByPhone,
  getVisitor,
  redeemStamp,
  registerVisitor,
  resolveVisitor,
  submitSurvey,
  stampProgress,
} from "@/lib/festival/repo";
import {
  createAdminSession,
  createPassSession,
  createStaffSession,
  destroyPassSession,
  destroyStaffSession,
  getPassSession,
  getStaffSession,
} from "@/lib/festival/session";
import { FEST_ADMIN_PASSWORD, STAFF_PIN } from "@/lib/festival/config";
import type { FestCourseKey, FestZoneKey } from "@/lib/festival/types";

export type FestFormState = { error?: string; ok?: boolean; message?: string };

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

// ── 사전등록 ─────────────────────────────────────────────────

export async function registerAction(
  _prev: FestFormState,
  formData: FormData
): Promise<FestFormState> {
  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const course = text(formData, "course") as FestCourseKey;
  const visitorType = text(formData, "visitorType");

  if (!name || !phone) return { error: "이름과 연락처를 입력해 주세요." };
  if (!/^01[016-9][-\s]?\d{3,4}[-\s]?\d{4}$/.test(phone.replace(/\s/g, ""))) {
    return { error: "휴대전화 번호 형식을 확인해 주세요. (예: 010-1234-5678)" };
  }
  if (course !== "job" && course !== "career") return { error: "참여 코스를 선택해 주세요." };
  if (!visitorType) return { error: "참가자 구분을 선택해 주세요." };
  if (!formData.get("agreePrivacy")) {
    return { error: "개인정보 수집·이용에 동의해야 사전등록이 가능합니다." };
  }

  const visitor = await registerVisitor({
    name,
    phone,
    email: text(formData, "email") || undefined,
    visitorType,
    school: text(formData, "school") || undefined,
    major: text(formData, "major") || undefined,
    grade: text(formData, "grade") || undefined,
    course,
    interestJobs: formData.getAll("interestJobs").map(String),
    interestIndustries: formData.getAll("interestIndustries").map(String),
    agreePrivacy: true,
    agreeMarketing: Boolean(formData.get("agreeMarketing")),
  });

  await createPassSession(visitor.id);
  redirect(await festPath("/pass?welcome=1"));
}

/** 이름 + 연락처로 기존 입장권 찾기 */
export async function findPassAction(
  _prev: FestFormState,
  formData: FormData
): Promise<FestFormState> {
  const name = text(formData, "name");
  const phone = text(formData, "phone");
  if (!name || !phone) return { error: "이름과 연락처를 모두 입력해 주세요." };

  const visitor = await findVisitorByPhone(phone);
  if (!visitor || visitor.name.replace(/\s/g, "") !== name.replace(/\s/g, "")) {
    return { error: "일치하는 사전등록 정보가 없습니다. 사전등록을 먼저 진행해 주세요." };
  }
  await createPassSession(visitor.id);
  redirect(await festPath("/pass"));
}

export async function logoutPassAction() {
  await destroyPassSession();
  redirect(await festPath("/"));
}

// ── 입사지원 ─────────────────────────────────────────────────

export async function applyAction(
  _prev: FestFormState,
  formData: FormData
): Promise<FestFormState> {
  const pass = await getPassSession();
  if (!pass?.vid) {
    return { error: "사전등록 후 지원할 수 있습니다. 먼저 사전등록을 완료해 주세요." };
  }
  const companyId = text(formData, "companyId");
  const positionId = text(formData, "positionId");
  if (!companyId || !positionId) return { error: "지원할 직무를 선택해 주세요." };

  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const email = text(formData, "email");
  const intro = text(formData, "intro");
  const strength = text(formData, "strength");

  if (!name || !phone || !email) return { error: "이름·연락처·이메일은 필수입니다." };
  if (intro.length < 20) return { error: "자기소개는 20자 이상 작성해 주세요." };
  if (strength.length < 20) return { error: "지원동기·강점은 20자 이상 작성해 주세요." };

  try {
    await applyToCompany({
      visitorId: pass.vid,
      companyId,
      positionId,
      name,
      phone,
      email,
      school: text(formData, "school") || undefined,
      major: text(formData, "major") || undefined,
      grade: text(formData, "grade") || undefined,
      careerType: text(formData, "careerType") || "신입",
      intro,
      strength,
      portfolioUrl: text(formData, "portfolioUrl") || undefined,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }

  redirect(await festPath("/pass?applied=1"));
}

// ── 면접 일정 ────────────────────────────────────────────────

export async function bookInterviewAction(
  _prev: FestFormState,
  formData: FormData
): Promise<FestFormState> {
  const pass = await getPassSession();
  if (!pass?.vid) return { error: "입장권 정보를 찾을 수 없습니다." };

  const applicationId = text(formData, "applicationId");
  const slotId = text(formData, "slotId");
  if (!applicationId || !slotId) return { error: "면접 시간을 선택해 주세요." };

  try {
    const interview = await bookInterview(applicationId, slotId);
    revalidatePath("/festival/pass");
    return { ok: true, message: `면접이 ${interview.time} 으로 확정되었습니다.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function cancelInterviewAction(formData: FormData) {
  const id = String(formData.get("interviewId") ?? "");
  if (id) await cancelInterview(id);
  revalidatePath("/festival/pass");
}

// ── 만족도 설문 ──────────────────────────────────────────────

export async function surveyAction(
  _prev: FestFormState,
  formData: FormData
): Promise<FestFormState> {
  const pass = await getPassSession();
  if (!pass?.vid) return { error: "입장권 정보를 찾을 수 없습니다." };

  const num = (key: string, fallback = 0) => Number(formData.get(key) ?? fallback);
  const overall = num("overall");
  if (!overall) return { error: "전반적인 만족도를 선택해 주세요." };

  await submitSurvey({
    visitorId: pass.vid,
    overall,
    booth: num("booth", overall),
    program: num("program", overall),
    operation: num("operation", overall),
    recommend: num("recommend", 7),
    helpful: formData.getAll("helpful").map(String),
    comment: text(formData, "comment") || undefined,
  });

  redirect(await festPath("/pass/done"));
}

// ── 부스 스태프 ──────────────────────────────────────────────

export async function staffLoginAction(
  _prev: FestFormState,
  formData: FormData
): Promise<FestFormState> {
  const booth = text(formData, "booth"); // "zone:id"
  const pin = text(formData, "pin");
  if (!booth) return { error: "담당 부스를 선택해 주세요." };
  if (pin !== STAFF_PIN) return { error: "운영 PIN 이 올바르지 않습니다." };

  const [zone, boothId] = booth.split(":") as [FestZoneKey | "entry", string];
  const info = await findBooth(zone, boothId);
  if (!info) return { error: "부스 정보를 찾을 수 없습니다." };

  await createStaffSession({ zone, boothId, boothName: info.name, boothNo: info.boothNo });
  redirect(await festPath("/staff/scan"));
}

export async function staffLogoutAction() {
  await destroyStaffSession();
  redirect(await festPath("/staff"));
}

export interface ScanState extends FestFormState {
  visitorName?: string;
  visitorCourse?: string;
  duplicated?: boolean;
  stampCollected?: number;
  stampGoal?: number;
  stampCompleted?: boolean;
  awardCode?: string;
}

export async function staffCheckinAction(
  _prev: ScanState,
  formData: FormData
): Promise<ScanState> {
  const staff = await getStaffSession();
  if (!staff) return { error: "부스 로그인이 필요합니다." };

  const raw = text(formData, "code");
  if (!raw) return { error: "QR 을 스캔하거나 6자리 코드를 입력해 주세요." };

  const visitor = await resolveVisitor(raw);
  if (!visitor) return { error: "등록되지 않은 코드입니다. 종합안내부스에서 확인해 주세요." };

  const mode = text(formData, "mode");
  const zone = mode === "exit" ? "exit" : staff.zone;
  const boothName = mode === "exit" ? "퇴장 게이트" : staff.boothName;

  const result = await checkIn(visitor, zone, staff.boothId, boothName, text(formData, "note"));

  return {
    ok: true,
    visitorName: visitor.name,
    visitorCourse: visitor.course === "job" ? "JOB 코스" : "Career 코스",
    duplicated: result.duplicated,
    stampCollected: result.stamp.collected,
    stampGoal: result.stamp.goal,
    stampCompleted: result.stamp.completed,
    awardCode: result.awarded?.code,
    message: result.duplicated
      ? `${visitor.name} 님은 이미 이 부스에 체크인했습니다.`
      : `${visitor.name} 님 체크인 완료`,
  };
}

/** QR 링크(/p/[token])로 진입한 스태프의 원클릭 체크인 */
export async function checkinByTokenAction(
  _prev: ScanState,
  formData: FormData
): Promise<ScanState> {
  const staff = await getStaffSession();
  if (!staff) return { error: "부스 로그인이 필요합니다." };

  const token = text(formData, "token");
  const visitor = await resolveVisitor(token);
  if (!visitor) return { error: "등록되지 않은 참가자입니다." };

  const result = await checkIn(visitor, staff.zone, staff.boothId, staff.boothName);
  revalidatePath("/festival/staff/scan");

  return {
    ok: true,
    visitorName: visitor.name,
    visitorCourse: visitor.course === "job" ? "JOB 코스" : "Career 코스",
    duplicated: result.duplicated,
    stampCollected: result.stamp.collected,
    stampGoal: result.stamp.goal,
    stampCompleted: result.stamp.completed,
    awardCode: result.awarded?.code,
    message: result.duplicated
      ? `${visitor.name} 님은 이미 이 부스에 체크인했습니다.`
      : `${visitor.name} 님 체크인 완료`,
  };
}

/** 종합안내부스: 스탬프 완주 코드 사용 처리 */
export async function redeemStampAction(
  _prev: FestFormState,
  formData: FormData
): Promise<FestFormState> {
  const code = text(formData, "code");
  if (!code) return { error: "완주 코드를 입력해 주세요." };
  const { award, alreadyRedeemed } = await redeemStamp(code);
  if (!award) return { error: "존재하지 않는 완주 코드입니다." };
  const visitor = await getVisitor(award.visitorId);
  const who = visitor?.name ?? "참가자";
  if (alreadyRedeemed) return { ok: true, message: `${who} 님은 이미 경품을 수령했습니다.` };
  return { ok: true, message: `${who} 님 완주 확인 · 경품 지급 처리 완료` };
}

// ── 운영 관리자 ──────────────────────────────────────────────

export async function festAdminLoginAction(
  _prev: FestFormState,
  formData: FormData
): Promise<FestFormState> {
  const password = String(formData.get("password") ?? "");
  if (password !== FEST_ADMIN_PASSWORD) return { error: "비밀번호가 올바르지 않습니다." };
  await createAdminSession();
  redirect(await festPath("/admin"));
}

/** 참가자 본인이 마이페이지에서 스탬프 현황을 새로고침할 때 사용 */
export async function refreshStampAction() {
  const pass = await getPassSession();
  if (pass?.vid) await stampProgress(pass.vid);
  revalidatePath("/festival/pass");
}
