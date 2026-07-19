import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuestion, listAnswers, getMentorsByIds } from "@/lib/repo";
import { getSession } from "@/lib/session";
import { themeName } from "@/lib/taxonomy";
import { formatKST } from "@/lib/format";
import { LikeButton } from "./like-button";
import { AnswerCard } from "./answer-card";

export const metadata: Metadata = { title: "질문 상세" };

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = getQuestion(id);
  if (!question) notFound();

  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const answers = listAnswers(question.id);
  const targets = getMentorsByIds(question.targetMentorIds);
  const chips = Object.entries(question.themeRefs)
    .filter(([, v]) => !!v)
    .map(([, v]) => themeName(v as string))
    .filter(Boolean) as string[];

  const pendingMentors = targets.filter((m) => !answers.some((a) => a.mentorId === m.id));

  return (
    <div className="container-page max-w-3xl py-10">
      <Link href="/questions" className="text-sm text-ink-muted hover:text-ink">
        ← 질문 게시판
      </Link>

      {/* 질문 */}
      <article className="card mt-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="badge bg-ink/5 text-ink-soft">
            {question.scope === "broadcast" ? "다중 질문" : "개별 질문"}
          </span>
          {chips.map((c) => (
            <span key={c} className="badge bg-brand-50 text-brand-500">
              {c}
            </span>
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-black">{question.title}</h1>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed text-ink-soft">{question.body}</p>
        <div className="mt-6 flex items-center justify-between border-t border-ink-line pt-4">
          <p className="text-sm text-ink-muted">
            {question.authorName} · {formatKST(question.createdAt)}
          </p>
          <LikeButton kind="question" id={question.id} questionId={question.id} count={question.likes} />
        </div>
      </article>

      {/* 발송 멘토 현황 */}
      <div className="mt-6 rounded-xl border border-ink-line bg-cream-100 p-4 text-sm">
        <p className="font-semibold text-ink-soft">
          멘토 {targets.length}명에게 발송 · 답변 {answers.length}건 · 대기 {pendingMentors.length}명
        </p>
        {pendingMentors.length > 0 && (
          <p className="mt-1 text-ink-muted">
            답변 대기: {pendingMentors.slice(0, 6).map((m) => m.name).join(", ")}
            {pendingMentors.length > 6 ? " 외" : ""}
          </p>
        )}
      </div>

      {/* 답변 */}
      <section className="mt-8">
        <h2 className="text-lg font-extrabold">
          멘토 답변 <span className="text-brand-400">{answers.length}</span>
        </h2>
        {answers.length === 0 ? (
          <div className="card mt-4 p-8 text-center text-ink-muted">
            아직 등록된 답변이 없습니다. 멘토가 카카오톡으로 답변을 작성하면 이곳에 표시됩니다.
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {answers.map((a) => {
              const mentor = targets.find((m) => m.id === a.mentorId);
              return (
                <AnswerCard
                  key={a.id}
                  answer={{
                    id: a.id,
                    mentorId: a.mentorId,
                    mentorName: a.mentorName,
                    body: a.body,
                    createdAt: a.createdAt,
                    likes: a.likes,
                    adopted: a.adopted,
                    payoutAmount: a.payoutAmount,
                  }}
                  mentorCompany={mentor?.company}
                  mentorTitle={mentor?.title}
                  questionId={question.id}
                  isAdmin={isAdmin}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
