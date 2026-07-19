"use server";

import { submitAnswerByToken, getUserById } from "@/lib/repo";
import { notifyStudentNewAnswer } from "@/lib/messaging";

export type AnswerResult = { ok: boolean; error?: string; notified?: boolean };

export async function submitAnswerAction(token: string, body: string): Promise<AnswerResult> {
  if (body.trim().length < 10) return { ok: false, error: "답변을 10자 이상 작성해 주세요." };
  const res = submitAnswerByToken(token, body);
  if (!res.ok) return { ok: false, error: res.error };

  // 학생에게 답변 도착 알림 (데모 스토어에서 사용자 유실 시 질문의 작성자명으로 폴백)
  const student = getUserById(res.question.authorUserId);
  const r = await notifyStudentNewAnswer(
    { name: student?.name ?? res.question.authorName, phone: student?.phone },
    res.question,
    res.answer
  );
  return { ok: true, notified: r.ok };
}
