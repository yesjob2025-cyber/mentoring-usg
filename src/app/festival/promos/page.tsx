import type { Metadata } from "next";
import { PageHero } from "@/components/festival/page-hero";
import { listPromos } from "@/lib/festival/repo";
import { FEST } from "@/lib/festival/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "홍보관",
  description: "취업지원기관·공공기관·대학 등 홍보관 참여 기관 전체 리스트와 상담 서비스 안내",
};

export default async function PromosPage() {
  const promos = await listPromos();
  const categories = Array.from(new Set(promos.map((p) => p.category)));

  return (
    <>
      <PageHero
        eyebrow="Zone C · 홍보관"
        title="참여 기관 전체보기"
        description="청년정책, 취업지원제도, 직업훈련, 창업까지. 행사 이후에도 이어서 도움받을 수 있는 기관을 한자리에서 만나보세요."
      >
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-white/50">참여 기관</dt>
            <dd className="mt-0.5 text-xl font-black">{promos.length}개</dd>
          </div>
          <div>
            <dt className="text-white/50">분야</dt>
            <dd className="mt-0.5 text-xl font-black">{categories.length}개</dd>
          </div>
          <div>
            <dt className="text-white/50">운영 시간</dt>
            <dd className="mt-0.5 text-xl font-black">{FEST.timeLabel}</dd>
          </div>
        </dl>
      </PageHero>

      <div className="fest-container py-10 sm:py-14">
        <div className="grid gap-4 md:grid-cols-2">
          {promos.map((promo) => (
            <article key={promo.id} className="fest-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="fest-chip border-fest-emerald/25 bg-emerald-50 text-fest-emerald">
                    {promo.category}
                  </span>
                  <h2 className="mt-2.5 text-lg font-extrabold text-fest-navy">{promo.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-fest-blue">{promo.summary}</p>
                </div>
                <span className="fest-chip shrink-0">{promo.boothNo}</span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-fest-ink/85">{promo.description}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold text-fest-muted">제공 서비스</p>
                  <ul className="mt-1.5 space-y-1 text-sm text-fest-ink/85">
                    {promo.services.map((s) => (
                      <li key={s}>· {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold text-fest-muted">지원 대상</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {promo.targets.map((t) => (
                      <span key={t} className="fest-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                  {promo.contact && (
                    <p className="mt-3 text-xs font-bold text-fest-muted">문의 {promo.contact}</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
