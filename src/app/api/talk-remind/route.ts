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

// 특정 날짜 예약 학생에게 "오늘 행사 안내 + Zoom 접속 링크" 발송
//  /api/talk-remind?secret=<SEED_SECRET>&date=2026-08-24            → 미리보기
//  /api/talk-remind?secret=<SEED_SECRET>&date=2026-08-24&send=1     → 발송
const SITE = "https://mentoring-usg.kr";
const BLOCK = new Set([
  "01012345678", "01000000000", "01011112222", "01022223333",
  "01011111111", "01099999999", "01012341234",
]);

function md(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}(${weekday(date)})`;
}

function remindMessage(name: string, date: string, slots: string): string {
  return (
    `[부울경 멘토링] 오늘 토크콘서트 안내\n\n` +
    `${name}님, 오늘 ${md(date)} 저녁 7시 온라인 토크콘서트가 진행됩니다.\n` +
    (slots ? `예약하신 프로그램: ${slots}\n\n` : `\n`) +
    `예약 시간에 아래에서 Zoom으로 바로 접속하세요.\n` +
    `· 접속: ${SITE}/talk-concert/zoom/${date}\n` +
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
    const arr = byUser.get(r.userId) ?? [];
    arr.push({ time: r.time, topic: r.topic });
    byUser.set(r.userId, arr);
  }

  const targets: { userId: string; name: string; phone: string; slots: string }[] = [];
  const skipped = { noPhone: 0, testNumber: 0 };
  for (const [userId, resv] of byUser) {
    const phone = phoneByUser.get(userId) || (resv[0] && ""); // 예약엔 번호 없음 → users 에서
    const digits = (phone || "").replace(/[^0-9]/g, "");
    if (digits.length < 10) { skipped.noPhone += 1; continue; }
    if (BLOCK.has(digits)) { skipped.testNumber += 1; continue; }
    const slots = resv
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((x) => `${slotLabel(x.time)} ${x.topic}`)
      .join(", ");
    targets.push({ userId, name: nameByUser.get(userId) || "학생", phone: phone!, slots });
  }

  if (!doSend) {
    return NextResponse.json({
      dryRun: true,
      date,
      targets: targets.length,
      staleExcluded,
      skipped,
      sampleMessage: remindMessage("홍길동", date, "19:00~20:00 인공지능"),
      preview: targets.slice(0, 30).map((t) => ({ name: t.name, phone: t.phone, slots: t.slots })),
    });
  }

  let sent = 0;
  const failures: { name: string; detail?: string }[] = [];
  for (const t of targets) {
    const res = await sendInviteLms(t.phone, "[부울경 멘토링] 오늘 토크콘서트 안내", remindMessage(t.name, date, t.slots));
    if (res.ok) sent += 1;
    else failures.push({ name: t.name, detail: res.detail });
  }
  return NextResponse.json({ dryRun: false, date, candidates: targets.length, sent, failed: failures.length, failures: failures.slice(0, 30) });
}
