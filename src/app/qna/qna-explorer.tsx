"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { ThemeItem, ThemeKind, QuestionThemeRefs } from "@/lib/types";
import type { RecommendedMentor } from "@/lib/view";
import { recommendAction, askAction } from "./actions";

type Kind = ThemeKind;
const KIND_ORDER: Kind[] = ["industry", "job", "company", "type", "major"];

interface Props {
  isStudent: boolean;
  initial: RecommendedMentor[];
  taxonomy: Record<Kind, ThemeItem[]>;
  themeMeta: Record<Kind, { label: string; short: string; desc: string; icon: string }>;
}

export function QnaExplorer({ isStudent, initial, taxonomy, themeMeta }: Props) {
  const [refs, setRefs] = useState<QuestionThemeRefs>({});
  const [recs, setRecs] = useState<RecommendedMentor[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  function toggleTheme(kind: Kind, id: string) {
    const next = { ...refs };
    if (next[kind] === id) delete next[kind];
    else next[kind] = id;
    updateRefs(next);
  }

  function resetThemes() {
    updateRefs({});
  }

  function toggleMentor(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function askOne(id: string) {
    setSelected(new Set([id]));
    composeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectAllVisible() {
    setSelected(new Set(recs.map((r) => r.mentor.id)));
    composeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mt-8">
      {/* 테마 선택 */}
      <div className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">테마 선택</h2>
          {selectedCount > 0 && (
            <button onClick={resetThemes} className="text-sm font-semibold text-ink-muted hover:text-ink">
              초기화 ✕
            </button>
          )}
        </div>
        <div className="space-y-4">
          {KIND_ORDER.map((kind) => (
            <div key={kind}>
              <div className="mb-2 flex items-center gap-2">
                <span>{themeMeta[kind].icon}</span>
                <span className="text-sm font-bold">{themeMeta[kind].label}</span>
                <span className="hidden text-xs text-ink-muted sm:inline">
                  {themeMeta[kind].desc}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {taxonomy[kind].map((it) => {
                  const active = refs[kind] === it.id;
                  return (
                    <button
                      key={it.id}
                      onClick={() => toggleTheme(kind, it.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        active
                          ? "border-ink bg-ink text-cream-50"
                          : "border-ink-line bg-white text-ink-soft hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      {it.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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
              <button onClick={selectAllVisible} className="text-sm font-semibold text-brand-500 hover:underline">
                전체 선택해서 질문
              </button>
            )}
          </div>

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
                          {matched.map((k) => (
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
