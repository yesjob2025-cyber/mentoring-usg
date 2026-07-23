"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { likeQuestion, likeAnswer, adoptAnswer, deleteQuestion, deleteAnswer } from "@/lib/repo";
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

// 전체(연합) 관리자 전용: 답변 삭제
export async function deleteAnswerAction(
  answerId: string,
  questionId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    return { ok: false, error: "삭제 권한이 없습니다." };
  }
  await deleteAnswer(answerId);
  revalidatePath(`/questions/${questionId}`);
  return { ok: true };
}

// 전체(연합) 관리자 전용: 질문 삭제 (관련 답변·토큰·정산 함께 제거)
export async function deleteQuestionAction(questionId: string): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "superadmin") return;
  await deleteQuestion(questionId);
  revalidatePath("/questions");
  redirect("/questions");
}
