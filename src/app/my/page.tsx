import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listQuestionsByUser, answerCountByQuestion, getUserById } from "@/lib/repo";
import { formatKST } from "@/lib/format";

export const metadata: Metadata = { title: "내 질문" };

export default async function MyPage() {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) redirect("/login");
  const [user, questions, answerCounts] = await Promise.all([
    getUserById(session.uid!),
    listQuestionsByUser(session.uid!),
    answerCountByQuestion(),
  ]);

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black">내 질문</h1>
          <p className="mt-1 text-ink-soft">
            {user?.name}님이 등록한 질문 {questions.length}건
          </p>
        </div>
        <Link href="/qna" className="btn-brand">
          새 질문
        </Link>
      </div>

      <ul className="mt-8 space-y-3">
        {questions.length === 0 && (
          <li className="card p-10 text-center text-ink-muted">
            아직 등록한 질문이 없습니다.{" "}
            <Link href="/qna" className="font-semibold text-brand-500 hover:underline">
              멘토에게 질문해 보세요.
            </Link>
          </li>
        )}
        {questions.map((q) => {
          const answerN = answerCounts.get(q.id) ?? 0;
          return (
            <li key={q.id}>
              <Link href={`/questions/${q.id}`} className="card block p-5 transition hover:shadow-pop">
                <div className="flex items-center gap-1.5">
                  <span className="badge bg-ink/5 text-ink-soft">
                    {q.scope === "broadcast" ? "다중질문" : "개별질문"}
                  </span>
                  <span
                    className={`badge ${
                      answerN > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {answerN > 0 ? `답변 ${answerN}` : "답변 대기"}
                  </span>
                  {!q.isPublic && <span className="badge bg-ink/5 text-ink-muted">비공개</span>}
                </div>
                <h3 className="mt-2 font-bold">{q.title}</h3>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatKST(q.createdAt)} · 멘토 {q.targetMentorIds.length}명
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
