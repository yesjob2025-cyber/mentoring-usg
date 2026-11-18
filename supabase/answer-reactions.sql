-- 답변 반응(카카오식) + 짧은 코멘트
create table if not exists answer_reactions (
  "id"         text primary key,
  "answerId"   text not null,
  "questionId" text not null,
  "userId"     text not null,
  "userName"   text,
  "emoji"      text not null,
  "comment"    text default '',
  "createdAt"  text not null
);
create index if not exists idx_reaction_answer on answer_reactions ("answerId");
create index if not exists idx_reaction_question on answer_reactions ("questionId");
