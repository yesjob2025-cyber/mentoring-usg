-- ─────────────────────────────────────────────────────────────
-- YESJOB 멘토링 플랫폼 — Supabase(PostgreSQL) 스키마
-- Supabase 프로젝트 → SQL Editor 에 붙여넣고 실행하세요.
-- 컬럼명은 앱의 TS 타입과 1:1 (따옴표 camelCase). 날짜는 ISO 문자열(text).
-- 접근은 서버(Service Role Key)에서만 하므로 RLS 는 활성화 + 정책 없음(=차단).
-- ─────────────────────────────────────────────────────────────

create table if not exists schools (
  id text primary key,
  name text not null,
  code text not null,
  region text,
  "adminUsername" text not null,
  "adminPasswordHash" text not null,
  "createdAt" text not null
);
create unique index if not exists schools_code_idx on schools (upper(code));

create table if not exists users (
  id text primary key,
  role text not null,
  "schoolId" text not null,
  name text not null,
  "studentNo" text,
  department text,
  grade text,
  gender text,
  phone text,
  email text not null,
  "passwordHash" text not null,
  "createdAt" text not null,
  "lastActiveAt" text not null,
  "questionCount" int not null default 0
);
create unique index if not exists users_email_idx on users (lower(email));
create index if not exists users_school_idx on users ("schoolId");

create table if not exists mentors (
  id text primary key,
  name text not null,
  company text,
  title text,
  years int,
  education text,
  summary text,
  career jsonb not null default '[]',
  "mentoringAreas" jsonb not null default '[]',
  tags jsonb not null default '{}',
  "kakaoPhone" text,
  "answerCount" int not null default 0,
  "avgResponseHours" int not null default 0,
  "participationScore" int not null default 0,
  active boolean not null default true,
  featured boolean not null default false
);

create table if not exists questions (
  id text primary key,
  "authorUserId" text not null,
  "authorName" text not null,
  "schoolId" text not null,
  scope text not null,
  category text not null,
  "themeRefs" jsonb not null default '{}',
  title text not null,
  body text not null,
  "targetMentorIds" jsonb not null default '[]',
  "isPublic" boolean not null default true,
  status text not null default 'open',
  likes int not null default 0,
  "createdAt" text not null
);
create index if not exists questions_school_idx on questions ("schoolId");
create index if not exists questions_author_idx on questions ("authorUserId");

create table if not exists answers (
  id text primary key,
  "questionId" text not null,
  "mentorId" text not null,
  "mentorName" text not null,
  body text not null,
  "createdAt" text not null,
  likes int not null default 0,
  adopted boolean not null default false,
  "payoutAmount" int not null default 0
);
create index if not exists answers_question_idx on answers ("questionId");

create table if not exists answer_tokens (
  token text primary key,
  "questionId" text not null,
  "mentorId" text not null,
  used boolean not null default false,
  "createdAt" text not null
);

create table if not exists payouts (
  id text primary key,
  "mentorId" text not null,
  "mentorName" text not null,
  "answerId" text not null,
  "questionId" text not null,
  amount int not null default 0,
  reason text,
  "createdAt" text not null
);

create table if not exists activity (
  id text primary key,
  "schoolId" text not null,
  "userId" text not null,
  type text not null,
  at text not null
);
create index if not exists activity_school_idx on activity ("schoolId");

create table if not exists talk_sessions (
  id text primary key,
  date text not null,
  slot int not null,
  track text not null,
  topic text not null,
  "mentorName" text,
  company text,
  "zoomUrl" text,
  capacity int not null default 100,
  "applicantUserIds" jsonb not null default '[]',
  status text not null default 'planned'
);

-- RLS: 이 앱은 서버(env의 비밀 키)로만 Supabase 에 접근하고, 어떤 키도 브라우저에
-- 노출하지 않으므로 RLS 를 끈다. (신규 sb_secret_ 키의 RLS 우회 이슈 회피 + 설정 단순화)
-- 향후 더 엄격히 하려면 RLS 활성화 + 서비스롤 정책을 추가할 것.
alter table schools        disable row level security;
alter table users          disable row level security;
alter table mentors        disable row level security;
alter table questions      disable row level security;
alter table answers        disable row level security;
alter table answer_tokens  disable row level security;
alter table payouts        disable row level security;
alter table activity       disable row level security;
alter table talk_sessions  disable row level security;
