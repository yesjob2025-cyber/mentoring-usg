import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FestLink } from "@/components/festival/fest-link";
import { festPath } from "@/lib/festival/base";
import { getPassSession } from "@/lib/festival/session";
import {
  getStampAward,
  getVisitor,
  listApplications,
  listCheckins,
  listInterviews,
} from "@/lib/festival/repo";
import { FEST } from "@/lib/festival/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "참여 완료",
};

export default async function DonePage() {
  const pass = await getPassSession();
  if (!pass?.vid) redirect(await festPath("/"));

  const visitor = await getVisitor(pass.vid);
  if (!visitor) redirect(await festPath("/"));

  const [checkins, applications, interviews, award] = await Promise.all([
    listCheckins(visitor.id),
    listApplications(visitor.id),
    listInterviews(visitor.id),
    getStampAward(visitor.id),
  ]);

  const boothVisits = checkins.filter((c) => c.zone !== "entry" && c.zone !== "exit").length;

  return (
    <div className="fest-container py-14 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-fest-emerald/10 text-3xl">
          🎉
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-fest-navy sm:text-4xl">
          {visitor.name}님, 참여해 주셔서 감사합니다
        </h1>
        <p className="mt-3 text-sm text-fest-muted sm:text-base">
          설문이 제출되었습니다. {FEST.title}에서의 하루가 좋은 결과로 이어지길 바랍니다.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "방문 부스", value: `${boothVisits}곳` },
            { label: "입사지원", value: `${applications.length}건` },
            { label: "현장 면접", value: `${interviews.length}건` },
            { label: "스탬프", value: award ? "완주" : "진행" },
          ].map((s) => (
            <div key={s.label} className="fest-card p-4">
              <dt className="text-xs text-fest-muted">{s.label}</dt>
              <dd className="mt-1 text-xl font-black text-fest-navy">{s.value}</dd>
            </div>
          ))}
        </dl>

        <div className="fest-card mt-8 p-6 text-left">
          <p className="text-sm font-extrabold text-fest-navy">이후 안내</p>
          <ul className="mt-3 space-y-2 text-sm text-fest-ink/85">
            <li>· 지원하신 기업의 전형 결과는 기업에서 개별 연락드립니다.</li>
            <li>· 참여 이력과 지원 현황은 마이페이지에서 계속 확인할 수 있습니다.</li>
            <li>· 추가 취업 상담은 홍보관 참여 기관을 통해 이어서 받을 수 있습니다.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <FestLink href="/pass" className="fest-btn-primary">
            마이페이지로 돌아가기
          </FestLink>
          <FestLink href="/" className="fest-btn-outline">
            행사 홈으로
          </FestLink>
        </div>
      </div>
    </div>
  );
}
