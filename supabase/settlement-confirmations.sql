-- 멘토별 질의응답 답변 정산 확인 테이블
create table if not exists settlement_confirmations (
  "token"       text primary key,
  "mentorId"    text not null,
  "mentorName"  text not null,
  "company"     text default '',
  "phone"       text default '',
  "asOf"        text not null,
  "answerCount" int  not null default 0,
  "confirmedAt" text,
  "createdAt"   text not null
);
create index if not exists idx_settlement_mentor on settlement_confirmations ("mentorId");
