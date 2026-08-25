-- 멘토 최초 입사연도(연차 자동 계산용) 컬럼 추가. Supabase SQL Editor에서 1회 실행.
alter table mentors add column if not exists "startYear" int;
