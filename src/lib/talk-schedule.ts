// 토크콘서트 공지 일정 (9일 × 5계열) + 날짜별 Zoom 세션 정보.
// 일정표·예약·Zoom 안내 페이지가 모두 이 설정을 공유한다.

export interface TalkSlot {
  track: string; // 계열(색상 분류)
  topic: string; // 분야
}
export interface TalkDay {
  date: string; // YYYY-MM-DD
  slots: TalkSlot[];
}

const t = (track: string, topic: string): TalkSlot => ({ track, topic });

// 공지된 일정 (각 날짜 5개 분야). 5번째는 공공기관.
export const TALK_SCHEDULE: TalkDay[] = [
  { date: "2026-08-24", slots: [t("IT분야", "인공지능"), t("공학", "자동차"), t("인문상경", "인사총무"), t("보건복지", "간호"), t("공공", "한국남동발전")] },
  { date: "2026-08-25", slots: [t("IT분야", "IT개발"), t("공학", "반도체"), t("인문상경", "회계"), t("보건복지", "사회복지"), t("공공", "중소벤처기업진흥공단")] },
  { date: "2026-08-26", slots: [t("IT분야", "IT인프라"), t("공학", "전기전자"), t("인문상경", "마케팅"), t("보건복지", "상담"), t("공공", "국방기술품질원")] },
  { date: "2026-08-27", slots: [t("IT분야", "게임개발"), t("공학", "방산/항공"), t("인문상경", "무역"), t("보건복지", "디자인"), t("공공", "한국재료연구원")] },
  { date: "2026-08-28", slots: [t("IT분야", "UX/UI"), t("공학", "제약/바이오"), t("인문상경", "영업/해외영업"), t("보건복지", "방송PD"), t("공공", "국민건강보험공단")] },
  { date: "2026-08-31", slots: [t("IT분야", "스마트팩토리"), t("공학", "구매"), t("인문상경", "은행"), t("보건복지", "웹툰"), t("공공", "부산교통공사")] },
  { date: "2026-09-01", slots: [t("IT분야", "데이터분석"), t("공학", "화학/철강"), t("인문상경", "증권"), t("보건복지", "물류관리"), t("공공", "한국관광공사")] },
  { date: "2026-09-02", slots: [t("IT분야", "건설/토목"), t("공학", "매장관리"), t("인문상경", "보험"), t("보건복지", "승무원"), t("공공", "한국해양공단"), t("공학", "배터리")] },
  { date: "2026-09-03", slots: [t("IT분야", "정보보안"), t("공학", "식품"), t("인문상경", "식품영양"), t("보건복지", "MD"), t("공공", "한국표준협회")] },
];

// 날짜별 Zoom 세션 (하루 1개 방). 값은 관리자가 채움 — 비어 있으면 "준비 중" 표기.
export interface ZoomSession {
  link: string; // 참가 URL
  id: string; // 회의 ID
  pw: string; // 암호
  host: string; // 안내(진행) 멘토
}
export const ZOOM_SESSIONS: Record<string, ZoomSession> = {
  "2026-08-24": { link: "", id: "", pw: "", host: "" },
  "2026-08-25": { link: "", id: "", pw: "", host: "" },
  "2026-08-26": { link: "", id: "", pw: "", host: "" },
  "2026-08-27": { link: "", id: "", pw: "", host: "" },
  "2026-08-28": { link: "", id: "", pw: "", host: "" },
  "2026-08-31": { link: "", id: "", pw: "", host: "" },
  "2026-09-01": { link: "", id: "", pw: "", host: "" },
  "2026-09-02": { link: "", id: "", pw: "", host: "" },
  "2026-09-03": { link: "", id: "", pw: "", host: "" },
};

export function zoomFor(date: string): ZoomSession | undefined {
  return ZOOM_SESSIONS[date];
}

export const CONCERT_TIME = "19:00~22:00";

export function weekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return ["일", "월", "화", "수", "목", "금", "토"][wd];
}

// 참여 안내(고정)
export const JOIN_RULES = [
  "화면(비디오)을 켜고 참여해 주세요.",
  "대화명(이름)은 «학교 + 이름»으로 설정해 주세요. 예) 부산대 홍길동",
  "질문은 채팅창으로 남겨 주세요. (진행 멘토가 정리해 답변)",
];
