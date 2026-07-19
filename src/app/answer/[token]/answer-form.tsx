"use client";

import { useState, useTransition } from "react";
import { submitAnswerAction, type AnswerResult } from "./actions";

export function AnswerForm({ token, mentorName }: { token: string; mentorName: string }) {
  const [body, setBody] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setResult(null);
    startTransition(async () => {
      const res = await submitAnswerAction(token, body);
      setResult(res);
      if (res.ok) setBody("");
    });
  }

  if (result?.ok) {
    return (
      <div className="mt-6 rounded-xl bg-emerald-50 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h3 className="mt-3 text-lg font-extrabold text-emerald-800">답변이 제출되었습니다</h3>
        <p className="mt-1 text-sm text-emerald-700">
          {mentorName} 멘토님, 감사합니다.
          {result.notified ? " 학생에게 카카오톡으로 전달했어요." : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <label className="field-label" htmlFor="answer">
        답변 작성
      </label>
      <textarea
        id="answer"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={7}
        className="field-input resize-none"
        placeholder="현직자 관점에서 도움이 되는 답변을 남겨주세요."
      />
      {result && !result.ok && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{result.error}</p>
      )}
      <button onClick={submit} disabled={pending} className="btn-brand mt-4 w-full">
        {pending ? "제출 중…" : "답변 제출하기"}
      </button>
    </div>
  );
}
