"use client";

import { useActionState } from "react";
import { staffLoginAction, type FestFormState } from "../actions";

export interface BoothOption {
  zone: string;
  id: string;
  name: string;
  boothNo: string;
}

const ZONE_LABEL: Record<string, string> = {
  entry: "입장/종합안내",
  company: "기업관",
  job: "직무관",
  promo: "홍보관",
  side: "부대행사",
};

export function StaffLoginForm({ booths }: { booths: BoothOption[] }) {
  const [state, action] = useActionState<FestFormState, FormData>(staffLoginAction, {});
  const groups = Array.from(new Set(booths.map((b) => b.zone)));

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="fest-label" htmlFor="booth">
          담당 부스
        </label>
        <select id="booth" name="booth" required defaultValue="" className="fest-input">
          <option value="" disabled>
            부스를 선택하세요
          </option>
          {groups.map((zone) => (
            <optgroup key={zone} label={ZONE_LABEL[zone] ?? zone}>
              {booths
                .filter((b) => b.zone === zone)
                .map((b) => (
                  <option key={`${b.zone}:${b.id}`} value={`${b.zone}:${b.id}`}>
                    [{b.boothNo}] {b.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="fest-label" htmlFor="pin">
          운영 PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          required
          inputMode="numeric"
          className="fest-input font-mono tracking-widest"
          placeholder="4자리"
        />
      </div>

      {state.error && (
        <p className="rounded-xl border border-fest-coral/30 bg-red-50 px-4 py-3 text-sm font-bold text-fest-coral">
          {state.error}
        </p>
      )}

      <button type="submit" className="fest-btn-primary w-full">
        체크인 화면 열기
      </button>
    </form>
  );
}
