import type { Metadata } from "next";
import { industries, jobs, companyTypes, majors, themeMeta } from "@/lib/taxonomy";
import { getSession } from "@/lib/session";
import { recommendMentors } from "@/lib/repo";
import { toPublicMentor } from "@/lib/view";
import { QnaExplorer } from "./qna-explorer";

export const metadata: Metadata = {
  title: "실시간 Q&A · 멘토 추천",
  description: "산업·직무·유형·전공별 현직자 멘토를 추천받고 질문하세요.",
};

export default async function QnaPage() {
  const session = await getSession();
  const isStudent = session?.role === "student";

  // 초기 추천(선택 없음): 참여도 상위 멘토
  const initial = (await recommendMentors({}, 24)).map((r) => ({
    mentor: toPublicMentor(r.mentor),
    score: r.score,
    matched: r.matched,
  }));

  return (
    <div className="container-page py-10">
      <div className="max-w-2xl">
        <span className="chip-brand">실시간 Q&A</span>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          산업·직무·유형·전공으로 멘토를 찾아 질문하세요
        </h1>
        <p className="mt-3 text-ink-soft">
          4가지 테마를 선택하면 답변 가능한 멘토가 추천됩니다. 한 명에게 개별 질문하거나, 여러
          멘토를 선택해 한 번에 질문할 수 있어요. 질문은 멘토에게 카카오톡·문자로 전달됩니다.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-500">
          <span>🔔</span> 참여 멘토는 계속 추가·업데이트됩니다.
        </div>
      </div>

      <QnaExplorer
        isStudent={isStudent}
        initial={initial}
        taxonomy={{
          industry: industries,
          job: jobs,
          type: companyTypes,
          major: majors,
        }}
        themeMeta={themeMeta}
      />
    </div>
  );
}
