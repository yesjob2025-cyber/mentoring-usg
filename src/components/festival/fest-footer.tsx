import { FestLink } from "./fest-link";
import { FEST, ZONES } from "@/lib/festival/config";

export function FestFooter() {
  return (
    <footer className="mt-20 border-t border-fest-line bg-fest-navy text-white/80">
      <div className="fest-container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-lg font-extrabold text-white">{FEST.title}</p>
          <p className="mt-2 text-sm">{FEST.tagline}</p>
          <dl className="mt-5 space-y-1.5 text-sm">
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 font-bold text-white/60">일시</dt>
              <dd>
                {FEST.dateLabel} {FEST.timeLabel}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 font-bold text-white/60">장소</dt>
              <dd>{FEST.venueDetail}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 font-bold text-white/60">문의</dt>
              <dd>
                {FEST.contact.phone} · {FEST.contact.email}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <p className="text-sm font-extrabold text-white">행사 구성</p>
          <ul className="mt-3 space-y-2 text-sm">
            {ZONES.map((z) => (
              <li key={z.key}>
                <FestLink href={z.href} className="hover:text-white">
                  {z.name}
                </FestLink>
              </li>
            ))}
            <li>
              <FestLink href="/guide" className="hover:text-white">
                참여방법 안내
              </FestLink>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-extrabold text-white">참가자 메뉴</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <FestLink href="/register" className="hover:text-white">
                사전등록 / QR 발급
              </FestLink>
            </li>
            <li>
              <FestLink href="/pass" className="hover:text-white">
                내 입장권 · 스탬프
              </FestLink>
            </li>
            <li>
              <FestLink href="/pass/find" className="hover:text-white">
                입장권 찾기
              </FestLink>
            </li>
            <li>
              <FestLink href="/staff" className="hover:text-white">
                부스 운영자 체크인
              </FestLink>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="fest-container flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            주최 {FEST.host.join(" · ")} &nbsp;|&nbsp; 주관 {FEST.organizers.join(" · ")}
          </p>
          <p>© 2026 {FEST.title}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
