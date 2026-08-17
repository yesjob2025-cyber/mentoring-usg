/**
 * 한글 조사 자동 선택.
 * 유형·무기 이름을 문장에 끼워 넣을 때 "정렬으로", "효율화을" 같은 어색한 표기를 막는다.
 */
export type JosaPair = "을/를" | "이/가" | "은/는" | "과/와" | "으로/로" | "이라는/라는";

export function josa(word: string, pair: JosaPair): string {
  const [withJong, withoutJong] = pair.split("/");
  const cleaned = word.trim().replace(/[)\]}"'’”」』\s.]+$/u, "");
  const last = cleaned.slice(-1);
  if (!last) return withoutJong;

  const code = last.charCodeAt(0);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  if (!isHangul) return withoutJong; // 영문·숫자 등은 판단하지 않고 개음절 형태 사용

  const jong = (code - 0xac00) % 28;
  if (pair === "으로/로") return jong === 0 || jong === 8 /* ㄹ */ ? "로" : "으로";
  return jong === 0 ? withoutJong : withJong;
}

/** `${withJosa("우선순위 정렬", "으로/로")}` → "우선순위 정렬로" */
export function withJosa(word: string, pair: JosaPair): string {
  return `${word}${josa(word, pair)}`;
}
