import type { Metadata } from "next";
import Link from "next/link";
import { WORK_TYPES } from "@/lib/strength/catalog";
import { weaponsOfType } from "@/lib/strength/weapons";

export const metadata: Metadata = {
  title: "일 강점 진단 · 입사서류 전략",
  description:
    "긍정·경청·꼼꼼 말고, 일하는 관점에서의 내 강점을 찾습니다. 6가지 일 유형과 24개 무기로 진단하고, 사례와 내 경험을 붙여 입사서류 전략까지 만듭니다.",
};

const FLOW = [
  {
    n: 1,
    title: "일하는 방식 진단",
    desc: "행동 문항 24개 + 상황 선택 6개. 성격이 아니라 '실제로 그렇게 해봤는가'를 묻습니다.",
  },
  {
    n: 2,
    title: "기존 검사 결과 분석",
    desc: "MBTI·DISC·직업적성검사 결과를 '일터에서의 행동' 언어로 번역하고 진단 결과와 교차 확인합니다.",
  },
  {
    n: 3,
    title: "종합 유형 확정",
    desc: "대표 유형·보조 유형과 서류에 밀고 갈 무기 3개를 확정합니다.",
  },
  {
    n: 4,
    title: "무기별 사례 확인",
    desc: "그 강점이 회사에서 어떤 장면으로 보이는지, 대학생 수준의 사례로 이미지화합니다.",
  },
  {
    n: 5,
    title: "내 경험 붙이기",
    desc: "무기마다 내 경험을 STAR로 정리합니다. 강점은 주장, 경험은 증거입니다.",
  },
  {
    n: 6,
    title: "입사서류 전략 도출",
    desc: "이력서 한 줄·자소서 문항별 초안·면접 예상질문·키워드를 뽑아 저장·인쇄합니다.",
  },
];

export default function StrengthIntroPage() {
  return (
    <div>
      <section className="border-b border-ink-line bg-gradient-to-b from-brand-50 to-cream">
        <div className="container-page py-14 sm:py-20">
          <span className="chip-brand">입사서류 준비</span>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            &lsquo;긍정적이고 꼼꼼합니다&rsquo;로는
            <br className="hidden sm:block" /> 아무도 설득되지 않습니다.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
            자기소개서에 쓰는 강점이 늘 긍정·경청·친절·꼼꼼에서 멈추는 이유는, 자신을{" "}
            <strong>사람의 성격</strong>으로만 봤기 때문입니다. 회사가 궁금한 것은 하나입니다.{" "}
            <strong>&ldquo;이 사람은 어떻게 일해서 결과를 만드는가?&rdquo;</strong>
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
            이 진단은 <strong>일하는 방식 6유형 · 24개 무기</strong>로 나를 정의하고, 그 무기가 발휘되는 장면을
            눈으로 확인한 뒤, 내 경험을 붙여 입사서류 문장까지 만들어 줍니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/strength/run" className="btn-primary">
              진단 시작하기 (약 10분)
            </Link>
            <Link href="/qna" className="btn-outline">
              결과 들고 현직자에게 질문하기
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            로그인 없이 이용할 수 있고, 응답은 서버로 전송되지 않고 이 브라우저에만 저장됩니다.
          </p>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">6단계로 서류가 완성됩니다</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW.map((f) => (
            <div key={f.n} className="card px-5 py-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-black text-brand-300">
                {f.n}
              </span>
              <p className="mt-3 text-base font-extrabold">{f.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-ink-line bg-cream-50">
        <div className="container-page py-14">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">일하는 방식 6유형 · 24개 무기</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            아래 24개 중 내 것 3개를 고르는 것이 이 진단의 목표입니다. 각 무기마다 회사에서의 장면, 사례,
            이력서·자소서 문장 뼈대, 예상 면접 질문이 준비되어 있습니다.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {WORK_TYPES.map((t) => (
              <div key={t.id} className="card px-5 py-5">
                <p className="text-lg font-black">
                  {t.emoji} {t.name}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink-soft">{t.tagline}</p>
                <ul className="mt-3 space-y-1.5">
                  {weaponsOfType(t.id).map((w) => (
                    <li key={w.id} className="text-sm leading-relaxed text-ink-soft">
                      <span className="font-bold text-ink">[{w.name}]</span> {w.headline}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.fitJobs.slice(0, 4).map((j) => (
                    <span key={j} className="chip !px-2 !py-0.5 !text-[11px]">
                      {j}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/strength/run" className="btn-brand">
              내 무기 3개 찾으러 가기 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
