"use client";

import { useMemo, useState } from "react";
import { slotLabel } from "@/lib/talk-config";

export interface ResRow {
  id: string;
  userId: string;
  name: string;
  studentNo: string;
  school: string;
  date: string;
  weekday: string;
  time: string;
  topic: string;
  company: string;
  track: string;
}

const TRACK_STYLE: Record<string, string> = {
  IT분야: "bg-blue-50 text-blue-700",
  공학: "bg-emerald-50 text-emerald-700",
  인문상경: "bg-brand-50 text-brand-500",
  기타: "bg-purple-50 text-purple-700",
  공공: "bg-ink/5 text-ink-soft",
};

export function TalkReservations({ rows, showSchool }: { rows: ResRow[]; showSchool?: boolean }) {
  const [q, setQ] = useState("");
  const [date, setDate] = useState<string>("all");

  const dates = useMemo(
    () => [...new Set(rows.map((r) => r.date))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (date !== "all" && r.date !== date) return false;
      if (!term) return true;
      return [r.name, r.studentNo, r.school, r.topic, r.company].join(" ").toLowerCase().includes(term);
    });
  }, [rows, q, date, showSchool]);

  const studentCount = useMemo(() => new Set(filtered.map((r) => r.userId)).size, [filtered]);

  // 학교별 요약 (전체 관리자용)
  const bySchool = useMemo(() => {
    const m = new Map<string, { count: number; students: Set<string> }>();
    for (const r of filtered) {
      const cur = m.get(r.school) ?? { count: 0, students: new Set<string>() };
      cur.count += 1;
      cur.students.add(r.userId);
      m.set(r.school, cur);
    }
    return [...m.entries()]
      .map(([school, v]) => ({ school, count: v.count, students: v.students.size }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  return (
    <section className="mt-8 card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-line p-5">
        <div>
          <h2 className="text-lg font-extrabold">토크콘서트 예약 현황</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            예약 {filtered.length}건 · 학생 {studentCount}명
            {showSchool ? ` · ${bySchool.length}개교` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-ink-line bg-white px-3 py-2 text-sm"
          >
            <option value="all">전체 날짜</option>
            {dates.map((d) => (
              <option key={d} value={d}>{d.slice(5).replace("-", ".")}</option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={showSchool ? "이름·학번·학교·분야 검색" : "이름·학번·분야 검색"}
            className="w-56 rounded-lg border border-ink-line bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* 학교별 요약 */}
      {showSchool && bySchool.length > 0 && (
        <div className="border-b border-ink-line bg-cream-50 p-5">
          <p className="mb-2 text-xs font-semibold text-ink-muted">학교별 예약</p>
          <div className="flex flex-wrap gap-2">
            {bySchool.map((s) => (
              <span key={s.school} className="rounded-lg border border-ink-line bg-white px-3 py-1.5 text-sm">
                <b>{s.school}</b>
                <span className="ml-1.5 text-ink-muted">{s.count}건 · {s.students}명</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-left text-ink-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">이름 / 학번</th>
              {showSchool && <th className="px-5 py-3 font-semibold">학교</th>}
              <th className="px-5 py-3 font-semibold">날짜</th>
              <th className="px-5 py-3 font-semibold">시간</th>
              <th className="px-5 py-3 font-semibold">분야 · 기업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-line">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showSchool ? 5 : 4} className="px-5 py-8 text-center text-ink-muted">
                  예약 내역이 없습니다.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-5 py-3">
                  <span className="font-semibold">{r.name}</span>
                  {r.studentNo && <span className="ml-1.5 text-xs text-ink-muted">{r.studentNo}</span>}
                </td>
                {showSchool && <td className="px-5 py-3 text-ink-soft">{r.school}</td>}
                <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                  {r.date.slice(5).replace("-", ".")} <span className="text-ink-muted">({r.weekday})</span>
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-bold text-cream-50">
                    {slotLabel(r.time)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${TRACK_STYLE[r.track] ?? "bg-ink/5 text-ink-soft"}`}>
                    {r.track}
                  </span>
                  <span className="font-medium">{r.topic}</span>
                  {r.company && <span className="text-ink-muted"> · {r.company}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
