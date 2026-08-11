// 토크콘서트 섭외 확정 라인업 (발송 대상).
// 멘토는 이름으로 공유 DB(mentors)에서 조회 → 실제 번호로 섭외 문자 발송.
// 미배정·보류 슬롯은 제외. 이름이 바뀌면 여기만 수정하면 됨.

export interface LineupEntry {
  date: string; // YYYY-MM-DD
  slot: string; // 분야
  track?: string; // 계열(참고)
  name: string; // 멘토 이름 (DB mentors.name 과 일치해야 함)
}

export const TALK_LINEUP: LineupEntry[] = [
  { date: "2026-08-24", slot: "인공지능", name: "신호선" },
  { date: "2026-08-24", slot: "자동차", name: "김동준" },
  { date: "2026-08-24", slot: "인사총무", name: "정현린" },
  { date: "2026-08-24", slot: "간호", name: "송채연" },
  { date: "2026-08-24", slot: "한국남부발전", name: "연상헌" },

  { date: "2026-08-25", slot: "IT개발", name: "정재환" },
  { date: "2026-08-25", slot: "반도체", name: "김결" },
  { date: "2026-08-25", slot: "회계", name: "이유경" },
  { date: "2026-08-25", slot: "중소벤처기업진흥공단", name: "이영운" },

  { date: "2026-08-26", slot: "IT인프라", name: "정혜수" },
  { date: "2026-08-26", slot: "전기전자", name: "임세훈" },
  { date: "2026-08-26", slot: "마케팅", name: "김우현" },
  { date: "2026-08-26", slot: "국방기술품질원", name: "박상훈" },

  { date: "2026-08-27", slot: "게임개발", name: "장병찬" },
  { date: "2026-08-27", slot: "방산/항공", name: "김도엽" },
  { date: "2026-08-27", slot: "무역", name: "권혁진" },
  { date: "2026-08-27", slot: "디자인", name: "이유손" },
  { date: "2026-08-27", slot: "한국재료연구원", name: "김재연" },

  { date: "2026-08-28", slot: "제약/바이오", name: "박정환" },
  { date: "2026-08-28", slot: "영업/해외영업", name: "노경용" },
  { date: "2026-08-28", slot: "국민건강보험공단", name: "김보경" },

  { date: "2026-08-31", slot: "구매", name: "정윤" },
  { date: "2026-08-31", slot: "은행", name: "추용호" },
  { date: "2026-08-31", slot: "부산교통공사", name: "정의훈" },

  { date: "2026-09-01", slot: "데이터분석", name: "성명규" },
  { date: "2026-09-01", slot: "화학/철강", name: "설재욱" },
  { date: "2026-09-01", slot: "물류관리", name: "성주현" },

  { date: "2026-09-02", slot: "건설/토목", name: "김준표" },
  { date: "2026-09-02", slot: "매장관리", name: "강예슬" },
  { date: "2026-09-02", slot: "승무원", name: "임하얀" },
  { date: "2026-09-02", slot: "한국해양공단", name: "최인호" },

  { date: "2026-09-03", slot: "정보보안", name: "구한서" },
  { date: "2026-09-03", slot: "식품", name: "강영훈" },
  { date: "2026-09-03", slot: "MD", name: "남지수" },
  { date: "2026-09-03", slot: "한국표준협회", name: "김민준" },
];

export const CONCERT_TIME = "19:00~22:00";
export const CONTACT_PHONE = "010-8553-6027";

// 멘토풀(DB)/명단에 아직 없는 섭외 대상 — 이름→실번호 수동 등록(최우선 매칭).
export const MANUAL_CONTACTS: Record<string, string> = {
  김우현: "010-6863-3788", // 삼성전자 영업마케팅 (마케팅 슬롯)
  연상헌: "010-2467-9820", // 한국남부발전 (8/24)
};

// DB에 없는 섭외 멘토의 회사명(공개 일정 표기용) — 이름은 공개하지 않고 회사명만 노출.
export const MANUAL_COMPANY: Record<string, string> = {
  김우현: "삼성전자",
  연상헌: "한국남부발전",
};

export function weekdayKo(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return ["일", "월", "화", "수", "목", "금", "토"][wd];
}
