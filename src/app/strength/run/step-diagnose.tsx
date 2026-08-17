"use client";

import { useRef } from "react";
import { LIKERT_ITEMS, LIKERT_LABELS, SITUATION_ITEMS } from "@/lib/strength/questions";
import { likertProgress, situationProgress } from "@/lib/strength/scoring";
import type { StrengthState, WorkTypeId } from "@/lib/strength/types";
import { Callout, StepHeading } from "./ui";

interface Props {
  state: StrengthState;
  update: (patch: (prev: StrengthState) => StrengthState) => void;
}

export function StepDiagnose({ state, update }: Props) {
  const situationRef = useRef<HTMLDivElement>(null);
  const l = likertProgress(state);
  const s = situationProgress(state);

  const setLikert = (id: string, value: number) =>
    update((prev) => ({ ...prev, likert: { ...prev.likert, [id]: value } }));

  const setSituation = (id: string, typeId: WorkTypeId) =>
    update((prev) => ({ ...prev, situation: { ...prev.situation, [id]: typeId } }));

  return (
    <div>
      <StepHeading
        step={1}
        title="일하는 방식 진단"
        desc="성격이 아니라 '실제로 그렇게 해봤는가'를 묻습니다. 1부 24문항 + 2부 상황 6문항, 약 5분이면 끝납니다. 정답은 없고, 과장하면 뒤에서 쓸 사례가 없어집니다."
      />

      <div className="sticky top-16 z-20 -mx-1 mb-6 rounded-2xl border border-ink-line bg-cream/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
          <span>
            1부 행동 문항 <span className="text-brand-500">{l.done}</span> / {l.total}
          </span>
          <span>
            2부 상황 문항 <span className="text-brand-500">{s.done}</span> / {s.total}
          </span>
          <button
            type="button"
            className="btn-ghost !px-3 !py-1"
            onClick={() => situationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            2부로 이동 ↓
          </button>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-200">
          <div
            className="h-full rounded-full bg-brand-400 transition-all"
            style={{ width: `${((l.done + s.done) / (l.total + s.total)) * 100}%` }}
          />
        </div>
      </div>

      <ol className="space-y-3">
        {LIKERT_ITEMS.map((item, idx) => {
          const value = state.likert[item.id];
          return (
            <li key={item.id} className="card px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/5 text-xs font-bold text-ink-soft">
                  {idx + 1}
                </span>
                <p className="text-[15px] font-semibold leading-relaxed">{item.text}</p>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
                {LIKERT_LABELS.map((opt) => {
                  const active = value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLikert(item.id, opt.value)}
                      className={`rounded-xl border px-1 py-2 text-[11px] font-semibold leading-tight transition sm:text-xs ${
                        active
                          ? "border-brand-400 bg-brand-300 text-ink shadow-card"
                          : "border-ink-line bg-white text-ink-muted hover:border-brand-200 hover:bg-brand-50"
                      }`}
                    >
                      <span className="sm:hidden">{opt.short}</span>
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <div ref={situationRef} className="mt-12 scroll-mt-32">
        <h3 className="text-xl font-black tracking-tight">2부. 상황에서의 선택</h3>
        <p className="mt-2 text-sm text-ink-soft">
          앞의 문항에서 대부분 &lsquo;그런 편&rsquo;을 골랐다면 유형이 잘 갈리지 않습니다. 아래 6개 상황에서는{" "}
          <strong>가장 먼저 하게 될 행동 하나</strong>만 고르세요.
        </p>

        <div className="mt-5 space-y-4">
          {SITUATION_ITEMS.map((item, idx) => (
            <div key={item.id} className="card px-5 py-5">
              <p className="text-[15px] font-extrabold leading-relaxed">
                {idx + 1}. {item.situation}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {item.options.map((opt) => {
                  const active = state.situation[item.id] === opt.typeId;
                  return (
                    <button
                      key={opt.typeId}
                      type="button"
                      onClick={() => setSituation(item.id, opt.typeId)}
                      className={`rounded-xl border px-3.5 py-3 text-left text-sm font-medium leading-snug transition ${
                        active
                          ? "border-brand-400 bg-brand-50 text-ink"
                          : "border-ink-line bg-white text-ink-soft hover:border-brand-200 hover:bg-cream-50"
                      }`}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {l.done + s.done < l.total + s.total ? (
        <div className="mt-8">
          <Callout tone="warn">
            아직 응답하지 않은 문항이 {l.total + s.total - l.done - s.done}개 있습니다. 모두 응답해야 유형이
            정확하게 계산됩니다.
          </Callout>
        </div>
      ) : (
        <div className="mt-8">
          <Callout>진단 완료! 다음 단계에서 이미 받아본 검사(MBTI·DISC 등) 결과와 교차 확인합니다.</Callout>
        </div>
      )}
    </div>
  );
}
