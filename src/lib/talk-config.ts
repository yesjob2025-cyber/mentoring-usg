// 토크콘서트 설정 (클라이언트/서버 공용 상수)

// 화상 교육장 테스트 대상 회차 1개.
// 이 회차만 입장 가능하며, 출석 로그가 기록됩니다.
export const TALK_TEST_SESSION_ID = "talk_2026-08-24_1";

// 토크콘서트 예약 시간대 (1시간 단위, 19:00~22:00 → 3개 블록)
// 한 학생은 하루에 시간대별로 1개씩, 최대 3개까지 희망 멘토링을 예약할 수 있습니다.
export const TALK_TIME_SLOTS = ["19:00", "20:00", "21:00"] as const;
export type TalkTimeSlot = (typeof TALK_TIME_SLOTS)[number];
export const TALK_MAX_PER_DAY = TALK_TIME_SLOTS.length; // 3

// "19:00" → "19:00~20:00"
export function slotLabel(time: string): string {
  const h = parseInt(time.slice(0, 2), 10);
  return `${time}~${String(h + 1).padStart(2, "0")}:00`;
}
