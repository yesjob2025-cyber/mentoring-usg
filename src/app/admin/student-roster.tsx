"use client";

import { useMemo, useState } from "react";

export interface StudentRow {
  id: string;
  name: string;
  studentNo: string;
  school: string;
  department: string;
  grade: string;
  gender: string;
  phone: string;
  email: string;
  joinedAt: string;
  questionCount: number;
}

export function StudentRoster({ rows, showSchool }: { rows: StudentRow[]; showSchool?: boolean }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.name, r.studentNo, r.school, r.department, r.email].join(" ").toLowerCase().includes(term)
    );
  }, [rows, q]);

  function exportCsv() {
    const cols = [
      "이름", "학번", ...(showSchool ? ["학교"] : []),
      "학과", "학년", "성별", "연락처", "이메일", "가입일", "질문수",
    ];
    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = filtered.map((r) =>
      [
        r.name, r.studentNo, ...(showSchool ? [r.school] : []),
        r.department, r.grade, r.gender, r.phone, r.email, r.joinedAt, r.questionCount,
      ]
        .map(esc)
        .join(",")
    );
    const csv = "﻿" + [cols.map(esc).join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "등록학생_명단.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-8 card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-line p-5">
        <div>
          <h2 className="text-lg font-extrabold">등록 학생 명단</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            총 {rows.length}명{q ? ` · 검색 ${filtered.length}명` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={showSchool ? "이름·학번·학교·학과 검색" : "이름·학번·학과 검색"}
            className="w-56 rounded-lg border border-ink-line bg-white px-3 py-2 text-sm"
          />
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="btn-outline px-3 py-2 text-sm disabled:opacity-50"
          >
            ⬇ CSV 내보내기
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-left text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">이름 / 학번</th>
              {showSchool && <th className="px-4 py-3 font-semibold">학교</th>}
              <th className="px-4 py-3 font-semibold">학과 / 학년</th>
              <th className="px-4 py-3 font-semibold">연락처</th>
              <th className="px-4 py-3 font-semibold">이메일</th>
              <th className="px-4 py-3 font-semibold">가입일</th>
              <th className="px-4 py-3 text-right font-semibold">질문</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showSchool ? 7 : 6} className="px-4 py-8 text-center text-ink-muted">
                  등록된 학생이 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="font-semibold">{r.name}</span>
                  {r.studentNo && <span className="ml-1.5 text-xs text-ink-muted">{r.studentNo}</span>}
                </td>
                {showSchool && <td className="px-4 py-3 text-ink-soft">{r.school}</td>}
                <td className="px-4 py-3 text-ink-soft">
                  {[r.department, r.grade].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-soft">{r.phone || "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{r.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{r.joinedAt}</td>
                <td className="px-4 py-3 text-right font-bold">{r.questionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
