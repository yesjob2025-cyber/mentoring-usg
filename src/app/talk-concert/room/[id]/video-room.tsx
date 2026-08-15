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
  sessionId,
}: {
  roomName: string;
  displayName: string;
  subject: string;
  sessionId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const attendanceIdRef = useRef<string | null>(null);

  useEffect(() => {
    let api: {
      dispose: () => void;
      addEventListener: (event: string, listener: (...args: unknown[]) => void) => void;
    } | null = null;
    let disposed = false;

    // 입장 기록 → 출석 id 저장
    const logJoin = () => {
      if (attendanceIdRef.current) return;
      fetch("/api/talk/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.attendanceId) attendanceIdRef.current = d.attendanceId;
        })
        .catch(() => {});
    };
    // 퇴장 기록 (탭 종료 시에도 전송되도록 sendBeacon 우선)
    const logLeave = () => {
      const id = attendanceIdRef.current;
      if (!id) return;
      attendanceIdRef.current = null;
      const body = JSON.stringify({ attendanceId: id });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/talk/leave", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/talk/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };
    const onPageHide = () => logLeave();
    window.addEventListener("pagehide", onPageHide);

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
        api.addEventListener("videoConferenceJoined", () => {
          setLoading(false);
          logJoin();
        });
        api.addEventListener("videoConferenceLeft", () => logLeave());
        api.addEventListener("readyToClose", () => logLeave());
        // 프리조인 화면에서 바로 로딩 표시 해제
        setLoading(false);
      })
      .catch(() => setError("화상 교육장을 불러오지 못했습니다. 네트워크를 확인하고 새로고침해 주세요."));

    return () => {
      disposed = true;
      window.removeEventListener("pagehide", onPageHide);
      logLeave();
      try {
        api?.dispose();
      } catch {
        /* noop */
      }
    };
  }, [roomName, displayName, subject, sessionId]);

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
