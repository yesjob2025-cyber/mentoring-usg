import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import { supabase, hasSupabase } from "@/lib/supabase";
import { newToken } from "@/lib/crypto";
import { sendInviteLms } from "@/lib/messaging";
import type { Mentor } from "@/lib/types";
import { TALK_LINEUP, CONCERT_TIME, CONTACT_PHONE, MANUAL_CONTACTS, weekdayKo } from "@/lib/talk-lineup";
import confirmedPool from "@/data/mentor-pool-confirmed.json";

// 토크콘서트 섭외 문자 발송 (USG에서 발송, 수락 링크는 mting.kr 로 연결)
//  /api/talk-invite?secret=<SEED_SECRET>            → 미리보기(dry-run)
//  /api/talk-invite?secret=<SEED_SECRET>&send=1     → 실제 발송
//  &force=1 : 이미 보낸 멘토도 재발송
const INVITE_BASE = "https://mting.kr/invite";
const COMMON = "01085536027"; // 공통번호(미승인) — 섭외에는 부적합
const TABLE = "talk_invites";

type PoolEntry = { name: string; phone?: string; removed?: boolean };

function inviteMessage(name: string, e: { date: string; slot: string }, url: string): string {
  const wd = weekdayKo(e.date);
  const md = e.date.slice(5).replace("-", "/");
  return (
    `[YESJOB 현직자 토크콘서트 멘토 섭외]\n` +
    `안녕하세요 ${name}님, 부울경 연합 현직자 멘토링 운영팀입니다.\n\n` +
    `${md}(${wd}) 온라인 토크콘서트 '${e.slot}' 분야 멘토로 모시고자 연락드립니다.\n` +
    `· 일시: ${md}(${wd}) ${CONCERT_TIME} (1시간 단위 진행)\n` +
    `· 방식: 온라인 화상(Zoom) — 직무 특강 + 자유 간담회\n\n` +
    `아래 링크에서 참여 가능 여부를 눌러주세요.\n${url}\n\n` +
    `문의: ${CONTACT_PHONE}`
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const doSend = url.searchParams.get("send") === "1";
  const force = url.searchParams.get("force") === "1";
  if (!hasSupabase) return NextResponse.json({ error: "DB 미연결" }, { status: 500 });

  // 실제 번호: JSON(mentor-pool-confirmed) 우선, 없으면 DB kakaoPhone(공통번호 제외)
  const jsonPhone = new Map<string, string>();
  for (const m of confirmedPool as PoolEntry[]) {
    if (!m.removed && m.phone) jsonPhone.set(m.name, m.phone);
  }
  const dbMentors = await all<Mentor>("mentors");
  const dbByName = new Map<string, { id: string; phone: string }[]>();
  for (const m of dbMentors) {
    const arr = dbByName.get(m.name) ?? [];
    arr.push({ id: m.id, phone: (m.kakaoPhone || "").replace(/[^0-9]/g, "") });
    dbByName.set(m.name, arr);
  }

  // 기존 초대(중복 발송 방지) + 테이블 존재 확인
  let tableReady = true;
  const existing = new Map<string, string>(); // "name|date|slot" → status
  {
    const { data, error } = await supabase().from(TABLE).select('"mentorName", date, slot, status').limit(10000);
    if (error) tableReady = false;
    else for (const r of (data ?? []) as { mentorName: string; date: string; slot: string; status: string }[])
      existing.set(`${r.mentorName}|${r.date}|${r.slot}`, r.status);
  }

  // 라인업 해석 (수동등록 > 명단 JSON > DB)
  const resolved = TALK_LINEUP.map((e) => {
    const manual = MANUAL_CONTACTS[e.name];
    const jp = jsonPhone.get(e.name);
    const db = dbByName.get(e.name) ?? [];
    let phone = manual ? manual.replace(/[^0-9]/g, "") : jp ? jp.replace(/[^0-9]/g, "") : "";
    let source = manual ? "수동" : jp ? "명단" : "";
    if (!phone && db.length === 1 && db[0].phone && db[0].phone !== COMMON) {
      phone = db[0].phone;
      source = "DB";
    }
    const ambiguous = !jp && db.length > 1;
    const status = existing.get(`${e.name}|${e.date}|${e.slot}`);
    return {
      date: e.date,
      slot: e.slot,
      name: e.name,
      mentorId: db[0]?.id,
      phone,
      source,
      matched: Boolean(phone),
      ambiguous,
      alreadyInvited: Boolean(status),
      status,
    };
  });

  const sendable = resolved.filter((r) => r.matched && (force || !r.alreadyInvited));
  const unmatched = resolved.filter((r) => !r.matched);

  if (!doSend) {
    return NextResponse.json({
      dryRun: true,
      note: "미리보기입니다. 실제 발송하려면 &send=1 을 붙이세요.",
      tableReady,
      tableHint: tableReady ? undefined : "talk_invites 테이블이 없습니다. supabase/talk-invites.sql 을 먼저 실행하세요.",
      total: resolved.length,
      willSend: sendable.length,
      alreadyInvited: resolved.filter((r) => r.alreadyInvited).length,
      unmatched: unmatched.map((u) => `${u.name}(${u.slot})${u.ambiguous ? " ·동명이인" : ""}`),
      preview: sendable.map((r) => ({ name: r.name, slot: r.slot, phone: r.phone, source: r.source })),
    });
  }

  if (!tableReady) {
    return NextResponse.json(
      { error: "talk_invites 테이블이 없습니다. supabase/talk-invites.sql 을 먼저 실행하세요." },
      { status: 400 }
    );
  }

  let sent = 0;
  const failures: { name: string; detail?: string }[] = [];
  for (const r of sendable) {
    const token = newToken();
    const link = `${INVITE_BASE}/${token}`;
    const row = {
      token,
      mentorId: r.mentorId ?? null,
      mentorName: r.name,
      phone: r.phone,
      date: r.date,
      slot: r.slot,
      status: "sent",
      createdAt: new Date().toISOString(),
    };
    const ins = await supabase().from(TABLE).insert(row);
    if (ins.error) {
      failures.push({ name: r.name, detail: `DB: ${ins.error.message}` });
      continue;
    }
    const res = await sendInviteLms(r.phone, "[YESJOB] 토크콘서트 멘토 섭외", inviteMessage(r.name, r, link));
    if (res.ok) sent += 1;
    else failures.push({ name: r.name, detail: res.detail });
  }

  return NextResponse.json({
    dryRun: false,
    candidates: sendable.length,
    sent,
    failed: failures.length,
    failures: failures.slice(0, 30),
    unmatched: unmatched.map((u) => `${u.name}(${u.slot})`),
  });
}
