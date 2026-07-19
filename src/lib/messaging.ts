import "server-only";
import type { Mentor, Question, Answer, User } from "./types";

// ─────────────────────────────────────────────────────────────
// 카카오 알림톡 발송 어댑터
//  - provider = "stub"  : 콘솔 로그(기본, 키 없이 구동)
//  - provider = "aligo" : 알리고 카카오 알림톡 API 연동
//  실제 발송에는 알리고 apikey/userid/senderkey 와 승인된 템플릿이 필요합니다.
// ─────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const PROVIDER = (process.env.KAKAO_PROVIDER || "stub").toLowerCase();
// 테스트용: 값이 있으면 모든 알림톡을 이 번호로 보냄(멘토/학생 무관).
// 여러 멘토에게 질문해도 전부 이 번호로 도착 → 실발송 테스트에 사용.
const TEST_REDIRECT = (process.env.TEST_REDIRECT_PHONE || "").replace(/[^0-9]/g, "");

export interface SendResult {
  ok: boolean;
  provider: string;
  to: string;
  detail?: string;
}

interface AlimtalkPayload {
  to: string; // 수신 번호
  recvName: string;
  tplCode: string; // 승인 템플릿 코드
  subject: string;
  message: string;
  button?: { name: string; url: string };
}

async function sendViaAligo(p: AlimtalkPayload): Promise<SendResult> {
  const apikey = process.env.ALIGO_API_KEY || process.env.KAKAO_API_KEY;
  const userid = process.env.ALIGO_USER_ID;
  const senderkey = process.env.KAKAO_SENDER_KEY;
  const sender = process.env.ALIGO_SENDER; // 발신 전화번호(사전 등록)
  if (!apikey || !userid || !senderkey || !sender) {
    return {
      ok: false,
      provider: "aligo",
      to: p.to,
      detail: "알리고 환경변수(ALIGO_API_KEY/ALIGO_USER_ID/KAKAO_SENDER_KEY/ALIGO_SENDER) 누락",
    };
  }

  const form = new URLSearchParams();
  form.set("apikey", apikey);
  form.set("userid", userid);
  form.set("senderkey", senderkey);
  form.set("tpl_code", p.tplCode);
  form.set("sender", sender);
  form.set("receiver_1", p.to.replace(/[^0-9]/g, ""));
  form.set("recvname_1", p.recvName);
  form.set("subject_1", p.subject);
  form.set("message_1", p.message);
  if (p.button) {
    form.set(
      "button_1",
      JSON.stringify({
        button: [{ name: p.button.name, linkType: "WL", linkTypeName: "웹링크", linkMo: p.button.url, linkPc: p.button.url }],
      })
    );
  }

  try {
    const res = await fetch("https://kakaoapi.aligo.in/akv10/alimtalk/send/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const json = (await res.json()) as { code?: number; message?: string };
    // 알리고: code 0 == 성공
    if (json.code === 0) return { ok: true, provider: "aligo", to: p.to, detail: json.message };
    return { ok: false, provider: "aligo", to: p.to, detail: json.message || "발송 실패" };
  } catch (e) {
    return { ok: false, provider: "aligo", to: p.to, detail: (e as Error).message };
  }
}

function sendViaStub(p: AlimtalkPayload): SendResult {
  // 개발/데모: 실제 발송 없이 콘솔에 출력
  // eslint-disable-next-line no-console
  console.log(
    `\n[카카오 알림톡·STUB] → ${p.recvName}(${p.to})\n  [${p.tplCode}] ${p.subject}\n  ${p.message}` +
      (p.button ? `\n  [버튼] ${p.button.name}: ${p.button.url}` : "") +
      "\n"
  );
  return { ok: true, provider: "stub", to: p.to, detail: "console" };
}

async function send(p: AlimtalkPayload): Promise<SendResult> {
  // 테스트 리다이렉트: 수신번호만 테스트 번호로 교체 (메시지 본문은 템플릿 일치 위해 그대로)
  const payload: AlimtalkPayload = TEST_REDIRECT ? { ...p, to: TEST_REDIRECT } : p;
  if (PROVIDER === "aligo") return sendViaAligo(payload);
  return sendViaStub(payload);
}

// ── 고수준 발송 함수 ─────────────────────────────────────

/** 질문 접수 → 멘토에게 "새 질문 도착 + 답변 링크" 알림톡 */
export async function notifyMentorNewQuestion(
  mentor: Mentor,
  question: Question,
  answerToken: string
): Promise<SendResult> {
  const url = `${SITE_URL}/answer/${answerToken}`;
  return send({
    to: mentor.kakaoPhone || "010-0000-0000",
    recvName: mentor.name,
    tplCode: process.env.KAKAO_TPL_NEW_QUESTION || "mentor_new_question",
    subject: "[YESJOB 멘토링] 새 질문이 도착했습니다",
    message:
      `${mentor.name} 멘토님, 새로운 질문이 도착했습니다.\n\n` +
      `▶ ${question.title}\n\n` +
      `아래 버튼을 눌러 답변을 작성해 주세요. 답변은 학생에게 카카오톡으로 전달됩니다.`,
    button: { name: "답변 작성하기", url },
  });
}

/** 답변 등록 → 학생에게 "답변 도착" 알림톡 */
export async function notifyStudentNewAnswer(
  student: Pick<User, "name" | "phone">,
  question: Question,
  answer: Answer
): Promise<SendResult> {
  const url = `${SITE_URL}/questions/${question.id}`;
  const preview = answer.body.length > 40 ? answer.body.slice(0, 40) + "…" : answer.body;
  return send({
    to: student.phone || "010-0000-0000",
    recvName: student.name,
    tplCode: process.env.KAKAO_TPL_NEW_ANSWER || "student_new_answer",
    subject: "[YESJOB 멘토링] 멘토 답변이 등록되었습니다",
    message:
      `${student.name}님, 질문에 대한 멘토 답변이 등록되었습니다.\n\n` +
      `▶ ${question.title}\n` +
      `${answer.mentorName} 멘토: ${preview}\n\n` +
      `사이트에서 전체 답변을 확인하세요.`,
    button: { name: "답변 확인하기", url },
  });
}

export const messagingProvider = PROVIDER;
