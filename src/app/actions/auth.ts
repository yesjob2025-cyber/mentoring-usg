"use server";

import { redirect } from "next/navigation";
import {
  getSchoolByCode,
  createStudent,
  authenticateStudent,
  verifyAdmin,
  touchActivity,
  resetPasswordByEmail,
} from "@/lib/repo";
import { createSession, destroySession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superadmin";
import { sendInviteLms } from "@/lib/messaging";

export type FormState = { error?: string; ok?: boolean };
export type ResetState = { error?: string; ok?: boolean; message?: string };

const SITE = "https://mentoring-usg.kr";

// 학생 비밀번호 재설정 — 이메일 입력 → 등록된 번호로 임시 비밀번호 문자 발송
export async function resetPasswordAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "가입한 이메일을 입력해 주세요." };
  const r = await resetPasswordByEmail(email);
  if (!r.ok) return { error: r.error };
  const digits = (r.phone || "").replace(/[^0-9]/g, "");
  if (digits.length < 10) {
    return { error: "등록된 연락처가 없어 문자를 보낼 수 없습니다. 운영사무국(010-8553-6027)으로 문의해 주세요." };
  }
  const msg =
    `[부울경 멘토링] 비밀번호 재설정\n\n` +
    `${r.name}님, 임시 비밀번호는 [ ${r.tempPassword} ] 입니다.\n` +
    `이 비밀번호로 로그인 후 이용해 주세요.\n· 로그인: ${SITE}/login`;
  await sendInviteLms(r.phone!, "[부울경 멘토링] 비밀번호 재설정", msg);
  const masked = digits.length >= 10 ? `${digits.slice(0, 3)}-****-${digits.slice(-4)}` : "등록된 번호";
  return { ok: true, message: `등록된 번호(${masked})로 임시 비밀번호를 문자로 보냈습니다. 확인 후 로그인해 주세요.` };
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") || "");
  const schoolName = String(formData.get("schoolName") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const studentNo = String(formData.get("studentNo") || "").trim();
  const department = String(formData.get("department") || "").trim();
  const grade = String(formData.get("grade") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (
    !code ||
    !schoolName ||
    !name ||
    !studentNo ||
    !department ||
    !phone ||
    !grade ||
    !gender ||
    !email ||
    !password
  ) {
    return { error: "필수 항목을 모두 입력해 주세요." };
  }
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다." };

  const school = await getSchoolByCode(code);
  if (!school) return { error: "유효하지 않은 학교 접속코드입니다. 담당 부서에 문의하세요." };
  if (school.name !== schoolName) {
    return { error: "선택한 학교와 접속코드가 일치하지 않습니다. 다시 확인해 주세요." };
  }

  const res = await createStudent({
    schoolId: school.id,
    name,
    email,
    password,
    studentNo,
    department,
    grade,
    gender,
    phone,
  });
  if (!res.ok) return { error: res.error };

  await createSession({
    role: "student",
    uid: res.user.id,
    schoolId: school.id,
    name: res.user.name,
  });
  redirect("/qna");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const nextRaw = String(formData.get("next") || "");
  // 오픈 리다이렉트 방지: 내부 경로만 허용
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/qna";
  const user = await authenticateStudent(email, password);
  if (!user) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  await touchActivity(user.id);
  await createSession({ role: "student", uid: user.id, schoolId: user.schoolId, name: user.name });
  redirect(next);
}

export async function adminLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  // 전체(연합) 관리자 먼저 확인
  if (isSuperAdmin(username, password)) {
    await createSession({ role: "superadmin", schoolId: "", name: "부울경 연합 전체 관리자" });
    redirect("/admin");
  }
  const school = await verifyAdmin(username, password);
  if (!school) return { error: "관리자 계정 정보가 올바르지 않습니다." };
  await createSession({ role: "admin", schoolId: school.id, name: `${school.name} 관리자` });
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
