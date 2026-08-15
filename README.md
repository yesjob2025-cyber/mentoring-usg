# YESJOB 멘토링 플랫폼

지역 정주형 **부울경 연합 현직자 온라인 멘토링** 플랫폼.
현직자 직무 멘토링과 실시간 질의응답(Q&A)을 동시에 제공합니다. (제안서 기준 구현)

- **① 실시간 Q&A** — 산업·직무·기업·유형·전공 5개 테마로 멘토를 추천받고, 개별 또는 여러 멘토에게 한 번에 질문. 질문은 멘토에게 카카오톡(알림톡)으로 전달되고, 멘토가 답변하면 사이트 저장 + 학생에게 카톡 회신.
- **② 온라인 토크콘서트** — 8/24~9/3, 45회(매일 5명×9일) 릴레이 Zoom 토크콘서트. (일정/구조 UI 우선, Zoom·섭외는 확정 후 세팅)
- **학교별 관리자 대시보드** — 학교 접속코드 기반 회원가입, 참여/접속/질문 현황과 채택·정산 원장.

---

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # 필요시 값 수정 (없어도 기본값으로 구동됨)
npm run dev                  # http://localhost:3000
```

> 외부 서비스(Supabase/카카오) 키가 없어도 **바로 실행**됩니다.
> 데이터는 로컬 JSON 스토어(`.data/db.json`)에 저장되며, 제안서 별첨 멘토풀 566명이 시드됩니다.
> 카카오 알림톡은 기본 `stub` 모드로 콘솔에 출력됩니다(발송 로그에 멘토 답변 링크가 찍힘).

### 데모 계정

| 구분 | 계정 | 비밀번호 |
|------|------|----------|
| 학생 로그인 | `student1@pnu.ac.kr` | `test1234` |
| 학교 관리자 | `pnu-admin` | `admin1234` |
| 회원가입 접속코드 | `PNU2025` (그 외 PKNU2025, DAU2025, KSU2025, DEU2025, UOU2025, GNU2025) | — |

### 유용한 스크립트

```bash
npm run build      # 프로덕션 빌드
npm run start      # 프로덕션 실행
npm run reset-db   # 로컬 데이터 초기화(다음 실행 시 시드 재생성)
```

---

## 주요 화면

| 경로 | 설명 |
|------|------|
| `/` | 랜딩(프로그램 소개·질문 프로세스·대표 멘토) |
| `/qna` | 실시간 Q&A — 테마 선택 → 멘토 추천 → 개별/다중 질문 |
| `/questions`, `/questions/[id]` | 항목별 질문 게시판 · 상세(답변·좋아요·채택) |
| `/mentors/[id]` | 멘토 프로필(학력·경력·멘토링 영역·참여도) |
| `/answer/[token]` | 멘토 답변 작성(로그인 불필요, 알림톡 링크로 진입) |
| `/talk-concert` | 온라인 토크콘서트 일정(9일×5회) + Zoom 자리표시 |
| `/signup`, `/login`, `/admin/login` | 접속코드 회원가입 / 로그인 / 관리자 로그인 |
| `/admin` | 학교별 대시보드(접속·질문 현황, 정산 원장) |
| `/my` | 학생 내 질문 |

---

## 아키텍처

```
src/
  app/                 # Next.js App Router (페이지 + 서버 액션)
  components/           # 공통 UI (헤더/푸터/배지/버튼)
  lib/
    types.ts           # 도메인 타입
    taxonomy.ts         # 산업/직무/기업/유형/전공 분류 (제안서 기준)
    mentor-generator.ts # 멘토풀 원본 → 태그 자동추론 + 가상 프로필 생성
    seed.ts             # 학교·토크콘서트 일정·데모 데이터 시드
    store.ts            # 개발/데모용 JSON 파일 스토어 (교체 지점)
    repo.ts             # 쿼리/뮤테이션 (추천·질문·답변·정산·대시보드 집계)
    session.ts          # 쿠키 세션(jose JWT)
    messaging.ts        # 카카오 알림톡 어댑터 (stub / 알리고)
    crypto.ts, format.ts, grades.ts, view.ts
  data/mentor-pool.raw.json  # 제안서 별첨 멘토풀(566명) 원본
```

### 멘토 추천 로직
`recommendMentors(themeRefs)` 가 선택된 각 테마(산업/직무/기업/유형/전공)와 멘토 태그를
가중치(기업>직무>산업>유형>전공)로 매칭·점수화하여 정렬합니다. 멘토 태그는
`mentor-generator.ts` 가 원본 소속/직무 텍스트의 키워드로 자동 추론합니다.

### Q&A → 카톡 → 답변 흐름
1. 학생이 멘토 선택 후 질문 등록 (`askAction`)
2. 각 멘토에게 알림톡 발송(답변용 토큰 링크 포함) — `notifyMentorNewQuestion`
3. 멘토가 링크(`/answer/[token]`)로 진입해 답변 작성 (로그인 불필요)
4. 답변 저장 + 학생에게 답변 도착 알림톡 — `notifyStudentNewAnswer`
5. 관리자가 우수 답변 **채택** → 등급별 차등 지급액이 내부 정산 원장에 기록

---

## 프로덕션 전환 가이드

### 1) 카카오 알림톡 (알리고)
`.env.local` 에서 provider 를 `aligo` 로 바꾸고 키를 채웁니다.

```env
KAKAO_PROVIDER=aligo
ALIGO_API_KEY=...
ALIGO_USER_ID=...
KAKAO_SENDER_KEY=...        # 알림톡 발신 프로필(채널) 발신키
ALIGO_SENDER=010########    # 사전 등록된 발신번호
KAKAO_TPL_NEW_QUESTION=...  # 승인된 템플릿 코드(멘토용)
KAKAO_TPL_NEW_ANSWER=...    # 승인된 템플릿 코드(학생용)
```

- 알림톡은 **사전 승인된 템플릿**만 발송 가능합니다. `src/lib/messaging.ts` 의 메시지
  본문/버튼을 승인 템플릿과 일치시키세요. (연동 코드: `sendViaAligo`)
- 멘토 수신 번호는 현재 마스킹된 가상값입니다. 실제 운영 시 멘토 연락처를 안전하게 저장하세요.

### 2) 데이터 백엔드 (Supabase) — 구현 완료, 환경변수만 설정하면 전환
데이터 접근은 `src/lib/data.ts` 한 곳에서 백엔드를 자동 선택합니다.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 가 있으면 → **Supabase(PostgreSQL, 영구 저장)**
- 없으면 → 로컬 JSON 스토어(데모)

**전환 절차**
1. [supabase.com](https://supabase.com) 에서 프로젝트 생성(무료)
2. **SQL Editor** 에 `supabase/schema.sql` 붙여넣고 실행 (테이블 생성)
3. Vercel 환경변수 추가 후 재배포:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Project Settings → API → service_role
   SEED_SECRET=아무_긴_임의문자열           # 시드 엔드포인트 보호용
   ```
4. 시드 채우기(1회): `https://mentoring-usg.kr/api/seed?secret=<SEED_SECRET>` 접속
   → 학교 12개, 멘토 566명, 토크콘서트 45회 등 자동 삽입 (이미 있으면 skip, `&force=1` 로 강제)

> ⚠️ Vercel 서버리스는 파일시스템이 휘발성이라 JSON 스토어로는 데이터가 유지되지 않습니다.
> 실제 운영은 위 Supabase 전환이 필수입니다.

> 참고: `service_role` 키는 서버에서만 사용되며(클라이언트 노출 없음), 스키마는 RLS 활성화 +
> 정책 없음이라 anon 키로는 접근이 차단됩니다.

### 3) Zoom (토크콘서트)
`TalkSession.zoomUrl` 에 회차별 링크를 채우고, 섭외 확정 시 `mentorName/company/status` 를
업데이트합니다. Zoom API 자동 생성 연동은 `ZOOM_*` 환경변수 자리를 참고하세요.

---

## 배포 (Vercel · 데모용)

코드가 GitHub에 있으므로 Vercel에서 바로 배포할 수 있습니다.

1. https://vercel.com 에서 **GitHub로 로그인**
2. **Add New → Project** → `yesjob2025-cyber/mentoring-usg` **Import**
3. Branch를 `claude/mentoring-homepage-setup-udana7` 로 선택 (또는 이 브랜치를 main으로 머지)
4. **Environment Variables** 에 최소 `SESSION_SECRET`(임의 32자 이상) 입력
   (카톡 실발송하려면 `KAKAO_PROVIDER=aligo` + 알리고 키들도 함께)
5. **Deploy** → 몇 분 뒤 `https://<프로젝트>.vercel.app` 주소 생성

> ⚠️ **데이터 영속성 주의**: 서버리스에서는 임시 저장소(`/tmp`)를 쓰므로 배포·재시작 시
> 가입/질문 데이터가 초기화됩니다(시드 데이터로 리셋). 화면·플로우 확인용 데모로는 충분하지만,
> 실제 운영(데이터 유지, 다중 사용자)은 위 **Supabase 전환**이 필요합니다.

## 기술 스택
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · jose(세션) ·
데이터: 로컬 JSON 스토어(데모) → Supabase(프로덕션)

---

# 2026 김해 JOB FESTIVAL (jobfestival.co.kr)

같은 Next.js 앱이 **두 개의 서비스**를 서빙합니다.

| 도메인 | 서비스 | 라우트 |
|--------|--------|--------|
| mentoring 도메인 | 부울경 연합 멘토링 플랫폼 | `/` (`src/app/(main)`) |
| **jobfestival.co.kr** | 2026 김해 JOB FESTIVAL | `/festival/*` |

`src/middleware.ts` 가 `FESTIVAL_HOSTS` 에 등록된 도메인 요청의 경로 앞에 `/festival` 을
붙여 rewrite 하므로, 방문자에게는 `https://jobfestival.co.kr/companies` 처럼 깔끔한 주소가
보입니다. 링크는 `FestLink` 가 도메인에 맞춰 prefix 를 자동으로 붙입니다.

## 행사 개요 (`src/lib/festival/config.ts` 한 곳에서 관리)

- **사업명** 2026 김해 JOB FESTIVAL
- **일시** 2026년 9월 10일(목) 10:00 ~ 17:00
- **구성** 기업관 / 직무관 / 홍보관 / 부대행사
- **주최** 김해시 · 인제대 · 가야대 · 영산대 · 김해대

## 화면 구성

| 경로 (축제 도메인 기준) | 설명 |
|------|------|
| `/` | 메인 — 4개 관 소개, 참여 코스, 현장 이용 흐름, 참가기업 미리보기 |
| `/about` | 행사안내 — 개요, 행사장 구성, 당일 운영 시간표 |
| `/companies` · `/companies/[id]` | **기업관** 전체 리스트(검색·산업·고용형태·면접운영 필터) → 기업 상세(모집직무·면접 시간표) |
| `/companies/[id]/apply` | **입사지원** 폼 (사전등록자, 직무 선택 → 지원서 제출) |
| `/jobs` · `/jobs/[id]` | **직무관** 전체 리스트(계열 탭·검색) → 직무 상세(업무·역량·자격·커리어 경로·채용기업) |
| `/promos` | **홍보관** 참여 기관 전체 리스트(서비스·지원대상) |
| `/events` | **부대행사** 전체 프로그램(시간·정원·예약 여부) |
| `/guide` | 참여방법 — JOB/Career 코스, 사전 매칭, QR 이용 흐름, 스탬프 이벤트, FAQ |
| `/register` | 사전등록 → 입장 QR 즉시 발급 |
| `/pass` | **내 입장권** — QR·확인코드, 자동 추천 부스, 스탬프 현황, 지원 현황·면접 시간 선택, 참여 이력 |
| `/pass/find` · `/pass/survey` · `/pass/done` | 입장권 찾기 / 만족도 설문 / 마무리 |
| `/p/[token]` | QR 스캔 시 열리는 참가자 확인 페이지 (부스 운영자용) |
| `/staff` · `/staff/scan` | **부스 운영자** 로그인(부스 선택 + 운영 PIN) → QR 스캔·코드 입력 체크인 |
| `/admin` | 운영 관리 대시보드 (등록·입장·체크인·지원·면접·만족도 집계, CSV 내보내기) |

## 입퇴장 · 참여 체크 흐름

```
사전등록(관심 직무·코스) → 입장 QR + 6자리 코드 발급
   → 입장 게이트 체크인(enteredAt 기록) → 코스/관심사 기반 부스 자동 추천
   → 부스별 체크인(관별 스탬프 적립, 동일 부스 중복은 1건만 기록)
   → 4개 관 완주 시 완주 코드 발급 → 종합안내부스에서 경품 지급 처리
   → 만족도 설문 → 참여 마무리 요약
```

- QR 내용은 `https://jobfestival.co.kr/p/<token>` 절대 URL 이라 어떤 QR 앱으로 찍어도 열립니다.
  부스 기기가 로그인되어 있으면 그 화면에서 바로 체크인됩니다.
- `/staff/scan` 은 브라우저 `BarcodeDetector` 지원 시 카메라 연속 스캔, 미지원 시 6자리 코드
  직접 입력으로 동작합니다.
- 입사지원 → 마이페이지에서 기업별 30분 단위 면접 슬롯을 선택(정원·시간 중복 체크)합니다.

## 운영 설정

```env
FESTIVAL_HOSTS="jobfestival.co.kr,www.jobfestival.co.kr"
FEST_STAFF_PIN="2026"          # 부스 운영자 공용 PIN — 운영 전 반드시 변경
FEST_ADMIN_PASSWORD="..."      # /admin 접근 비밀번호 (기본값 kimhae2026!)
```

## 부스 데이터 교체

`src/lib/festival/seed.ts` 의 기업/직무/기관/부대행사는 **화면 확인용 샘플 데이터**입니다.
참가 확정 명단으로 교체한 뒤:

- JSON 백엔드(데모): `npm run reset-db` 후 재시작하면 새 시드가 반영됩니다.
- Supabase(운영): `supabase/festival-schema.sql` 실행 → `/api/seed?secret=<SEED_SECRET>&only=festival`
  (기존 부스 데이터를 갈아끼우려면 `&force=1`)

> 참가자·지원·체크인 데이터는 `force` 를 써도 삭제되지 않습니다.

## 도메인 연결 (Vercel 기준)

1. Vercel 프로젝트 → Settings → Domains 에 `jobfestival.co.kr`, `www.jobfestival.co.kr` 추가
2. 도메인 등록기관 DNS 에 Vercel 이 안내하는 A / CNAME 레코드 등록
3. 환경변수 `FESTIVAL_HOSTS` 에 두 도메인을 등록하고 재배포
4. 접속 확인 — `jobfestival.co.kr/` 이 축제 메인으로, 기존 도메인은 멘토링 사이트로 동작
