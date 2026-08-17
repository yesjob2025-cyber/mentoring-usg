"use client";

import { useState } from "react";
import { WORK_TYPES, WORK_TYPE_MAP } from "@/lib/strength/catalog";
import { WEAPON_MAP } from "@/lib/strength/weapons";
import { crossComment, externalTypeScores } from "@/lib/strength/external";
import { effectiveWeapons, primaryType, secondaryType } from "@/lib/strength/scoring";
import type { ScoreResult, StrengthState, WorkTypeId } from "@/lib/strength/types";
import { Callout, ScoreBar, StepHeading } from "./ui";

interface Props {
  state: StrengthState;
  update: (patch: (prev: StrengthState) => StrengthState) => void;
  score: ScoreResult;
}

export function StepResult({ state, update, score }: Props) {
  const [showAll, setShowAll] = useState(false);
  const pId = primaryType(state, score);
  const sId = secondaryType(state, score);
  const p = WORK_TYPE_MAP[pId];
  const s = WORK_TYPE_MAP[sId];

  const extScores = state.external.reflect ? externalTypeScores(state.external) : null;
  const extTop = extScores
    ? (WORK_TYPES.slice().sort((a, b) => extScores[b.id] - extScores[a.id])[0].id as WorkTypeId)
    : null;

  const picked = effectiveWeapons(state, score);
  const isPicked = (id: string) => picked.includes(id);

  const togglePick = (id: string) => {
    update((prev) => {
      const cur = prev.pickedWeapons.length ? prev.pickedWeapons : score.rankedWeapons.slice(0, 3);
      if (cur.includes(id)) {
        return { ...prev, pickedWeapons: cur.filter((w) => w !== id) };
      }
      if (cur.length >= 3) return { ...prev, pickedWeapons: [...cur.slice(1), id] };
      return { ...prev, pickedWeapons: [...cur, id] };
    });
  };

  const candidateIds = showAll ? score.rankedWeapons : score.rankedWeapons.slice(0, 8);

  return (
    <div>
      <StepHeading
        step={3}
        title="종합: 나는 이렇게 일하는 사람이다"
        desc="행동 진단 + 상황 선택 + (선택한 경우) 검사 결과를 합친 결과입니다. 여기서 대표 유형과 서류에 밀고 갈 무기 3개를 확정합니다."
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="card px-6 py-6">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl">{p.emoji}</span>
            <h3 className="text-2xl font-black tracking-tight">{p.name}</h3>
            <span className="text-sm font-bold text-brand-500">{score.typeScores[pId]}점</span>
          </div>
          <p className="mt-1 text-base font-semibold text-ink-soft">{p.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.value}</p>

          <p className="mt-5 text-sm font-extrabold">회사에서 이렇게 보입니다</p>
          <ul className="mt-2 space-y-1.5">
            {p.scenes.map((sc) => (
              <li key={sc} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                <span className="text-brand-400">▸</span>
                <span>{sc}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-sm font-extrabold">이 방식이 먹히는 직무</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.fitJobs.map((j) => (
              <span key={j} className="chip">
                {j}
              </span>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-relaxed">
            <strong>주의</strong> — {p.overuse}
          </div>

          <div className="mt-5 rounded-xl border border-ink-line bg-cream-50 px-4 py-3">
            <p className="text-sm font-extrabold">
              보조 유형 {s.emoji} {s.name}{" "}
              <span className="font-bold text-ink-muted">({score.typeScores[sId]}점)</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {s.tagline} — 대표 유형만으로 부족할 때 이 방식으로 보완한다고 쓰면 입체적으로 보입니다.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card px-5 py-5">
            <p className="text-sm font-extrabold">유형별 점수</p>
            <div className="mt-3 space-y-2">
              {score.rankedTypes.map((id) => (
                <ScoreBar
                  key={id}
                  label={WORK_TYPE_MAP[id].name}
                  emoji={WORK_TYPE_MAP[id].emoji}
                  value={score.typeScores[id]}
                  highlight={id === pId}
                />
              ))}
            </div>
            <div className="mt-4">
              <p className="field-label">대표 유형을 직접 바꾸고 싶다면</p>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      update((prev) => ({
                        ...prev,
                        pickedType: prev.pickedType === t.id ? undefined : t.id,
                      }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      pId === t.id
                        ? "border-brand-400 bg-brand-300 text-ink"
                        : "border-ink-line bg-white text-ink-muted hover:bg-cream-50"
                    }`}
                  >
                    {t.emoji} {t.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                점수는 참고값입니다. 실제 경험이 더 많이 쌓인 쪽으로 직접 바꿔도 됩니다.
              </p>
            </div>
          </div>

          <Callout tone={extTop && extTop !== pId ? "warn" : "brand"}>
            {crossComment(extTop, pId)}
          </Callout>
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-xl font-black tracking-tight">서류에 밀고 갈 무기 3개 확정</h3>
        <p className="mt-2 text-sm text-ink-soft">
          자기소개서에 강점을 5개 나열하면 하나도 남지 않습니다. <strong>3개만</strong> 고르세요. 점수가 높아도
          &lsquo;쓸 사례가 없는&rsquo; 무기는 빼는 편이 낫습니다.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {candidateIds.map((id) => {
            const w = WEAPON_MAP[id];
            const active = isPicked(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePick(id)}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  active
                    ? "border-brand-400 bg-brand-50 shadow-card"
                    : "border-ink-line bg-white hover:bg-cream-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold">
                    {WORK_TYPE_MAP[w.typeId].emoji} {w.name}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-ink-muted">
                    {score.weaponScores[id]}점 {active ? "· 선택됨 ✓" : ""}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{w.definition}</p>
              </button>
            );
          })}
        </div>

        <button type="button" className="btn-ghost mt-3" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "상위 8개만 보기" : "24개 무기 전체 보기"}
        </button>

        <div className="mt-4">
          <Callout>
            선택한 무기:{" "}
            <strong>
              {picked.map((id) => WEAPON_MAP[id]?.name).filter(Boolean).join(" · ") || "없음"}
            </strong>{" "}
            ({picked.length}/3) — 다음 단계에서 이 무기들의 사례를 보고, 내 경험을 붙입니다.
          </Callout>
        </div>
      </div>
    </div>
  );
}
