"use client";

import { useActionState, useState } from "react";
import { applyAction, type FestFormState } from "../../../actions";
import type { FestCompany, FestVisitor } from "@/lib/festival/types";

export function ApplyForm({
  company,
  visitor,
  defaultPositionId,
}: {
  company: FestCompany;
  visitor: FestVisitor;
  defaultPositionId?: string;
}) {
  const [state, action] = useActionState<FestFormState, FormData>(applyAction, {});
  const [positionId, setPositionId] = useState(
    defaultPositionId && company.positions.some((p) => p.id === defaultPositionId)
      ? defaultPositionId
      : company.positions[0]?.id ?? ""
  );
  const position = company.positions.find((p) => p.id === positionId);

  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="companyId" value={company.id} />
      <input type="hidden" name="positionId" value={positionId} />

      <fieldset>
        <legend className="text-base font-extrabold text-fest-navy">지원 직무</legend>
        <div className="mt-3 grid gap-2">
          {company.positions.map((p) => (
            <label
              key={p.id}
              className={`cursor-pointer rounded-2xl border-2 px-4 py-3 transition ${
                positionId === p.id
                  ? "border-fest-blue bg-fest-sky"
                  : "border-fest-line bg-white hover:border-fest-blue/40"
              }`}
            >
              <input
                type="radio"
                checked={positionId === p.id}
                onChange={() => setPositionId(p.id)}
                className="sr-only"
              />
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-fest-navy">{p.title}</span>
                <span className="flex gap-1.5">
                  <span className="fest-chip">{p.employmentType}</span>
                  <span className="fest-chip">{p.experience}</span>
                  <span className="fest-chip">{p.headcount}명</span>
                </span>
              </span>
            </label>
          ))}
        </div>
        {position && (
          <p className="mt-3 rounded-xl bg-fest-bg px-4 py-3 text-xs text-fest-muted">
            자격요건 · {position.requirements.join(" / ")}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="text-base font-extrabold text-fest-navy">지원자 정보</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="fest-label" htmlFor="a-name">
              이름 <span className="text-fest-coral">*</span>
            </label>
            <input
              id="a-name"
              name="name"
              required
              defaultValue={visitor.name}
              className="fest-input"
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="a-phone">
              휴대전화 <span className="text-fest-coral">*</span>
            </label>
            <input
              id="a-phone"
              name="phone"
              required
              defaultValue={visitor.phone}
              className="fest-input"
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="a-email">
              이메일 <span className="text-fest-coral">*</span>
            </label>
            <input
              id="a-email"
              name="email"
              type="email"
              required
              defaultValue={visitor.email ?? ""}
              className="fest-input"
              placeholder="hong@example.com"
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="a-careerType">
              구분
            </label>
            <select
              id="a-careerType"
              name="careerType"
              defaultValue="신입"
              className="fest-input"
            >
              <option>신입</option>
              <option>경력</option>
              <option>인턴 희망</option>
            </select>
          </div>
          <div>
            <label className="fest-label" htmlFor="a-school">
              학교 / 소속
            </label>
            <input
              id="a-school"
              name="school"
              defaultValue={visitor.school ?? ""}
              className="fest-input"
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="a-major">
              전공
            </label>
            <input
              id="a-major"
              name="major"
              defaultValue={visitor.major ?? ""}
              className="fest-input"
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="a-grade">
              학년 / 졸업여부
            </label>
            <input
              id="a-grade"
              name="grade"
              defaultValue={visitor.grade ?? ""}
              className="fest-input"
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="a-portfolio">
              포트폴리오 · 이력서 링크
            </label>
            <input
              id="a-portfolio"
              name="portfolioUrl"
              className="fest-input"
              placeholder="https://"
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-base font-extrabold text-fest-navy">자기소개</legend>
        <div className="mt-3 space-y-4">
          <div>
            <label className="fest-label" htmlFor="a-intro">
              간단한 자기소개 <span className="text-fest-coral">*</span>
            </label>
            <textarea
              id="a-intro"
              name="intro"
              rows={4}
              required
              minLength={20}
              className="fest-input"
              placeholder="전공, 경험, 강점을 중심으로 20자 이상 작성해 주세요."
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="a-strength">
              지원 동기 및 준비된 역량 <span className="text-fest-coral">*</span>
            </label>
            <textarea
              id="a-strength"
              name="strength"
              rows={4}
              required
              minLength={20}
              className="fest-input"
              placeholder="이 기업·직무에 지원한 이유와 관련 경험을 20자 이상 작성해 주세요."
            />
          </div>
        </div>
      </fieldset>

      {state.error && (
        <p className="rounded-xl border border-fest-coral/30 bg-red-50 px-4 py-3 text-sm font-bold text-fest-coral">
          {state.error}
        </p>
      )}

      <button type="submit" className="fest-btn-primary w-full">
        입사지원서 제출하기
      </button>
      <p className="text-center text-xs text-fest-muted">
        제출 후 마이페이지에서 현장 면접 시간을 선택할 수 있습니다.
      </p>
    </form>
  );
}
