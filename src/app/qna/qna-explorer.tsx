"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { ThemeItem, ThemeKind, QuestionThemeRefs } from "@/lib/types";
import type { RecommendedMentor } from "@/lib/view";
import { recommendAction, askAction } from "./actions";

// 선택 가능한 분류 차원 (기업 제외 — 산업/직무/유형/전공)
type SelKind = "industry" | "job" | "type" | "major";
const KIND_ORDER: SelKind[] = ["industry", "job", "type", "major"];

// 한 번에 질문할 수 있는 최대 멘토 수 (무분별한 다중 질문 방지)
const MAX_MENTORS = 3;

interface Props {
  isStudent: boolean;
  initial: RecommendedMentor[];
  taxonomy: Record<SelKind, ThemeItem[]>;
  themeMeta: Record<ThemeKind, { label: string; short: string; desc: string; icon: string }>;
}

export function QnaExplorer({ isStudent, initial, taxonomy, themeMeta }: Props) {
  const [refs, setRefs] = useState<QuestionThemeRefs>({});
  const [recs, setRecs] = useState<RecommendedMentor[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openKind, setOpenKind] = useState<SelKind | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const composeRef = useRef<HTMLDivElement>(null);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const k of KIND_ORDER) for (const it of taxonomy[k]) m.set(it.id, it.name);
    return m;
  }, [taxonomy]);

  const selectedCount = KIND_ORDER.filter((k) => refs[k]).length;

  function updateRefs(next: QuestionThemeRefs) {
    setRefs(next);
    startTransition(async () => {
      const list = await recommendAction(next);
      setRecs(list);
    });
  }

  function selectTheme(kind: SelKind, id: string) {
    const next = { ...refs };
    if (next[kind] === id) delete next[kind];
    else next[kind] = id;
    setOpenKind(null);
    updateRefs(next);
  }

  function clearTheme(kind: SelKind) {
    const next = { ...refs };
    delete next[kind];
    updateRefs(next);
  }

  function resetThemes() {
    setOpenKind(null);
    updateRefs({});
  }

  function toggleMentor(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        return n;
      }
      // 최대 인원 초과 시 안내 팝업 (선택은 그대로 유지)
      if (n.size >= MAX_MENTORS) {
        setLimitOpen(true);
        return prev;
      }
      n.add(id);
      return n;
    });
  }

  function askOne(id: string) {
    setSelected(new Set([id]));
    composeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // 추천 상위 N명(최대 3명) 선택
  function selectTopMentors() {
    setSelected(new Set(recs.slice(0, MAX_MENTORS).map((r) => r.mentor.id)));
    composeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mt-8">
      {/* 테마 선택 (드롭다운) — z-30 으로 아래 추천목록 위에 패널이 뜨도록 */}
      <div className="card relative z-30 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold">테마 선택</h2>
            <p className="text-sm text-ink-muted">
              항목을 눌러 하나씩 선택하세요. 산업·직무·유형·전공 중 원하는 만큼만 지정하면 됩니다.
            </p>
          </div>
          {selectedCount > 0 && (
            <button onClick={resetThemes} className="text-sm font-semibold text-ink-muted hover:text-ink">
              초기화 ✕
            </button>
          )}
        </div>

        {/* 바깥 클릭 시 닫기 */}
        {openKind && (
          <button
            aria-label="닫기"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpenKind(null)}
          />
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {KIND_ORDER.map((kind) => {
            const meta = themeMeta[kind];
            const selId = refs[kind];
            const isOpen = openKind === kind;
            return (
              <div key={kind} className="relative z-20">
                <button
                  type="button"
                  onClick={() => setOpenKind(isOpen ? null : kind)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                    selId
                      ? "border-brand-400 bg-brand-50"
                      : "border-ink-line bg-white hover:border-brand-300"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span>{meta.icon}</span>
                    {selId ? (
                      <span className="truncate font-semibold text-ink">{nameOf.get(selId)}</span>
                    ) : (
                      <span className="truncate text-ink-muted">{meta.label} 선택</span>
                    )}
                  </span>
                  {selId ? (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`${meta.label} 선택 해제`}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearTheme(kind);
                      }}
                      className="shrink-0 rounded px-1 text-ink-muted hover:text-ink"
                    >
                      ✕
                    </span>
                  ) : (
                    <span className={`shrink-0 text-ink-muted transition ${isOpen ? "rotate-180" : ""}`}>
                      ▾
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-ink-line bg-white p-1.5 shadow-pop">
                    <p className="px-2 py-1 text-xs text-ink-muted">{meta.desc}</p>
                    {taxonomy[kind].map((it) => {
                      const active = refs[kind] === it.id;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => selectTheme(kind, it.id)}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                            active
                              ? "bg-ink text-cream-50"
                              : "text-ink-soft hover:bg-brand-50 hover:text-ink"
                          }`}
                        >
                          {it.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 선택 요약 */}
      {selectedCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm">
          <span className="font-semibold text-brand-500">선택한 테마:</span>
          {KIND_ORDER.filter((k) => refs[k]).map((k) => (
            <span key={k} className="chip-brand">
              {themeMeta[k].short}: {nameOf.get(refs[k]!)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* 추천 멘토 리스트 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">
              추천 멘토 <span className="text-brand-400">{recs.length}</span>
              {pending && <span className="ml-2 text-sm font-normal text-ink-muted">불러오는 중…</span>}
            </h2>
            {recs.length > 0 && (
              <button onClick={selectTopMentors} className="text-sm font-semibold text-brand-500 hover:underline">
                추천 상위 3명 선택
              </button>
            )}
          </div>
          <p className="mb-3 text-xs text-ink-muted">
            멘토는 한 번에 <b className="text-brand-500">최대 {MAX_MENTORS}명</b>까지 선택할 수 있어요.
            <span className="ml-1">({selected.size}/{MAX_MENTORS} 선택됨)</span>
          </p>

          {recs.length === 0 ? (
            <div className="card p-8 text-center text-ink-muted">
              선택한 테마에 맞는 멘토가 없습니다. 다른 테마를 선택해 보세요.
            </div>
          ) : (
            <ul className="space-y-3">
              {recs.map(({ mentor, matched }) => {
                const isSel = selected.has(mentor.id);
                return (
                  <li
                    key={mentor.id}
                    className={`card p-4 transition ${isSel ? "ring-2 ring-brand-300" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleMentor(mentor.id)}
                        className="mt-1.5 h-4 w-4 accent-brand-400"
                        aria-label={`${mentor.name} 선택`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/mentors/${mentor.id}`} className="font-bold hover:underline">
                            {mentor.name}
                          </Link>
                          {mentor.featured && <span className="badge bg-brand-100 text-brand-500">대표멘토</span>}
                        </div>
                        <p className="truncate text-sm text-ink-soft">
                          {mentor.company} · {mentor.title} · {mentor.years}년차
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {matched
                            .filter((k) => k !== "company")
                            .map((k) => (
                              <span key={k} className="badge bg-emerald-50 text-emerald-700">
                                {themeMeta[k].short} 매칭
                              </span>
                            ))}
                          {mentor.mentoringAreas.slice(0, 2).map((a) => (
                            <span key={a} className="badge bg-ink/5 text-ink-soft">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-ink-muted">참여도 {mentor.participationScore}</span>
                        <button
                          onClick={() => askOne(mentor.id)}
                          className="btn-outline px-3 py-1.5 text-xs"
                        >
                          개별 질문
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 질문 작성 패널 */}
        <div ref={composeRef} className="lg:sticky lg:top-20 lg:self-start">
          <ComposePanel
            isStudent={isStudent}
            refs={refs}
            selectedIds={[...selected]}
            mentorNameById={new Map(recs.map((r) => [r.mentor.id, r.mentor.name]))}
            onRemove={(id) => toggleMentor(id)}
          />
        </div>
      </div>

      {/* 최대 선택 인원 초과 안내 팝업 */}
      {limitOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setLimitOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-2xl">
              ⚠️
            </div>
            <h3 className="mt-3 text-lg font-extrabold">멘토는 최대 {MAX_MENTORS}명까지</h3>
            <p className="mt-2 text-sm text-ink-soft">
              한 번에 질문할 수 있는 멘토는 <b className="text-brand-500">최대 {MAX_MENTORS}명</b>
              입니다. 더 선택하려면 기존 선택을 먼저 해제해 주세요.
            </p>
            <button onClick={() => setLimitOpen(false)} className="btn-brand mt-5 w-full">
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComposePanel({
  isStudent,
  refs,
  selectedIds,
  mentorNameById,
  onRemove,
}: {
  isStudent: boolean;
  refs: QuestionThemeRefs;
  selectedIds: string[];
  mentorNameById: Map<string, string>;
  onRemove: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [result, setResult] = useState<
    { ok: true; questionId: string; sent: number } | { ok: false; error: string; needAuth?: boolean } | null
  >(null);
  const [pending, startTransition] = useTransition();

  const scope = selectedIds.length > 1 ? "전체(다중) 질문" : selectedIds.length === 1 ? "개별 질문" : "";

  function submit() {
    setResult(null);
    startTransition(async () => {
      const res = await askAction({ refs, targetMentorIds: selectedIds, title, body, isPublic });
      setResult(res);
      if (res.ok) {
        setTitle("");
        setBody("");
      }
    });
  }

  if (result?.ok) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h3 className="mt-3 text-lg font-extrabold">질문이 전송되었습니다</h3>
        <p className="mt-1 text-sm text-ink-muted">
          {result.sent}명의 멘토에게 카카오톡 알림톡을 발송했어요. 답변이 등록되면 카톡으로
          알려드립니다.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link href={`/questions/${result.questionId}`} className="btn-brand">
            내 질문 보기
          </Link>
          <button onClick={() => setResult(null)} className="btn-ghost">
            다른 질문 하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="text-lg font-extrabold">질문 작성</h3>
      <p className="mt-1 text-sm text-ink-muted">
        {selectedIds.length === 0
          ? "왼쪽에서 멘토를 선택하세요."
          : `${selectedIds.length}명 선택됨 · ${scope}`}
      </p>

      {selectedIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selectedIds.map((id) => (
            <span key={id} className="chip">
              {mentorNameById.get(id) ?? "멘토"}
              <button onClick={() => onRemove(id)} className="ml-1 text-ink-muted hover:text-ink" aria-label="제거">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <label className="field-label" htmlFor="q-title">
            질문 제목
          </label>
          <input
            id="q-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field-input"
            placeholder="예: 신입에게 가장 중요한 역량은?"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="q-body">
            질문 내용
          </label>
          <textarea
            id="q-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="field-input resize-none"
            placeholder="궁금한 점을 구체적으로 적어주세요."
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 accent-brand-400"
          />
          답변을 게시판에 공개 (다른 학생도 열람)
        </label>
      </div>

      {result && !result.ok && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {result.error}
          {result.needAuth && (
            <>
              {" "}
              <Link href="/login" className="font-semibold underline">
                로그인하기
              </Link>
            </>
          )}
        </div>
      )}

      {!isStudent && (
        <p className="mt-3 rounded-lg bg-cream-200/60 px-3 py-2 text-xs text-ink-soft">
          질문을 보내려면 로그인이 필요합니다.{" "}
          <Link href="/login" className="font-semibold underline">
            로그인
          </Link>
        </p>
      )}

      <button
        onClick={submit}
        disabled={pending || selectedIds.length === 0}
        className="btn-brand mt-4 w-full"
      >
        {pending ? "전송 중…" : `질문 보내기${selectedIds.length ? ` (${selectedIds.length}명)` : ""}`}
      </button>
    </div>
  );
}
