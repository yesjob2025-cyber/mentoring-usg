// 우수 답변 채택 등급별 차등 지급액 (내부 정산 기록용)
// server action 모듈이 아닌 순수 상수 모듈 → 서버/클라이언트 양쪽에서 import 가능
export const GRADE_AMOUNT: Record<string, number> = {
  "1등급 (우수)": 30000,
  "2등급 (우량)": 20000,
  "3등급 (일반)": 10000,
};

export const GRADES = Object.keys(GRADE_AMOUNT);
