"use client";

import { useState } from "react";

export function StepHeading({
  step,
  title,
  desc,
}: {
  step: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="mb-6">
      <span className="chip-brand">STEP {step}</span>
      <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft sm:text-base">{desc}</p>
    </div>
  );
}

/** 0~100 점수 막대 */
export function ScoreBar({
  label,
  emoji,
  value,
  highlight,
}: {
  label: string;
  emoji?: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 text-sm font-semibold">
        {emoji ? `${emoji} ` : ""}
        {label}
      </div>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-cream-200">
        <div
          className={`h-full rounded-full transition-all ${highlight ? "bg-brand-400" : "bg-ink/25"}`}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
      <div className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-ink-soft">
        {value}
      </div>
    </div>
  );
}

export function CopyButton({
  text,
  label = "복사",
  className = "btn-outline",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // 클립보드 권한이 없는 환경(구형 브라우저 등) 대비
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? "복사됨 ✓" : label}
    </button>
  );
}

export function Callout({
  tone = "brand",
  children,
}: {
  tone?: "brand" | "warn" | "plain";
  children: React.ReactNode;
}) {
  const cls =
    tone === "brand"
      ? "border-brand-200 bg-brand-50 text-ink"
      : tone === "warn"
        ? "border-orange-200 bg-orange-50 text-ink"
        : "border-ink-line bg-white text-ink-soft";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${cls}`}>{children}</div>
  );
}

export function Accordion({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span>
          <span className="block text-base font-extrabold">{title}</span>
          {subtitle ? <span className="mt-0.5 block text-sm text-ink-muted">{subtitle}</span> : null}
        </span>
        <span className="shrink-0 text-ink-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open ? <div className="border-t border-ink-line px-5 py-5">{children}</div> : null}
    </div>
  );
}
