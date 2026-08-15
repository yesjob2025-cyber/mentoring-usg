import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FestLink } from "@/components/festival/fest-link";
import { festAbsolute, festPath } from "@/lib/festival/base";
import { getPassSession } from "@/lib/festival/session";
import {
  getStampAward,
  getSurvey,
  getVisitor,
  listApplications,
  listCheckins,
  listInterviews,
  slotAvailability,
  stampProgress,
} from "@/lib/festival/repo";
import { recommendFor } from "@/lib/festival/recommend";
import { FEST, STAMP_MISSIONS, STAMP_REWARD, courseName } from "@/lib/festival/config";
import { formatKST } from "@/lib/format";
import { logoutPassAction, cancelInterviewAction } from "../actions";
import { InterviewPicker, type SlotOption } from "./interview-picker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "내 입장권",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "접수완료",
  reviewing: "서류검토중",
  interview: "면접확정",
  done: "면접완료",
  passed: "합격",
  rejected: "불합격",
};

const ZONE_LABEL: Record<string, string> = {
  entry: "입장",
  exit: "퇴장",
  company: "기업관",
  job: "직무관",
  promo: "홍보관",
  side: "부대행사",
};

export default async function PassPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pass = await getPassSession();
  if (!pass?.vid) redirect(await festPath("/pass/find"));

  const visitor = await getVisitor(pass.vid);
  if (!visitor) redirect(await festPath("/pass/find"));

  const sp = await searchParams;
  const [checkins, applications, interviews, stamp, award, survey, reco, qrTarget] =
    await Promise.all([
      listCheckins(visitor.id),
      listApplications(visitor.id),
      listInterviews(visitor.id),
      stampProgress(visitor.id),
      getStampAward(visitor.id),
      getSurvey(visitor.id),
      recommendFor(visitor),
      festAbsolute(`/p/${visitor.token}`),
    ]);

  // 지원한 기업별 면접 슬롯
  const companyIds = Array.from(new Set(applications.map((a) => a.companyId)));
  const slotsByCompany = new Map<string, SlotOption[]>();
  await Promise.all(
    companyIds.map(async (id) => {
      const slots = await slotAvailability(id);
      slotsByCompany.set(
        id,
        slots.map((s) => ({ id: s.id, time: s.time, place: s.place, remaining: s.remaining }))
      );
    })
  );
  const interviewByApp = new Map(interviews.map((i) => [i.applicationId, i]));

  const qrSrc = `/api/festival/qr?data=${encodeURIComponent(qrTarget)}`;

  return (
    <div className="fest-container py-8 sm:py-12">
      {sp.welcome && (
        <p className="mb-5 rounded-2xl border border-fest-emerald/25 bg-emerald-50 px-5 py-4 text-sm font-bold text-fest-emerald">
          사전등록이 완료되었습니다. 행사 당일 아래 QR 을 입구에서 보여주세요.
        </p>
      )}
      {sp.applied && (
        <p className="mb-5 rounded-2xl border border-fest-blue/25 bg-fest-sky px-5 py-4 text-sm font-bold text-fest-blue">
          입사지원이 접수되었습니다. 아래 &lsquo;지원 현황&rsquo;에서 현장 면접 시간을 선택해 주세요.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* ── 입장권 ─────────────────────────────────── */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-3xl bg-fest-navy text-white shadow-[0_20px_50px_-24px_rgba(10,27,61,0.7)]">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <p className="text-[11px] font-black tracking-[0.2em] text-fest-lime">
                  ENTRY PASS
                </p>
                <p className="mt-1 text-sm font-extrabold">{FEST.title}</p>
              </div>
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold">
                {courseName(visitor.course)}
              </span>
            </div>

            <div className="mt-5 bg-white px-6 py-6 text-center text-fest-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="입장 QR 코드" className="mx-auto h-48 w-48" />
              <p className="mt-3 text-xs font-bold text-fest-muted">현장 확인 코드</p>
              <p className="text-2xl font-black tracking-[0.3em] text-fest-navy">{visitor.code}</p>
            </div>

            <dl className="grid grid-cols-2 gap-y-3 px-6 py-5 text-sm">
              <div>
                <dt className="text-white/50">이름</dt>
                <dd className="font-extrabold">{visitor.name}</dd>
              </div>
              <div>
                <dt className="text-white/50">구분</dt>
                <dd className="font-extrabold">{visitor.visitorType}</dd>
              </div>
              <div>
                <dt className="text-white/50">일시</dt>
                <dd className="font-extrabold">
                  {FEST.dateShort} {FEST.timeLabel}
                </dd>
              </div>
              <div>
                <dt className="text-white/50">입장</dt>
                <dd className="font-extrabold">
                  {visitor.enteredAt ? formatKST(visitor.enteredAt).slice(-5) : "입장 전"}
                </dd>
              </div>
            </dl>
          </div>

          {/* 스탬프 */}
          <div className="fest-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-fest-navy">스탬프 현황</p>
              <span className="fest-chip-blue">
                {stamp.collected} / {stamp.goal}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {STAMP_MISSIONS.map((m) => {
                const done = stamp.zones[m.zone] > 0;
                return (
                  <div
                    key={m.zone}
                    className={`rounded-2xl border-2 p-3 text-center ${
                      done
                        ? "border-fest-blue bg-fest-sky"
                        : "border-dashed border-fest-line bg-fest-bg"
                    }`}
                  >
                    <p className={`text-lg ${done ? "" : "opacity-30"}`}>{done ? "✓" : "○"}</p>
                    <p
                      className={`mt-1 text-[11px] font-extrabold ${
                        done ? "text-fest-blue" : "text-fest-muted"
                      }`}
                    >
                      {ZONE_LABEL[m.zone]}
                    </p>
                  </div>
                );
              })}
            </div>
            {award ? (
              <div className="mt-4 rounded-xl bg-fest-navy px-4 py-3 text-center text-white">
                <p className="text-xs text-white/60">완주 코드</p>
                <p className="text-xl font-black tracking-widest">{award.code}</p>
                <p className="mt-1 text-[11px] text-white/60">
                  {award.redeemed ? "경품 수령 완료" : "종합안내부스에서 제시하세요"}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-fest-muted">{STAMP_REWARD}</p>
            )}
          </div>

          <div className="fest-card p-5">
            <p className="text-sm font-extrabold text-fest-navy">마무리</p>
            <p className="mt-2 text-xs text-fest-muted">
              행사 참여 후 만족도 설문에 참여해 주세요. 다음 행사 운영에 반영됩니다.
            </p>
            <FestLink
              href="/pass/survey"
              className={`mt-3 w-full ${survey ? "fest-btn-outline" : "fest-btn-primary"}`}
            >
              {survey ? "만족도 설문 수정하기" : "만족도 설문 참여하기"}
            </FestLink>
            <form action={logoutPassAction} className="mt-2">
              <button type="submit" className="fest-btn-ghost fest-btn-sm w-full">
                이 기기에서 입장권 로그아웃
              </button>
            </form>
          </div>
        </div>

        {/* ── 오른쪽 ─────────────────────────────────── */}
        <div className="space-y-6">
          {/* 추천 */}
          <section className="fest-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="fest-eyebrow">Auto matching</p>
                <h2 className="mt-1 text-lg font-extrabold text-fest-navy">
                  {visitor.name}님을 위한 추천 부스
                </h2>
              </div>
              <span className="fest-chip">{courseName(visitor.course)}</span>
            </div>

            {reco.companies.length + reco.jobs.length === 0 ? (
              <p className="mt-4 text-sm text-fest-muted">
                관심 직무를 선택하면 맞춤 부스를 추천해 드립니다.
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                {reco.companies.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-fest-blue">기업관 추천</p>
                    <ul className="mt-2 space-y-2">
                      {reco.companies.map((r) => (
                        <li key={r.item.id}>
                          <FestLink
                            href={`/companies/${r.item.id}`}
                            className="flex items-start justify-between gap-3 rounded-xl border border-fest-line px-4 py-3 hover:border-fest-blue/40 hover:bg-fest-sky"
                          >
                            <span>
                              <span className="block text-sm font-extrabold text-fest-navy">
                                {r.item.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-fest-muted">
                                {r.reasons[0] ?? r.item.summary}
                              </span>
                            </span>
                            <span className="fest-chip shrink-0">{r.item.boothNo}</span>
                          </FestLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {reco.jobs.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-fest-violet">직무관 추천</p>
                    <ul className="mt-2 space-y-2">
                      {reco.jobs.map((r) => (
                        <li key={r.item.id}>
                          <FestLink
                            href={`/jobs/${r.item.id}`}
                            className="flex items-start justify-between gap-3 rounded-xl border border-fest-line px-4 py-3 hover:border-fest-violet/40 hover:bg-violet-50"
                          >
                            <span>
                              <span className="block text-sm font-extrabold text-fest-navy">
                                {r.item.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-fest-muted">
                                {r.reasons[0] ?? r.item.summary}
                              </span>
                            </span>
                            <span className="fest-chip shrink-0">{r.item.boothNo}</span>
                          </FestLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {reco.promos.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-fest-emerald">홍보관 추천</p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {reco.promos.map((r) => (
                          <li key={r.item.id}>
                            <FestLink href="/promos" className="hover:underline">
                              · {r.item.name}
                            </FestLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {reco.events.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-[#B77400]">부대행사 추천</p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {reco.events.map((r) => (
                          <li key={r.item.id}>
                            <FestLink href="/events" className="hover:underline">
                              · {r.item.title}
                            </FestLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 지원 현황 */}
          <section className="fest-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-fest-navy">지원 현황 · 면접 일정</h2>
              <FestLink href="/companies" className="fest-btn-outline fest-btn-sm">
                기업 더 보기
              </FestLink>
            </div>

            {applications.length === 0 ? (
              <p className="mt-4 rounded-xl bg-fest-bg px-4 py-8 text-center text-sm text-fest-muted">
                아직 지원한 기업이 없습니다. 기업관에서 관심 기업에 지원해 보세요.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {applications.map((app) => {
                  const interview = interviewByApp.get(app.id);
                  const slots = slotsByCompany.get(app.companyId) ?? [];
                  return (
                    <li key={app.id} className="rounded-2xl border border-fest-line p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-fest-navy">{app.companyName}</p>
                          <p className="mt-0.5 text-xs text-fest-muted">
                            {app.positionTitle} · {formatKST(app.appliedAt)} 지원
                          </p>
                        </div>
                        <span
                          className={`fest-chip ${
                            app.status === "interview"
                              ? "border-fest-blue/30 bg-fest-sky text-fest-blue"
                              : ""
                          }`}
                        >
                          {STATUS_LABEL[app.status] ?? app.status}
                        </span>
                      </div>

                      {interview && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-fest-sky px-4 py-3">
                          <p className="text-sm font-bold text-fest-blue">
                            면접 확정 · {interview.time} · {interview.place}
                          </p>
                          <form action={cancelInterviewAction}>
                            <input type="hidden" name="interviewId" value={interview.id} />
                            <button
                              type="submit"
                              className="text-xs font-bold text-fest-muted underline"
                            >
                              면접 취소
                            </button>
                          </form>
                        </div>
                      )}

                      {slots.length > 0 && (
                        <InterviewPicker
                          applicationId={app.id}
                          slots={slots}
                          currentSlotId={interview?.slotId}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 참여 이력 */}
          <section className="fest-card p-6">
            <h2 className="text-lg font-extrabold text-fest-navy">참여 이력</h2>
            {checkins.length === 0 ? (
              <p className="mt-4 rounded-xl bg-fest-bg px-4 py-8 text-center text-sm text-fest-muted">
                아직 체크인 기록이 없습니다. 행사 당일 부스에서 QR 을 보여주세요.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {checkins.map((c) => (
                  <li key={c.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fest-blue" />
                    <div className="flex-1 border-b border-fest-line pb-3">
                      <p className="text-sm font-bold text-fest-navy">
                        <span className="text-fest-blue">[{ZONE_LABEL[c.zone] ?? c.zone}]</span>{" "}
                        {c.boothName}
                      </p>
                      <p className="text-xs text-fest-muted">{formatKST(c.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
