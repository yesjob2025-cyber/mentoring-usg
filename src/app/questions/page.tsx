import type { Metadata } from "next";
import Link from "next/link";
import { listPublicQuestions, answerCountByQuestion, topQuestions } from "@/lib/repo";
import { getSession } from "@/lib/session";
import { themeName, themeMeta } from "@/lib/taxonomy";
import { formatKSTDate } from "@/lib/format";
import type { ThemeKind } from "@/lib/types";
import { DeleteQuestionButton } from "./[id]/delete-question-button";

export const metadata: Metadata = {
  title: "질문 게시판",
  description: "산업·직무·기업·유형·전공별 현직자 Q&A 게시판",
};

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "industry", label: "산업" },
  { key: "job", label: "직무" },
  { key: "type", label: "유형" },
  { key: "major", label: "전공" },
  { key: "mentor", label: "멘토" },
];

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = category && TABS.some((t) => t.key === category) ? category : "all";
  const questions = await listPublicQuestions(
    active === "all" ? undefined : { category: active as ThemeKind | "mentor" }
  );
  const [top, answerCounts, session] = await Promise.all([
    topQuestions(3),
    answerCountByQuestion(),
    getSession(),
  ]);
  const isSuperAdmin = session?.role === "superadmin";

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip-brand">질문 게시판</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight">항목별 질문 & 답변</h1>
          <p className="mt-2 text-ink-soft">
            산업·직무·기업·유형·전공·멘토별로 현직자의 답변을 모아봅니다.
          </p>
        </div>
        <Link href="/qna" className="btn-brand">
          질문하기
        </Link>
      </div>

      {/* 우수 질문 */}
      {top.length > 0 && (
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
          <p className="mb-3 text-sm font-bold text-brand-500">🔥 우수 질문</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {top.map((q) => (
              <Link key={q.id} href={`/questions/${q.id}`} className="rounded-xl bg-white p-4 shadow-card transition hover:shadow-pop">
                <p className="line-clamp-2 font-semibold">{q.title}</p>
                <p className="mt-2 text-xs text-ink-muted">♥ {q.likes} · {q.authorName}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/questions" : `/questions?category=${t.key}`}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              active === t.key
                ? "border-ink bg-ink text-cream-50"
                : "border-ink-line bg-white text-ink-soft hover:bg-cream-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* 목록 */}
      <ul className="mt-6 space-y-3">
        {questions.length === 0 && (
          <li className="card p-10 text-center text-ink-muted">아직 등록된 질문이 없습니다.</li>
        )}
        {questions.map((q) => {
          const answerN = answerCounts.get(q.id) ?? 0;
          const chips = Object.entries(q.themeRefs)
            .filter(([, v]) => !!v)
            .map(([, v]) => themeName(v as string))
            .filter(Boolean) as string[];
          return (
            <li key={q.id} className="card relative p-5 transition hover:shadow-pop">
              {isSuperAdmin && (
                <div className="absolute right-4 top-4 z-10">
                  <DeleteQuestionButton questionId={q.id} />
                </div>
              )}
              <Link href={`/questions/${q.id}`} className="block">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="badge bg-ink/5 text-ink-soft">
                    {q.category === "mentor" ? "멘토" : themeMeta[q.category as ThemeKind]?.short ?? "질문"}
                  </span>
                  {q.scope === "broadcast" && (
                    <span className="badge bg-purple-50 text-purple-700">다중질문</span>
                  )}
                  {chips.slice(0, 3).map((c) => (
                    <span key={c} className="badge bg-brand-50 text-brand-500">
                      {c}
                    </span>
                  ))}
                  <span
                    className={`badge ${
                      answerN > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {answerN > 0 ? `답변 ${answerN}` : "답변 대기"}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold">{q.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{q.body}</p>
                <p className="mt-3 text-xs text-ink-muted">
                  {q.authorName} · {formatKSTDate(q.createdAt)} · ♥ {q.likes} · 멘토{" "}
                  {q.targetMentorIds.length}명에게 발송
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
