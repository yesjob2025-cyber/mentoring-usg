-- 정산 지급액/지급완료 컬럼 추가 (기존 settlement_confirmations 테이블에)
alter table settlement_confirmations add column if not exists "payAmount" int;
alter table settlement_confirmations add column if not exists "paidAt" text;
