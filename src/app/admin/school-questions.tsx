"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface SchoolQuestionRow {
  id: string;
  title: string;
  body: string;
  authorName: string;
  studentNo: string;
  date: string; // 서버에서 포맷된 날짜
  answered: number;
  anonymous: boolean;
}

export function SchoolQuestions({ questions }: { questions: SchoolQuestionRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return questions;
    return questions.filter((row) =>
      [row.authorName, row.studentNo, row.title, row.body]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [q, questions]);

  return (
    <section className="mt-8 card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-line p-5">
        <div>
          <h2 className="text-lg font-extrabold">학교 질문 전체</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            이름 · 학번 · 내용으로 검색할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 / 학번 / 내용 검색"
            className="w-56 rounded-lg border border-ink-line bg-white px-3 py-2 text-sm"
          />
          <span className="shrink-0 text-sm text-ink-muted">
            {filtered.length}/{questions.length}건
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-left text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">이름</th>
              <th className="px-5 py-3 font-semibold">학번</th>
              <th className="px-5 py-3 font-semibold">질문</th>
              <th className="px-5 py-3 font-semibold">답변</th>
              <th className="px-5 py-3 font-semibold">작성일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-ink-muted">
                  {questions.length === 0 ? "아직 등록된 질문이 없습니다." : "검색 결과가 없습니다."}
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="whitespace-nowrap px-5 py-3 font-semibold">
                  {row.authorName}
                  {row.anonymous && <span className="ml-1 text-xs text-ink-muted">(익명)</span>}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-ink-soft">{row.studentNo || "-"}</td>
                <td className="px-5 py-3">
                  <Link href={`/questions/${row.id}`} className="font-medium hover:underline">
                    {row.title}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{row.body}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span
                    className={`badge ${
                      row.answered > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {row.answered > 0 ? `답변 ${row.answered}` : "대기"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
