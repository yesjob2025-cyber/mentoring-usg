"use server";

import { getSession } from "@/lib/session";
import {
  recommendMentors,
  getUserById,
  getMentorsByIds,
  createQuestion,
} from "@/lib/repo";
import { toPublicMentor, type RecommendedMentor } from "@/lib/view";
import { notifyMentorNewQuestion } from "@/lib/messaging";
import type { QuestionThemeRefs, ThemeKind } from "@/lib/types";

export async function recommendAction(refs: QuestionThemeRefs): Promise<RecommendedMentor[]> {
  const list = recommendMentors(refs, 30);
  return list.map((r) => ({
    mentor: toPublicMentor(r.mentor),
    score: r.score,
    matched: r.matched,
  }));
}

export type AskResult =
  | { ok: true; questionId: string; sent: number }
  | { ok: false; error: string; needAuth?: boolean };

function pickCategory(refs: QuestionThemeRefs): ThemeKind | "mentor" {
  const order: ThemeKind[] = ["company", "job", "industry", "type", "major"];
  for (const k of order) if (refs[k]) return k;
  return "mentor";
}

export async function askAction(input: {
  refs: QuestionThemeRefs;
  targetMentorIds: string[];
  title: string;
  body: string;
  isPublic: boolean;
}): Promise<AskResult> {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) {
    return { ok: false, error: "질문하려면 로그인이 필요합니다.", needAuth: true };
  }
  const user = getUserById(session.uid);
  if (!user) return { ok: false, error: "사용자 정보를 찾을 수 없습니다.", needAuth: true };

  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 5) return { ok: false, error: "질문 제목을 5자 이상 입력해 주세요." };
  if (body.length < 10) return { ok: false, error: "질문 내용을 10자 이상 입력해 주세요." };

  const mentors = getMentorsByIds(input.targetMentorIds);
  if (mentors.length === 0) return { ok: false, error: "질문할 멘토를 1명 이상 선택해 주세요." };

  const scope = mentors.length > 1 ? "broadcast" : "individual";
  const { question, tokens } = createQuestion({
    author: user,
    scope,
    category: pickCategory(input.refs),
    themeRefs: input.refs,
    title,
    body,
    targetMentorIds: mentors.map((m) => m.id),
    isPublic: input.isPublic,
  });

  // 각 멘토에게 카카오 알림톡(답변 링크) 발송
  const tokenByMentor = new Map(tokens.map((t) => [t.mentorId, t.token]));
  let sent = 0;
  await Promise.all(
    mentors.map(async (m) => {
      const token = tokenByMentor.get(m.id);
      if (!token) return;
      const res = await notifyMentorNewQuestion(m, question, token);
      if (res.ok) sent += 1;
    })
  );

  return { ok: true, questionId: question.id, sent };
}
