import type { Metadata } from "next";
import { getSettlement } from "@/lib/settlements";
import { SettleForm } from "./settle-form";

export const metadata: Metadata = { title: "답변 정산 확인", robots: { index: false } };
export const dynamic = "force-dynamic";

function mdLabel(asOf: string): string {
  const [y, m, d] = asOf.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export default async function SettlePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const s = await getSettlement(token);

  if (!s) {
    return (
      <div className="container-page max-w-lg py-16">
        <div className="card p-8 text-center">
          <p className="text-lg font-extrabold">유효하지 않은 링크입니다</p>
          <p className="mt-2 text-sm text-ink-soft">링크를 다시 확인해 주세요. 문의: 010-8553-6027</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-lg py-14">
      <div className="card overflow-hidden">
        <div className="bg-ink px-6 py-8 text-cream-50">
          <p className="text-sm font-semibold text-brand-300">부울경 연합 현직자 멘토링</p>
          <h1 className="mt-2 text-2xl font-black">답변 정산 확인</h1>
          <p className="mt-1 text-cream-200/80">{s.mentorName} 멘토님, 그동안 답변에 참여해 주셔서 감사합니다.</p>
        </div>

        <div className="p-6">
          <dl className="space-y-3 rounded-xl bg-cream-100 p-5 text-sm">
            <Row label="멘토" value={`${s.mentorName}${s.company ? ` · ${s.company}` : ""}`} />
            <Row label="기준일" value={`${mdLabel(s.asOf)} 기준`} />
            <div className="flex items-center justify-between border-t border-ink-line pt-3">
              <dt className="text-ink-muted">답변 완료 건수</dt>
              <dd className="text-2xl font-black text-brand-600">
                {s.answerCount}
                <span className="ml-1 text-sm font-semibold text-ink-muted">건</span>
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-sm text-ink-soft">
            위 건수는 {mdLabel(s.asOf)}까지 등록된 질의응답 답변 기준입니다. 내용이 맞으면 아래
            «확인» 버튼을 눌러주세요. 확인해 주신 건수를 기준으로 답변 비용을 지급해 드립니다.
          </p>

          <div className="mt-6">
            <SettleForm token={s.token} confirmed={Boolean(s.confirmedAt)} count={s.answerCount} />
          </div>

          <p className="mt-6 text-center text-xs text-ink-muted">
            건수가 실제와 다르면 확인을 누르지 마시고 운영팀(010-8553-6027)으로 연락 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
