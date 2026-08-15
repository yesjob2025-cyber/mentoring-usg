"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { staffCheckinAction, type ScanState } from "../../actions";

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

export function Scanner({ boothName, boothNo }: { boothName: string; boothNo: string }) {
  const [state, action, pending] = useActionState<ScanState, FormData>(staffCheckinAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastValueRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  const [supported, setSupported] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [mode, setMode] = useState<"booth" | "exit">("booth");

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };

  useEffect(() => stopCamera, []);

  const submitValue = (value: string) => {
    const now = Date.now();
    if (lastValueRef.current.value === value && now - lastValueRef.current.at < 4000) return;
    lastValueRef.current = { value, at: now };
    if (inputRef.current) inputRef.current.value = value;
    formRef.current?.requestSubmit();
  };

  const startCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamOn(true);

      const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });

      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) submitValue(codes[0].rawValue);
        } catch {
          // 프레임 디코딩 실패는 무시하고 다음 프레임 시도
        }
        if (streamRef.current) setTimeout(tick, 400);
      };
      void tick();
    } catch {
      setCamError("카메라를 사용할 수 없습니다. 휴대폰 QR 앱으로 스캔하거나 코드를 직접 입력해 주세요.");
      stopCamera();
    }
  };

  return (
    <div className="space-y-5">
      <div className="fest-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-fest-muted">체크인 대상 부스</p>
            <p className="text-lg font-extrabold text-fest-navy">
              {boothName} <span className="text-sm text-fest-muted">({boothNo})</span>
            </p>
          </div>
          <div className="flex rounded-xl border border-fest-line p-1">
            <button
              type="button"
              onClick={() => setMode("booth")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                mode === "booth" ? "bg-fest-blue text-white" : "text-fest-muted"
              }`}
            >
              참여 체크
            </button>
            <button
              type="button"
              onClick={() => setMode("exit")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                mode === "exit" ? "bg-fest-navy text-white" : "text-fest-muted"
              }`}
            >
              퇴장 체크
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-fest-navy">
          <video
            ref={videoRef}
            muted
            playsInline
            className={`h-64 w-full object-cover ${camOn ? "" : "hidden"}`}
          />
          {!camOn && (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-white/70">
              <p className="text-sm">
                {supported
                  ? "카메라로 참가자 QR 을 스캔하세요"
                  : "이 브라우저는 카메라 스캔을 지원하지 않습니다"}
              </p>
              {supported && (
                <button type="button" onClick={startCamera} className="fest-btn-primary fest-btn-sm">
                  카메라 켜기
                </button>
              )}
            </div>
          )}
        </div>
        {camOn && (
          <button type="button" onClick={stopCamera} className="fest-btn-ghost fest-btn-sm mt-2">
            카메라 끄기
          </button>
        )}
        {camError && <p className="mt-2 text-sm font-bold text-fest-coral">{camError}</p>}
      </div>

      <form ref={formRef} action={action} className="fest-card p-5">
        <input type="hidden" name="mode" value={mode === "exit" ? "exit" : "booth"} />
        <label className="fest-label" htmlFor="scan-code">
          QR 스캔 결과 또는 6자리 확인 코드
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            id="scan-code"
            name="code"
            className="fest-input font-mono text-lg tracking-widest"
            placeholder="123456"
            inputMode="text"
            autoComplete="off"
          />
          <button type="submit" disabled={pending} className="fest-btn-primary shrink-0">
            {pending ? "확인 중…" : "체크인"}
          </button>
        </div>
        <p className="mt-2 text-xs text-fest-muted">
          휴대폰 QR 앱으로 스캔한 링크를 붙여넣어도 됩니다.
        </p>
      </form>

      {(state.error || state.ok) && (
        <div
          className={`rounded-2xl border p-5 ${
            state.error
              ? "border-fest-coral/30 bg-red-50"
              : state.duplicated
                ? "border-amber-300/50 bg-amber-50"
                : "border-fest-emerald/30 bg-emerald-50"
          }`}
        >
          {state.error ? (
            <p className="text-sm font-bold text-fest-coral">{state.error}</p>
          ) : (
            <>
              <p className="text-lg font-black text-fest-navy">{state.message}</p>
              <p className="mt-1 text-sm font-bold text-fest-muted">
                {state.visitorName} · {state.visitorCourse}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="fest-chip-blue">
                  스탬프 {state.stampCollected} / {state.stampGoal}
                </span>
                {state.stampCompleted && (
                  <span className="fest-chip border-fest-emerald/30 bg-white text-fest-emerald">
                    스탬프 완주! 완주 코드 {state.awardCode}
                  </span>
                )}
                {state.duplicated && <span className="fest-chip">중복 체크인 (기록 유지)</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
