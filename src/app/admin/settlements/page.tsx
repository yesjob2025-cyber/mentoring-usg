import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listSettlements, SETTLE_ASOF_DEFAULT } from "@/lib/settlements";
import { formatKST } from "@/lib/format";
import { SettlementBoard, type SettleRow } from "../settlement-board";

export const metadata: Metadata = { title: "답변 정산 확인" };
export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    redirect("/admin/login");
  }

  const settlements = await listSettlements();
  const asOf = settlements[0]?.asOf ?? SETTLE_ASOF_DEFAULT;

  const rows: SettleRow[] = settlements
    .map((s) => ({
      mentor: s.mentorName,
      company: s.company,
      answers: s.answerCount,
      phone: s.phone,
      approved: Boolean(s.phone),
      confirmed: Boolean(s.confirmedAt),
      confirmedAt: s.confirmedAt ? formatKST(s.confirmedAt) : "",
    }))
    .sort((a, b) => b.answers - a.answers);

  const mentors = rows.length;
  const totalAnswers = rows.reduce((s, r) => s + r.answers, 0);
  const confirmed = rows.filter((r) => r.confirmed).length;
  const confirmedAnswers = rows.filter((r) => r.confirmed).reduce((s, r) => s + r.answers, 0);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip-brand">전체 관리자</span>
          <h1 className="mt-3 text-3xl font-black">답변 정산 확인</h1>
          <p className="mt-1 text-ink-soft">
            {asOf} 기준 멘토별 질의응답 답변 건수와 멘토 확인 현황입니다. 확인 완료 건을 기준으로 비용을 지급하세요.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="정산 대상 멘토" value={mentors} unit="명" />
        <Kpi label="총 답변 건수" value={totalAnswers} unit="건" />
        <Kpi label="확인 완료 멘토" value={confirmed} unit="명" accent />
        <Kpi label="확인 완료 건수" value={confirmedAnswers} unit="건" />
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 card p-8 text-center">
          <p className="font-extrabold">아직 정산 대상이 생성되지 않았습니다.</p>
          <p className="mt-2 text-sm text-ink-soft">
            먼저 정산 대상을 생성하고 멘토에게 확인 링크를 발송하세요. (운영자 전용 URL)
          </p>
          <p className="mt-3 rounded-lg bg-cream-100 px-4 py-2 font-mono text-xs text-ink-soft">
            /api/settle-init?secret=&lt;SEED_SECRET&gt; (미리보기) · &amp;send=1 (발송)
          </p>
        </div>
      ) : (
        <SettlementBoard rows={rows} asOf={asOf} />
      )}
    </div>
  );
}

function Kpi({ label, value, unit, accent }: { label: string; value: number; unit: string; accent?: boolean }) {
  return (
    <div className={`card p-5 ${accent ? "ring-2 ring-brand-300" : ""}`}>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-black">
        {value.toLocaleString()}
        <span className="ml-1 text-base font-semibold text-ink-muted">{unit}</span>
      </p>
    </div>
  );
}
