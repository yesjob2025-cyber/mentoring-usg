"use client";

import { useTransition } from "react";
import { deleteQuestionAction } from "../actions";

export function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (confirm("이 질문과 관련 답변을 모두 삭제할까요? 되돌릴 수 없습니다.")) {
          startTransition(() => deleteQuestionAction(questionId));
        }
      }}
      disabled={pending}
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
    >
      {pending ? "삭제 중…" : "질문 삭제"}
    </button>
  );
}
