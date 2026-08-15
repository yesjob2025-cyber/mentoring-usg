"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FestLink, useFestBase } from "./fest-link";
import { FEST } from "@/lib/festival/config";

const NAV = [
  { href: "/about", label: "행사안내" },
  { href: "/companies", label: "기업관" },
  { href: "/jobs", label: "직무관" },
  { href: "/promos", label: "홍보관" },
  { href: "/events", label: "부대행사" },
  { href: "/guide", label: "참여방법" },
];

export function FestHeader({ hasPass }: { hasPass: boolean }) {
  const [open, setOpen] = useState(false);
  const base = useFestBase();
  const pathname = usePathname();

  const isActive = (href: string) => pathname === `${base}${href}`;

  return (
    <header className="sticky top-0 z-50 border-b border-fest-line/80 bg-white/90 backdrop-blur">
      <div className="fest-container flex h-16 items-center justify-between gap-4">
        <FestLink href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fest-navy text-[11px] font-black leading-none text-white">
            JOB
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight text-fest-navy">
              {FEST.titleShort}
            </span>
            <span className="block text-[10px] font-bold tracking-[0.14em] text-fest-blue">
              {FEST.dateShort} · {FEST.timeLabel}
            </span>
          </span>
        </FestLink>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <FestLink
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                isActive(item.href)
                  ? "bg-fest-sky text-fest-blue"
                  : "text-fest-ink/80 hover:bg-fest-ink/5"
              }`}
            >
              {item.label}
            </FestLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {hasPass ? (
            <FestLink href="/pass" className="fest-btn-primary fest-btn-sm">
              내 입장권
            </FestLink>
          ) : (
            <>
              <FestLink href="/pass/find" className="fest-btn-ghost fest-btn-sm">
                입장권 찾기
              </FestLink>
              <FestLink href="/register" className="fest-btn-primary fest-btn-sm">
                사전등록
              </FestLink>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="메뉴 열기"
          aria-expanded={open}
          className="rounded-lg border border-fest-line p-2 lg:hidden"
        >
          <span className="block h-0.5 w-5 bg-fest-ink" />
          <span className="mt-1 block h-0.5 w-5 bg-fest-ink" />
          <span className="mt-1 block h-0.5 w-5 bg-fest-ink" />
        </button>
      </div>

      {open && (
        <div className="border-t border-fest-line bg-white lg:hidden">
          <div className="fest-container grid gap-1 py-3">
            {NAV.map((item) => (
              <FestLink
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-bold text-fest-ink hover:bg-fest-sky"
              >
                {item.label}
              </FestLink>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <FestLink
                href="/pass"
                onClick={() => setOpen(false)}
                className="fest-btn-outline fest-btn-sm"
              >
                내 입장권
              </FestLink>
              <FestLink
                href="/register"
                onClick={() => setOpen(false)}
                className="fest-btn-primary fest-btn-sm"
              >
                사전등록
              </FestLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
