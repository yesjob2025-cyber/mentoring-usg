"use client";

import { useMemo, useState } from "react";
import { FestLink } from "@/components/festival/fest-link";
import type { FestJobBooth } from "@/lib/festival/types";

export function JobExplorer({ jobs }: { jobs: FestJobBooth[] }) {
  const categories = useMemo(
    () => ["전체", ...Array.from(new Set(jobs.map((j) => j.category)))],
    [jobs]
  );
  const [category, setCategory] = useState("전체");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (category !== "전체" && j.category !== category) return false;
      if (!keyword) return true;
      return [j.name, j.summary, j.description, ...j.tasks, ...j.skills, ...j.tags]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [jobs, category, q]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                category === c
                  ? "bg-fest-violet text-white"
                  : "border border-fest-line bg-white text-fest-ink hover:border-fest-violet/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          className="fest-input sm:max-w-xs"
          placeholder="직무 · 역량 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="직무 검색"
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((job) => (
          <FestLink key={job.id} href={`/jobs/${job.id}`} className="fest-card-hover flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="fest-chip border-fest-violet/25 bg-violet-50 text-fest-violet">
                  {job.category}
                </span>
                <h3 className="mt-2.5 text-lg font-extrabold text-fest-navy">{job.name}</h3>
              </div>
              <span className="fest-chip shrink-0">{job.boothNo}</span>
            </div>
            <p className="mt-2 text-sm text-fest-ink/80">{job.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 3).map((s) => (
                <span key={s} className="fest-chip">
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-4 border-t border-fest-line pt-3 text-xs font-bold text-fest-muted">
              {job.mentorTitle}
            </p>
          </FestLink>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="fest-card mt-4 px-6 py-16 text-center text-sm text-fest-muted">
          조건에 맞는 직무가 없습니다.
        </p>
      )}
    </div>
  );
}
