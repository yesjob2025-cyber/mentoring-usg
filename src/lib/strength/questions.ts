import type { LikertItem, SituationItem } from "./types";
import { WEAPONS } from "./weapons";

/**
 * 1부: 무기별 행동 문항 24개(리커트 5점).
 * "나는 어떤 사람인가"가 아니라 **"실제로 그렇게 해봤는가"**를 묻는다.
 */
const LIKERT_TEXT: Record<string, string> = {
  "plan-trend": "새로 유행하는 콘텐츠나 가게를 보면 '왜 뜨는지' 이유를 따져보는 편이다.",
  "plan-data": "무언가를 결정할 때 관련된 숫자(가격·횟수·비율)를 먼저 찾아본다.",
  "plan-priority": "할 일이 몰리면 목록을 만들어 순서를 정한 뒤에 시작한다.",
  "plan-concept": "같은 내용이라도 제목·표현을 바꿔 더 눈에 띄게 만들어 본 적이 있다.",

  "act-charge": "아이디어가 떠오르면 완성도가 낮아도 일단 초안부터 만들어 본다.",
  "act-field": "궁금한 것이 있으면 검색보다 직접 가보거나 물어보는 쪽을 택한다.",
  "act-reject": "부탁이나 제안을 거절당해도 방법을 바꿔 다시 시도해 본 적이 있다.",
  "act-pace": "팀이 늘어질 때 진행 상황을 챙기며 마감까지 끌고 간 적이 있다.",

  "admin-risk": "서류나 숫자를 볼 때 틀리거나 빠진 부분이 눈에 잘 띈다.",
  "admin-archive": "자료는 나중에 찾기 쉽도록 이름·폴더 규칙을 정해두는 편이다.",
  "admin-schedule": "마감일을 기준으로 거꾸로 계산해 중간 일정을 잡는다.",
  "admin-checklist": "반복되는 일은 매번 기억하기보다 목록·절차로 만들어 둔다.",

  "comm-translate": "어려운 내용을 상대가 아는 예시로 바꿔 설명하는 편이다.",
  "comm-mediate": "다툼이 생기면 양쪽 이야기를 끝까지 듣고 정리하는 역할을 맡는다.",
  "comm-rapport": "처음 만난 사람과도 어색한 시간을 짧게 끝내는 편이다.",
  "comm-memory": "상대가 지나가듯 한 말이나 취향을 기억했다가 다음에 언급한다.",

  "solve-poker": "예상치 못한 문제가 터져도 목소리나 표정이 크게 흔들리지 않는다.",
  "solve-planb": "계획을 세울 때 안 될 경우의 대비책도 함께 생각해 둔다.",
  "solve-rapid": "문제가 생기면 나중에 처리하기보다 그 자리에서 먼저 움직인다.",
  "solve-resource": "혼자 안 되는 일은 도와줄 사람이나 방법을 찾아 연결한다.",

  "improve-diet": "같은 일을 두 번 하고 있다는 걸 알아채면 방법부터 바꾼다.",
  "improve-digital": "반복 작업은 엑셀 함수·양식·앱 같은 도구로 바꾸려고 한다.",
  "improve-flow": "사람이 몰리거나 헤매는 지점을 보면 배치·순서를 바꾸고 싶어진다.",
  "improve-breaker": "'원래 그렇게 해요'라는 답을 들으면 이유를 다시 물어보는 편이다.",
};

/** 같은 유형 문항이 연달아 나오지 않도록 섞어서 배열 */
export const LIKERT_ITEMS: LikertItem[] = (() => {
  const byOrder = [0, 1, 2, 3].flatMap((slot) =>
    ["plan", "act", "admin", "comm", "solve", "improve"].map((typeId) => {
      const list = WEAPONS.filter((w) => w.typeId === typeId);
      return list[slot];
    }),
  );
  return byOrder.map((w, i) => ({
    id: `L${String(i + 1).padStart(2, "0")}`,
    weaponId: w.id,
    typeId: w.typeId,
    text: LIKERT_TEXT[w.id],
  }));
})();

export const LIKERT_LABELS = [
  { value: 1, label: "전혀 아니다", short: "전혀" },
  { value: 2, label: "아닌 편", short: "아님" },
  { value: 3, label: "보통", short: "보통" },
  { value: 4, label: "그런 편", short: "그럼" },
  { value: 5, label: "매우 그렇다", short: "매우" },
];

/**
 * 2부: 상황형 문항 6개.
 * 리커트만 쓰면 모두 '4점'을 주기 쉬우므로, 하나만 고르게 해 유형 간 우선순위를 가른다.
 */
export const SITUATION_ITEMS: SituationItem[] = [
  {
    id: "S1",
    situation: "팀 프로젝트 첫 회의. 주제만 정해졌고 다들 막막해한다. 나는?",
    options: [
      { typeId: "plan", text: "무엇부터 정해야 하는지 기준(축)을 정리해 제안한다" },
      { typeId: "act", text: "일단 초안이나 샘플을 만들어 다음 회의에 들고 온다" },
      { typeId: "admin", text: "역할·마감·자료 공유 규칙부터 정하자고 한다" },
      { typeId: "comm", text: "팀원들이 뭘 하고 싶은지 한 명씩 들어보며 분위기를 잡는다" },
      { typeId: "solve", text: "안 될 경우를 가정해 가능한 범위부터 확인한다" },
      { typeId: "improve", text: "작년 자료를 보고 비효율적인 부분부터 걷어내자고 한다" },
    ],
  },
  {
    id: "S2",
    situation: "행사 당일, 예상 인원의 2배가 몰려 현장이 엉켰다. 나는?",
    options: [
      { typeId: "solve", text: "즉시 현장에 들어가 대기·안내부터 정리한다" },
      { typeId: "act", text: "인력을 더 부르고 몸으로 뛰며 처리량을 올린다" },
      { typeId: "improve", text: "줄 서는 동선을 바꿔 병목 자체를 없앤다" },
      { typeId: "comm", text: "대기 고객에게 상황을 설명하며 불만을 가라앉힌다" },
      { typeId: "admin", text: "남은 물량·시간을 계산해 안전하게 마감 가능한 선을 잡는다" },
      { typeId: "plan", text: "우선 처리 기준(사전신청자 우선 등)을 정해 공지한다" },
    ],
  },
  {
    id: "S3",
    situation: "아르바이트 마감 중 현금 시재가 3만 원 비었다. 나는?",
    options: [
      { typeId: "admin", text: "영수증과 기록을 처음부터 대조해 원인을 찾는다" },
      { typeId: "solve", text: "우선 점장에게 보고하고 오늘 가능한 조치를 정한다" },
      { typeId: "improve", text: "반복되지 않도록 확인 절차를 바꾸자고 제안한다" },
      { typeId: "plan", text: "최근 오차 이력을 모아 패턴이 있는지 본다" },
      { typeId: "comm", text: "함께 근무한 동료와 상황을 맞춰보며 확인한다" },
      { typeId: "act", text: "남아서라도 다시 세어 끝을 본다" },
    ],
  },
  {
    id: "S4",
    situation: "팀원이 마감을 계속 어겨 프로젝트가 밀리고 있다. 나는?",
    options: [
      { typeId: "comm", text: "따로 만나 이유를 듣고 조정한다" },
      { typeId: "act", text: "내가 일부를 가져와서라도 진도를 낸다" },
      { typeId: "admin", text: "중간 마감을 잘게 나눠 관리 체계를 만든다" },
      { typeId: "plan", text: "업무량을 다시 계산해 배분을 조정한다" },
      { typeId: "solve", text: "대신할 사람이나 대체 방법을 확보한다" },
      { typeId: "improve", text: "그 업무 자체를 없애거나 간소화할 방법을 찾는다" },
    ],
  },
  {
    id: "S5",
    situation: "인턴 첫 주, 전임자가 남긴 자료가 뒤죽박죽이다. 나는?",
    options: [
      { typeId: "admin", text: "분류 규칙을 정해 정리부터 한다" },
      { typeId: "improve", text: "지금 안 쓰는 자료는 걷어내고 필요한 것만 남긴다" },
      { typeId: "plan", text: "업무 흐름을 먼저 파악해 무엇이 핵심 자료인지 판단한다" },
      { typeId: "comm", text: "전임자·동료에게 직접 물어 맥락을 채운다" },
      { typeId: "act", text: "일단 눈앞의 업무부터 처리하면서 익힌다" },
      { typeId: "solve", text: "급한 요청이 오면 그때그때 찾아 대응한다" },
    ],
  },
  {
    id: "S6",
    situation: "신제품 홍보를 맡았는데 예산이 거의 없다. 나는?",
    options: [
      { typeId: "plan", text: "타깃과 메시지를 좁혀 한 곳에 집중한다" },
      { typeId: "improve", text: "이미 있는 채널·자산을 재활용할 방법을 찾는다" },
      { typeId: "solve", text: "예산 없이 가능한 대안(제휴·바터)을 설계한다" },
      { typeId: "comm", text: "관계자·인플루언서에게 직접 부탁해 노출을 얻는다" },
      { typeId: "act", text: "발로 뛰며 오프라인 홍보를 직접 돌린다" },
      { typeId: "admin", text: "집행 가능한 항목과 규정을 확인해 낭비를 막는다" },
    ],
  },
];
