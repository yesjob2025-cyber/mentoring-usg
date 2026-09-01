import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { sendInviteLms } from "@/lib/messaging";
import { weekday, TALK_SCHEDULE } from "@/lib/talk-schedule";
import { slotLabel } from "@/lib/talk-config";
import type { User, TalkReservation } from "@/lib/types";

// 현재 일정에 존재하는 (날짜|분야) 조합만 유효 — 옛 일정으로 한 예약 제외용
const VALID_SLOT = new Set(
  TALK_SCHEDULE.flatMap((d) => d.slots.map((s) => `${d.date}|${s.topic}`))
);
// (날짜|분야) → 기업명
const COMPANY_BY_SLOT = new Map(
  TALK_SCHEDULE.flatMap((d) => d.slots.map((s) => [`${d.date}|${s.topic}`, s.company] as const))
);

// 특정 날짜 예약 학생에게 "오늘 행사 안내 + Zoom 접속 링크" 발송
//  /api/talk-remind?secret=<SEED_SECRET>&date=2026-08-24            → 미리보기
//  /api/talk-remind?secret=<SEED_SECRET>&date=2026-08-24&send=1     → 발송
const SITE = "https://mentoring-usg.kr";
const BLOCK = new Set([
  "01012345678", "01000000000", "01011112222", "01022223333",
  "01011111111", "01099999999", "01012341234",
]);

// (날짜|분야) → 변경 공지. 그 슬롯을 예약한 학생에게만 추가로 안내.
const CHANGE_NOTICES: Record<string, string> = {
  "2026-08-26|식품영양":
    "※ [변경 안내] '식품영양' 진행 기업이 담당자 사정으로 CJ프레시웨이 → 아라마크(동일 직무)로 변경되었습니다.",
};

function md(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}(${weekday(date)})`;
}

function remindMessage(name: string, date: string, slots: string, notice: string): string {
  return (
    `[부울경 멘토링] 오늘 토크콘서트 안내\n\n` +
    `${name}님, 오늘 ${md(date)} 저녁 7시 온라인 토크콘서트가 진행됩니다.\n` +
    (slots ? `예약하신 프로그램: ${slots}\n` : ``) +
    (notice ? `\n${notice}\n` : ``) +
    `\n예약 시간에 아래에서 Zoom으로 바로 접속하세요.\n` +
    `· 접속: ${SITE}/talk-concert/zoom/${date}\n` +
    `· 참여: 화면 ON / 대화명 «학교+이름» / 질문은 채팅창\n\n` +
    `문의: 010-8553-6027`
  );
}

// 시작 임박 안내: 오늘 7시 시작, 10분 전 입장 요청
function startMessage(name: string, date: string, slots: string, notice: string): string {
  return (
    `[부울경 멘토링] 오늘 토크콘서트 시작 안내\n\n` +
    `${name}님, 오늘 저녁 7시 토크콘서트가 시작됩니다. 원활한 진행을 위해 ` +
    `시작 10분 전(18:50)까지 입장해 주세요.\n` +
    (slots ? `예약하신 프로그램: ${slots}\n` : ``) +
    (notice ? `\n${notice}\n` : ``) +
    `\n홈페이지에서 바로 Zoom으로 접속할 수 있습니다.\n` +
    `· 접속: ${SITE}/talk-concert/zoom/${date}\n` +
    `· 참여: 화면 ON / 대화명 «학교+이름» / 질문은 채팅창\n\n` +
    `문의: 010-8553-6027`
  );
}

// 시작 오류 사과 안내 (고정 문구)
function apologyMessage(): string {
  return (
    `안녕하세요. 부울경 연합 토크콘서트 운영사무국입니다.\n\n` +
    `오늘 멘토링 시작할 때 사무실에 갑작스런 인터넷 및 전기 문제로 원활하게 진행되지 못한 점 죄송합니다. ` +
    `앞으로는 이런 일이 없도록 사전에 잘 준비해서 시작하겠습니다.\n\n` +
    `다시 한번 사과드리며, 현직자 분들과 함께 현장 이해와 취업준비에 도움 받으시기 바랍니다.`
  );
}

// 시작 임박 + 다른 멘토링 참여 독려
function startMoreMessage(name: string, date: string, slots: string, notice: string): string {
  return (
    `[부울경 멘토링] 오늘 토크콘서트 시작 안내\n\n` +
    `${name}님, 오늘 저녁 7시 토크콘서트가 시작됩니다. 시작 10분 전(18:50)까지 입실 완료해 주세요.\n` +
    (slots ? `예약하신 프로그램: ${slots}\n` : ``) +
    (notice ? `\n${notice}\n` : ``) +
    `\n홈페이지에서 바로 Zoom으로 접속할 수 있습니다.\n` +
    `· 접속: ${SITE}/talk-concert/zoom/${date}\n` +
    `· 참여: 화면 ON / 대화명 «학교+이름» / 질문은 채팅창\n\n` +
    `이 외에도 9/3(목)까지 매일 다양한 분야의 현직자 멘토링이 준비되어 있습니다. ` +
    `관심 분야를 예약하고 많이 참여해 주세요!\n` +
    `· 전체 일정·예약: ${SITE}/talk-concert\n\n` +
    `문의: 010-8553-6027`
  );
}

// 진행 중 독려: 지금 바로 참여 요청
function nowMessage(name: string, date: string, slots: string, notice: string): string {
  return (
    `[부울경 멘토링] 토크콘서트 진행 중 안내\n\n` +
    `${name}님, 오늘 토크콘서트가 진행 중입니다. 아직 참여 전이시라면 ` +
    `지금 바로 홈페이지에서 접속해 주세요!\n` +
    (slots ? `예약하신 프로그램: ${slots}\n` : ``) +
    (notice ? `\n${notice}\n` : ``) +
    `\n· 바로 접속: ${SITE}/talk-concert/zoom/${date}\n` +
    `· 참여: 화면 ON / 대화명 «학교+이름» / 질문은 채팅창\n\n` +
    `문의: 010-8553-6027`
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const date = (url.searchParams.get("date") || "2026-08-24").trim();
  const doSend = url.searchParams.get("send") === "1";
  const variant = (url.searchParams.get("variant") || "").trim();
  // 특정 분야·시간만 대상으로 좁히기 (예: 한 세션 시간 변경 안내)
  const onlyTopic = (url.searchParams.get("topic") || "").trim();
  const onlyTime = (url.searchParams.get("time") || "").trim();
  const newTime = (url.searchParams.get("newtime") || "20:00").trim();

  // 시간 변경(지연) 안내 문구
  const delayMessage = (name: string, d: string): string => {
    const company = onlyTopic ? COMPANY_BY_SLOT.get(`${d}|${onlyTopic}`) || "" : "";
    const label = [onlyTopic, company].filter(Boolean).join(" · ");
    return (
      `[부울경 멘토링] 세션 시간 변경 안내\n\n` +
      `${name}님, 오늘 ${md(d)} 예약하신 '${label}' 세션이 진행 멘토 사정으로 ` +
      `예정보다 늦게 시작됩니다.\n` +
      `${newTime}부터 시작하오니, 해당 시간에 맞춰 접속해 주세요. 기다리게 해 죄송합니다.\n\n` +
      `· 접속: ${SITE}/talk-concert/zoom/${d}\n` +
      `· 참여: 화면 ON / 대화명 «학교+이름» / 질문은 채팅창\n\n` +
      `문의: 010-8553-6027`
    );
  };

  const buildMsg =
    variant === "delay" ? (name: string, d: string) => delayMessage(name, d)
    : variant === "apology" ? () => apologyMessage()
    : variant === "startmore" ? startMoreMessage
    : variant === "now" ? nowMessage
    : variant === "start" ? startMessage
    : remindMessage;
  const subject =
    variant === "apology" ? "[부울경 토크콘서트] 사과 말씀"
    : variant === "delay" ? "[부울경 멘토링] 세션 시간 변경 안내"
    : "[부울경 멘토링] 오늘 토크콘서트 안내";

  const [reservations, users] = await Promise.all([
    all<TalkReservation>("talkReservations"),
    all<User>("users"),
  ]);
  const phoneByUser = new Map<string, string>();
  const nameByUser = new Map<string, string>();
  for (const u of users) {
    phoneByUser.set(u.id, (u.phone || "").trim());
    nameByUser.set(u.id, u.name);
  }

  // 해당 날짜 예약 → 학생별 그룹(예약 시간·분야 목록)
  // 옛 일정(현재 분야에 없는)으로 한 예약은 제외
  let staleExcluded = 0;
  const byUser = new Map<string, { time: string; topic: string }[]>();
  for (const r of reservations) {
    if (r.date !== date) continue;
    if (!VALID_SLOT.has(`${r.date}|${r.topic}`)) { staleExcluded += 1; continue; }
    if (onlyTopic && r.topic !== onlyTopic) continue;
    if (onlyTime && r.time !== onlyTime) continue;
    const arr = byUser.get(r.userId) ?? [];
    arr.push({ time: r.time, topic: r.topic });
    byUser.set(r.userId, arr);
  }

  const targets: { userId: string; name: string; phone: string; slots: string; notice: string }[] = [];
  const skipped = { noPhone: 0, testNumber: 0 };
  let noticedCount = 0;
  for (const [userId, resv] of byUser) {
    const phone = phoneByUser.get(userId) || (resv[0] && ""); // 예약엔 번호 없음 → users 에서
    const digits = (phone || "").replace(/[^0-9]/g, "");
    if (digits.length < 10) { skipped.noPhone += 1; continue; }
    if (BLOCK.has(digits)) { skipped.testNumber += 1; continue; }
    const sorted = resv.sort((a, b) => a.time.localeCompare(b.time));
    const slots = sorted.map((x) => `${slotLabel(x.time)} ${x.topic}`).join(", ");
    const notice = [...new Set(sorted.map((x) => CHANGE_NOTICES[`${date}|${x.topic}`]).filter(Boolean))].join("\n");
    if (notice) noticedCount += 1;
    targets.push({ userId, name: nameByUser.get(userId) || "학생", phone: phone!, slots, notice });
  }

  if (!doSend) {
    return NextResponse.json({
      dryRun: true,
      date,
      targets: targets.length,
      staleExcluded,
      changeNoticeRecipients: noticedCount,
      skipped,
      sampleMessage: buildMsg("홍길동", date, "19:00~20:00 인공지능", CHANGE_NOTICES[`${date}|식품영양`] ?? ""),
      preview: targets.slice(0, 30).map((t) => ({ name: t.name, phone: t.phone, slots: t.slots })),
    });
  }

  let sent = 0;
  const failures: { name: string; detail?: string }[] = [];
  for (const t of targets) {
    const res = await sendInviteLms(t.phone, subject, buildMsg(t.name, date, t.slots, t.notice));
    if (res.ok) sent += 1;
    else failures.push({ name: t.name, detail: res.detail });
  }
  return NextResponse.json({ dryRun: false, date, candidates: targets.length, sent, failed: failures.length, failures: failures.slice(0, 30) });
}
