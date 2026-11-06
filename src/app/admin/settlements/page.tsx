import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listSettlements, SETTLE_ASOF_DEFAULT } from "@/lib/settlements";
import { formatKST } from "@/lib/format";
import { SettlementBoard, type SettleRow } from "../settlement-board";

export const metadata: Metadata = { title: "답변 정산 처리현황" };
export const dynamic = "force-dynamic";

const won = (n: number) => n.toLocaleString() + "원";

export default async function SettlementsPage() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    redirect("/admin/login");
  }

  const settlements = await listSettlements();
  const asOf = settlements[0]?.asOf ?? SETTLE_ASOF_DEFAULT;

  const rows: SettleRow[] = settlements
    .map((s) => ({
      token: s.token,
      mentor: s.mentorName,
      company: s.company,
      answers: s.answerCount,
      amount: s.payAmount ?? 0,
      phone: s.phone,
      approved: Boolean(s.phone),
      confirmed: Boolean(s.confirmedAt),
      confirmedAt: s.confirmedAt ? formatKST(s.confirmedAt) : "",
      paid: Boolean(s.paidAt),
      paidAt: s.paidAt ? formatKST(s.paidAt) : "",
    }))
    .sort((a, b) => b.answers - a.answers);

  const mentors = rows.length;
  const totalAnswers = rows.reduce((s, r) => s + r.answers, 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const paidCount = rows.filter((r) => r.paid).length;
  const paidAmount = rows.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip-brand">전체 관리자</span>
          <h1 className="mt-3 text-3xl font-black">답변 정산 처리현황</h1>
          <p className="mt-1 text-ink-soft">
            {asOf} 기준 확정 명단입니다. 지급을 완료한 멘토는 «지급완료 처리»를 눌러 현황을 관리하세요.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="정산 대상" value={`${mentors}명`} />
        <Kpi label="총 답변 건수" value={`${totalAnswers}건`} />
        <Kpi label="총 지급액" value={won(totalAmount)} accent />
        <Kpi label="지급완료" value={`${paidCount}명`} />
        <Kpi label="지급완료 금액" value={won(paidAmount)} />
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 card p-8 text-center">
          <p className="font-extrabold">아직 정산 대상이 없습니다.</p>
          <p className="mt-2 text-sm text-ink-soft">확정 명단을 먼저 반영하세요. (운영자 전용 URL)</p>
          <p className="mt-3 rounded-lg bg-cream-100 px-4 py-2 font-mono text-xs text-ink-soft">
            /api/settle-import?secret=&lt;SEED_SECRET&gt; (미리보기) · &amp;commit=1 (반영)
          </p>
        </div>
      ) : (
        <SettlementBoard rows={rows} asOf={asOf} />
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card p-5 ${accent ? "ring-2 ring-brand-300" : ""}`}>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}
