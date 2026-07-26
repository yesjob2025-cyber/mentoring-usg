import { NextResponse } from "next/server";
import { getAnswerToken, getQuestion, getMentorById } from "@/lib/repo";

// 답변 링크 진단: /api/diag/token?secret=<SEED_SECRET>&token=<토큰>
// 링크가 안 열릴 때 토큰/질문/멘토 존재 여부를 각각 확인해 원인 지목.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const token = url.searchParams.get("token") || "";
  if (!token) return NextResponse.json({ error: "token 파라미터 필요" }, { status: 400 });

  const t = await getAnswerToken(token);
  if (!t) {
    return NextResponse.json({
      token,
      found: false,
      diagnosis: "토큰이 DB에 없음 → 화면: '유효하지 않은 답변 링크'. (질문 삭제됨/미저장/다른 환경에서 생성 가능)",
    });
  }
  const [question, mentor] = await Promise.all([
    getQuestion(t.questionId),
    getMentorById(t.mentorId),
  ]);
  return NextResponse.json({
    token,
    found: true,
    used: t.used,
    questionId: t.questionId,
    mentorId: t.mentorId,
    questionExists: !!question,
    questionTitle: question?.title ?? null,
    mentorExists: !!mentor,
    mentorName: mentor?.name ?? null,
    mentorActive: mentor?.active ?? null,
    diagnosis: !question
      ? "질문이 삭제/누락됨 → 화면: '질문 정보를 찾을 수 없습니다'."
      : !mentor
        ? "멘토가 삭제/누락됨(재시드로 ID 변경 등) → 화면: '질문 정보를 찾을 수 없습니다'."
        : t.used
          ? "정상. 다만 이미 답변 제출됨(used=true) → '이미 답변을 제출한 질문입니다'."
          : "정상. 링크가 열려야 함.",
  });
}
