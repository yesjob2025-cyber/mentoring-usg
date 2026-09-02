import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { listSchools } from "@/lib/repo";
import { sendInviteLms } from "@/lib/messaging";
import { TALK_SCHEDULE, weekday } from "@/lib/talk-schedule";
import type { User, School, TalkReservation } from "@/lib/types";

// 현재 일정에 존재하는 (날짜|분야) 조합만 유효 — 옛 일정 예약 무시용
const VALID_SLOT = new Set(
  TALK_SCHEDULE.flatMap((d) => d.slots.map((s) => `${d.date}|${s.topic}`))
);

// 특정 날짜의 라인업(분야 · 기업)을 문자용 목록으로 구성
function dayLineup(date: string): string {
  const day = TALK_SCHEDULE.find((d) => d.date === date);
  if (!day) return "";
  const [, m, d] = date.split("-");
  const head = `▶ ${Number(m)}/${Number(d)}(${weekday(date)})`;
  const lines = day.slots.map((s) => `· ${s.topic}${s.company ? ` · ${s.company}` : ""}`);
  return [head, ...lines].join("\n");
}

// 오늘·내일(마지막) 라인업 안내 + 미신청자 신청 독려
function lastCallMessage(name: string, dates: string[]): string {
  return (
    `[부울경 연합 현직자 멘토링] 오늘·내일 마지막 토크콘서트 안내\n\n` +
    `${name}님, 온라인 토크콘서트가 오늘·내일 저녁 7시로 마무리됩니다.\n` +
    `아직 신청 전이시라면 아래 현직자 멘토링을 지금 예약하고 참여하세요!\n\n` +
    dates.map(dayLineup).filter(Boolean).join("\n\n") +
    `\n\n· 예약·접속: ${SITE}/talk-concert\n` +
    `· 참여: 화면 ON / 대화명 «학교+이름» / 질문은 채팅창\n\n` +
    `문의: 010-8553-6027`
  );
}

// 등록 학생 전체(또는 학교별)에게 토크콘서트 안내 문자(LMS) 발송
//  /api/announce?secret=<SEED_SECRET>                → 미리보기(dry-run)
//  /api/announce?secret=<SEED_SECRET>&send=1         → 실제 발송
//  &school=<학교코드 또는 id>                         → 특정 학교만
const SITE = "https://mentoring-usg.kr";

function announceMessage(name: string): string {
  return (
    `[부울경 연합 현직자 멘토링] 온라인 토크콘서트 안내\n\n` +
    `${name}님, 8/24(월)~9/3(목) 매일 저녁 7시, 45명 현직자 릴레이 ` +
    `온라인 토크콘서트가 열립니다.\n` +
    `관심 분야 현직자 멘토를 예약하고 Zoom으로 참여하세요.\n\n` +
    `· 일정·예약·접속: ${SITE}/talk-concert\n` +
    `· 참여: 화면 ON / 대화명 «학교+이름» / 질문은 채팅창\n\n` +
    `문의: 010-8553-6027`
  );
}

// 2차 안내: 9/3까지 계속 진행 → 지속 참여 독려
function continueMessage(name: string): string {
  return (
    `[부울경 연합 현직자 멘토링] 토크콘서트 계속 진행 안내\n\n` +
    `${name}님, 온라인 토크콘서트가 9/3(목)까지 매일 저녁 7시 계속됩니다.\n` +
    `매일 새로운 분야의 현직자 멘토가 진행하니, 관심 분야를 예약하고 끝까지 함께해요.\n\n` +
    `· 일정·예약·접속: ${SITE}/talk-concert\n` +
    `· 참여: 화면 ON / 대화명 «학교+이름» / 질문은 채팅창\n\n` +
    `문의: 010-8553-6027`
  );
}

// 다음 주(8/31~9/3) 안내 + 남은 기간 미리 신청 독려
function nextWeekMessage(name: string): string {
  return (
    `[부울경 연합 현직자 멘토링] 다음 주 토크콘서트 안내\n\n` +
    `${name}님, 온라인 토크콘서트가 다음 주 8/31(월)~9/3(목)에도 매일 저녁 7시 계속됩니다.\n` +
    `매일 새로운 분야의 현직자 멘토가 진행하니, 남은 기간 관심 분야를 미리 예약하고 참여해 주세요!\n\n` +
    `· 일정·예약·접속: ${SITE}/talk-concert\n` +
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
  const doSend = url.searchParams.get("send") === "1";
  const schoolFilter = (url.searchParams.get("school") || "").trim();
  const variant = (url.searchParams.get("variant") || "").trim();
  // 특정 날짜(들)에 이미 예약한 학생을 발송 대상에서 제외 (예: 오늘·내일 신청자 제외)
  const exclDates = (url.searchParams.get("exclreserved") || "")
    .split(",").map((d) => d.trim()).filter(Boolean);
  const buildMsg =
    variant === "lastcall" ? (name: string) => lastCallMessage(name, exclDates)
    : variant === "nextweek" ? nextWeekMessage
    : variant === "continue" ? continueMessage
    : announceMessage;

  const [users, schools, reservations] = await Promise.all([
    all<User>("users"),
    listSchools(),
    exclDates.length ? all<TalkReservation>("talkReservations") : Promise.resolve([]),
  ]);
  // 지정 날짜에 유효 예약이 있는 학생 → 제외 대상
  const reservedUserIds = new Set<string>();
  for (const r of reservations) {
    if (exclDates.includes(r.date) && VALID_SLOT.has(`${r.date}|${r.topic}`)) {
      reservedUserIds.add(r.userId);
    }
  }
  const schoolById = new Map<string, School>(schools.map((s) => [s.id, s]));
  // 학교 필터: id 또는 code 로 지정
  let targetSchoolId = "";
  if (schoolFilter) {
    const hit = schools.find(
      (s) => s.id === schoolFilter || s.code?.toUpperCase() === schoolFilter.toUpperCase()
    );
    if (!hit) return NextResponse.json({ error: `학교를 찾을 수 없습니다: ${schoolFilter}` }, { status: 400 });
    targetSchoolId = hit.id;
  }

  // 명백한 테스트/더미 번호 제외 (모르는 사람에게 발송 방지)
  const BLOCK = new Set([
    "01012345678", "01000000000", "01011112222", "01022223333",
    "01011111111", "01099999999", "01012341234",
  ]);
  const students = users.filter(
    (u) =>
      (u.role ?? "student") === "student" &&
      (u.phone || "").replace(/[^0-9]/g, "").length >= 10 &&
      !BLOCK.has((u.phone || "").replace(/[^0-9]/g, "")) &&
      !reservedUserIds.has(u.id) &&
      (!targetSchoolId || u.schoolId === targetSchoolId)
  );

  // 학교별 집계
  const bySchool: Record<string, number> = {};
  for (const u of students) {
    const nm = schoolById.get(u.schoolId)?.name ?? u.schoolId;
    bySchool[nm] = (bySchool[nm] ?? 0) + 1;
  }
  const noPhone = users.filter(
    (u) => (u.role ?? "student") === "student" && (u.phone || "").replace(/[^0-9]/g, "").length < 10
  ).length;

  if (!doSend) {
    return NextResponse.json({
      dryRun: true,
      note: "미리보기입니다. 실제 발송은 &send=1. (학교별: &school=코드)",
      targets: students.length,
      reservedExcluded: reservedUserIds.size,
      exclDates,
      bySchool,
      noPhoneSkipped: noPhone,
      sampleMessage: buildMsg("홍길동"),
      preview: students.slice(0, 20).map((u) => ({
        name: u.name,
        school: schoolById.get(u.schoolId)?.name ?? u.schoolId,
        phone: u.phone,
      })),
    });
  }

  let sent = 0;
  const failures: { name: string; detail?: string }[] = [];
  for (const u of students) {
    const res = await sendInviteLms(u.phone!, "[부울경 멘토링] 토크콘서트 안내", buildMsg(u.name));
    if (res.ok) sent += 1;
    else failures.push({ name: u.name, detail: res.detail });
  }
  return NextResponse.json({
    dryRun: false,
    candidates: students.length,
    sent,
    failed: failures.length,
    failures: failures.slice(0, 30),
  });
}
