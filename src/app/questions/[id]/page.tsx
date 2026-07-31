import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getQuestion,
  listAnswers,
  getMentorsByIds,
  answerLinksForQuestion,
  getUserById,
} from "@/lib/repo";
import { getSession } from "@/lib/session";
import { themeName } from "@/lib/taxonomy";
import { formatKST } from "@/lib/format";
import { maskName } from "@/lib/mask";
import { displayAuthor } from "@/lib/author";
import { LikeButton } from "./like-button";
import { AnswerCard } from "./answer-card";
import { DeleteQuestionButton } from "./delete-question-button";

export const metadata: Metadata = { title: "질문 상세" };

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getQuestion(id);
  if (!question) notFound();

  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const isSuperAdmin = session?.role === "superadmin";
  const [answers, targets] = await Promise.all([
    listAnswers(question.id),
    getMentorsByIds(question.targetMentorIds),
  ]);
  const chips = Object.entries(question.themeRefs)
    .filter(([, v]) => !!v)
    .map(([, v]) => themeName(v as string))
    .filter(Boolean) as string[];

  const pendingMentors = targets.filter((m) => !answers.some((a) => a.mentorId === m.id));
  const answerLinks = isAdmin ? await answerLinksForQuestion(question.id) : [];

  // 작성자 식별 정보(이름·학번)는 관리자와 본인에게만 노출
  const isAdminAny = isAdmin || isSuperAdmin;
  const isOwner = !!session?.uid && session.uid === question.authorUserId;
  const canSeeIdentity = isAdminAny || isOwner;
  const authorUser = canSeeIdentity ? await getUserById(question.authorUserId) : undefined;
  let authorLine: string;
  if (canSeeIdentity) {
    authorLine = question.authorName;
    if (isAdminAny && !question.isPublic) authorLine += " (익명)";
    if (authorUser?.studentNo) authorLine += ` · 학번 ${authorUser.studentNo}`;
  } else {
    authorLine = displayAuthor(question, false);
  }

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
          {isSuperAdmin && (
            <span className="ml-auto">
              <DeleteQuestionButton questionId={question.id} />
            </span>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-black">{question.title}</h1>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed text-ink-soft">{question.body}</p>
        <div className="mt-6 flex items-center justify-between border-t border-ink-line pt-4">
          <p className="text-sm text-ink-muted">
            {authorLine} · {formatKST(question.createdAt)}
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
            답변 대기: {pendingMentors.slice(0, 6).map((m) => maskName(m.name)).join(", ")}
            {pendingMentors.length > 6 ? " 외" : ""}
          </p>
        )}
      </div>

      {/* 관리자 전용: 멘토 답변 링크 (수동 발송·테스트용) */}
      {isAdmin && answerLinks.length > 0 && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <p className="text-sm font-bold text-brand-500">🔗 멘토 답변 링크 (관리자 전용)</p>
          <p className="mt-1 text-xs text-ink-muted">
            카카오 알림톡으로 발송되는 링크입니다. 직접 눌러 답변 흐름을 테스트하거나, 알림톡이
            안 갈 때 수동으로 전달할 수 있어요.
          </p>
          <ul className="mt-3 space-y-1.5">
            {answerLinks.map((l) => (
              <li
                key={l.token}
                className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{l.mentorName}</span>
                  {l.kakaoPhone && <span className="ml-2 text-xs text-ink-muted">{l.kakaoPhone}</span>}
                  {l.used && <span className="ml-2 badge bg-emerald-50 text-emerald-700">답변완료</span>}
                </span>
                <Link
                  href={`/answer/${l.token}`}
                  className="btn-outline shrink-0 px-3 py-1.5 text-xs"
                  target="_blank"
                >
                  답변 링크 열기 →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  }}
                  mentorCompany={mentor?.company}
                  mentorTitle={mentor?.title}
                  questionId={question.id}
                  isSuperAdmin={isSuperAdmin}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
