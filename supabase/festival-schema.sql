-- ─────────────────────────────────────────────────────────────
-- 2026 김해 JOB FESTIVAL (jobfestival.co.kr) — Supabase 스키마
-- Supabase 프로젝트 → SQL Editor 에 붙여넣고 실행하세요.
-- 컬럼명은 앱의 TS 타입과 1:1 (따옴표 camelCase). 날짜는 ISO 문자열(text).
-- 배열/객체 필드는 jsonb 로 저장합니다.
-- 실행 후 /api/seed?secret=<SEED_SECRET>&only=festival 로 부스 데이터를 채웁니다.
-- ─────────────────────────────────────────────────────────────

-- 기업관 ------------------------------------------------------
create table if not exists fest_companies (
  id text primary key,
  "boothNo" text not null,
  name text not null,
  industry text not null,
  scale text not null,
  location text not null,
  employees text not null,
  "logoText" text not null,
  summary text not null,
  description text not null,
  products jsonb not null default '[]',
  welfare jsonb not null default '[]',
  homepage text,
  positions jsonb not null default '[]',
  "onSiteInterview" boolean not null default true,
  courses jsonb not null default '[]',
  tags jsonb not null default '[]',
  featured boolean not null default false,
  "order" int not null default 0
);

-- 직무관 ------------------------------------------------------
create table if not exists fest_jobs (
  id text primary key,
  "boothNo" text not null,
  name text not null,
  category text not null,
  summary text not null,
  description text not null,
  tasks jsonb not null default '[]',
  skills jsonb not null default '[]',
  certificates jsonb not null default '[]',
  "careerPath" jsonb not null default '[]',
  "salaryRange" text not null,
  outlook text not null,
  "mentorTitle" text not null,
  programs jsonb not null default '[]',
  "relatedCompanyIds" jsonb not null default '[]',
  tags jsonb not null default '[]',
  "order" int not null default 0
);

-- 홍보관 ------------------------------------------------------
create table if not exists fest_promos (
  id text primary key,
  "boothNo" text not null,
  name text not null,
  category text not null,
  summary text not null,
  description text not null,
  services jsonb not null default '[]',
  targets jsonb not null default '[]',
  contact text,
  homepage text,
  tags jsonb not null default '[]',
  "order" int not null default 0
);

-- 부대행사 ----------------------------------------------------
create table if not exists fest_events (
  id text primary key,
  "boothNo" text not null,
  title text not null,
  category text not null,
  place text not null,
  summary text not null,
  description text not null,
  "timeSlots" jsonb not null default '[]',
  capacity int not null default 0,
  "needReserve" boolean not null default false,
  notes jsonb not null default '[]',
  courses jsonb not null default '[]',
  tags jsonb not null default '[]',
  "order" int not null default 0
);

-- 참가자(사전등록 · 입장 QR) ----------------------------------
create table if not exists fest_visitors (
  id text primary key,
  code text not null,
  token text not null,
  name text not null,
  phone text not null,
  email text,
  "visitorType" text not null,
  school text,
  major text,
  grade text,
  course text not null,
  "interestJobs" jsonb not null default '[]',
  "interestIndustries" jsonb not null default '[]',
  "agreePrivacy" boolean not null default false,
  "agreeMarketing" boolean not null default false,
  "registeredAt" text not null,
  "enteredAt" text,
  "exitedAt" text
);
create unique index if not exists fest_visitors_token_idx on fest_visitors (token);
create unique index if not exists fest_visitors_code_idx on fest_visitors (code);
create index if not exists fest_visitors_phone_idx on fest_visitors (phone);

-- 입퇴장 · 부스 체크인 ----------------------------------------
create table if not exists fest_checkins (
  id text primary key,
  "visitorId" text not null,
  "visitorName" text not null,
  zone text not null,
  "boothId" text not null,
  "boothName" text not null,
  at text not null,
  "staffNote" text
);
create index if not exists fest_checkins_visitor_idx on fest_checkins ("visitorId");
create index if not exists fest_checkins_booth_idx on fest_checkins ("boothId");

-- 입사지원 ----------------------------------------------------
create table if not exists fest_applications (
  id text primary key,
  "visitorId" text not null,
  "companyId" text not null,
  "companyName" text not null,
  "positionId" text not null,
  "positionTitle" text not null,
  name text not null,
  phone text not null,
  email text not null,
  school text,
  major text,
  grade text,
  "careerType" text not null,
  intro text not null,
  strength text not null,
  "portfolioUrl" text,
  status text not null default 'submitted',
  "appliedAt" text not null,
  memo text
);
create index if not exists fest_applications_visitor_idx on fest_applications ("visitorId");
create index if not exists fest_applications_company_idx on fest_applications ("companyId");

-- 현장 면접 슬롯 / 확정 일정 ----------------------------------
create table if not exists fest_interview_slots (
  id text primary key,
  "companyId" text not null,
  time text not null,
  "durationMin" int not null default 25,
  capacity int not null default 2,
  place text not null
);
create index if not exists fest_slots_company_idx on fest_interview_slots ("companyId");

create table if not exists fest_interviews (
  id text primary key,
  "applicationId" text not null,
  "slotId" text not null,
  "companyId" text not null,
  "companyName" text not null,
  "visitorId" text not null,
  "visitorName" text not null,
  time text not null,
  place text not null,
  status text not null default 'confirmed',
  "createdAt" text not null
);
create index if not exists fest_interviews_visitor_idx on fest_interviews ("visitorId");
create index if not exists fest_interviews_slot_idx on fest_interviews ("slotId");

-- 스탬프 완주 / 만족도 ----------------------------------------
create table if not exists fest_stamps (
  id text primary key,
  "visitorId" text not null,
  code text not null,
  "awardedAt" text not null,
  redeemed boolean not null default false
);
create unique index if not exists fest_stamps_code_idx on fest_stamps (code);

create table if not exists fest_surveys (
  id text primary key,
  "visitorId" text not null,
  overall int not null,
  booth int not null,
  program int not null,
  operation int not null,
  recommend int not null,
  helpful jsonb not null default '[]',
  comment text,
  "submittedAt" text not null
);
create unique index if not exists fest_surveys_visitor_idx on fest_surveys ("visitorId");

-- RLS: 서버(Service Role Key)에서만 접근하며 브라우저에 키를 노출하지 않는다.
alter table fest_companies       disable row level security;
alter table fest_jobs            disable row level security;
alter table fest_promos          disable row level security;
alter table fest_events          disable row level security;
alter table fest_visitors        disable row level security;
alter table fest_checkins        disable row level security;
alter table fest_applications    disable row level security;
alter table fest_interview_slots disable row level security;
alter table fest_interviews      disable row level security;
alter table fest_stamps          disable row level security;
alter table fest_surveys         disable row level security;
