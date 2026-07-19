import type { Mentor, MentorTags } from "./types";
import { industries, jobs, companyTypes, majors, companies } from "./taxonomy";
import rawPool from "@/data/mentor-pool.raw.json";

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
