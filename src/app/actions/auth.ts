"use server";

import { redirect } from "next/navigation";
import {
  getSchoolByCode,
  createStudent,
  authenticateStudent,
  verifyAdmin,
  touchActivity,
} from "@/lib/repo";
import { createSession, destroySession } from "@/lib/session";

export type FormState = { error?: string; ok?: boolean };

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const studentNo = String(formData.get("studentNo") || "");
  const department = String(formData.get("department") || "");
  const phone = String(formData.get("phone") || "");

  if (!code || !name || !email || !password) {
    return { error: "필수 항목을 모두 입력해 주세요." };
  }
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다." };

  const school = await getSchoolByCode(code);
  if (!school) return { error: "유효하지 않은 학교 접속코드입니다. 담당 부서에 문의하세요." };

  const res = await createStudent({
    schoolId: school.id,
    name,
    email,
    password,
    studentNo,
    department,
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
  const user = await authenticateStudent(email, password);
  if (!user) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  await touchActivity(user.id);
  await createSession({ role: "student", uid: user.id, schoolId: user.schoolId, name: user.name });
  redirect("/qna");
}

export async function adminLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const school = await verifyAdmin(username, password);
  if (!school) return { error: "관리자 계정 정보가 올바르지 않습니다." };
  await createSession({ role: "admin", schoolId: school.id, name: `${school.name} 관리자` });
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
