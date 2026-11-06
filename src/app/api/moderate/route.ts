import { NextResponse } from "next/server";
import { all, insert, patch } from "@/lib/data";
import { getQuestion, deleteQuestion } from "@/lib/repo";
import { newId } from "@/lib/crypto";
import type { Answer } from "@/lib/types";

// 질문 모더레이션: 테스트/부적절 질문 삭제, 운영사무국 안내 답변 등록
//  삭제:   /api/moderate?secret=<SEED_SECRET>&action=delete&id=q_xxx            (미리보기)
//          /api/moderate?secret=<SEED_SECRET>&action=delete&id=q_xxx&commit=1   (실제 삭제)
//  운영답변:/api/moderate?secret=<SEED_SECRET>&action=opsanswer&id=q_xxx&commit=1
const OPS_NAME = "운영사무국";
const OPS_ANSWER =
  `안녕하세요, 부울경 연합 현직자 멘토링 운영사무국입니다.\n\n` +
  `본 멘토링은 플랫폼 내 질문·답변(Q&A)을 통해 진행됩니다. 멘토님과의 개별 대면 만남이나 ` +
  `개인 연락처·개인정보 요청은 멘토 보호와 개인정보 보호를 위해 제공해 드리기 어려운 점 양해 부탁드립니다.\n\n` +
  `직무·취업과 관련해 궁금하신 점은 질문으로 남겨주시면, 해당 분야 현직자 멘토가 성심껏 답변드리겠습니다. 감사합니다.`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const action = (url.searchParams.get("action") || "").trim();
  const id = (url.searchParams.get("id") || "").trim();
  const commit = url.searchParams.get("commit") === "1";
  if (!id) return NextResponse.json({ error: "id(questionId) 필요" }, { status: 400 });

  const question = await getQuestion(id);
  if (!question) return NextResponse.json({ error: `질문을 찾을 수 없습니다: ${id}` }, { status: 404 });

  const answers = await all<Answer>("answers");
  const qAnswers = answers.filter((a) => a.questionId === id);

  if (action === "delete") {
    if (!commit) {
      return NextResponse.json({
        dryRun: true,
        note: "실제 삭제는 &commit=1. 질문·답변·토큰이 함께 삭제됩니다.",
        questionId: id,
        title: question.title,
        answersToDelete: qAnswers.length,
      });
    }
    await deleteQuestion(id);
    return NextResponse.json({ deleted: true, questionId: id, title: question.title, removedAnswers: qAnswers.length });
  }

  if (action === "opsanswer") {
    // 이미 운영사무국 답변이 있으면 중복 생성 방지
    const existing = qAnswers.find((a) => a.mentorName === OPS_NAME);
    if (existing) {
      return NextResponse.json({ ok: true, alreadyExists: true, questionId: id, title: question.title });
    }
    if (!commit) {
      return NextResponse.json({
        dryRun: true,
        note: "실제 등록은 &commit=1.",
        questionId: id,
        title: question.title,
        willPostAs: OPS_NAME,
        message: OPS_ANSWER,
      });
    }
    const answer: Answer = {
      id: newId("a"),
      questionId: id,
      mentorId: "ops",
      mentorName: OPS_NAME,
      body: OPS_ANSWER,
      createdAt: new Date().toISOString(),
      likes: 0,
      adopted: false,
      payoutAmount: 0,
    };
    await insert("answers", answer as unknown as Record<string, unknown>);
    await patch("questions", "id", id, { status: "answered" });
    return NextResponse.json({ posted: true, questionId: id, title: question.title, as: OPS_NAME });
  }

  return NextResponse.json({ error: "action 은 delete 또는 opsanswer" }, { status: 400 });
}
