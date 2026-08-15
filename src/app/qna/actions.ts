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
  const list = await recommendMentors(refs, 30);
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
  authorPublic: boolean; // 작성자 이름 공개 여부 (질문 자체는 항상 공개)
}): Promise<AskResult> {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) {
    return { ok: false, error: "질문하려면 로그인이 필요합니다.", needAuth: true };
  }
  // 서버리스 인스턴스 간 데이터가 유실될 수 있어(데모 스토어), 세션 정보로 폴백.
  // (프로덕션에서 Supabase 로 전환하면 이 폴백은 사실상 필요 없음)
  const user =
    (await getUserById(session.uid)) ??
    ({
      id: session.uid,
      role: "student" as const,
      schoolId: session.schoolId,
      name: session.name ?? "학생",
      email: "",
      passwordHash: "",
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      questionCount: 0,
    });

  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 5) return { ok: false, error: "질문 제목을 5자 이상 입력해 주세요." };
  if (body.length < 10) return { ok: false, error: "질문 내용을 10자 이상 입력해 주세요." };

  const mentors = await getMentorsByIds(input.targetMentorIds);
  if (mentors.length === 0) return { ok: false, error: "질문할 멘토를 1명 이상 선택해 주세요." };
  if (mentors.length > 3) {
    return { ok: false, error: "멘토는 한 번에 최대 3명까지만 선택할 수 있습니다." };
  }

  const scope = mentors.length > 1 ? "broadcast" : "individual";
  const { question, tokens } = await createQuestion({
    author: user,
    scope,
    category: pickCategory(input.refs),
    themeRefs: input.refs,
    title,
    body,
    targetMentorIds: mentors.map((m) => m.id),
    isPublic: input.authorPublic, // isPublic 필드를 '이름 공개 여부'로 사용
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
