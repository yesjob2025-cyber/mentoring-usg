import { NextResponse } from "next/server";
import { all } from "@/lib/data";
import type { AnswerToken, Mentor } from "@/lib/types";

// 특정 멘토들이 질문을 받았는지 확인
//  /api/diag/mentor-questions?secret=<SEED_SECRET>&names=남성민,유성화,이승훈,조서현
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized (SEED_SECRET 필요)" }, { status: 401 });
  }
  const names = (url.searchParams.get("names") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const [tokens, mentors] = await Promise.all([
    all<AnswerToken>("answerTokens"),
    all<Mentor>("mentors"),
  ]);
  const byName = new Map(mentors.map((m) => [m.name, m]));

  const recv = new Map<string, number>();
  const ans = new Map<string, number>();
  for (const t of tokens) {
    recv.set(t.mentorId, (recv.get(t.mentorId) ?? 0) + 1);
    if (t.used) ans.set(t.mentorId, (ans.get(t.mentorId) ?? 0) + 1);
  }

  const targets = names.length ? names : mentors.map((m) => m.name);
  const result = targets.map((name) => {
    const m = byName.get(name);
    if (!m) {
      return {
        name,
        inPool: false,
        received: 0,
        answered: 0,
        hasQuestion: false,
        note: "현재 명단에 없음(삭제됨). 질문 기록 확인 불가.",
      };
    }
    const received = recv.get(m.id) ?? 0;
    return {
      name,
      inPool: true,
      mentorId: m.id,
      received,
      answered: ans.get(m.id) ?? 0,
      hasQuestion: received > 0,
    };
  });

  return NextResponse.json({
    checked: targets.length,
    withQuestions: result.filter((r) => r.received > 0).map((r) => r.name),
    detail: result,
  });
}
