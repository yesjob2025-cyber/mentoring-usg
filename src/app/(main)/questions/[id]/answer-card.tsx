"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LikeButton } from "./like-button";
import { deleteAnswerAction } from "../actions";
import { formatKST } from "@/lib/format";
import { maskName } from "@/lib/mask";

interface AnswerVM {
  id: string;
  mentorId: string;
  mentorName: string;
  body: string;
  createdAt: string;
  likes: number;
}

export function AnswerCard({
  answer,
  mentorCompany,
  mentorTitle,
  questionId,
  isSuperAdmin,
}: {
  answer: AnswerVM;
  mentorCompany?: string;
  mentorTitle?: string;
  questionId: string;
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function del() {
    if (!confirm("이 답변을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setError(null);
    startDelete(async () => {
      const res = await deleteAnswerAction(answer.id, questionId);
      if (res.ok) router.refresh();
      else setError(res.error ?? "삭제에 실패했습니다.");
    });
  }

  return (
    <li className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-500">
            {maskName(answer.mentorName).slice(0, 1)}
          </div>
          <div>
            <p className="font-bold">{maskName(answer.mentorName)} 멘토</p>
            <p className="text-xs text-ink-muted">
              {[mentorCompany, mentorTitle].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink-soft">{answer.body}</p>

      <div className="mt-4 flex items-center justify-between border-t border-ink-line pt-3">
        <span className="text-xs text-ink-muted">{formatKST(answer.createdAt)}</span>
        <div className="flex items-center gap-2">
          <LikeButton kind="answer" id={answer.id} questionId={questionId} count={answer.likes} />
          {isSuperAdmin && (
            <button
              onClick={del}
              disabled={deleting}
              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              {deleting ? "삭제 중…" : "삭제"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}
