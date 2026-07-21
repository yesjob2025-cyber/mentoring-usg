import type {
  Database,
  School,
  User,
  Question,
  Answer,
  TalkSession,
  PayoutRecord,
  ActivityEvent,
  TalkTrack,
} from "./types";
import { hashPassword } from "./crypto";
import { buildConfirmedMentors } from "./mentor-generator";
import { industries, jobs } from "./taxonomy";

const NOW = "2026-07-19T09:00:00.000Z";

// ── 학교 + 접속 코드 + 관리자 계정 (참여 12개교) ──────────
type SchoolDef = Omit<School, "adminPasswordHash" | "createdAt"> & { adminPassword: string };
const SCHOOL_DEFS: SchoolDef[] = [
  { id: "sch_ksu", name: "경성대학교", code: "KSU7602", region: "부산", adminUsername: "ksu-admin", adminPassword: "Ksu@2025!" },
  { id: "sch_kosin", name: "고신대학교", code: "KOSIN8355", region: "부산", adminUsername: "kosin-admin", adminPassword: "Kosin@2025!" },
  { id: "sch_tu", name: "동명대학교", code: "TU8995", region: "부산", adminUsername: "tu-admin", adminPassword: "Tu@2025!" },
  { id: "sch_dsu", name: "동서대학교", code: "DSU8938", region: "부산", adminUsername: "dsu-admin", adminPassword: "Dsu@2025!" },
  { id: "sch_dau", name: "동아대학교", code: "DAU4991", region: "부산", adminUsername: "dau-admin", adminPassword: "Dau@2025!" },
  { id: "sch_deu", name: "동의대학교", code: "DEU9317", region: "부산", adminUsername: "deu-admin", adminPassword: "Deu@2025!" },
  { id: "sch_pknu", name: "국립부경대학교", code: "PKNU4939", region: "부산", adminUsername: "pknu-admin", adminPassword: "Pknu@2025!" },
  { id: "sch_bufs", name: "부산외국어대학교", code: "BUFS1142", region: "부산", adminUsername: "bufs-admin", adminPassword: "Bufs@2025!" },
  { id: "sch_silla", name: "신라대학교", code: "SILLA5614", region: "부산", adminUsername: "silla-admin", adminPassword: "Silla@2025!" },
  { id: "sch_ysu", name: "영산대학교", code: "YSU9155", region: "경남", adminUsername: "ysu-admin", adminPassword: "Ysu@2025!" },
  { id: "sch_uou", name: "울산대학교", code: "UOU5206", region: "울산", adminUsername: "uou-admin", adminPassword: "Uou@2025!" },
  { id: "sch_inje", name: "인제대학교", code: "INJE4174", region: "경남", adminUsername: "inje-admin", adminPassword: "Inje@2025!" },
];

// ── 토크콘서트 일정 (제안서: 8/24~9/3, 9일 × 5회 = 45회) ──
const TRACKS: TalkTrack[] = ["IT분야", "공학", "인문상경", "보건복지", "공공"];
const TALK_DAYS: { date: string; topics: string[] }[] = [
  { date: "2026-08-24", topics: ["빅데이터", "화학/에너지", "인사총무", "경영기획", "영상디자인"] },
  { date: "2026-08-25", topics: ["인공지능", "제약/바이오", "재무회계", "식품영양", "방송PD"] },
  { date: "2026-08-26", topics: ["SW개발", "방산/항공", "영업/해외영업", "사회복지", "웹툰PD"] },
  { date: "2026-08-27", topics: ["게임개발", "건설/토목", "무역", "간호사", "일반행정"] },
  { date: "2026-08-28", topics: ["IT인프라", "시설설비", "물류관리", "심리상담", "발전"] },
  { date: "2026-08-31", topics: ["UX/UI", "스마트팩토리", "증권", "MD", "토목"] },
  { date: "2026-09-01", topics: ["정보보안", "구매", "은행", "매장관리", "사업기획"] },
  { date: "2026-09-02", topics: ["자동차", "안전관리", "마케팅", "승무원", "사업인증"] },
  { date: "2026-09-03", topics: ["반도체", "연구개발", "ESG", "시각디자인", "전기"] },
];
function buildTalkSessions(): TalkSession[] {
  const sessions: TalkSession[] = [];
  // 하루 5개 계열은 19:00~22:00 동안 동시 진행 → 회차별 시간 구분 없음
  TALK_DAYS.forEach((day) => {
    day.topics.forEach((topic, i) => {
      sessions.push({
        id: `talk_${day.date}_${i + 1}`,
        date: day.date,
        slot: i + 1,
        track: TRACKS[i],
        topic,
        capacity: 100,
        applicantUserIds: [],
        status: "planned", // 섭외 확정 전 (페이지만 우선)
      });
    });
  });
  return sessions;
}

export function buildSeed(): Database {
  const mentors = buildConfirmedMentors();

  const schools: School[] = SCHOOL_DEFS.map(({ adminPassword, ...s }) => ({
    ...s,
    adminPasswordHash: hashPassword(adminPassword),
    createdAt: NOW,
  }));

  // 데모 학생 (부산대 2명) — 로그인 테스트/대시보드 데이터용
  const users: User[] = [
    {
      id: "usr_demo1",
      role: "student",
      schoolId: "sch_pknu",
      name: "김민준",
      studentNo: "202012345",
      department: "기계공학과",
      phone: "010-1234-5678",
      email: "student1@pknu.ac.kr",
      passwordHash: hashPassword("test1234"),
      createdAt: NOW,
      lastActiveAt: NOW,
      questionCount: 2,
    },
    {
      id: "usr_demo2",
      role: "student",
      schoolId: "sch_pknu",
      name: "이서연",
      studentNo: "202154321",
      department: "경영학과",
      phone: "010-2222-3333",
      email: "student2@pknu.ac.kr",
      passwordHash: hashPassword("test1234"),
      createdAt: NOW,
      lastActiveAt: NOW,
      questionCount: 1,
    },
  ];

  // 데모 질문/답변
  const swMentors = mentors.filter((m) => m.tags.job.includes(jobs.find((j) => j.name === "SW개발")!.id));
  const hrMentors = mentors.filter((m) => m.tags.job.includes(jobs.find((j) => j.name === "인사총무")!.id));
  const semiIndustry = industries.find((i) => i.name === "반도체")!.id;

  const q1Targets = swMentors.slice(0, 3).map((m) => m.id);
  const q2Target = hrMentors.slice(0, 1).map((m) => m.id);

  const questions: Question[] = [
    {
      id: "q_demo1",
      authorUserId: "usr_demo1",
      authorName: "김민준",
      schoolId: "sch_pknu",
      scope: "broadcast",
      category: "job",
      themeRefs: { job: jobs.find((j) => j.name === "SW개발")!.id },
      title: "신입 SW개발자에게 가장 중요한 역량은 무엇인가요?",
      body: "전공 지식 외에 실무에서 가장 필요하다고 느끼신 역량이 궁금합니다. 여러 멘토님들의 관점을 듣고 싶어요.",
      targetMentorIds: q1Targets,
      isPublic: true,
      status: "answered",
      likes: 12,
      createdAt: "2026-07-15T02:10:00.000Z",
    },
    {
      id: "q_demo2",
      authorUserId: "usr_demo2",
      authorName: "이서연",
      schoolId: "sch_pknu",
      scope: "individual",
      category: "type",
      themeRefs: { type: "type-1" },
      title: "대기업 인사직무 취업 준비, 무엇부터 시작할까요?",
      body: "인사총무 직무로 대기업을 목표로 하고 있습니다. 학점/자격증/대외활동 중 우선순위를 조언해 주세요.",
      targetMentorIds: q2Target,
      isPublic: true,
      status: "open",
      likes: 5,
      createdAt: "2026-07-17T05:40:00.000Z",
    },
  ];

  const answers: Answer[] = [];
  const payouts: PayoutRecord[] = [];
  if (q1Targets.length >= 2) {
    const m0 = mentors.find((m) => m.id === q1Targets[0])!;
    const m1 = mentors.find((m) => m.id === q1Targets[1])!;
    answers.push({
      id: "a_demo1",
      questionId: "q_demo1",
      mentorId: m0.id,
      mentorName: m0.name,
      body: "코드를 '읽는' 능력과 협업 커뮤니케이션이 가장 중요합니다. 신입 때는 완성도보다 질문을 잘 정리해 물어보는 태도가 성장 속도를 좌우해요.",
      createdAt: "2026-07-15T08:00:00.000Z",
      likes: 9,
      adopted: true,
      payoutAmount: 30000,
    });
    answers.push({
      id: "a_demo2",
      questionId: "q_demo1",
      mentorId: m1.id,
      mentorName: m1.name,
      body: "Git 협업, 테스트 작성 습관, 그리고 로그를 읽고 문제를 좁혀가는 디버깅 역량을 추천합니다. 사이드 프로젝트 하나를 끝까지 배포해보는 경험이 큰 도움이 됩니다.",
      createdAt: "2026-07-16T01:20:00.000Z",
      likes: 6,
      adopted: false,
      payoutAmount: 0,
    });
    payouts.push({
      id: "pay_demo1",
      mentorId: m0.id,
      mentorName: m0.name,
      answerId: "a_demo1",
      questionId: "q_demo1",
      amount: 30000,
      reason: "우수 답변 채택 (차등 지급 1등급)",
      createdAt: "2026-07-16T09:00:00.000Z",
    });
  }

  const activity: ActivityEvent[] = [
    { id: "ev1", schoolId: "sch_pknu", userId: "usr_demo1", type: "signup", at: NOW },
    { id: "ev2", schoolId: "sch_pknu", userId: "usr_demo2", type: "signup", at: NOW },
    { id: "ev3", schoolId: "sch_pknu", userId: "usr_demo1", type: "question", at: "2026-07-15T02:10:00.000Z" },
    { id: "ev4", schoolId: "sch_pknu", userId: "usr_demo2", type: "question", at: "2026-07-17T05:40:00.000Z" },
  ];

  void semiIndustry;

  return {
    schools,
    users,
    mentors,
    questions,
    answers,
    answerTokens: [],
    payouts,
    activity,
    talkSessions: buildTalkSessions(),
    talkAttendance: [],
  };
}
