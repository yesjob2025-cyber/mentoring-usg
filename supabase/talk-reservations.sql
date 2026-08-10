-- ─────────────────────────────────────────────────────────────
-- 토크콘서트 시간대 예약 (날짜 → 희망 멘토링 → 시간, 1시간 단위)
-- Supabase SQL Editor 에서 1회 실행.
-- 규칙: 한 학생은 하루 최대 3개, 같은 시간대(19/20/21시) 중복 불가.
--       (userId, date, time) 유니크 인덱스로 시간대 중복을 DB 차원에서 차단.
-- ─────────────────────────────────────────────────────────────
create table if not exists talk_reservations (
  id text primary key,
  "userId" text not null,
  "userName" text not null,
  "studentNo" text,
  "schoolId" text not null,
  date text not null,
  time text not null,
  track text not null,
  topic text not null,
  "createdAt" text not null
);

create index if not exists talk_res_user_idx on talk_reservations ("userId");
create index if not exists talk_res_date_idx on talk_reservations (date);
create unique index if not exists talk_res_slot_unique
  on talk_reservations ("userId", date, time);

alter table talk_reservations disable row level security;
