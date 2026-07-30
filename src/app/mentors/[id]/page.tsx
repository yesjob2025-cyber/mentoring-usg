import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMentorById, listPublicQuestions } from "@/lib/repo";
import { toPublicMentor } from "@/lib/view";
import { maskName } from "@/lib/mask";
import { displayAuthor } from "@/lib/author";
import { MentorTagBadges } from "@/components/mentor-badges";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const m = await getMentorById(id);
  return { title: m && m.active ? `${maskName(m.name)} 멘토` : "멘토" };
}

export default async function MentorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getMentorById(id);
  // 숨김/비활성 멘토는 프로필 페이지 비노출 (답변 기록만 게시판에 남음)
  if (!raw || !raw.active) notFound();
  const m = toPublicMentor(raw);
  const questions = (await listPublicQuestions({ mentorId: id })).slice(0, 5);

  return (
    <div className="container-page max-w-3xl py-10">
      <Link href="/qna" className="text-sm text-ink-muted hover:text-ink">
        ← 멘토 추천으로
      </Link>

      <div className="card mt-4 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand-100 text-3xl font-black text-brand-500">
            {m.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">{m.name}</h1>
              {m.featured && <span className="badge bg-brand-100 text-brand-500">대표멘토</span>}
            </div>
            <p className="mt-1 text-ink-soft">
              {m.company} · {m.title} · {m.years}년차
            </p>
            <div className="mt-3">
              <MentorTagBadges tags={m.tags} max={8} />
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-ink-line pt-5 text-center">
          <div>
            <dt className="text-xs text-ink-muted">답변 수</dt>
            <dd className="text-lg font-extrabold">{m.answerCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">평균 응답</dt>
            <dd className="text-lg font-extrabold">{m.avgResponseHours}시간</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">답변 참여도</dt>
            <dd className="text-lg font-extrabold">{m.participationScore}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-sm font-bold text-ink-muted">학력 · 주요 경력</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            {m.career.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand-400">•</span>
                {c}
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="text-sm font-bold text-ink-muted">주요 멘토링 영역</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {m.mentoringAreas.map((a) => (
              <span key={a} className="chip-brand">
                {a}
              </span>
            ))}
          </div>
        </section>
      </div>

      {questions.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-extrabold">이 멘토에게 온 질문</h2>
          <ul className="mt-3 space-y-2">
            {questions.map((q) => (
              <li key={q.id}>
                <Link href={`/questions/${q.id}`} className="card block p-4 transition hover:shadow-pop">
                  <p className="font-semibold">{q.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {displayAuthor(q)} · ♥ {q.likes}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 rounded-2xl bg-ink p-6 text-center text-cream-50">
        <p className="font-bold">{m.name} 멘토에게 궁금한 점이 있나요?</p>
        <Link href="/qna" className="btn-brand mt-3">
          질문하러 가기
        </Link>
      </div>
    </div>
  );
}
