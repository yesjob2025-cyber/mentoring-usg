"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { likeQuestion, likeAnswer, adoptAnswer } from "@/lib/repo";
import { GRADE_AMOUNT } from "@/lib/grades";

export async function likeQuestionAction(id: string) {
  await likeQuestion(id);
  revalidatePath(`/questions/${id}`);
  revalidatePath("/questions");
}

export async function likeAnswerAction(answerId: string, questionId: string) {
  await likeAnswer(answerId);
  revalidatePath(`/questions/${questionId}`);
}

export async function adoptAnswerAction(
  answerId: string,
  questionId: string,
  grade: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false, error: "답변 채택은 학교 관리자만 가능합니다." };
  }
  const amount = GRADE_AMOUNT[grade] ?? 10000;
  await adoptAnswer(answerId, amount, grade);
  revalidatePath(`/questions/${questionId}`);
  return { ok: true };
}
