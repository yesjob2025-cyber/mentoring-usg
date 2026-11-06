-- 재배정(대신 답변) 토큰 표시용 컬럼
alter table answer_tokens add column if not exists "reassigned" boolean default false;
alter table answer_tokens add column if not exists "reassignedFrom" text;
