"use client";

import { useMemo, useState } from "react";

export interface MentorQnaRow {
  id: string;
  name: string;
  company: string;
  title: string;
  received: number;
  answered: number;
  pending: number;
  answerRate: number;
  lastAnswered: string; // 서버 포맷된 날짜 (없으면 "")
}

type Tab = "all" | "pending" | "done";

export function MentorQna({ rows }: { rows: MentorQnaRow[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "pending" && r.pending === 0) return false;
      if (tab === "done" && r.pending !== 0) return false;
      if (!term) return true;
      return [r.name, r.company, r.title].join(" ").toLowerCase().includes(term);
    });
  }, [q, tab, rows]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "pending", label: "미답변 있음" },
    { key: "done", label: "모두 답변" },
  ];

  return (
    <section className="mt-8 card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-line p-5">
        <div>
          <h2 className="text-lg font-extrabold">멘토 질문·답변 현황</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            질문을 받은 멘토별 발송·답변·미답변 현황입니다. 이름·소속으로 검색하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="멘토 이름 / 소속 검색"
            className="w-52 rounded-lg border border-ink-line bg-white px-3 py-2 text-sm"
          />
          <span className="shrink-0 text-sm text-ink-muted">
            {filtered.length}/{rows.length}명
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-ink-line px-5 py-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.key
                ? "border-ink bg-ink text-cream-50"
                : "border-ink-line bg-white text-ink-soft hover:bg-cream-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-left text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">멘토</th>
              <th className="px-5 py-3 font-semibold">소속·직무</th>
              <th className="px-5 py-3 text-right font-semibold">발송</th>
              <th className="px-5 py-3 text-right font-semibold">답변</th>
              <th className="px-5 py-3 text-right font-semibold">미답변</th>
              <th className="px-5 py-3 text-right font-semibold">답변률</th>
              <th className="px-5 py-3 font-semibold">최근 답변</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-ink-muted">
                  {rows.length === 0 ? "아직 발송된 질문이 없습니다." : "검색 결과가 없습니다."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-5 py-3 font-semibold">{r.name}</td>
                <td className="px-5 py-3 text-ink-soft">
                  {[r.company, r.title].filter(Boolean).join(" · ")}
                </td>
                <td className="px-5 py-3 text-right">{r.received}</td>
                <td className="px-5 py-3 text-right font-semibold text-emerald-600">{r.answered}</td>
                <td className="px-5 py-3 text-right">
                  {r.pending > 0 ? (
                    <span className="font-bold text-amber-600">{r.pending}</span>
                  ) : (
                    <span className="text-ink-muted">0</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">{r.answerRate}%</td>
                <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{r.lastAnswered || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
