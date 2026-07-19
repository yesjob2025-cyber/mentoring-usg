// 서버/클라이언트 하이드레이션 불일치 방지를 위해 고정 시간대(Asia/Seoul)로 포맷.
// toLocaleString 을 그대로 쓰면 실행 환경 TZ 에 따라 서버·클라이언트 출력이 달라져
// React hydration mismatch(#418) 가 발생하므로, 아래 헬퍼로 통일한다.

const KST = "Asia/Seoul";

const dateTimeFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatKST(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function formatKSTDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}
