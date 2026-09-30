"use client";

import { useMemo, useState } from "react";

export interface SettleRow {
  mentor: string;
  company: string;
  answers: number;
  phone: string;
  approved: boolean;
  confirmed: boolean;
  confirmedAt: string;
}

export function SettlementBoard({ rows, asOf }: { rows: SettleRow[]; asOf: string }) {
  const [q, setQ] = useState("");
  const [onlyConfirmed, setOnlyConfirmed] = useState<"all" | "confirmed" | "pending">("all");

  const filtered = useMemo(() => {
    const kw = q.trim();
    return rows.filter((r) => {
      if (onlyConfirmed === "confirmed" && !r.confirmed) return false;
      if (onlyConfirmed === "pending" && r.confirmed) return false;
      if (!kw) return true;
      return (
        r.mentor.includes(kw) ||
        r.company.includes(kw) ||
        r.phone.replace(/[^0-9]/g, "").includes(kw.replace(/[^0-9]/g, ""))
      );
    });
  }, [rows, q, onlyConfirmed]);

  function exportCsv() {
    const header = ["멘토", "기업", "답변건수", "연락처", "확인여부", "확인시각"];
    const lines = filtered.map((r) =>
      [r.mentor, r.company, String(r.answers), r.phone, r.confirmed ? "확인" : "미확인", r.confirmedAt]
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

  const totalAnswers = filtered.reduce((s, r) => s + r.answers, 0);
  const confirmedAnswers = filtered.filter((r) => r.confirmed).reduce((s, r) => s + r.answers, 0);

  return (
    <section className="mt-8 card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-line p-5">
        <div>
          <h2 className="text-lg font-extrabold">답변 정산 확인 현황</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {asOf} 기준 · 표시 {filtered.length}명 · 답변 {totalAnswers}건 (확인 {confirmedAnswers}건)
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
          {([["all", "전체"], ["confirmed", "확인완료"], ["pending", "미확인"]] as const).map(
            ([k, label]) => (
              <button
                key={k}
                onClick={() => setOnlyConfirmed(k)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  onlyConfirmed === k ? "bg-brand-500 text-white" : "bg-white text-ink-soft border border-ink-line"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-left text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">멘토</th>
              <th className="px-5 py-3 font-semibold">기업</th>
              <th className="px-5 py-3 text-right font-semibold">답변 건수</th>
              <th className="px-5 py-3 font-semibold">연락처</th>
              <th className="px-5 py-3 font-semibold">확인</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-ink-muted">
                  표시할 정산 대상이 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={`${r.mentor}-${r.phone}`} className={r.confirmed ? "bg-emerald-50/40" : undefined}>
                <td className="px-5 py-3 font-semibold">{r.mentor}</td>
                <td className="px-5 py-3 text-ink-soft">{r.company || "-"}</td>
                <td className="px-5 py-3 text-right font-bold">{r.answers}</td>
                <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                  {r.approved ? r.phone : "미승인·발송제외"}
                </td>
                <td className="px-5 py-3">
                  {r.confirmed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {r.confirmedAt || "확인"}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">미확인</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
