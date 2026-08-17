"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StrengthState } from "./types";

export const STORAGE_KEY = "yesjob.strength.v1";

export function emptyState(): StrengthState {
  return {
    version: 1,
    likert: {},
    situation: {},
    external: { reflect: true, holland: [] },
    pickedWeapons: [],
    experiences: [],
    target: { company: "", job: "" },
    updatedAt: "",
  };
}

function reviveState(raw: string): StrengthState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StrengthState>;
    if (!parsed || parsed.version !== 1) return null;
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      likert: parsed.likert ?? base.likert,
      situation: parsed.situation ?? base.situation,
      external: { ...base.external, ...(parsed.external ?? {}) },
      pickedWeapons: parsed.pickedWeapons ?? [],
      experiences: parsed.experiences ?? [],
      target: { ...base.target, ...(parsed.target ?? {}) },
    };
  } catch {
    return null;
  }
}

/**
 * 진단 상태를 브라우저(localStorage)에만 저장한다.
 * 서버로 개인 응답을 보내지 않기 때문에 로그인 없이도 쓸 수 있고, 학생 입장에서 부담이 적다.
 */
export function useStrengthState() {
  const [state, setState] = useState<StrengthState>(emptyState);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const revived = reviveState(raw);
      if (revived) setState(revived);
    }
    loaded.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((patch: (prev: StrengthState) => StrengthState) => {
    setState((prev) => ({ ...patch(prev), updatedAt: new Date().toISOString() }));
  }, []);

  const reset = useCallback(() => {
    setState(emptyState());
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { state, update, reset, ready };
}
