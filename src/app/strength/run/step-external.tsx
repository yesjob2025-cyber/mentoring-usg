"use client";

import {
  DISC_PROFILES,
  HOLLAND_PROFILES,
  MBTI_PROFILES,
  externalProfiles,
  externalTypeScores,
} from "@/lib/strength/external";
import { WORK_TYPE_MAP, WORK_TYPES } from "@/lib/strength/catalog";
import type { StrengthState } from "@/lib/strength/types";
import { Callout, ScoreBar, StepHeading } from "./ui";

interface Props {
  state: StrengthState;
  update: (patch: (prev: StrengthState) => StrengthState) => void;
}

export function StepExternal({ state, update }: Props) {
  const ext = state.external;
  const profiles = externalProfiles(ext);
  const extScores = externalTypeScores(ext);
  const extTop = extScores
    ? WORK_TYPES.slice().sort((a, b) => extScores[b.id] - extScores[a.id])[0]
    : null;

  const setExt = (patch: Partial<StrengthState["external"]>) =>
    update((prev) => ({ ...prev, external: { ...prev.external, ...patch } }));

  const toggleHolland = (code: string) => {
    const cur = ext.holland ?? [];
    if (cur.includes(code)) {
      setExt({ holland: cur.filter((c) => c !== code) });
    } else {
      // 상위 2개까지만 — 앞의 것을 밀어낸다
      setExt({ holland: [...cur, code].slice(-2) });
    }
  };

  return (
    <div>
      <StepHeading
        step={2}
        title="이미 받은 검사 결과, 일의 언어로 번역하기"
        desc="MBTI·DISC·직업적성검사 결과를 그대로 쓰면 '저는 ENFP라 사람을 좋아합니다'에서 끝납니다. 여기서는 검사 결과를 '일터에서의 행동'으로 바꿔 적고, 1단계 진단 결과와 어긋나는지 확인합니다. (검사를 안 받았다면 건너뛰어도 됩니다.)"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card px-5 py-5">
          <p className="field-label">MBTI</p>
          <div className="grid grid-cols-4 gap-1.5">
            {MBTI_PROFILES.map((p) => {
              const active = ext.mbti === p.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setExt({ mbti: active ? undefined : p.code })}
                  className={`rounded-lg border px-1 py-2 text-xs font-bold transition ${
                    active
                      ? "border-brand-400 bg-brand-300 text-ink"
                      : "border-ink-line bg-white text-ink-muted hover:bg-brand-50"
                  }`}
                >
                  {p.code}
                </button>
              );
            })}
          </div>

          <p className="field-label mt-5">DISC (주 유형)</p>
          <div className="grid grid-cols-2 gap-2">
            {DISC_PROFILES.map((p) => {
              const active = ext.disc === p.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() =>
                    setExt({ disc: active ? undefined : (p.code as "D" | "I" | "S" | "C") })
                  }
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                    active
                      ? "border-brand-400 bg-brand-50"
                      : "border-ink-line bg-white text-ink-soft hover:bg-cream-50"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <p className="field-label mt-5">홀랜드 직업적성 (상위 2개까지)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {HOLLAND_PROFILES.map((p) => {
              const active = (ext.holland ?? []).includes(p.code);
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => toggleHolland(p.code)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "border-brand-400 bg-brand-50"
                      : "border-ink-line bg-white text-ink-soft hover:bg-cream-50"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <p className="field-label mt-5">그 밖의 검사 결과 · 피드백 메모</p>
          <textarea
            className="field-input min-h-[90px]"
            placeholder="예) 강점검사 상위 5: 발상·전략·수집 / 직업선호도검사: 사무·관리 / 교수님 피드백: 자료 정리를 잘한다"
            value={ext.memo ?? ""}
            onChange={(e) => setExt({ memo: e.target.value })}
          />

          <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-xl border border-ink-line bg-cream-50 px-3.5 py-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={ext.reflect}
              onChange={(e) => setExt({ reflect: e.target.checked })}
            />
            <span className="text-sm leading-relaxed text-ink-soft">
              검사 결과를 종합 점수에 <strong>20%만</strong> 반영합니다. (내 행동 진단이 80%) — 검사 결과가
              오래됐거나 신뢰가 낮으면 체크를 해제하세요.
            </span>
          </label>
        </div>

        <div className="space-y-4">
          {profiles.length === 0 ? (
            <Callout tone="plain">
              왼쪽에서 검사 결과를 선택하면, 그 결과가 <strong>일터에서 어떤 행동으로 보이는지</strong> 번역해
              드립니다. 이 문장은 자기소개서에 그대로 옮겨 쓸 수 있습니다.
            </Callout>
          ) : (
            profiles.map((p) => (
              <div key={`${p.code}-${p.label}`} className="card px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="badge bg-ink text-cream-50">{p.code}</span>
                  <span className="text-sm font-extrabold">{p.label}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.translation}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(p.weights)
                    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                    .slice(0, 2)
                    .map(([k]) => (
                      <span key={k} className="chip-brand">
                        {WORK_TYPE_MAP[k as keyof typeof WORK_TYPE_MAP].emoji}{" "}
                        {WORK_TYPE_MAP[k as keyof typeof WORK_TYPE_MAP].name} 성향
                      </span>
                    ))}
                </div>
              </div>
            ))
          )}

          {extScores ? (
            <div className="card px-5 py-5">
              <p className="text-sm font-extrabold">검사 결과가 가리키는 일 유형</p>
              <div className="mt-3 space-y-2">
                {WORK_TYPES.map((t) => (
                  <ScoreBar
                    key={t.id}
                    label={t.name}
                    emoji={t.emoji}
                    value={extScores[t.id]}
                    highlight={extTop?.id === t.id}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                ※ 이 값은 검사 결과만 본 &lsquo;참고치&rsquo;입니다. 다음 단계에서 1단계 행동 진단과 합쳐 최종
                유형이 나옵니다.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
