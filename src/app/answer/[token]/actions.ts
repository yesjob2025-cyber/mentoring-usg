"use server";

import { submitAnswerByToken, getUserById } from "@/lib/repo";
import { notifyStudentNewAnswer } from "@/lib/messaging";

export type AnswerResult = { ok: boolean; error?: string; notified?: boolean };

export async function submitAnswerAction(token: string, body: string): Promise<AnswerResult> {
  if (body.trim().length < 10) return { ok: false, error: "답변을 10자 이상 작성해 주세요." };
  const res = submitAnswerByToken(token, body);
  if (!res.ok) return { ok: false, error: res.error };

  // 학생에게 답변 도착 카카오 알림톡
  let notified = false;
  const student = getUserById(res.question.authorUserId);
  if (student) {
    const r = await notifyStudentNewAnswer(
      { name: student.name, phone: student.phone },
      res.question,
      res.answer
    );
    notified = r.ok;
  }
  return { ok: true, notified };
}
