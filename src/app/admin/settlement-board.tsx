"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPaidAction } from "@/app/actions/settle";

export interface SettleRow {
  token: string;
  mentor: string;
  company: string;
  answers: number;
  amount: number;
  phone: string;
  approved: boolean;
  confirmed: boolean;
  confirmedAt: string;
  paid: boolean;
  paidAt: string;
}

const won = (n: number) => n.toLocaleString() + "원";

export function SettlementBoard({ rows, asOf }: { rows: SettleRow[]; asOf: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "paid" | "unpaid">("all");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const kw = q.trim();
    return rows.filter((r) => {
      if (tab === "paid" && !r.paid) return false;
      if (tab === "unpaid" && r.paid) return false;
      if (!kw) return true;
      return (
        r.mentor.includes(kw) ||
        r.company.includes(kw) ||
        r.phone.replace(/[^0-9]/g, "").includes(kw.replace(/[^0-9]/g, ""))
      );
    });
  }, [rows, q, tab]);

  function togglePaid(r: SettleRow) {
    setBusy(r.token);
    startTransition(async () => {
      const res = await setPaidAction(r.token, !r.paid);
      setBusy(null);
      if (res.error) alert(res.error);
      else router.refresh();
    });
  }

  function exportCsv() {
    const header = ["멘토", "기업", "답변건수", "지급액", "연락처", "지급상태", "지급일"];
    const lines = filtered.map((r) =>
      [r.mentor, r.company, String(r.answers), String(r.amount), r.phone, r.paid ? "지급완료" : "미지급", r.paidAt]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `답변정산_${asOf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const paidAmount = filtered.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);

  return (
    <section className="mt-8 card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-line p-5">
        <div>
          <h2 className="text-lg font-extrabold">지급 처리 현황</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {asOf} 기준 · 표시 {filtered.length}명 · 합계 {won(totalAmount)} (지급완료 {won(paidAmount)})
          </p>
        </div>
        <button onClick={exportCsv} className="btn-outline text-sm">CSV 내보내기</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-ink-line bg-cream-50 px-5 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="멘토·기업·연락처 검색"
          className="field-input max-w-xs text-sm"
        />
        <div className="flex gap-1">
          {([["all", "전체"], ["unpaid", "미지급"], ["paid", "지급완료"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                tab === k ? "bg-brand-500 text-white" : "bg-white text-ink-soft border border-ink-line"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-left text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">멘토</th>
              <th className="px-5 py-3 font-semibold">기업</th>
              <th className="px-5 py-3 text-right font-semibold">답변</th>
              <th className="px-5 py-3 text-right font-semibold">지급액</th>
              <th className="px-5 py-3 font-semibold">연락처</th>
              <th className="px-5 py-3 font-semibold">지급 처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-muted">
                  표시할 정산 대상이 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.token} className={r.paid ? "bg-emerald-50/40" : undefined}>
                <td className="px-5 py-3 font-semibold">{r.mentor}</td>
                <td className="px-5 py-3 text-ink-soft">{r.company || "-"}</td>
                <td className="px-5 py-3 text-right font-bold">{r.answers}</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums">{won(r.amount)}</td>
                <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                  {r.approved ? r.phone : "미승인"}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePaid(r)}
                      disabled={pending && busy === r.token}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-50 ${
                        r.paid
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "border border-ink-line bg-white text-ink-soft hover:bg-cream-100"
                      }`}
                    >
                      {busy === r.token ? "처리 중…" : r.paid ? "✓ 지급완료" : "지급완료 처리"}
                    </button>
                    {r.paid && r.paidAt && <span className="text-[11px] text-ink-muted">{r.paidAt}</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
