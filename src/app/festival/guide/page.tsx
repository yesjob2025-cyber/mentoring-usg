import type { Metadata } from "next";
import { PageHero } from "@/components/festival/page-hero";
import { FestLink } from "@/components/festival/fest-link";
import { COURSES, FEST, STAMP_MISSIONS, STAMP_REWARD, ZONES } from "@/lib/festival/config";

export const metadata: Metadata = {
  title: "참여방법 안내",
  description:
    "JOB 코스 / Career 코스 안내, 스탬프 이벤트, 사전 매칭, 입장 QR 사용법 등 2026 김해 JOB FESTIVAL 참여 방법",
};

const FAQ = [
  {
    q: "사전등록을 꼭 해야 하나요?",
    a: "현장 등록도 가능하지만, 사전등록자에게는 입장 대기 없는 QR 입장, 관심 직무 기반 사전 매칭, 현장 면접·컨설팅 우선 배정 혜택이 제공됩니다.",
  },
  {
    q: "입장 QR 은 어디서 확인하나요?",
    a: "사전등록을 마치면 바로 발급되며 '내 입장권' 메뉴에서 언제든 다시 볼 수 있습니다. 휴대폰을 두고 오셨다면 6자리 확인 코드로도 체크인할 수 있습니다.",
  },
  {
    q: "입사지원은 현장에서만 가능한가요?",
    a: "홈페이지에서 미리 지원서를 제출할 수 있습니다. 제출 후 마이페이지에서 기업별 현장 면접 시간을 직접 선택하면 당일 대기 없이 면접에 참여할 수 있습니다.",
  },
  {
    q: "면접 시간을 바꾸거나 취소할 수 있나요?",
    a: "마이페이지 '지원 현황'에서 언제든 시간 변경과 취소가 가능합니다. 다만 잔여석이 없으면 변경이 제한될 수 있습니다.",
  },
  {
    q: "스탬프는 어떻게 적립되나요?",
    a: "부스에서 입장 QR 을 보여주면 자동으로 적립됩니다. 기업관·직무관·홍보관·부대행사 각 1회 이상 참여하면 완주 코드가 발급됩니다.",
  },
  {
    q: "참가비가 있나요?",
    a: "전 프로그램 무료입니다. 일부 푸드트럭 등 편의시설만 유료로 운영됩니다.",
  },
];

export default function GuidePage() {
  return (
    <>
      <PageHero
        eyebrow="Guide"
        title="행사 참여 방법 안내"
        description={`${FEST.dateLabel} ${FEST.timeLabel} · 코스를 정하고, QR 하나로 입장부터 스탬프·설문까지 한 번에 진행됩니다.`}
      >
        <div className="flex flex-wrap gap-3">
          <FestLink href="/register" className="fest-btn bg-fest-lime text-fest-navy hover:bg-[#a5dd3d]">
            사전등록 하기
          </FestLink>
          <FestLink
            href="/pass"
            className="fest-btn border border-white/30 bg-white/5 text-white hover:bg-white/15"
          >
            내 입장권 보기
          </FestLink>
        </div>
      </PageHero>

      <div className="fest-container space-y-16 py-12 sm:py-16">
        {/* 코스 안내 */}
        <section>
          <p className="fest-eyebrow">Step 1</p>
          <h2 className="fest-section-title mt-2">참여 코스 선택</h2>
          <p className="mt-3 text-sm text-fest-muted sm:text-base">
            사전등록에서 코스를 선택하면 입장 시 코스에 맞춰 부스가 자동 추천되고, 우선 배정
            프로그램이 달라집니다.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {COURSES.map((course) => (
              <div
                key={course.key}
                className={`fest-card overflow-hidden ${
                  course.key === "job" ? "border-t-4 border-t-fest-blue" : "border-t-4 border-t-fest-violet"
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`fest-chip border-transparent ${
                        course.key === "job"
                          ? "bg-fest-sky text-fest-blue"
                          : "bg-violet-50 text-fest-violet"
                      }`}
                    >
                      {course.name}
                    </span>
                    <span className="text-sm font-bold text-fest-muted">{course.subtitle}</span>
                  </div>
                  <p className="mt-4 text-sm font-bold text-fest-ink">
                    추천 대상 · {course.target}
                  </p>

                  <ol className="mt-5 space-y-3">
                    {course.steps.map((step, i) => (
                      <li key={step} className="flex gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${
                            course.key === "job" ? "bg-fest-blue" : "bg-fest-violet"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm text-fest-ink/90">{step}</span>
                      </li>
                    ))}
                  </ol>

                  <p className="mt-5 rounded-xl bg-fest-bg px-4 py-3 text-sm font-bold text-fest-navy">
                    혜택 · {course.benefit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 사전 매칭 */}
        <section>
          <p className="fest-eyebrow">Step 2</p>
          <h2 className="fest-section-title mt-2">사전 매칭 — 내게 맞는 부스를 미리</h2>
          <p className="mt-3 max-w-3xl text-sm text-fest-muted sm:text-base">
            사전등록에서 관심 직무와 산업 분야를 선택하면, 참가 기업의 채용 직무·부스 정보와
            자동으로 매칭해 추천 목록을 만들어 드립니다. 넓은 행사장에서 어디부터 갈지 고민할
            필요가 없습니다.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                t: "관심 직무 선택",
                d: "사전등록에서 관심 직무(최대 제한 없음)와 산업 분야를 고릅니다.",
              },
              {
                t: "자동 매칭 계산",
                d: "선택한 직무를 채용 중인 기업, 관련 직무관·홍보관·부대행사를 점수화합니다.",
              },
              {
                t: "입장 시 추천 제공",
                d: "입장 QR 을 찍으면 마이페이지에 추천 부스와 이동 순서가 정리됩니다.",
              },
            ].map((s, i) => (
              <div key={s.t} className="fest-card p-5">
                <span className="text-xs font-black tracking-widest text-fest-blue">
                  0{i + 1}
                </span>
                <h3 className="mt-2 text-base font-extrabold text-fest-navy">{s.t}</h3>
                <p className="mt-1.5 text-sm text-fest-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* QR 이용 흐름 */}
        <section>
          <p className="fest-eyebrow">Step 3</p>
          <h2 className="fest-section-title mt-2">입퇴장 · 참여 체크는 QR 하나로</h2>

          <ol className="mt-6 space-y-3">
            {[
              {
                t: "입장 QR 발급",
                d: "사전등록 완료 즉시 마이페이지에 QR 과 6자리 확인 코드가 생성됩니다.",
              },
              {
                t: "입장 게이트 체크",
                d: "입구에서 QR 을 제시하면 입장이 기록되고, 코스 기반 추천 부스가 안내됩니다.",
              },
              {
                t: "부스별 참여 체크",
                d: "각 부스 운영자가 QR 을 스캔하면 참여가 기록되고 해당 관의 스탬프가 적립됩니다.",
              },
              {
                t: "스탬프 완주",
                d: "4개 관을 모두 채우면 완주 코드가 발급되어 종합안내부스에서 경품에 응모합니다.",
              },
              {
                t: "만족도 설문 · 퇴장",
                d: "설문을 제출하면 참여 이력이 정리되고, 퇴장 체크로 하루 일정이 마무리됩니다.",
              },
            ].map((s, i) => (
              <li key={s.t} className="fest-card flex items-start gap-4 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fest-navy text-sm font-black text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-fest-navy">{s.t}</h3>
                  <p className="mt-1 text-sm text-fest-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-4 rounded-2xl border border-fest-line bg-white px-5 py-4 text-sm text-fest-muted">
            휴대폰 배터리가 없거나 QR 화면을 열 수 없을 때는 마이페이지의{" "}
            <b className="text-fest-navy">6자리 확인 코드</b>를 부스 운영자에게 말씀해 주시면
            동일하게 체크인됩니다.
          </p>
        </section>

        {/* 스탬프 이벤트 */}
        <section>
          <p className="fest-eyebrow">Event</p>
          <h2 className="fest-section-title mt-2">스탬프 이벤트</h2>
          <p className="mt-3 text-sm text-fest-muted sm:text-base">{STAMP_REWARD}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAMP_MISSIONS.map((m, i) => {
              const zone = ZONES.find((z) => z.key === m.zone);
              return (
                <div key={m.zone} className="fest-card p-5 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-fest-blue/40 bg-fest-sky text-lg font-black text-fest-blue">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-sm font-extrabold text-fest-navy">{zone?.name}</p>
                  <p className="mt-1 text-xs text-fest-muted">{m.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl bg-fest-navy p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-sm font-black text-fest-lime">완주 혜택</p>
              <p className="mt-1.5 text-sm text-white/85">
                기념품 증정 + 경품 응모 (추첨 16:40 메인 스테이지) · 완주 코드는 마이페이지에서
                확인
              </p>
            </div>
            <FestLink
              href="/register"
              className="fest-btn mt-4 bg-fest-lime text-fest-navy hover:bg-[#a5dd3d] sm:mt-0"
            >
              사전등록하고 참여
            </FestLink>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <p className="fest-eyebrow">FAQ</p>
          <h2 className="fest-section-title mt-2">자주 묻는 질문</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="fest-card group p-5">
                <summary className="cursor-pointer list-none text-sm font-extrabold text-fest-navy marker:hidden">
                  <span className="text-fest-blue">Q.</span> {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-fest-ink/85">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
