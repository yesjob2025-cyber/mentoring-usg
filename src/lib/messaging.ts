import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import type { Mentor, Question, Answer, User } from "./types";

// ─────────────────────────────────────────────────────────────
// 메시지 발송 어댑터 (provider = KAKAO_PROVIDER)
//  - stub    : 콘솔 로그(기본, 키 없이 구동)
//  - solapi  : 솔라피 문자(SMS/LMS) — HMAC 인증, IP 제한 없음 → 서버리스에 적합 (추천)
//  - sms     : 알리고 문자(SMS/LMS) — 발신번호+API키, 단 발송 IP 등록 필요(서버리스 부적합)
//  - aligo   : 알리고 카카오 알림톡 — 채널·발신키·승인 템플릿 필요
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
  tplCode: string; // 승인 템플릿 코드/ID
  subject: string;
  message: string;
  button?: { name: string; url: string };
  variables?: Record<string, string>; // 알림톡 템플릿 변수(#{...})
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

async function sendViaSolapi(p: AlimtalkPayload): Promise<SendResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER || process.env.ALIGO_SENDER;
  if (!apiKey || !apiSecret || !from) {
    return {
      ok: false,
      provider: "solapi",
      to: p.to,
      detail: "솔라피 환경변수(SOLAPI_API_KEY/SOLAPI_API_SECRET/SOLAPI_SENDER) 누락",
    };
  }
  // 링크 버튼은 문자 본문 하단에 URL 로 첨부
  const text = p.button ? `${p.message}\n\n▶ ${p.button.name}\n${p.button.url}` : p.message;

  // HMAC-SHA256 인증 (IP 제한 없음)
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  const body = {
    message: {
      to: p.to.replace(/[^0-9]/g, ""),
      from: from.replace(/[^0-9]/g, ""),
      text,
      type: "LMS", // 링크 포함 장문 → LMS
      subject: p.subject.slice(0, 40),
    },
  };

  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      statusCode?: string;
      statusMessage?: string;
      errorMessage?: string;
    };
    // 솔라피: statusCode "2000" = 정상 접수
    if (res.ok && json.statusCode === "2000") {
      return { ok: true, provider: "solapi", to: p.to, detail: json.statusMessage };
    }
    return {
      ok: false,
      provider: "solapi",
      to: p.to,
      detail: json.errorMessage || json.statusMessage || `발송 실패(${res.status})`,
    };
  } catch (e) {
    return { ok: false, provider: "solapi", to: p.to, detail: (e as Error).message };
  }
}

async function sendViaSolapiAta(p: AlimtalkPayload): Promise<SendResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER || process.env.ALIGO_SENDER;
  const pfId = process.env.SOLAPI_PFID;
  if (!apiKey || !apiSecret || !from || !pfId || !p.tplCode) {
    return {
      ok: false,
      provider: "solapi_ata",
      to: p.to,
      detail: "알림톡 환경변수(SOLAPI_PFID/템플릿ID/SOLAPI_SENDER) 누락",
    };
  }
  // 알림톡 실패 시 문자(LMS)로 자동 대체할 본문
  const smsFallback = p.button ? `${p.message}\n\n▶ ${p.button.name}\n${p.button.url}` : p.message;

  const date = new Date().toISOString();
  const salt = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  const body = {
    message: {
      to: p.to.replace(/[^0-9]/g, ""),
      from: from.replace(/[^0-9]/g, ""),
      text: smsFallback, // disableSms:false → 알림톡 불가 시 이 내용으로 문자 대체
      kakaoOptions: {
        pfId,
        templateId: p.tplCode,
        variables: p.variables || {},
        disableSms: false,
      },
    },
  };

  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      statusCode?: string;
      statusMessage?: string;
      errorMessage?: string;
    };
    if (res.ok && json.statusCode === "2000") {
      return { ok: true, provider: "solapi_ata", to: p.to, detail: json.statusMessage };
    }
    return {
      ok: false,
      provider: "solapi_ata",
      to: p.to,
      detail: json.errorMessage || json.statusMessage || `발송 실패(${res.status})`,
    };
  } catch (e) {
    return { ok: false, provider: "solapi_ata", to: p.to, detail: (e as Error).message };
  }
}

async function sendViaAligoSms(p: AlimtalkPayload): Promise<SendResult> {
  const key = process.env.ALIGO_API_KEY || process.env.KAKAO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;
  if (!key || !userId || !sender) {
    return {
      ok: false,
      provider: "sms",
      to: p.to,
      detail: "알리고 문자 환경변수(ALIGO_API_KEY/ALIGO_USER_ID/ALIGO_SENDER) 누락",
    };
  }
  // 링크 버튼은 문자에선 본문 하단에 URL 로 첨부
  const msg = p.button ? `${p.message}\n\n▶ ${p.button.name}\n${p.button.url}` : p.message;

  const form = new URLSearchParams();
  form.set("key", key);
  form.set("user_id", userId);
  form.set("sender", sender.replace(/[^0-9]/g, ""));
  form.set("receiver", p.to.replace(/[^0-9]/g, ""));
  form.set("msg", msg);
  form.set("title", p.subject.slice(0, 40));
  form.set("msg_type", "LMS"); // 90byte 초과 장문
  form.set("testmode_yn", (process.env.ALIGO_TESTMODE || "N").toUpperCase());

  try {
    const res = await fetch("https://apis.aligo.in/send/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const json = (await res.json()) as { result_code?: number | string; message?: string };
    if (String(json.result_code) === "1") return { ok: true, provider: "sms", to: p.to, detail: json.message };
    return { ok: false, provider: "sms", to: p.to, detail: json.message || "문자 발송 실패" };
  } catch (e) {
    return { ok: false, provider: "sms", to: p.to, detail: (e as Error).message };
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
  // 테스트 리다이렉트: 수신번호만 테스트 번호로 교체 (알림톡 템플릿 일치 위해 본문은 그대로)
  const payload: AlimtalkPayload = TEST_REDIRECT ? { ...p, to: TEST_REDIRECT } : p;
  if (PROVIDER === "solapi_ata" || PROVIDER === "ata") return sendViaSolapiAta(payload);
  if (PROVIDER === "solapi") return sendViaSolapi(payload);
  if (PROVIDER === "aligo" || PROVIDER === "alimtalk") return sendViaAligo(payload);
  if (PROVIDER === "sms" || PROVIDER === "aligo_sms") return sendViaAligoSms(payload);
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
    subject: "[부울경 멘토링] 새 질문이 도착했습니다",
    message:
      `${mentor.name} 멘토님, 새로운 질문이 도착했습니다.\n\n` +
      `▶ ${question.title}\n\n` +
      `아래 버튼을 눌러 답변을 작성해 주세요. 답변은 학생에게 카카오톡으로 전달됩니다.`,
    button: { name: "답변 작성하기", url },
    // 알림톡 템플릿 A 변수 (등록한 변수명과 일치해야 함)
    variables: {
      "#{멘토명}": mentor.name,
      "#{질문제목}": question.title,
      "#{토큰}": answerToken,
    },
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
    subject: "[부울경 멘토링] 멘토 답변이 등록되었습니다",
    message:
      `${student.name}님, 질문에 대한 멘토 답변이 등록되었습니다.\n\n` +
      `▶ ${question.title}\n` +
      `${answer.mentorName} 멘토: ${preview}\n\n` +
      `사이트에서 전체 답변을 확인하세요.`,
    button: { name: "답변 확인하기", url },
    // 알림톡 템플릿 B 변수 (등록한 변수명과 일치해야 함)
    variables: {
      "#{학생명}": student.name,
      "#{질문제목}": question.title,
      "#{멘토명}": answer.mentorName,
      "#{질문번호}": question.id,
    },
  });
}

export const messagingProvider = PROVIDER;

/** 진단용 테스트 발송 — 현재 provider 로 간단한 메시지를 보내고 원본 결과 반환 */
export async function sendTestMessage(
  to: string
): Promise<SendResult & { env: Record<string, boolean | string> }> {
  const result = await send({
    to,
    recvName: "테스트",
    tplCode: process.env.KAKAO_TPL_NEW_QUESTION || "test",
    subject: "[YESJOB] 발송 테스트",
    message: "부울경 멘토링 발송 테스트 메시지입니다. 이 문자가 오면 연동 성공입니다.",
    button: { name: "답변 작성하기", url: `${SITE_URL}/answer/testtoken` },
    // 알림톡(solapi_ata) 테스트용: 템플릿 A 변수
    variables: {
      "#{멘토명}": "테스트",
      "#{질문제목}": "발송 테스트 질문입니다",
      "#{토큰}": "testtoken",
    },
  });
  return {
    ...result,
    env: {
      KAKAO_PROVIDER: process.env.KAKAO_PROVIDER || "(unset)",
      SOLAPI_API_KEY: !!process.env.SOLAPI_API_KEY,
      SOLAPI_API_SECRET: !!process.env.SOLAPI_API_SECRET,
      SOLAPI_SENDER: !!(process.env.SOLAPI_SENDER || process.env.ALIGO_SENDER),
      SOLAPI_PFID: !!process.env.SOLAPI_PFID,
      KAKAO_TPL_NEW_QUESTION: !!process.env.KAKAO_TPL_NEW_QUESTION,
      KAKAO_TPL_NEW_ANSWER: !!process.env.KAKAO_TPL_NEW_ANSWER,
      TEST_REDIRECT_PHONE: !!process.env.TEST_REDIRECT_PHONE,
    },
  };
}
