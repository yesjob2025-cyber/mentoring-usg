"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeScores, hasAnyAnswer, isDiagnosisComplete } from "@/lib/strength/scoring";
import { useStrengthState } from "@/lib/strength/storage";
import { StepDiagnose } from "./step-diagnose";
import { StepExternal } from "./step-external";
import { StepResult } from "./step-result";
import { StepCases } from "./step-cases";
import { StepExperience } from "./step-experience";
import { StepStrategy } from "./step-strategy";
import { Callout } from "./ui";

const STEPS = [
  { n: 1, label: "진단", short: "30문항" },
  { n: 2, label: "검사 분석", short: "MBTI·DISC" },
  { n: 3, label: "종합 유형", short: "무기 3개" },
  { n: 4, label: "사례", short: "이미지화" },
  { n: 5, label: "내 경험", short: "STAR" },
  { n: 6, label: "서류 전략", short: "초안" },
];

export function StrengthWizard() {
  const { state, update, reset, ready } = useStrengthState();
  const [step, setStep] = useState(1);
  const [focusWeapon, setFocusWeapon] = useState<string | undefined>();

  const score = useMemo(() => computeScores(state), [state]);
  const diagnosed = isDiagnosisComplete(state);

  const go = (n: number) => {
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!ready) {
    return (
      <div className="container-page py-16">
        <p className="text-sm text-ink-muted">이전 응답을 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="container-page py-8 sm:py-10">
      {/* 단계 네비게이션 */}
      <nav className="no-print mb-8 overflow-x-auto">
        <ol className="flex min-w-max items-center gap-2">
          {STEPS.map((s) => {
            const active = s.n === step;
            const done = s.n < step;
            return (
              <li key={s.n}>
                <button
                  type="button"
                  onClick={() => go(s.n)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-brand-400 bg-brand-300 text-ink shadow-card"
                      : done
                        ? "border-ink-line bg-white text-ink-soft"
                        : "border-ink-line bg-white/60 text-ink-muted hover:bg-white"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-black ${
                      active ? "bg-ink text-brand-300" : "bg-ink/10 text-ink-soft"
                    }`}
                  >
                    {s.n}
                  </span>
                  <span>{s.label}</span>
                  <span className="hidden text-xs font-medium text-ink-muted sm:inline">{s.short}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {step > 2 && !diagnosed ? (
        <div className="mb-6">
          <Callout tone="warn">
            1단계 문항이 아직 다 채워지지 않았습니다. 지금 결과는 참고용이며, 문항을 모두 응답하면 유형이 다시
            계산됩니다.{" "}
            <button type="button" className="font-bold underline" onClick={() => go(1)}>
              1단계로 가기
            </button>
          </Callout>
        </div>
      ) : null}

      {step === 1 ? <StepDiagnose state={state} update={update} /> : null}
      {step === 2 ? <StepExternal state={state} update={update} /> : null}
      {step === 3 ? <StepResult state={state} update={update} score={score} /> : null}
      {step === 4 ? (
        <StepCases
          state={state}
          score={score}
          onWrite={(id) => {
            setFocusWeapon(id);
            go(5);
          }}
        />
      ) : null}
      {step === 5 ? (
        <StepExperience state={state} update={update} score={score} focusWeapon={focusWeapon} />
      ) : null}
      {step === 6 ? <StepStrategy state={state} update={update} score={score} /> : null}

      {/* 하단 이동 */}
      <div className="no-print mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-ink-line pt-6">
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-outline"
            onClick={() => go(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            ← 이전
          </button>
          {step < 6 ? (
            <button type="button" className="btn-primary" onClick={() => go(step + 1)}>
              다음 단계 →
            </button>
          ) : (
            <Link href="/qna" className="btn-primary">
              현직자에게 검증받기 →
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span>
            {hasAnyAnswer(state) ? "응답은 이 브라우저에만 저장됩니다" : "아직 저장된 응답이 없습니다"}
          </span>
          <button
            type="button"
            className="btn-ghost !px-3 !py-1"
            onClick={() => {
              if (window.confirm("모든 응답과 작성한 경험이 삭제됩니다. 초기화할까요?")) {
                reset();
                go(1);
              }
            }}
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
