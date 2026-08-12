import "server-only";
import { all } from "./data";
import type { Mentor } from "./types";

// 멘토 이름 → 프로필 id (노출된 활성 멘토만).
// 일정표에서 "직무·기업"만 보여주되, 풀에 등록된 멘토는 프로필로 연동하기 위해 사용.
export async function profileIdByName(): Promise<Record<string, string>> {
  let mentors: Mentor[] = [];
  try {
    mentors = await all<Mentor>("mentors");
  } catch {
    mentors = [];
  }
  const out: Record<string, string> = {};
  for (const m of mentors) {
    if (m.name && m.active !== false && !out[m.name]) out[m.name] = m.id;
  }
  return out;
}
