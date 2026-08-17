"use client";

import { useMemo } from "react";
import { WORK_TYPE_MAP } from "@/lib/strength/catalog";
import { WEAPON_MAP } from "@/lib/strength/weapons";
import { buildReport } from "@/lib/strength/report";
import { effectiveWeapons, primaryType, secondaryType } from "@/lib/strength/scoring";
import type { ScoreResult, StrengthState } from "@/lib/strength/types";
import { Callout, CopyButton, StepHeading } from "./ui";

interface Props {
  state: StrengthState;
  update: (patch: (prev: StrengthState) => StrengthState) => void;
  score: ScoreResult;
}

export function StepStrategy({ state, update, score }: Props) {
  const report = useMemo(() => buildReport(state, score), [state, score]);
  const p = WORK_TYPE_MAP[primaryType(state, score)];
  const s = WORK_TYPE_MAP[secondaryType(state, score)];
  const weapons = effectiveWeapons(state, score).map((id) => WEAPON_MAP[id]).filter(Boolean);
  const expCount = state.experiences.filter((e) => e.action.trim()).length;

  const download = () => {
    const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "일강점_입사서류_전략.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <StepHeading
        step={6}
        title="입사서류 작성 전략"
        desc="유형 → 무기 → 사례 → 내 경험이 하나로 이어진 결과물입니다. 그대로 제출하는 문서가 아니라, 여기서 뽑은 문장을 회사·직무에 맞게 고쳐 쓰는 재료입니다."
      />

      <div className="card mb-6 px-5 py-5">
        <p className="text-sm font-extrabold">어디에 지원하나요? (넣으면 문장이 그 회사·직무로 바뀝니다)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label">회사·기관</label>
            <input
              className="field-input"
              placeholder="예: 부산은행"
              value={state.target.company}
              onChange={(e) =>
                update((prev) => ({ ...prev, target: { ...prev.target, company: e.target.value } }))
              }
            />
          </div>
          <div>
            <label className="field-label">직무</label>
            <input
              className="field-input"
              placeholder="예: 개인금융 영업"
              value={state.target.job}
              onChange={(e) =>
                update((prev) => ({ ...prev, target: { ...prev.target, job: e.target.value } }))
              }
            />
          </div>
        </div>
      </div>

      {expCount === 0 ? (
        <div className="mb-6">
          <Callout tone="warn">
            아직 정리한 경험이 없어 초안이 <strong>[대괄호] 빈칸</strong> 상태로 나옵니다. 5단계에서 사례를 1개만
            채워도 문장이 완성됩니다.
          </Callout>
        </div>
      ) : null}

      <div className="card px-6 py-6">
        <p className="text-xs font-bold text-brand-500">나의 일 강점 한 줄 정의</p>
        <p className="mt-2 text-xl font-black leading-snug sm:text-2xl">{report.headline}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip-brand">
            {p.emoji} 대표 {p.name}
          </span>
          <span className="chip">
            {s.emoji} 보조 {s.name}
          </span>
          {weapons.map((w) => (
            <span key={w.id} className="chip">
              {w.name}
            </span>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-cream-50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {report.positioning}
        </p>
        <div className="no-print mt-3 flex flex-wrap gap-2">
          <CopyButton text={report.positioning} label="한 줄 소개 복사" />
          <CopyButton text={report.markdown} label="전체 전략 복사" className="btn-primary" />
          <button type="button" className="btn-outline" onClick={download}>
            .md 파일 저장
          </button>
          <button type="button" className="btn-outline" onClick={() => window.print()}>
            인쇄 · PDF
          </button>
        </div>
      </div>

      <div className="mt-5">
        <Callout tone="plain">{report.crossCheck}</Callout>
      </div>

      <section className="mt-8">
        <h3 className="text-xl font-black tracking-tight">이력서 요약 문장</h3>
        <p className="mt-1 text-sm text-ink-soft">
          경력기술서·자기소개 요약란에 쓰는 &lsquo;한 줄 성과&rsquo;입니다. 숫자가 비어 있으면 5단계에서 채우세요.
        </p>
        <ul className="mt-3 space-y-2">
          {report.resumeLines.map((line) => (
            <li key={line} className="card flex items-start justify-between gap-3 px-5 py-4">
              <span className="text-sm leading-relaxed">{line}</span>
              <CopyButton text={line} className="btn-ghost shrink-0 !px-3 !py-1 text-xs" />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h3 className="text-xl font-black tracking-tight">자기소개서 문항별 초안</h3>
        <div className="mt-3 space-y-4">
          {report.coverLetter.map((c) => (
            <div key={c.title} className="card px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold">{c.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{c.guide}</p>
                </div>
                <CopyButton text={c.draft} className="btn-ghost shrink-0 !px-3 !py-1 text-xs" />
              </div>
              <p className="mt-3 whitespace-pre-line rounded-xl bg-cream-50 px-4 py-3 text-sm leading-relaxed">
                {c.draft}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="card px-5 py-5">
          <h3 className="text-lg font-black tracking-tight">예상 면접 질문</h3>
          <ul className="mt-3 space-y-3">
            {report.interview.map((q) => (
              <li key={q.question}>
                <p className="text-sm font-semibold leading-relaxed">Q. {q.question}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">→ {q.hint}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-5">
          <div className="card px-5 py-5">
            <h3 className="text-lg font-black tracking-tight">서류 키워드</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {report.keywords.map((k) => (
                <span key={k} className="chip">
                  {k}
                </span>
              ))}
            </div>
          </div>
          <div className="card px-5 py-5">
            <h3 className="text-lg font-black tracking-tight">이렇게 쓰면 감점됩니다</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
              {report.cautions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <Callout>
          다음 단계는 사람의 몫입니다. 여기서 뽑은 문장을 들고 <strong>현직자 멘토에게 질문</strong>하면, 지원
          직무에서 실제로 통하는 표현인지 확인받을 수 있습니다.
        </Callout>
      </div>
    </div>
  );
}
