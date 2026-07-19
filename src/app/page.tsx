import Link from "next/link";
import { listMentors, featuredMentors } from "@/lib/repo";
import { industries, jobs, companies } from "@/lib/taxonomy";
import { toPublicMentor } from "@/lib/view";
import { MentorTagBadges } from "@/components/mentor-badges";

export default async function HomePage() {
  const mentorCount = (await listMentors()).length;
  const featured = (await featuredMentors(6)).map(toPublicMentor);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-brand-100/60 blur-3xl" />
        </div>
        <div className="container-page grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="chip-brand">지역 정주형 · 부울경 연합</span>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              직무 멘토링과<br />
              <span className="text-brand-400">실시간 질의응답</span>을<br />
              동시에.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              산업·직무·유형·전공별 현직자 멘토를 추천받고, 한 번에 여러 멘토에게 질문하세요.
              현직자의 다양한 관점을 카카오톡으로 편하게 받아봅니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/qna" className="btn-brand text-base">
                멘토 추천받고 질문하기
              </Link>
              <Link href="/talk-concert" className="btn-outline text-base">
                토크콘서트 일정 보기
              </Link>
            </div>
            <dl className="mt-10 flex gap-8">
              <div>
                <dt className="text-sm text-ink-muted">현직자 멘토</dt>
                <dd className="text-2xl font-extrabold">{mentorCount.toLocaleString()}명</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">산업 테마</dt>
                <dd className="text-2xl font-extrabold">{industries.length}개</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">직무 분야</dt>
                <dd className="text-2xl font-extrabold">{jobs.length}개</dd>
              </div>
            </dl>
          </div>

          {/* 사원증 컨셉 비주얼 */}
          <div className="relative mx-auto w-full max-w-sm animate-fade-up">
            <div className="mx-auto mb-[-14px] h-14 w-2 rounded-full bg-brand-300" />
            <div className="rounded-2xl2 border-2 border-ink bg-white p-6 shadow-pop">
              <p className="text-center text-xs font-bold tracking-[0.3em] text-ink-muted">
                EMPLOYEE CARD
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-2xl">
                  🧑‍💼
                </div>
                <div>
                  <p className="text-lg font-extrabold">현직자 멘토</p>
                  <p className="text-sm text-ink-muted">부울경 연합 멘토링</p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm">
                {["산업 트렌드·현황", "직무 실무 이야기", "기업유형별 조직문화", "전공 커리어 로드맵"].map(
                  (t) => (
                    <div key={t} className="flex items-center gap-2 rounded-lg bg-cream-100 px-3 py-2">
                      <span className="text-brand-400">✔</span>
                      <span className="text-ink-soft">{t}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 프로그램 2트랙 */}
      <section className="container-page py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <ProgramCard
            tag="① 실시간 Q&A"
            title="현직자에게 바로 묻는 실시간 Q&A"
            desc="산업·직무·유형·전공 4가지 테마로 멘토를 추천받고, 개별 또는 여러 멘토에게 한 번에 질문하세요. 답변은 카카오톡으로 도착합니다."
            href="/qna"
            cta="질문 시작하기"
            highlight
          />
          <ProgramCard
            tag="② 온라인 토크콘서트"
            title="45명 현직자 릴레이 토크콘서트"
            desc="8/24~9/3, 매일 5명씩 9일간 진행되는 온라인 직무 토크콘서트. Zoom으로 현장 업무와 취업 노하우를 만나보세요."
            href="/talk-concert"
            cta="일정 확인하기"
          />
        </div>
      </section>

      {/* 질문 프로세스 */}
      <section className="container-page py-12">
        <h2 className="text-2xl font-extrabold">질문은 이렇게 진행돼요</h2>
        <p className="mt-1 text-ink-muted">유형 확인부터 답변 게시까지 5단계</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { n: "1", t: "유형 확인", d: "산업·직무·유형·전공 선택" },
            { n: "2", t: "멘토 추천", d: "테마에 맞는 멘토 리스트" },
            { n: "3", t: "질문 등록", d: "개별 또는 여러 멘토에게" },
            { n: "4", t: "멘토 답변", d: "카톡 알림 → 답변 작성" },
            { n: "5", t: "답변 게시", d: "사이트 게시 + 카톡 회신" },
          ].map((s) => (
            <li key={s.n} className="card p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-bold text-brand-300">
                {s.n}
              </span>
              <p className="mt-3 font-bold">{s.t}</p>
              <p className="mt-1 text-sm text-ink-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 대표 멘토 */}
      {featured.length > 0 && (
        <section className="container-page py-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">대표 멘토</h2>
              <p className="mt-1 text-ink-muted">토크콘서트에 참여하는 대표 현직자 멘토</p>
            </div>
            <Link href="/qna" className="btn-ghost hidden sm:inline-flex">
              전체 멘토 보기 →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((m) => (
              <Link key={m.id} href={`/mentors/${m.id}`} className="card p-5 transition hover:shadow-pop">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 font-bold text-brand-500">
                    {m.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{m.name}</p>
                    <p className="truncate text-sm text-ink-muted">{m.company}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-1 text-sm text-ink-soft">{m.title} · {m.years}년차</p>
                <div className="mt-3">
                  <MentorTagBadges tags={m.tags} max={4} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 기업 로고 스트립 */}
      <section className="border-y border-ink-line bg-cream-100 py-8">
        <div className="container-page">
          <p className="text-center text-sm font-semibold text-ink-muted">
            부산·경남·울산 지역 대표 기업 현직자가 함께합니다
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {companies.slice(0, 18).map((c) => (
              <span key={c.id} className="chip">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16">
        <div className="rounded-2xl2 bg-ink px-8 py-12 text-center text-cream-50">
          <h2 className="text-2xl font-extrabold sm:text-3xl">지금 바로 현직자에게 물어보세요</h2>
          <p className="mx-auto mt-3 max-w-xl text-cream-200/80">
            학교 접속코드로 가입하고, 관심 산업·직무의 현직자 멘토에게 질문을 시작하세요.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link href="/signup" className="btn-brand">
              회원가입
            </Link>
            <Link href="/qna" className="btn-outline border-cream-200/30 bg-white/10 text-cream-50 hover:bg-white/20">
              멘토 추천받기
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function ProgramCard({
  tag,
  title,
  desc,
  href,
  cta,
  highlight,
}: {
  tag: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`card flex flex-col p-7 ${
        highlight ? "ring-2 ring-brand-300" : ""
      }`}
    >
      <span className={highlight ? "chip-brand" : "chip"}>{tag}</span>
      <h3 className="mt-4 text-xl font-extrabold">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{desc}</p>
      <Link href={href} className={`mt-6 ${highlight ? "btn-brand" : "btn-primary"} w-fit`}>
        {cta} →
      </Link>
    </div>
  );
}
