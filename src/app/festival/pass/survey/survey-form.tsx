"use client";

import { useActionState } from "react";
import { surveyAction, type FestFormState } from "../../actions";
import type { FestSurvey } from "@/lib/festival/types";

const SCORE_ITEMS = [
  { name: "overall", label: "행사 전반에 대한 만족도" },
  { name: "booth", label: "부스 구성 및 운영 (기업관·직무관·홍보관)" },
  { name: "program", label: "부대행사 프로그램의 유용성" },
  { name: "operation", label: "안내·동선·대기시간 등 운영" },
] as const;

const HELPFUL = [
  "기업관 채용 상담",
  "현장 면접",
  "직무관 현직자 상담",
  "홍보관 정책 상담",
  "이력서 사진 촬영",
  "이력서·자소서 컨설팅",
  "AI 모의면접",
  "직업심리검사",
  "취업 특강",
  "스탬프 이벤트",
];

export function SurveyForm({ existing }: { existing?: FestSurvey }) {
  const [state, action] = useActionState<FestFormState, FormData>(surveyAction, {});

  return (
    <form action={action} className="space-y-8">
      {SCORE_ITEMS.map((item) => (
        <fieldset key={item.name}>
          <legend className="text-sm font-extrabold text-fest-navy">{item.label}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <label key={v} className="cursor-pointer">
                <input
                  type="radio"
                  name={item.name}
                  value={v}
                  defaultChecked={existing?.[item.name] === v}
                  className="peer sr-only"
                  required={item.name === "overall"}
                />
                <span className="flex h-11 w-16 items-center justify-center rounded-xl border border-fest-line bg-white text-sm font-bold text-fest-ink transition peer-checked:border-fest-blue peer-checked:bg-fest-blue peer-checked:text-white">
                  {v}점
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-fest-muted">1점 매우 불만족 · 5점 매우 만족</p>
        </fieldset>
      ))}

      <fieldset>
        <legend className="text-sm font-extrabold text-fest-navy">
          지인에게 이 행사를 추천하시겠습니까?
        </legend>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, i) => i).map((v) => (
            <label key={v} className="cursor-pointer">
              <input
                type="radio"
                name="recommend"
                value={v}
                defaultChecked={(existing?.recommend ?? 8) === v}
                className="peer sr-only"
              />
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-fest-line bg-white text-sm font-bold transition peer-checked:border-fest-blue peer-checked:bg-fest-blue peer-checked:text-white">
                {v}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-fest-muted">0 전혀 아니다 · 10 매우 그렇다</p>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-extrabold text-fest-navy">
          도움이 된 프로그램 (복수 선택)
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {HELPFUL.map((h) => (
            <label key={h} className="cursor-pointer">
              <input
                type="checkbox"
                name="helpful"
                value={h}
                defaultChecked={existing?.helpful?.includes(h)}
                className="peer sr-only"
              />
              <span className="fest-chip peer-checked:border-fest-blue peer-checked:bg-fest-sky peer-checked:text-fest-blue">
                {h}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="fest-label" htmlFor="comment">
          개선 의견 · 바라는 점
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          defaultValue={existing?.comment ?? ""}
          className="fest-input"
          placeholder="다음 행사에 반영했으면 하는 점을 자유롭게 적어주세요."
        />
      </div>

      {state.error && (
        <p className="rounded-xl border border-fest-coral/30 bg-red-50 px-4 py-3 text-sm font-bold text-fest-coral">
          {state.error}
        </p>
      )}

      <button type="submit" className="fest-btn-primary w-full">
        {existing ? "설문 수정하기" : "설문 제출하기"}
      </button>
    </form>
  );
}
