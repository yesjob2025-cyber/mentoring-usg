import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { listSchools } from "@/lib/repo";
import { TALK_SCHEDULE } from "@/lib/talk-schedule";
import type { TalkReservation, School } from "@/lib/types";

// 토크콘서트 예약 집계
//  /api/talk-stats?secret=<SEED_SECRET>
//   - totalReservations: 중복 포함(예약 건수, 한 명이 3개 예약 → 3)
//   - uniqueStudents: 중복 제외(1건 이상 예약한 학생 수)
//   - 현재 일정에 존재하는 (날짜|분야) 예약만 유효로 집계, 옛 일정 예약은 제외
const VALID_SLOT = new Set(
  TALK_SCHEDULE.flatMap((d) => d.slots.map((s) => `${d.date}|${s.topic}`))
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }

  const [reservations, schools] = await Promise.all([
    all<TalkReservation>("talkReservations"),
    listSchools(),
  ]);
  const schoolName = new Map<string, string>(
    schools.map((s: School) => [s.id, s.name])
  );

  const valid = reservations.filter((r) => VALID_SLOT.has(`${r.date}|${r.topic}`));
  const staleExcluded = reservations.length - valid.length;

  const uniq = new Set(valid.map((r) => r.userId));

  // 날짜별 집계
  const byDate: Record<string, { reservations: number; students: number }> = {};
  const byDateUsers: Record<string, Set<string>> = {};
  for (const r of valid) {
    byDate[r.date] = byDate[r.date] || { reservations: 0, students: 0 };
    byDate[r.date].reservations += 1;
    (byDateUsers[r.date] = byDateUsers[r.date] || new Set()).add(r.userId);
  }
  for (const d of Object.keys(byDate)) byDate[d].students = byDateUsers[d].size;

  // 학교별 (중복 제외 학생 수)
  const bySchoolUsers: Record<string, Set<string>> = {};
  for (const r of valid) {
    const nm = schoolName.get(r.schoolId) || r.schoolId;
    (bySchoolUsers[nm] = bySchoolUsers[nm] || new Set()).add(r.userId);
  }
  const bySchool: Record<string, number> = {};
  for (const nm of Object.keys(bySchoolUsers)) bySchool[nm] = bySchoolUsers[nm].size;

  return NextResponse.json({
    totalReservations: valid.length, // 중복 포함
    uniqueStudents: uniq.size, // 중복 제외
    avgPerStudent: uniq.size ? Number((valid.length / uniq.size).toFixed(2)) : 0,
    staleExcluded,
    byDate: Object.fromEntries(Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))),
    uniqueStudentsBySchool: Object.fromEntries(
      Object.entries(bySchool).sort(([, a], [, b]) => b - a)
    ),
  });
}
