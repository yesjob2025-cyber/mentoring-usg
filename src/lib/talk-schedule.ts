// 토크콘서트 공지 일정 + 날짜별 Zoom 세션 정보.
// 공개 표기는 "직무(분야) + 기업"만. 멘토 이름은 화면에 노출하지 않음(프로필 링크에만 사용).
// confirmed=false 는 변동 가능(미확정) 슬롯.

export interface TalkSlot {
  track: string; // 계열(색상 분류)
  topic: string; // 분야(직무) — 공공기관은 기관명
  company: string; // 기업 (공공기관 슬롯은 빈 값: topic 이 곧 기관명)
  mentor: string; // 멘토 이름 (프로필 연동용, 화면 비노출)
  confirmed: boolean; // 확정 여부(색칠=확정)
}
export interface TalkDay {
  date: string;
  slots: TalkSlot[];
}

const s = (track: string, topic: string, company: string, mentor: string, confirmed = true): TalkSlot => ({
  track, topic, company, mentor, confirmed,
});
// 공공기관 슬롯 (기관명이 곧 분야, 기업 표기 없음)
const pub = (topic: string, mentor: string, confirmed = true): TalkSlot => ({
  track: "공공", topic, company: "", mentor, confirmed,
});

export const TALK_SCHEDULE: TalkDay[] = [
  { date: "2026-08-24", slots: [
    s("IT분야", "인공지능", "대웅제약", "신호선"),
    s("공학", "조선", "HD현대중공업", "정현천"),
    s("인문상경", "경영기획", "KPX케미칼", "김주경"),
    s("기타", "상담", "한국상담네트워크", "김규리", false),
    pub("한국철도공사", "연상헌"),
  ] },
  { date: "2026-08-25", slots: [
    s("IT분야", "데이터", "삼성전자", "이원준"),
    s("공학", "반도체", "SK하이닉스", "김결"),
    s("인문상경", "회계", "코카콜라음료", "이유경"),
    s("기타", "승무원", "에어부산", "임하얀"),
    pub("한국남부발전", "남태환"),
  ] },
  { date: "2026-08-26", slots: [
    s("IT분야", "IT인프라", "LG CNS", "정혜수"),
    s("공학", "전기전자", "쿠쿠전자", "임세훈"),
    s("인문상경", "마케팅", "삼성전자", "김우현"),
    s("기타", "식품영양", "CJ프레시웨이", ""),
    pub("국방기술품질원", "박상훈"),
  ] },
  { date: "2026-08-27", slots: [
    s("IT분야", "게임개발", "네오위즈", "장병찬"),
    s("공학", "방산/항공", "LIG넥스원", "김도엽"),
    s("인문상경", "무역", "한화", "권혁진"),
    s("인문상경", "제품 디자인", "현대자동차", "이유손"),
    pub("한국재료연구원", "김재연"),
  ] },
  { date: "2026-08-28", slots: [
    s("IT분야", "IT개발", "한화에어로스페이스", "차은영"),
    s("공학", "제약/바이오", "한국존슨앤드존슨", "박정환"),
    s("인문상경", "영업/해외영업", "은산해운항공", "노경용"),
    s("기타", "방송PD", "스튜디오 유별히", "서혜인"),
    pub("국민건강보험공단", "김보경"),
  ] },
  { date: "2026-08-31", slots: [
    s("인문상경", "MD", "무신사", "박예슬"),
    s("기타", "간호", "인제대백병원", "오선영"),
    s("인문상경", "은행", "기업은행", "추용호"),
    s("인문상경", "인사총무", "LS일렉트릭", "김수연"),
    pub("부산교통공사", "배성림"),
  ] },
  { date: "2026-09-01", slots: [
    s("공학", "자동차", "기아", "강기철"),
    s("공학", "화학/철강", "포스코스틸리온", "설재욱"),
    s("인문상경", "엔터테인먼트", "카카오", "하성진"),
    s("인문상경", "물류관리", "CJ대한통운", "성주현"),
    pub("중소벤처기업진흥공단", "이지현"),
  ] },
  { date: "2026-09-02", slots: [
    s("공학", "건설/토목", "중흥토건", "김준표"),
    s("공학", "배터리", "HD건설기계", "김장욱"),
    s("인문상경", "호텔관광", "에버미라클호텔", "이하진"),
    s("기타", "철도승무원", "SR", "이유진", false),
    pub("한국환경공단", "최인호"),
  ] },
  { date: "2026-09-03", slots: [
    s("IT분야", "정보보안", "기술보증기금", "구한서"),
    s("기타", "식품", "한국야쿠르트", "강영훈"),
    s("인문상경", "매장관리", "BGF", "허혜진"),
    s("인문상경", "브랜딩 디자인", "삼진어묵", "육진태", false),
    pub("한국관광공사", "김다인"),
  ] },
];

// 날짜별 Zoom 세션 (하루 1개 방). 관리자가 값 채움 — 비어 있으면 "준비 중".
export interface ZoomSession {
  link: string;
  id: string;
  pw: string;
  host: string;
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

export const JOIN_RULES = [
  "화면(비디오)을 켜고 참여해 주세요.",
  "대화명(이름)은 «학교 + 이름»으로 설정해 주세요. 예) 부산대 홍길동",
  "질문은 채팅창으로 남겨 주세요. (진행 멘토가 정리해 답변)",
];
