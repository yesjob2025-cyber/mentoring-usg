"use client";

import { useEffect, useState } from "react";
import { WORK_TYPE_MAP } from "@/lib/strength/catalog";
import { WEAPON_MAP } from "@/lib/strength/weapons";
import { effectiveWeapons } from "@/lib/strength/scoring";
import type { ExperienceEntry, ScoreResult, StrengthState } from "@/lib/strength/types";
import { Callout, StepHeading } from "./ui";

interface Props {
  state: StrengthState;
  update: (patch: (prev: StrengthState) => StrengthState) => void;
  score: ScoreResult;
  focusWeapon?: string;
}

const FIELDS: {
  key: keyof Pick<ExperienceEntry, "situation" | "task" | "action" | "result" | "metric">;
  label: string;
  hint: string;
}[] = [
  { key: "situation", label: "S · 상황", hint: "언제, 어디서, 어떤 상태였나? (예: 3학년 2학기 학과 축제 준비, 준비 인원 8명·기간 3주)" },
  { key: "task", label: "T · 과제", hint: "내가 맡은 문제는 무엇이었나? (예: 예산이 작년의 60%로 줄어든 상태에서 방문객은 유지해야 했다)" },
  { key: "action", label: "A · 행동", hint: "내가 한 행동을 동사로. '우리는'이 아니라 '나는'으로 씁니다." },
  { key: "result", label: "R · 결과", hint: "무엇이 달라졌나? 상대의 반응·채택 여부도 결과입니다." },
  { key: "metric", label: "숫자", hint: "인원·금액·시간·비율 중 하나로. 정확한 수치가 없으면 '약', '기준'을 붙여도 됩니다." },
];

function newEntry(weaponId: string): ExperienceEntry {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return { id, weaponId, title: "", situation: "", task: "", action: "", result: "", metric: "" };
}

export function StepExperience({ state, update, score, focusWeapon }: Props) {
  const picked = effectiveWeapons(state, score);
  const [active, setActive] = useState(focusWeapon ?? picked[0]);

  useEffect(() => {
    if (focusWeapon) setActive(focusWeapon);
  }, [focusWeapon]);

  const weapon = WEAPON_MAP[active] ?? WEAPON_MAP[picked[0]];
  const list = state.experiences.filter((e) => e.weaponId === weapon?.id);

  const add = () =>
    update((prev) => ({ ...prev, experiences: [...prev.experiences, newEntry(weapon.id)] }));

  const patch = (id: string, field: keyof ExperienceEntry, value: string) =>
    update((prev) => ({
      ...prev,
      experiences: prev.experiences.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));

  const remove = (id: string) =>
    update((prev) => ({ ...prev, experiences: prev.experiences.filter((e) => e.id !== id) }));

  if (!weapon) {
    return (
      <div>
        <StepHeading step={5} title="내 경험 정리" desc="먼저 3단계에서 무기를 선택해 주세요." />
        <Callout tone="warn">3단계에서 대표 무기 3개를 확정하면 이 단계가 열립니다.</Callout>
      </div>
    );
  }

  return (
    <div>
      <StepHeading
        step={5}
        title="내 경험 붙이기 — 강점을 사실로 증명하기"
        desc="여기서부터가 진짜입니다. 강점은 주장이고, 경험은 증거입니다. 무기마다 최소 1개, 가능하면 2개씩 STAR로 정리해 두면 어떤 문항이 나와도 조합해서 쓸 수 있습니다."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {picked.map((id) => {
          const w = WEAPON_MAP[id];
          const count = state.experiences.filter((e) => e.weaponId === id).length;
          const isActive = id === weapon.id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-brand-400 bg-brand-300 text-ink"
                  : "border-ink-line bg-white text-ink-soft hover:bg-cream-50"
              }`}
            >
              {WORK_TYPE_MAP[w.typeId].emoji} {w.name}
              <span className={`ml-1.5 text-xs ${count ? "text-ink-soft" : "text-red-500"}`}>
                {count}건
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4">
        <p className="text-sm font-extrabold">{weapon.name} — 이 질문에 답한다고 생각하세요</p>
        <ul className="mt-2 space-y-1">
          {weapon.evidencePrompts.map((q) => (
            <li key={q} className="text-sm leading-relaxed text-ink-soft">
              · {q}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 space-y-5">
        {list.map((e, idx) => {
          const filled = FIELDS.filter((f) => e[f.key]?.trim()).length;
          return (
            <div key={e.id} className="card px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-ink text-cream-50">사례 {idx + 1}</span>
                <input
                  className="field-input flex-1 !py-2 font-semibold"
                  placeholder="경험 제목 (예: 학과 축제 예산 40% 삭감 상황에서 방문객 유지)"
                  value={e.title}
                  onChange={(ev) => patch(e.id, "title", ev.target.value)}
                />
                <button type="button" className="btn-ghost !px-3" onClick={() => remove(e.id)}>
                  삭제
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="field-label">{f.label}</label>
                    <textarea
                      className={`field-input ${f.key === "metric" ? "min-h-[52px]" : "min-h-[70px]"}`}
                      placeholder={f.hint}
                      value={e[f.key]}
                      onChange={(ev) => patch(e.id, f.key, ev.target.value)}
                    />
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs font-semibold text-ink-muted">
                작성 {filled}/5 —{" "}
                {e.metric.trim()
                  ? "숫자까지 들어갔습니다. 서류에 바로 쓸 수 있는 상태입니다."
                  : "숫자가 비어 있습니다. 인원·금액·시간·비율 중 하나만 넣어도 설득력이 크게 올라갑니다."}
              </p>
            </div>
          );
        })}
      </div>

      <button type="button" className="btn-outline mt-5" onClick={add}>
        + {weapon.name} 사례 추가
      </button>

      {list.length === 0 ? (
        <div className="mt-5">
          <Callout tone="warn">
            아직 이 무기에 붙은 경험이 없습니다. 거창한 경험일 필요는 없습니다. 아르바이트·팀 프로젝트·동아리에서
            <strong> 내가 직접 한 행동</strong>이면 충분합니다.
          </Callout>
        </div>
      ) : null}
    </div>
  );
}
