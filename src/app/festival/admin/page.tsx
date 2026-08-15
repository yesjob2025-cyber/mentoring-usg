import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { festPath } from "@/lib/festival/base";
import { isFestAdmin } from "@/lib/festival/session";
import {
  listAllApplications,
  listAllCheckins,
  listAllInterviews,
  listCompanies,
  listSurveys,
  listVisitors,
} from "@/lib/festival/repo";
import { FEST, courseName } from "@/lib/festival/config";
import { formatKST } from "@/lib/format";
import { RedeemForm } from "./redeem-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "운영 관리",
  robots: { index: false, follow: false },
};

const ZONE_LABEL: Record<string, string> = {
  entry: "입장",
  exit: "퇴장",
  company: "기업관",
  job: "직무관",
  promo: "홍보관",
  side: "부대행사",
};

function avg(values: number[]): string {
  if (!values.length) return "-";
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
}

export default async function FestAdminPage() {
  if (!(await isFestAdmin())) redirect(await festPath("/admin/login"));

  const [visitors, checkins, applications, interviews, surveys, companies] = await Promise.all([
    listVisitors(),
    listAllCheckins(),
    listAllApplications(),
    listAllInterviews(),
    listSurveys(),
    listCompanies(),
  ]);

  const entered = visitors.filter((v) => v.enteredAt).length;
  const zoneCounts = checkins.reduce<Record<string, number>>((acc, c) => {
    acc[c.zone] = (acc[c.zone] ?? 0) + 1;
    return acc;
  }, {});

  const boothRank = Object.entries(
    checkins
      .filter((c) => c.zone !== "entry" && c.zone !== "exit")
      .reduce<Record<string, number>>((acc, c) => {
        acc[c.boothName] = (acc[c.boothName] ?? 0) + 1;
        return acc;
      }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const appsByCompany = companies
    .map((c) => ({
      company: c,
      apps: applications.filter((a) => a.companyId === c.id),
      interviews: interviews.filter((i) => i.companyId === c.id),
    }))
    .sort((a, b) => b.apps.length - a.apps.length);

  const courseCounts = {
    job: visitors.filter((v) => v.course === "job").length,
    career: visitors.filter((v) => v.course === "career").length,
  };

  const kpis = [
    { label: "사전등록", value: visitors.length },
    { label: "현장 입장", value: entered },
    { label: "부스 체크인", value: checkins.filter((c) => c.zone !== "entry" && c.zone !== "exit").length },
    { label: "입사지원", value: applications.length },
    { label: "면접 확정", value: interviews.length },
    { label: "설문 응답", value: surveys.length },
  ];

  return (
    <div className="fest-container py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="fest-eyebrow">Admin dashboard</p>
          <h1 className="mt-1 text-2xl font-black text-fest-navy sm:text-3xl">
            {FEST.title} 운영 현황
          </h1>
          <p className="mt-1 text-sm text-fest-muted">
            {FEST.dateLabel} {FEST.timeLabel} · 실시간 집계
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["visitors", "applications", "checkins", "surveys"].map((t) => (
            <a key={t} href={`/api/festival/export?type=${t}`} className="fest-btn-outline fest-btn-sm">
              {t} CSV
            </a>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="fest-card p-4">
            <p className="text-xs text-fest-muted">{k.label}</p>
            <p className="mt-1 text-2xl font-black text-fest-navy">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* 기업별 지원 현황 */}
          <section className="fest-card p-6">
            <h2 className="text-lg font-extrabold text-fest-navy">기업별 지원 · 면접 현황</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-fest-line text-left text-xs text-fest-muted">
                    <th className="py-2 font-bold">기업</th>
                    <th className="py-2 font-bold">부스</th>
                    <th className="py-2 text-right font-bold">채용예정</th>
                    <th className="py-2 text-right font-bold">지원</th>
                    <th className="py-2 text-right font-bold">면접확정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fest-line">
                  {appsByCompany.map(({ company, apps, interviews: ivs }) => (
                    <tr key={company.id}>
                      <td className="py-2.5 font-bold text-fest-navy">{company.name}</td>
                      <td className="py-2.5 text-fest-muted">{company.boothNo}</td>
                      <td className="py-2.5 text-right">
                        {company.positions.reduce((s, p) => s + p.headcount, 0)}
                      </td>
                      <td className="py-2.5 text-right font-bold text-fest-blue">{apps.length}</td>
                      <td className="py-2.5 text-right">{ivs.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 최근 참가자 */}
          <section className="fest-card p-6">
            <h2 className="text-lg font-extrabold text-fest-navy">최근 사전등록자</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-fest-line text-left text-xs text-fest-muted">
                    <th className="py-2 font-bold">이름</th>
                    <th className="py-2 font-bold">구분</th>
                    <th className="py-2 font-bold">코스</th>
                    <th className="py-2 font-bold">소속</th>
                    <th className="py-2 font-bold">등록시각</th>
                    <th className="py-2 font-bold">입장</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fest-line">
                  {visitors.slice(0, 25).map((v) => (
                    <tr key={v.id}>
                      <td className="py-2.5 font-bold text-fest-navy">{v.name}</td>
                      <td className="py-2.5 text-fest-muted">{v.visitorType}</td>
                      <td className="py-2.5">{courseName(v.course)}</td>
                      <td className="py-2.5 text-fest-muted">{v.school ?? "-"}</td>
                      <td className="py-2.5 text-fest-muted">{formatKST(v.registeredAt)}</td>
                      <td className="py-2.5">
                        {v.enteredAt ? (
                          <span className="fest-chip-blue">입장</span>
                        ) : (
                          <span className="fest-chip">대기</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visitors.length === 0 && (
                <p className="py-10 text-center text-sm text-fest-muted">
                  아직 사전등록자가 없습니다.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="fest-card p-5">
            <h2 className="text-sm font-extrabold text-fest-navy">관별 체크인</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {["entry", "company", "job", "promo", "side", "exit"].map((z) => (
                <li key={z} className="flex items-center justify-between">
                  <span className="text-fest-muted">{ZONE_LABEL[z]}</span>
                  <span className="font-black text-fest-navy">{zoneCounts[z] ?? 0}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="fest-card p-5">
            <h2 className="text-sm font-extrabold text-fest-navy">코스 분포</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-fest-muted">JOB 코스</span>
                <span className="font-black text-fest-navy">{courseCounts.job}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-fest-muted">Career 코스</span>
                <span className="font-black text-fest-navy">{courseCounts.career}</span>
              </li>
            </ul>
          </section>

          <section className="fest-card p-5">
            <h2 className="text-sm font-extrabold text-fest-navy">인기 부스 TOP 10</h2>
            {boothRank.length === 0 ? (
              <p className="mt-3 text-sm text-fest-muted">데이터 없음</p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {boothRank.map(([name, n], i) => (
                  <li key={name} className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      <span className="mr-2 font-black text-fest-blue">{i + 1}</span>
                      {name}
                    </span>
                    <span className="shrink-0 font-bold text-fest-navy">{n}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="fest-card p-5">
            <h2 className="text-sm font-extrabold text-fest-navy">만족도</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                { k: "전반", v: avg(surveys.map((s) => s.overall)) },
                { k: "부스 운영", v: avg(surveys.map((s) => s.booth)) },
                { k: "프로그램", v: avg(surveys.map((s) => s.program)) },
                { k: "운영/동선", v: avg(surveys.map((s) => s.operation)) },
                { k: "추천지수(0-10)", v: avg(surveys.map((s) => s.recommend)) },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between">
                  <dt className="text-fest-muted">{row.k}</dt>
                  <dd className="font-black text-fest-navy">{row.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="fest-card p-5">
            <h2 className="text-sm font-extrabold text-fest-navy">스탬프 완주 코드 확인</h2>
            <p className="mt-1.5 text-xs text-fest-muted">
              종합안내부스에서 경품 지급 시 완주 코드를 입력하세요.
            </p>
            <div className="mt-3">
              <RedeemForm />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
