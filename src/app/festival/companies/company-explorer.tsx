"use client";

import { useMemo, useState } from "react";
import { FestLink } from "@/components/festival/fest-link";
import type { FestCompany } from "@/lib/festival/types";

export function CompanyExplorer({ companies }: { companies: FestCompany[] }) {
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("전체");
  const [employment, setEmployment] = useState("전체");
  const [onlyInterview, setOnlyInterview] = useState(false);

  const industries = useMemo(
    () => ["전체", ...Array.from(new Set(companies.map((c) => c.industry)))],
    [companies]
  );
  const employments = useMemo(
    () => [
      "전체",
      ...Array.from(new Set(companies.flatMap((c) => c.positions.map((p) => p.employmentType)))),
    ],
    [companies]
  );

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return companies.filter((c) => {
      if (industry !== "전체" && c.industry !== industry) return false;
      if (employment !== "전체" && !c.positions.some((p) => p.employmentType === employment))
        return false;
      if (onlyInterview && !c.onSiteInterview) return false;
      if (!keyword) return true;
      const haystack = [
        c.name,
        c.industry,
        c.summary,
        c.description,
        ...c.tags,
        ...c.positions.map((p) => p.title),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [companies, q, industry, employment, onlyInterview]);

  return (
    <div>
      <div className="fest-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <label className="fest-label" htmlFor="company-q">
              검색
            </label>
            <input
              id="company-q"
              className="fest-input"
              placeholder="기업명 · 직무 · 키워드 (예: 생산관리)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="company-industry">
              산업
            </label>
            <select
              id="company-industry"
              className="fest-input"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {industries.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fest-label" htmlFor="company-employment">
              고용형태
            </label>
            <select
              id="company-employment"
              className="fest-input"
              value={employment}
              onChange={(e) => setEmployment(e.target.value)}
            >
              {employments.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-fest-ink">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-fest-line text-fest-blue focus:ring-fest-blue"
            checked={onlyInterview}
            onChange={(e) => setOnlyInterview(e.target.checked)}
          />
          현장 면접 운영 기업만 보기
        </label>
      </div>

      <p className="mt-6 text-sm font-bold text-fest-muted">
        총 <span className="text-fest-blue">{filtered.length}</span>개 기업
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((company) => {
          const total = company.positions.reduce((s, p) => s + p.headcount, 0);
          return (
            <FestLink
              key={company.id}
              href={`/companies/${company.id}`}
              className="fest-card-hover flex flex-col p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fest-navy text-xs font-black text-white">
                    {company.logoText}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-extrabold text-fest-navy">
                      {company.name}
                    </p>
                    <p className="text-xs text-fest-muted">
                      {company.industry} · {company.scale}
                    </p>
                  </div>
                </div>
                <span className="fest-chip shrink-0">{company.boothNo}</span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-fest-ink/80">{company.summary}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {company.positions.slice(0, 3).map((p) => (
                  <span key={p.id} className="fest-chip">
                    {p.title}
                  </span>
                ))}
                {company.positions.length > 3 && (
                  <span className="fest-chip">+{company.positions.length - 3}</span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-fest-line pt-3 text-xs font-bold">
                <span className="text-fest-muted">채용 {total}명</span>
                {company.onSiteInterview ? (
                  <span className="fest-chip-blue">현장 면접 운영</span>
                ) : (
                  <span className="fest-chip">상담 전용</span>
                )}
              </div>
            </FestLink>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="fest-card mt-4 px-6 py-16 text-center text-sm text-fest-muted">
          조건에 맞는 기업이 없습니다. 검색어나 필터를 조정해 보세요.
        </p>
      )}
    </div>
  );
}
