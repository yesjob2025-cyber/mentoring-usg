"use client";

import { useMemo, useState } from "react";

export interface QMRow {
  student: string;
  studentNo: string;
  department: string;
  grade: string;
  school: string; // superadmin 전용
  question: string;
  date: string; // 표시용(YYYY-MM-DD)
  mentor: string;
  mentorCompany: string;
  answered: boolean;
  answeredAt: string;
}

export function QuestionMentors({ rows, showSchool }: { rows: QMRow[]; showSchool?: boolean }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "answered" | "pending">("all");

  const filtered = useMemo(() => {
    const kw = q.trim();
    return rows.filter((r) => {
      if (tab === "answered" && !r.answered) return false;
      if (tab === "pending" && r.answered) return false;
      if (!kw) return true;
      return (
        r.student.includes(kw) ||
        r.mentor.includes(kw) ||
        r.mentorCompany.includes(kw) ||
        r.question.includes(kw) ||
        r.studentNo.includes(kw) ||
        (showSchool && r.school.includes(kw))
      );
    });
  }, [rows, q, tab, showSchool]);

  function exportCsv() {
    const header = [
      ...(showSchool ? ["학교"] : []),
      "학생", "학번", "학과", "학년", "질문 제목", "질문일", "질문받은 멘토", "멘토 기업", "답변여부", "답변일",
    ];
    const lines = filtered.map((r) =>
      [
        ...(showSchool ? [r.school] : []),
        r.student, r.studentNo, r.department, r.grade, r.question, r.date,
        r.mentor, r.mentorCompany, r.answered ? "답변완료" : "미답변", r.answeredAt,
      ]
        .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `질문멘토현황_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const students = new Set(filtered.map((r) => `${r.school}|${r.student}|${r.studentNo}`)).size;
  const answered = filtered.filter((r) => r.answered).length;

  return (
    <section className="mt-8 card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-line p-5">
        <div>
          <h2 className="text-lg font-extrabold">학생별 질문·멘토 현황</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            학생 {students}명 · 질문-멘토 {filtered.length}건 · 답변완료 {answered}건
          </p>
        </div>
        <button onClick={exportCsv} className="btn-outline text-sm">CSV 내보내기</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-ink-line bg-cream-50 px-5 py-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="학생·멘토·질문 검색"
          className="field-input max-w-xs text-sm"
        />
        <div className="flex gap-1">
          {([["all", "전체"], ["answered", "답변완료"], ["pending", "미답변"]] as const).map(([k, label]) => (
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
              {showSchool && <th className="px-4 py-3 font-semibold">학교</th>}
              <th className="px-4 py-3 font-semibold">학생</th>
              <th className="px-4 py-3 font-semibold">학번</th>
              <th className="px-4 py-3 font-semibold">질문 제목</th>
              <th className="px-4 py-3 font-semibold">질문받은 멘토</th>
              <th className="px-4 py-3 font-semibold">답변</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showSchool ? 6 : 5} className="px-4 py-8 text-center text-ink-muted">
                  해당하는 질문이 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((r, i) => (
              <tr key={i}>
                {showSchool && <td className="px-4 py-3 text-ink-soft">{r.school}</td>}
                <td className="px-4 py-3 font-semibold">
                  {r.student}
                  {r.studentNo ? <span className="ml-1 text-xs text-ink-muted">{r.studentNo}</span> : null}
                </td>
                <td className="px-4 py-3 text-ink-soft">{r.studentNo || "-"}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {r.question}
                  <span className="ml-1 text-xs text-ink-muted">· {r.date}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold">{r.mentor}</span>
                  {r.mentorCompany ? <span className="ml-1 text-xs text-ink-muted">{r.mentorCompany}</span> : null}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      r.answered ? "text-emerald-600" : "text-ink-muted"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${r.answered ? "bg-emerald-500" : "bg-ink-line"}`} />
                    {r.answered ? "답변완료" : "미답변"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
