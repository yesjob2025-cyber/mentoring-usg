"use client";

import { WORK_TYPE_MAP } from "@/lib/strength/catalog";
import { WEAPON_MAP } from "@/lib/strength/weapons";
import { effectiveWeapons } from "@/lib/strength/scoring";
import type { ScoreResult, StrengthState } from "@/lib/strength/types";
import { Accordion, Callout, CopyButton, StepHeading } from "./ui";

interface Props {
  state: StrengthState;
  score: ScoreResult;
  onWrite: (weaponId: string) => void;
}

export function StepCases({ state, score, onWrite }: Props) {
  const picked = effectiveWeapons(state, score);

  return (
    <div>
      <StepHeading
        step={4}
        title="이 무기는 실제로 이렇게 생겼다"
        desc="강점을 골랐다고 서류가 써지지는 않습니다. 먼저 '그 강점이 발휘되는 장면'을 눈으로 확인하고, 비슷한 내 경험을 떠올리세요. 사례는 베끼는 용도가 아니라 기억을 끌어내는 용도입니다."
      />

      <div className="space-y-4">
        {picked.map((id, idx) => {
          const w = WEAPON_MAP[id];
          if (!w) return null;
          const type = WORK_TYPE_MAP[w.typeId];
          return (
            <Accordion
              key={id}
              defaultOpen={idx === 0}
              title={`${type.emoji} ${w.name}`}
              subtitle={w.headline}
            >
              <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
                <div>
                  <p className="text-sm font-extrabold">일의 관점에서 다시 쓰면</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{w.definition}</p>

                  <p className="mt-4 text-sm font-extrabold">이미지화 — 회사에서의 장면</p>
                  <p className="mt-1.5 rounded-xl border border-ink-line bg-cream-50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                    {w.scene}
                  </p>

                  <p className="mt-4 text-sm font-extrabold">이 무기를 직접 요구하는 직무</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.jobFit.map((j) => (
                      <span key={j} className="chip">
                        {j}
                      </span>
                    ))}
                  </div>

                  <p className="mt-5 text-sm font-extrabold">사례 — 대학생 수준에서 실제로 가능한 장면</p>
                  <div className="mt-2 space-y-2.5">
                    {w.cases.map((c) => (
                      <div key={c.action} className="rounded-xl border border-ink-line bg-white px-4 py-3">
                        <p className="text-xs font-bold text-brand-500">{c.context}</p>
                        <p className="mt-1 text-sm leading-relaxed">
                          <span className="font-semibold text-ink-muted">행동 </span>
                          {c.action}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed">
                          <span className="font-semibold text-ink-muted">결과 </span>
                          {c.result}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-4">
                    <p className="text-sm font-extrabold">내 경험을 끌어내는 질문</p>
                    <ul className="mt-2 space-y-1.5">
                      {w.evidencePrompts.map((q) => (
                        <li key={q} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                          <span className="text-brand-500">Q</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="btn-primary mt-3 w-full" onClick={() => onWrite(id)}>
                      이 무기로 내 경험 쓰기 →
                    </button>
                  </div>

                  <div className="rounded-2xl border border-ink-line bg-white px-4 py-4">
                    <p className="text-sm font-extrabold">서류에 쓰는 동사</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {w.actionVerbs.map((v) => (
                        <span key={v} className="chip-brand">
                          {v}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm font-extrabold">성과를 숫자로 바꾸는 힌트</p>
                    <ul className="mt-1.5 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
                      {w.metricHints.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-ink-line bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-extrabold">이력서 한 줄</p>
                      <CopyButton text={w.resumeLine} className="btn-ghost !px-3 !py-1 text-xs" />
                    </div>
                    <p className="mt-1.5 rounded-lg bg-cream-50 px-3 py-2 text-sm leading-relaxed text-ink-soft">
                      {w.resumeLine}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-extrabold">자기소개서 문단 뼈대</p>
                      <CopyButton text={w.coverLetterSkeleton} className="btn-ghost !px-3 !py-1 text-xs" />
                    </div>
                    <p className="mt-1.5 rounded-lg bg-cream-50 px-3 py-2 text-sm leading-relaxed text-ink-soft">
                      {w.coverLetterSkeleton}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-ink-line bg-white px-4 py-4">
                    <p className="text-sm font-extrabold">이렇게 쓰면 반드시 들어오는 면접 질문</p>
                    <ul className="mt-1.5 list-disc pl-5 text-sm leading-relaxed text-ink-soft">
                      {w.interviewQuestions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Accordion>
          );
        })}
      </div>

      <div className="mt-6">
        <Callout tone="plain">
          다른 무기의 사례도 보고 싶다면 3단계로 돌아가 선택을 바꾸면 됩니다. 24개 무기 모두 사례·문장 템플릿을
          가지고 있습니다.
        </Callout>
      </div>
    </div>
  );
}
