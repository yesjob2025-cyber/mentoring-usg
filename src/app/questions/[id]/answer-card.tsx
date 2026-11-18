"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LikeButton } from "./like-button";
import { deleteAnswerAction, reactAction } from "@/app/questions/actions";
import { formatKST } from "@/lib/format";
import { maskName } from "@/lib/mask";

const REACTIONS = ["🙏", "👍", "❤️", "👏", "😊"];

interface AnswerVM {
  id: string;
  mentorId: string;
  mentorName: string;
  body: string;
  createdAt: string;
  likes: number;
}
interface ReactionVM {
  userId: string;
  userName: string;
  emoji: string;
  comment: string;
}

export function AnswerCard({
  answer,
  mentorCompany,
  mentorTitle,
  questionId,
  isSuperAdmin,
  reactions = [],
  canReact = false,
  myUserId,
}: {
  answer: AnswerVM;
  mentorCompany?: string;
  mentorTitle?: string;
  questionId: string;
  isSuperAdmin?: boolean;
  reactions?: ReactionVM[];
  canReact?: boolean;
  myUserId?: string;
}) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const mine = reactions.find((r) => r.userId === myUserId);
  const [picked, setPicked] = useState<string>(mine?.emoji ?? "");
  const [comment, setComment] = useState<string>(mine?.comment ?? "");
  const [open, setOpen] = useState(false);
  const [saving, startSave] = useTransition();
  const [rxErr, setRxErr] = useState<string | null>(null);

  function react(emoji: string) {
    setPicked(emoji);
    setRxErr(null);
    startSave(async () => {
      const res = await reactAction({ answerId: answer.id, questionId, emoji, comment });
      if (res.ok) router.refresh();
      else setRxErr(res.error ?? "반응 저장에 실패했습니다.");
    });
  }
  function saveComment() {
    if (!picked) { setRxErr("먼저 반응을 선택해 주세요."); return; }
    setRxErr(null);
    startSave(async () => {
      const res = await reactAction({ answerId: answer.id, questionId, emoji: picked, comment });
      if (res.ok) { setOpen(false); router.refresh(); }
      else setRxErr(res.error ?? "코멘트 저장에 실패했습니다.");
    });
  }

  function del() {
    if (!confirm("이 답변을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setError(null);
    startDelete(async () => {
      const res = await deleteAnswerAction(answer.id, questionId);
      if (res.ok) router.refresh();
      else setError(res.error ?? "삭제에 실패했습니다.");
    });
  }

  // 반응 집계
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  const commentReactions = reactions.filter((r) => r.comment);

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

      {/* 반응 집계 + 코멘트 */}
      {(counts.size > 0 || commentReactions.length > 0) && (
        <div className="mt-3 space-y-2">
          {counts.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {[...counts.entries()].map(([emoji, n]) => (
                <span key={emoji} className="inline-flex items-center gap-1 rounded-full bg-cream-200/70 px-2 py-0.5 text-sm">
                  <span>{emoji}</span>
                  <span className="text-xs font-semibold text-ink-soft">{n}</span>
                </span>
              ))}
            </div>
          )}
          {commentReactions.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-sm">
              <span>{r.emoji}</span>
              <span className="rounded-2xl bg-cream-100 px-2.5 py-1 text-ink-soft">
                <b className="text-ink">{maskName(r.userName)}</b> {r.comment}
              </span>
            </div>
          ))}
        </div>
      )}

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

      {/* 학생 반응 입력 (카카오식) */}
      {canReact && (
        <div className="mt-3 rounded-xl bg-cream-100/70 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-ink-muted">답변이 도움됐다면</span>
            {REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => react(e)}
                disabled={saving}
                className={`grid h-8 w-8 place-items-center rounded-full text-lg transition hover:scale-110 disabled:opacity-50 ${
                  picked === e ? "bg-brand-100 ring-2 ring-brand-300" : "bg-white"
                }`}
                aria-label={`반응 ${e}`}
              >
                {e}
              </button>
            ))}
            <button
              onClick={() => setOpen((v) => !v)}
              className="ml-1 text-xs font-semibold text-brand-500 underline"
            >
              {mine?.comment ? "코멘트 수정" : "한마디"}
            </button>
          </div>
          {open && (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 20))}
                maxLength={20}
                placeholder="감사합니다! (20자 이내)"
                className="field-input h-9 flex-1 text-sm"
              />
              <span className="text-xs text-ink-muted">{comment.length}/20</span>
              <button onClick={saveComment} disabled={saving} className="btn-brand px-3 py-1.5 text-xs">
                {saving ? "저장 중…" : "등록"}
              </button>
            </div>
          )}
          {mine && !open && <p className="mt-1 text-[11px] text-ink-muted">내 반응: {mine.emoji}{mine.comment ? ` · "${mine.comment}"` : ""} (다시 눌러 변경)</p>}
          {rxErr && <p className="mt-1 text-xs text-red-600">{rxErr}</p>}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}
