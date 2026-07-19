"use client";

import { useState, useTransition } from "react";
import { LikeButton } from "./like-button";
import { adoptAnswerAction } from "@/app/questions/actions";
import { GRADES, GRADE_AMOUNT } from "@/lib/grades";
import { formatKST } from "@/lib/format";

interface AnswerVM {
  id: string;
  mentorId: string;
  mentorName: string;
  body: string;
  createdAt: string;
  likes: number;
  adopted: boolean;
  payoutAmount: number;
}

export function AnswerCard({
  answer,
  mentorCompany,
  mentorTitle,
  questionId,
  isAdmin,
}: {
  answer: AnswerVM;
  mentorCompany?: string;
  mentorTitle?: string;
  questionId: string;
  isAdmin: boolean;
}) {
  const [adopted, setAdopted] = useState(answer.adopted);
  const [payout, setPayout] = useState(answer.payoutAmount);
  const [grade, setGrade] = useState(GRADES[0]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function adopt() {
    setError(null);
    startTransition(async () => {
      const res = await adoptAnswerAction(answer.id, questionId, grade);
      if (res.ok) {
        setAdopted(true);
        setPayout(GRADE_AMOUNT[grade] ?? 0);
      } else {
        setError(res.error ?? "채택에 실패했습니다.");
      }
    });
  }

  return (
    <li className={`card p-5 ${adopted ? "ring-2 ring-brand-300" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-500">
            {answer.mentorName.slice(0, 1)}
          </div>
          <div>
            <p className="font-bold">{answer.mentorName} 멘토</p>
            <p className="text-xs text-ink-muted">
              {[mentorCompany, mentorTitle].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        {adopted && (
          <span className="badge bg-brand-300 text-ink">채택 · {payout.toLocaleString()}원</span>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink-soft">{answer.body}</p>

      <div className="mt-4 flex items-center justify-between border-t border-ink-line pt-3">
        <span className="text-xs text-ink-muted">{formatKST(answer.createdAt)}</span>
        <div className="flex items-center gap-2">
          <LikeButton kind="answer" id={answer.id} questionId={questionId} count={answer.likes} />
          {isAdmin && !adopted && (
            <div className="flex items-center gap-1.5">
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="rounded-lg border border-ink-line bg-white px-2 py-1.5 text-xs"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g} · {(GRADE_AMOUNT[g] ?? 0).toLocaleString()}원
                  </option>
                ))}
              </select>
              <button onClick={adopt} disabled={pending} className="btn-primary px-3 py-1.5 text-xs">
                {pending ? "처리중" : "채택"}
              </button>
            </div>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}
