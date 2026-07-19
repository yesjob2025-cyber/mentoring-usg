import type { Metadata } from "next";
import Link from "next/link";
import { getAnswerToken, getQuestion, getMentorById } from "@/lib/repo";
import { themeName } from "@/lib/taxonomy";
import { formatKST } from "@/lib/format";
import { AnswerForm } from "./answer-form";

export const metadata: Metadata = { title: "멘토 답변 작성", robots: { index: false } };

export default async function AnswerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = getAnswerToken(token);

  if (!t) {
    return <InvalidNotice message="유효하지 않은 답변 링크입니다. 링크를 다시 확인해 주세요." />;
  }
  const question = getQuestion(t.questionId);
  const mentor = getMentorById(t.mentorId);
  if (!question || !mentor) {
    return <InvalidNotice message="질문 정보를 찾을 수 없습니다." />;
  }

  const themeChips = Object.entries(question.themeRefs)
    .filter(([, v]) => !!v)
    .map(([, v]) => themeName(v as string))
    .filter(Boolean) as string[];

  return (
    <div className="container-page max-w-2xl py-12">
      <div className="card p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm font-black text-brand-300">
            Y
          </span>
          <span className="font-extrabold">YESJOB 멘토링</span>
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          {mentor.name} 멘토님, 아래 질문에 답변해 주세요. 답변은 사이트에 저장되고 학생에게
          카카오톡으로 전달됩니다.
        </p>

        <div className="mt-5 rounded-xl border border-ink-line bg-cream-100 p-5">
          <div className="flex flex-wrap gap-1.5">
            <span className="badge bg-ink/5 text-ink-soft">
              {question.scope === "broadcast" ? "다중 질문" : "개별 질문"}
            </span>
            {themeChips.map((c) => (
              <span key={c} className="badge bg-brand-50 text-brand-500">
                {c}
              </span>
            ))}
          </div>
          <h1 className="mt-3 text-xl font-extrabold">{question.title}</h1>
          <p className="mt-2 whitespace-pre-wrap text-ink-soft">{question.body}</p>
          <p className="mt-3 text-xs text-ink-muted">
            {question.authorName} 학생 · {formatKST(question.createdAt)}
          </p>
        </div>

        {t.used ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-center text-sm text-emerald-700">
            이미 답변을 제출한 질문입니다. 감사합니다!
          </div>
        ) : (
          <AnswerForm token={token} mentorName={mentor.name} />
        )}
      </div>
    </div>
  );
}

function InvalidNotice({ message }: { message: string }) {
  return (
    <div className="container-page max-w-lg py-20 text-center">
      <div className="card p-10">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-2xl">
          !
        </div>
        <p className="mt-4 text-ink-soft">{message}</p>
        <Link href="/" className="btn-outline mt-6">
          홈으로
        </Link>
      </div>
    </div>
  );
}
