"use client";

import { useActionState, useState } from "react";
import { registerAction, type FestFormState } from "../actions";
import { COURSES } from "@/lib/festival/config";
import type { FestJobBooth } from "@/lib/festival/types";

const VISITOR_TYPES = ["재학생", "졸업예정자", "구직자", "재직자(이직 준비)", "일반/기타"];
const GRADES = ["1학년", "2학년", "3학년", "4학년", "졸업생", "해당 없음"];

export function RegisterForm({
  jobs,
  industries,
}: {
  jobs: FestJobBooth[];
  industries: readonly string[];
}) {
  const [state, action] = useActionState<FestFormState, FormData>(registerAction, {});
  const [course, setCourse] = useState<string>("job");

  return (
    <form action={action} className="space-y-8">
      {/* 참여 코스 */}
      <fieldset>
        <legend className="text-base font-extrabold text-fest-navy">1. 참여 코스 선택</legend>
        <p className="mt-1 text-sm text-fest-muted">
          코스에 따라 입장 시 추천 부스와 우선 배정 프로그램이 달라집니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {COURSES.map((c) => (
            <label
              key={c.key}
              className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                course === c.key
                  ? "border-fest-blue bg-fest-sky"
                  : "border-fest-line bg-white hover:border-fest-blue/40"
              }`}
            >
              <input
                type="radio"
                name="course"
                value={c.key}
                checked={course === c.key}
                onChange={() => setCourse(c.key)}
                className="sr-only"
              />
              <span className="block text-sm font-black text-fest-navy">{c.name}</span>
              <span className="mt-1 block text-xs font-bold text-fest-blue">{c.subtitle}</span>
              <span className="mt-2 block text-xs text-fest-muted">{c.target}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 기본 정보 */}
      <fieldset>
        <legend className="text-base font-extrabold text-fest-navy">2. 참가자 정보</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="fest-label" htmlFor="name">
              이름 <span className="text-fest-coral">*</span>
            </label>
            <input id="name" name="name" required className="fest-input" placeholder="홍길동" />
          </div>
          <div>
            <label className="fest-label" htmlFor="phone">
              휴대전화 <span className="text-fest-coral">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              required
              inputMode="tel"
              className="fest-input"
              placeholder="010-1234-5678"
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="fest-input"
              placeholder="hong@example.com"
            />
          </div>
          <div>
            <label className="fest-label" htmlFor="visitorType">
              참가자 구분 <span className="text-fest-coral">*</span>
            </label>
            <select id="visitorType" name="visitorType" required defaultValue="" className="fest-input">
              <option value="" disabled>
                선택해 주세요
              </option>
              {VISITOR_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="fest-label" htmlFor="school">
              학교 / 소속
            </label>
            <input id="school" name="school" className="fest-input" placeholder="인제대학교" />
          </div>
          <div>
            <label className="fest-label" htmlFor="major">
              전공
            </label>
            <input id="major" name="major" className="fest-input" placeholder="기계공학과" />
          </div>
          <div>
            <label className="fest-label" htmlFor="grade">
              학년
            </label>
            <select id="grade" name="grade" defaultValue="" className="fest-input">
              <option value="">선택 안 함</option>
              {GRADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* 관심 직무 */}
      <fieldset>
        <legend className="text-base font-extrabold text-fest-navy">3. 관심 직무 (복수 선택)</legend>
        <p className="mt-1 text-sm text-fest-muted">
          선택한 직무를 기준으로 기업관·직무관 부스를 자동 추천해 드립니다. (사전 매칭)
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {jobs.map((job) => (
            <label key={job.id} className="cursor-pointer">
              <input type="checkbox" name="interestJobs" value={job.id} className="peer sr-only" />
              <span className="fest-chip peer-checked:border-fest-blue peer-checked:bg-fest-sky peer-checked:text-fest-blue">
                {job.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 관심 분야 */}
      <fieldset>
        <legend className="text-base font-extrabold text-fest-navy">4. 관심 산업 분야</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {industries.map((ind) => (
            <label key={ind} className="cursor-pointer">
              <input
                type="checkbox"
                name="interestIndustries"
                value={ind}
                className="peer sr-only"
              />
              <span className="fest-chip peer-checked:border-fest-blue peer-checked:bg-fest-sky peer-checked:text-fest-blue">
                {ind}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 동의 */}
      <fieldset className="rounded-2xl bg-fest-bg p-5">
        <legend className="px-1 text-base font-extrabold text-fest-navy">5. 개인정보 동의</legend>
        <p className="mt-2 text-xs leading-relaxed text-fest-muted">
          수집 항목 : 이름, 휴대전화번호, 이메일, 소속·전공·학년, 관심 직무 · 수집 목적 : 행사 참가
          확인, 입장 및 부스 참여 관리, 입사지원·면접 매칭, 만족도 조사 · 보유 기간 : 행사 종료 후
          1년(이후 파기). 동의를 거부할 수 있으나 이 경우 사전등록 및 QR 발급이 제한됩니다.
        </p>
        <label className="mt-3 flex items-start gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="agreePrivacy"
            required
            className="mt-0.5 h-4 w-4 rounded border-fest-line text-fest-blue focus:ring-fest-blue"
          />
          <span>
            (필수) 개인정보 수집·이용에 동의합니다.
          </span>
        </label>
        <label className="mt-2 flex items-start gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="agreeMarketing"
            className="mt-0.5 h-4 w-4 rounded border-fest-line text-fest-blue focus:ring-fest-blue"
          />
          <span>(선택) 행사 안내 및 채용 정보 문자 수신에 동의합니다.</span>
        </label>
      </fieldset>

      {state.error && (
        <p className="rounded-xl border border-fest-coral/30 bg-red-50 px-4 py-3 text-sm font-bold text-fest-coral">
          {state.error}
        </p>
      )}

      <button type="submit" className="fest-btn-primary w-full">
        사전등록하고 입장 QR 받기
      </button>
      <p className="text-center text-xs text-fest-muted">
        이미 등록하셨다면 같은 연락처로 다시 등록해도 기존 QR 이 유지됩니다.
      </p>
    </form>
  );
}
