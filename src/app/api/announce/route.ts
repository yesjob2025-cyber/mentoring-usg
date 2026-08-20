import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { listSchools } from "@/lib/repo";
import { sendInviteLms } from "@/lib/messaging";
import type { User, School } from "@/lib/types";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const doSend = url.searchParams.get("send") === "1";
  const schoolFilter = (url.searchParams.get("school") || "").trim();

  const [users, schools] = await Promise.all([all<User>("users"), listSchools()]);
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

  const students = users.filter(
    (u) =>
      (u.role ?? "student") === "student" &&
      (u.phone || "").replace(/[^0-9]/g, "").length >= 10 &&
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
      bySchool,
      noPhoneSkipped: noPhone,
      sampleMessage: announceMessage("홍길동"),
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
    const res = await sendInviteLms(u.phone!, "[부울경 멘토링] 토크콘서트 안내", announceMessage(u.name));
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
