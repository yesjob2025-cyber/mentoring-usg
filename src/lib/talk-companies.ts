import "server-only";
import { all } from "./data";
import type { Mentor } from "./types";
import { TALK_LINEUP, MANUAL_COMPANY } from "./talk-lineup";

// 공개 일정에 "분야 + 회사명"만 노출(멘토 이름 비공개).
// 각 (날짜|분야) 슬롯에 배정된 멘토의 회사명을 반환.

function firstToken(s: string): string {
  return (s || "").trim().split(/[\s/·]+/)[0] || "";
}

export async function companyBySlot(): Promise<Record<string, string>> {
  let mentors: Mentor[] = [];
  try {
    mentors = await all<Mentor>("mentors");
  } catch {
    mentors = [];
  }
  const nameCo = new Map<string, string>();
  for (const m of mentors) {
    if (m.name && m.company) nameCo.set(m.name, firstToken(m.company));
  }
  const out: Record<string, string> = {};
  for (const e of TALK_LINEUP) {
    const co = MANUAL_COMPANY[e.name] || nameCo.get(e.name) || "";
    if (co) out[`${e.date}|${e.slot}`] = co;
  }
  return out;
}
