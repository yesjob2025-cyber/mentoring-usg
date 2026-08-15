"use client";

import { useState, useTransition } from "react";
import { likeQuestionAction, likeAnswerAction } from "@/app/questions/actions";

export function LikeButton({
  kind,
  id,
  questionId,
  count,
}: {
  kind: "question" | "answer";
  id: string;
  questionId: string;
  count: number;
}) {
  const [likes, setLikes] = useState(count);
  const [liked, setLiked] = useState(false);
  const [pending, startTransition] = useTransition();

  function like() {
    if (liked) return;
    setLikes((n) => n + 1);
    setLiked(true);
    startTransition(async () => {
      if (kind === "question") await likeQuestionAction(id);
      else await likeAnswerAction(id, questionId);
    });
  }

  return (
    <button
      onClick={like}
      disabled={pending || liked}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
        liked
          ? "border-brand-300 bg-brand-50 text-brand-500"
          : "border-ink-line bg-white text-ink-soft hover:border-brand-300"
      }`}
    >
      <span>{liked ? "♥" : "♡"}</span>
      좋아요 {likes}
    </button>
  );
}
