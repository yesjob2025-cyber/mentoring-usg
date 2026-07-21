"use client";

import { useEffect, useRef, useState } from "react";

// meet.jit.si 외부 API 를 우리 페이지에 임베드 (Zoom 대체, 무료·계정 불필요)
// - 회차별 고유 방 이름으로 접속 → 같은 회차 신청자끼리 같은 방
// - 로그인 이름을 표시명으로 프리필

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      dispose: () => void;
      addEventListener: (event: string, listener: (...args: unknown[]) => void) => void;
    };
  }
}

const JITSI_DOMAIN = "meet.jit.si";

function loadJitsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const existing = document.getElementById("jitsi-external-api");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Jitsi 로드 실패")));
      return;
    }
    const s = document.createElement("script");
    s.id = "jitsi-external-api";
    s.src = `https://${JITSI_DOMAIN}/external_api.js`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Jitsi 로드 실패"));
    document.body.appendChild(s);
  });
}

export function VideoRoom({
  roomName,
  displayName,
  subject,
}: {
  roomName: string;
  displayName: string;
  subject: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let api: {
      dispose: () => void;
      addEventListener: (event: string, listener: (...args: unknown[]) => void) => void;
    } | null = null;
    let disposed = false;

    loadJitsiScript()
      .then(() => {
        if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          configOverwrite: {
            subject,
            prejoinPageEnabled: true,
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            disableThirdPartyRequests: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            MOBILE_APP_PROMO: false,
            DEFAULT_BACKGROUND: "#221f1a",
          },
        });
        api.addEventListener("videoConferenceJoined", () => setLoading(false));
        // 프리조인 화면에서 바로 로딩 표시 해제
        setLoading(false);
      })
      .catch(() => setError("화상 교육장을 불러오지 못했습니다. 네트워크를 확인하고 새로고침해 주세요."));

    return () => {
      disposed = true;
      try {
        api?.dispose();
      } catch {
        /* noop */
      }
    };
  }, [roomName, displayName, subject]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-ink-line bg-cream-100 p-8 text-center">
        <p className="text-ink-soft">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-ink-line bg-ink">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-cream-200/80">
          화상 교육장 연결 중…
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
