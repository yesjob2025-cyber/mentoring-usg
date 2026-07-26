import type { Mentor, MentorTags } from "./types";
import { industries, jobs, companyTypes, majors, companies } from "./taxonomy";
import rawPool from "@/data/mentor-pool.raw.json";
import confirmedPool from "@/data/mentor-pool-confirmed.json";

// ─────────────────────────────────────────────────────────────
// 멘토풀 원본(제안서 별첨)에서 가상 프로필/태그를 생성
//  - org 텍스트의 키워드로 산업/직무/유형/전공을 추론
//  - 나머지 프로필 필드는 시드 기반 결정적(deterministic) 목업
// ─────────────────────────────────────────────────────────────

type RawEntry = { name: string; org: string };

const nameToId = (arr: { id: string; name: string }[]) =>
  new Map(arr.map((x) => [x.name, x.id]));

const indId = nameToId(industries);
const jobId = nameToId(jobs);
const typeId = nameToId(companyTypes);
const majId = nameToId(majors);
const coId = nameToId(companies);

function id(map: Map<string, string>, name: string): string | undefined {
  return map.get(name);
}

// 문자열 해시 → 결정적 PRNG (mulberry32)
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function prng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rnd: () => number, arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const rint = (rnd: () => number, min: number, max: number) =>
  Math.floor(rnd() * (max - min + 1)) + min;

// 키워드 → 이름 매칭 규칙
const has = (s: string, kws: string[]) => kws.some((k) => s.includes(k));

// ── 기업유형 추론 ─────────────────────────────────────────
function detectType(org: string): string {
  const publicKw = [
    "공사",
    "공단",
    "공기업",
    "진흥원",
    "재단",
    "위원회",
    "국립",
    "시립",
    "광역시",
    "경찰",
    "소방",
    "환경부",
    "식품의약",
    "안전처",
    "건강보험",
    "보증기금",
    "관리원",
    "품질원",
    "연구원",
    "발전",
    "수력원자력",
    "한전",
    "코레일",
    "철도",
    "항만공사",
    "관리공사",
    "저작권위원회",
    "실용화재단",
    "내일재단",
    "청년",
    "NGO",
    "WIPO",
    "UN",
  ];
  const foreignKw = [
    "코리아",
    "마이크로소프트",
    "듀폰",
    "볼보",
    "닛산",
    "GM",
    "ASML",
    "P&G",
    "IBM",
    "모건스탠리",
    "아라마크",
    "로슈",
    "MSD",
    "존슨앤드존슨",
    "에드워드",
    "아트라스콥코",
    "어플라이드머티어리얼즈",
    "KLA",
    "EXAIL",
    "SGS",
    "덴소",
  ];
  const bigKw = [
    "삼성",
    "LG",
    "SK",
    "현대",
    "기아",
    "한화",
    "롯데",
    "CJ",
    "포스코",
    "네이버",
    "카카오",
    "농협",
    "GS",
    "두산",
    "대우",
    "금호",
    "HD한국조선",
    "HD현대",
    "KT",
    "BNK",
    "IBK",
    "KB",
    "신세계",
    "아모레퍼시픽",
    "이랜드",
    "KAI",
    "LIG",
  ];
  const startupKw = ["창업", "스타트업"];

  if (has(org, publicKw)) return typeId.get("공기업/공공기관")!;
  if (has(org, foreignKw)) return typeId.get("외국계")!;
  if (has(org, bigKw)) return typeId.get("대기업")!;
  if (has(org, startupKw)) return typeId.get("스타트업")!;
  // 대표/이사 직함이면 중소기업, 그 외 중견기업으로 분산
  if (has(org, ["대표", "회장", "원장", "이사"])) return typeId.get("중소기업")!;
  return typeId.get("중견기업")!;
}

// ── 산업 추론 ─────────────────────────────────────────────
const INDUSTRY_RULES: [string, string[]][] = [
  ["자동차", ["자동차", "모비스", "르노", "닛산", "덴소", "성우하이텍", "화신", "서연이화", "현대로템", "글로비스", "인프라코어배터리", "F&I", "DRB", "코렌스", "만도"]],
  ["반도체", ["반도체", "하이닉스", "파운드리", "메모리", "ASML", "KLA", "어플라이드머티어리얼즈", "비전세미콘", "TEST기술", "PKG", "ETCH", "설비기술"]],
  ["전기전자", ["전자", "전기", "일렉트릭", "디스플레이", "삼성전기", "옵트론텍", "효성전기", "말타니", "LS", "웨이브일렉트로닉스"]],
  ["IT서비스", ["CNS", "SDS", "KTDS", "케이티디에스", "소프트", "소프트웨어", "SW", "IT", "클라우드", "프로그래", "개발", "데이터", "딥러닝", "메타버스", "XR", "네이버", "카카오", "당근", "토스", "IT사업", "전산", "네트워크"]],
  ["항공/방산", ["항공", "KAI", "에어로스페이스", "LIG", "방산", "국방기술품질원", "세아항공", "우주", "한화시스템", "정밀기계"]],
  ["제약바이오", ["제약", "바이오", "바이넥스", "대웅", "알보젠", "녹십자", "유바이오", "신약", "약품", "제약바", "스파크바이오", "젬백스", "펜타스", "프록사이", "MSD", "로슈"]],
  ["식품", ["식품", "어묵", "주조", "빙그레", "삼양식품", "풀무원", "웰푸드", "제일제당", "야쿠르트", "칠성", "코카콜라", "샐러드", "F&B", "프레시웨이", "골든듀", "성경식품"]],
  ["물류/유통", ["물류", "로지스", "유통", "대한통운", "글로벌로지스", "홈쇼핑", "리테일", "올리브영", "다이소", "쇼핑", "커머스", "무신사", "29cm", "MD", "BGF", "A-land", "에스에스지", "SSG", "쿠팡", "해운", "컨테이너", "세일즈"]],
  ["보건의료", ["병원", "의료원", "간호", "치과", "물리치료", "작업치료", "의료정보", "원무", "재활", "한방병원", "임플란트", "치기공", "헬스케어", "리더스헬스"]],
  ["에너지", ["발전", "에너지", "석유", "가스", "한전", "수력원자력", "도시가스", "정유", "SK에너지", "KDN", "석유공사", "에너지솔루션", "화학", "케미칼", "석유화학"]],
  ["금융", ["은행", "증권", "보험", "손해사정", "캐피탈", "금융", "저축은행", "신협", "자산관리공사", "보증기금", "투자", "생명", "카드", "BNK", "IBK", "KB", "하나", "우리은행", "기업은행"]],
  ["방송/미디어", ["방송", "KNN", "미디어", "영화", "PD", "아나운서", "기자", "게임", "웹툰", "영상", "콘텐츠", "엔터테인먼트", "네오위즈", "넥슨", "더블유게임즈", "트리노드", "게임즈", "합창단", "교향악단"]],
  ["디자인", ["디자인", "주얼리", "스타일리스트", "VMD", "그래픽", "브랜딩디자"]],
  ["건설/교통", ["건설", "건축", "토목", "엔지니어링", "교통공사", "철도", "코레일", "국토", "도로공사", "항만", "조선", "중공업", "E&T", "플랜트", "BIM", "택지", "토건", "하우시스", "미포", "해양", "조선해양", "설계사"]],
];
function detectIndustries(org: string): string[] {
  const out: string[] = [];
  for (const [name, kws] of INDUSTRY_RULES) {
    if (has(org, kws)) {
      const i = indId.get(name);
      if (i) out.push(i);
    }
  }
  return out.length ? [...new Set(out)].slice(0, 2) : [];
}

// ── 직무 추론 ─────────────────────────────────────────────
const JOB_RULES: [string, string[]][] = [
  ["인사총무", ["인사", "총무", "HR", "HRD", "HRM", "인재", "노무", "채용", "피플", "People", "인력운영", "CHO", "제조인사"]],
  ["마케팅", ["마케팅", "홍보", "브랜딩", "브랜드기획"]],
  ["회계세무", ["회계", "세무", "재무", "원가", "경리", "재경", "ERP운영"]],
  ["사업기획", ["기획", "경영기획", "전략", "사업기획", "경영지원", "경영관리", "경영진단", "기획조정", "경영/", "투자개발"]],
  ["영업", ["영업", "세일", "영업관리", "영업총괄", "영업추진"]],
  ["SW개발", ["개발", "프로그래", "소프트웨어", "웹개발", "앱", "게임 콘텐츠 기획", "웹 프로", "IT개발"]],
  ["IT인프라", ["인프라", "네트워크", "클라우드", "전산", "IT운영", "데이터센터", "시스템", "기술지원", "IT사업관리", "전력설비운영"]],
  ["UI/UX", ["UX", "UI", "웹디자", "UX/UI"]],
  ["AI/데이터", ["AI", "빅데이터", "딥러닝", "데이터분석", "데이터서비스", "데이터 관리", "데이터관리"]],
  ["기계설계", ["기계", "기구설계", "기장설계", "기계설계", "기계기술", "기계설비"]],
  ["전기설계", ["전장설계", "전기설계", "전기직", "전기기술", "PC설계", "전산설계"]],
  ["생산관리", ["생산", "생산관리", "제조", "차량생기", "생기", "양산", "면생산", "생산기술"]],
  ["품질관리", ["품질", "QC", "QA", "품질보증", "품질관리", "감항", "품질기획"]],
  ["구매", ["구매", "SCM", "자재", "상생협력"]],
  ["연구개발", ["연구개발", "R&D", "연구원", "선임연구원", "제품개발", "소재연구", "선행기술", "연구소", "기술이전"]],
  ["안전관리", ["안전", "환경안전", "PSM", "재난안전", "산업안전", "안전관리", "안전보건", "안전환경"]],
  ["금융상담", ["대출", "보증", "손해사정", "정산", "보험가입", "이행전담", "인수합병", "매각자문", "선박금융", "기업금융", "개인금융", "개인고객"]],
  ["전문의료", ["간호", "치과위생", "물리치료", "작업치료", "의료정보", "원무", "진단검사", "보건의료정보", "치과기공", "치기공", "응급구조"]],
  ["헬스케어", ["헬스케어", "건강관리", "피트니스", "재활의학", "스포츠 건강"]],
  ["콘텐츠기획", ["콘텐츠", "PD", "웹툰", "영상사업", "무대감독", "프로듀서", "쇼호스트", "문화산업", "콘덴츠", "한류콘텐츠", "게임 콘텐츠"]],
  ["디자인", ["디자인", "디자이너", "시각디자", "제품디자", "VMD", "그래픽"]],
  ["매장관리", ["매장", "점포", "슈퍼바이저", "지배인", "객실", "식음", "호텔외식", "매장관리", "신규점포"]],
  ["사회복지", ["사회복지", "복지", "요양", "재가서비스", "아동보호", "노인복지", "상담심리"]],
  ["브랜드", ["브랜드 디자", "브랜드매니저", "브랜드 매니저", "브랜드디자이너", "브랜드 디자이너"]],
  ["고객서비스", ["승무원", "객실승무", "CS", "관제", "쇼핑호스트", "고객전략", "고객서비스", "VTS"]],
  ["컨설팅", ["컨설팅", "컨설턴트", "자문", "기업컨설팅"]],
  ["해외영업", ["해외영업", "글로벌세일", "수출", "해외 Part", "중동팀", "미주영업", "글로벌본부", "해운수출"]],
  ["행정지원", ["행정", "사무영업", "사무지원", "관리팀", "관리부", "업무지원", "행정지원", "행정원"]],
];
function detectJobs(org: string): string[] {
  const out: string[] = [];
  for (const [name, kws] of JOB_RULES) {
    if (has(org, kws)) {
      const j = jobId.get(name);
      if (j) out.push(j);
    }
  }
  // 폴백: 명시적 직무 키워드가 없을 때 직함/조직으로 유추
  if (out.length === 0) {
    let fb: string | undefined;
    if (has(org, ["대표", "회장", "총괄", "원장", "이사", "대표이사", "실장", "본부장"])) fb = "사업기획";
    else if (has(org, ["교사", "유치원", "어린이집", "보육", "요양"])) fb = "사회복지";
    else if (has(org, ["경찰", "소방", "구조사", "지구대"])) fb = "행정지원";
    else if (has(org, ["교수", "강사", "협회", "진흥회", "센터"])) fb = "컨설팅";
    if (fb) {
      const j = jobId.get(fb);
      if (j) out.push(j);
    }
  }
  return [...new Set(out)].slice(0, 2);
}

// ── 전공 계열 추론 (직무/산업 기반) ───────────────────────
function detectMajors(jobIds: string[], indIds: string[]): string[] {
  const jn = new Set(jobIds.map((x) => jobs.find((j) => j.id === x)?.name));
  const inn = new Set(indIds.map((x) => industries.find((j) => j.id === x)?.name));
  const out = new Set<string>();
  const add = (name: string) => {
    const m = majId.get(name);
    if (m) out.add(m);
  };
  if ([...jn].some((n) => n && ["기계설계", "전기설계", "생산관리", "품질관리", "연구개발", "안전관리", "구매"].includes(n)))
    add("이공계열");
  if ([...jn].some((n) => n && ["SW개발", "IT인프라", "AI/데이터", "UI/UX"].includes(n))) add("IT·컴퓨터");
  if ([...jn].some((n) => n && ["인사총무", "마케팅", "회계세무", "사업기획", "영업", "금융상담", "컨설팅", "해외영업", "행정지원", "브랜드"].includes(n)))
    add("인문·상경계열");
  if ([...jn].some((n) => n && ["전문의료", "헬스케어", "사회복지"].includes(n))) add("보건·의료복지");
  if ([...jn].some((n) => n && ["디자인", "콘텐츠기획"].includes(n))) add("디자인·예술");
  if ([...inn].some((n) => n && ["방송/미디어", "디자인"].includes(n))) add("디자인·예술");
  if (out.size === 0) add("기타");
  return [...out];
}

// ── 소속 기업 매칭 (taxonomy companies) ───────────────────
function detectCompanies(org: string): string[] {
  const out: string[] = [];
  for (const c of companies) {
    // 표기 흔들림 보정
    const variants = [c.name, c.name.replace(/\s/g, "")];
    if (variants.some((v) => org.replace(/\s/g, "").includes(v.replace(/\s/g, "")))) {
      out.push(c.id);
    }
  }
  return [...new Set(out)];
}

const REGION_UNIS = [
  "부산대",
  "부경대",
  "동아대",
  "경성대",
  "동의대",
  "부산외대",
  "경남대",
  "인제대",
  "동명대",
  "신라대",
  "울산대",
  "한국해양대",
];

const DEGREES = ["학사", "학사", "학사", "석사"];

// org 안의 "(XX 졸업선배)" 추출
function extractAlmaMater(org: string): string | undefined {
  const m = org.match(/\(([^)]*졸업선배)\)/);
  if (m) return m[1].replace("졸업선배", "").trim();
  return undefined;
}

// 표시용 회사명: org에서 부서/직급/괄호주석 제거한 앞부분
function displayCompany(org: string): string {
  if (!org) return "비공개 기업";
  let s = org.split("/")[0];
  s = s.replace(/\([^)]*\)/g, "").trim();
  // 부서/직급 토큰 앞까지
  const cut = s.split(/\s+/);
  return cut.slice(0, 3).join(" ").trim() || org;
}

function titleFrom(org: string, jobIds: string[]): string {
  // org 끝 토큰이 직급/부서면 사용, 아니면 직무명
  const t = org.replace(/\([^)]*\)/g, "").split("/").pop()?.trim();
  if (t && t.length <= 12 && /(팀장|부장|과장|대리|차장|사원|주임|선임|책임|대표|이사|매니저|연구원|프로|파트장|계장|수석|전임|실장|본부장|총괄|지배인|원장|감독)/.test(t))
    return t;
  const jn = jobIds.map((x) => jobs.find((j) => j.id === x)?.name).filter(Boolean);
  return (jn[0] as string) || "현직자";
}

function maskedPhone(rnd: () => number): string {
  const a = rint(rnd, 1000, 9999);
  return `010-****-${a}`;
}

export function buildMentors(): Mentor[] {
  const pool = rawPool as RawEntry[];
  const mentors: Mentor[] = [];
  pool.forEach((entry, idx) => {
    const org = entry.org || "";
    const seed = hash(entry.name + "|" + org + "|" + idx);
    const rnd = prng(seed);

    const indIds = detectIndustries(org);
    const jIds = detectJobs(org);
    const tId = detectType(org);
    const mIds = detectMajors(jIds, indIds);
    const cIds = detectCompanies(org);

    const tags: MentorTags = {
      industry: indIds,
      job: jIds,
      company: cIds,
      type: [tId],
      major: mIds,
    };

    const company = displayCompany(org);
    const title = titleFrom(org, jIds);
    const years = rint(rnd, 2, 19);
    const alma = extractAlmaMater(org) || pick(rnd, REGION_UNIS);
    const degree = pick(rnd, DEGREES);
    const jobNames = jIds.map((x) => jobs.find((j) => j.id === x)?.name).filter(Boolean) as string[];
    const indNames = indIds.map((x) => industries.find((j) => j.id === x)?.name).filter(Boolean) as string[];

    const areaPool = [
      ...jobNames.map((j) => `${j} 실무`),
      ...indNames.map((i) => `${i} 산업 이해`),
      "직무 역량 개발",
      "채용 전형 준비",
      "커리어 로드맵",
      "자기소개서·면접",
    ];
    const mentoringAreas = [...new Set(areaPool)].slice(0, 4);

    const career = [
      `${company} ${title} 재직 (${years}년차)`,
      jobNames[0] ? `${jobNames[0]} 담당 실무 수행` : "현장 실무 수행",
      `${alma} ${degree}`,
    ];

    mentors.push({
      id: `m-${idx + 1}`,
      name: entry.name,
      company,
      title,
      years,
      education: `${alma} ${degree}`,
      summary: `${company} · ${title} · ${years}년차 현직 멘토`,
      career,
      mentoringAreas,
      tags,
      kakaoPhone: maskedPhone(rnd),
      answerCount: rint(rnd, 0, 42),
      avgResponseHours: rint(rnd, 2, 36),
      participationScore: rint(rnd, 55, 99),
      active: true,
      featured: rnd() < 0.08, // 약 8% 대표 멘토(토크콘서트 후보)
    });
  });
  return mentors;
}

// ─────────────────────────────────────────────────────────────
// 확정 멘토 풀 (별첨 확정본) — 실제 소속/학력/주요업무 반영
//  - 태그는 소속·전공·주요업무 텍스트로 추론
//  - 주요업무가 3개 미만이면 직무(부서) 특성에 맞는 공통 문구로 3줄까지 보강
//  - 전화번호는 확정 전까지 공통 번호 사용
// ─────────────────────────────────────────────────────────────
type ConfirmedEntry = {
  name: string;
  org: string;
  edu?: string;
  duties?: string[];
  // 수기 큐레이션 태그 (기업·소속·주요업무 기반). 있으면 키워드 추론보다 우선.
  ind?: string[];
  job?: string[];
  type?: string;
  // 승인 여부 + 실제 전화번호. 승인 멘토는 실번호, 미승인은 공통번호로 발송.
  approved?: boolean;
  phone?: string;
  // 명단 제외(숨김) 대상 — 화면·발송에서 완전히 제외.
  removed?: boolean;
};

const CONFIRM_PHONE = "010-8553-6027";

// 직무별 공통 주요업무(부서 특성 반영) — 부족한 줄 보강용
const GENERIC_DUTIES: Record<string, string[]> = {
  인사총무: ["채용·인사운영 및 조직 관리", "성과·보상 제도 운영 및 노무 지원", "교육·복리후생 등 총무 업무"],
  마케팅: ["브랜드·마케팅 전략 수립 및 실행", "채널·프로모션 기획 및 성과 분석", "시장·경쟁사 조사 및 인사이트 도출"],
  회계세무: ["결산·정산 및 재무제표 작성", "원가·손익 분석 및 예산 관리", "세무 신고 및 자금 집행 관리"],
  사업기획: ["사업 전략·경영계획 수립", "실적 관리 및 KPI 운영", "부서간 협업 및 과제 관리"],
  영업: ["고객 발굴 및 관계 관리", "수주·계약 및 매출 관리", "제안·견적 및 사후 관리"],
  해외영업: ["해외 고객·파트너 관리", "수출입 및 계약 관리", "글로벌 시장 개척 및 지원"],
  SW개발: ["애플리케이션 설계 및 개발", "코드 리뷰·테스트 및 배포", "요구사항 분석 및 유지보수"],
  IT인프라: ["서버·네트워크 인프라 운영", "장애 대응 및 보안 관리", "시스템 성능 모니터링 및 개선"],
  "AI/데이터": ["데이터 수집·정제 및 분석", "모델 개발 및 성능 개선", "데이터 파이프라인 구축·운영"],
  기계설계: ["기계 구조·부품 설계", "해석·검증 및 도면 작성", "시제품 제작 및 개선 설계"],
  전기설계: ["전기·제어 시스템 설계", "회로·설비 검증 및 시험", "설계 표준화 및 유지보수"],
  생산관리: ["생산 계획 수립 및 공정 관리", "품질·납기·원가 관리", "설비 운영 및 공정 개선"],
  품질관리: ["품질 기준 수립 및 검사", "부적합 원인 분석 및 개선", "인증·감사 및 협력사 품질관리"],
  구매: ["자재·부품 소싱 및 계약", "원가 절감 및 협력사 관리", "수급 계획 및 납기 관리"],
  연구개발: ["신제품·신기술 연구개발", "시험·검증 및 데이터 분석", "과제 기획 및 성과 이관"],
  안전관리: ["안전보건 관리체계 운영", "위험성 평가 및 진단", "법규 대응 및 협력사 안전관리"],
  금융상담: ["여신·수신 등 금융 업무", "고객 상담 및 심사", "리스크 관리 및 사후관리"],
  전문의료: ["환자 진료·검사 지원", "의료 정보 및 기록 관리", "부서 운영 및 안전 관리"],
  콘텐츠기획: ["콘텐츠 기획 및 제작", "채널 운영 및 성과 관리", "협업 및 일정 관리"],
  디자인: ["제품·시각 디자인 기획", "디자인 개발 및 검수", "트렌드 분석 및 협업"],
  매장관리: ["매장 운영 및 재고 관리", "상품 진열·VMD 및 판매 관리", "고객 응대 및 손익 관리"],
  사회복지: ["대상자 상담 및 사업 운영", "지역 자원 연계 및 관리", "제도·행정 지원 업무"],
  고객서비스: ["고객 응대 및 안전 관리", "서비스 품질 관리", "현장 운영 및 지원"],
  컨설팅: ["현황 진단 및 전략 수립", "솔루션 제안 및 실행 지원", "성과 관리 및 사후관리"],
  물류관리: ["운송·물류 계획 및 관리", "재고·창고 운영", "정산 및 협력사 관리"],
  행정지원: ["문서·행정 사무 처리", "예산·자원 관리 지원", "부서 운영 및 대외 협력"],
};
const DEFAULT_DUTIES = ["담당 부서 실무 전반 수행", "관련 업무 기획 및 관리", "부서 협업 및 개선 활동"];

function padDuties(duties: string[], jobNames: string[]): string[] {
  const out = [...duties];
  const pool = jobNames.flatMap((j) => GENERIC_DUTIES[j] || []).concat(DEFAULT_DUTIES);
  let i = 0;
  while (out.length < 3 && i < pool.length) {
    if (!out.includes(pool[i])) out.push(pool[i]);
    i++;
  }
  return out.slice(0, 3);
}

export function buildConfirmedMentors(): Mentor[] {
  const pool = confirmedPool as ConfirmedEntry[];
  return pool.map((entry, idx) => {
    const org = entry.org || "";
    const edu = (entry.edu || "").trim();
    const dutyList = entry.duties || [];
    const text = `${org} ${edu} ${dutyList.join(" ")}`;
    const seed = hash(entry.name + "|" + org + "|" + idx);
    const rnd = prng(seed);

    // 수기 큐레이션 태그 우선 → 없으면 키워드 추론으로 폴백
    const indIds =
      entry.ind && entry.ind.length
        ? (entry.ind.map((n) => indId.get(n)).filter(Boolean) as string[])
        : detectIndustries(text);
    const jIds =
      entry.job && entry.job.length
        ? (entry.job.map((n) => jobId.get(n)).filter(Boolean) as string[])
        : detectJobs(text);
    const tId = (entry.type && typeId.get(entry.type)) || detectType(org);
    const mIds = detectMajors(jIds, indIds);
    const cIds = detectCompanies(org);
    const jobNames = jIds.map((x) => jobs.find((j) => j.id === x)?.name).filter(Boolean) as string[];

    const tags: MentorTags = { industry: indIds, job: jIds, company: cIds, type: [tId], major: mIds };
    // 소속/직급 분리: org 끝이 직급이면 title 로, 아니면 소속 전체를 company 로
    const RANK = /(대표이사|대표|회장|부사장|전무|상무|이사|부장|차장|과장|대리|주임|사원|팀장|파트장|실장|본부장|센터장|소장|수석|선임연구원|책임연구원|선임|책임|연구원|매니저|엔지니어|계장|프로|전임|TL|PFC)$/;
    let company = org.trim();
    let rank = "";
    const ls = company.lastIndexOf(" ");
    const lastTok = ls >= 0 ? company.slice(ls + 1) : "";
    if (RANK.test(lastTok)) {
      rank = lastTok;
      company = company.slice(0, ls).trim();
    }
    const jn0 = jobNames[0];
    const title = rank || (jn0 && !company.includes(jn0) ? jn0 : "현직자");
    const years = rint(rnd, 2, 15);
    const education = edu || pick(rnd, REGION_UNIS) + " 졸업";
    const duties = padDuties(dutyList, jobNames);

    const areaPool = [
      ...jobNames.map((j) => `${j} 실무`),
      ...duties.map((d) => (d.length > 18 ? d.slice(0, 18) + "…" : d)),
      "커리어·진로 상담",
    ];
    const mentoringAreas = [...new Set(areaPool)].slice(0, 4);

    return {
      id: `m-${idx + 1}`,
      name: entry.name,
      company,
      title,
      years,
      education,
      summary: `${company} · ${title} · 현직 멘토`,
      career: [`${company} ${title} 재직`, ...duties, education].filter(Boolean),
      mentoringAreas,
      tags,
      // 승인 멘토는 실번호, 미승인 멘토는 공통번호로 질문 발송
      kakaoPhone: entry.approved ? entry.phone || CONFIRM_PHONE : CONFIRM_PHONE,
      answerCount: 0,
      avgResponseHours: rint(rnd, 4, 24),
      participationScore: rint(rnd, 70, 99),
      // 명단 제외(조서현·황상욱)만 숨김, 나머지는 미승인이라도 노출
      active: entry.removed !== true,
      featured: entry.removed !== true,
    } satisfies Mentor;
  });
}
