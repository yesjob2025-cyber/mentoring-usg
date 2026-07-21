import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTalkSession } from "@/lib/repo";
import { TALK_TEST_SESSION_ID } from "@/lib/talk-config";

export const metadata: Metadata = {
  title: "화상 교육장 · 온라인 토크콘서트",
};

function weekday(dateStr: string) {
  return ["일", "월", "화", "수", "목", "금", "토"][new Date(dateStr).getDay()];
}

function topicText(raw: string): string {
  const parts = raw.split(" · ");
  if (parts.length > 1 && /^\d{1,2}:\d{2}$/.test(parts[0].trim())) {
    return parts.slice(1).join(" · ");
  }
  return raw;
}

export default async function TalkRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "student" || !session.uid) {
    redirect(`/login?next=/talk-concert/room/${id}`);
  }

  const talk = await getTalkSession(id);
  if (!talk) notFound();

  const topic = topicText(talk.topic);

  // 현재는 테스트 회차 1개만 입장 가능
  if (talk.id !== TALK_TEST_SESSION_ID) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-ink-line bg-cream-100 p-8 text-center">
          <h1 className="text-xl font-extrabold">아직 열리지 않은 교육장입니다</h1>
          <p className="mt-2 text-sm text-ink-soft">
            현재는 테스트용 회차 1개만 입장할 수 있어요. 나머지 회차는 순차적으로 열립니다.
          </p>
          <Link href="/talk-concert" className="btn-brand mt-6 inline-flex">
            토크콘서트 일정으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 공용 Jitsi 서버에서 방 이름 충돌을 피하기 위한 고유 접두사
  const roomName = `buulgyeong-mentoring-${talk.id}`;
  const subject = `${talk.track} · ${topic}`;
  const { VideoRoom } = await import("./video-room");

  return (
    <div className="container-page py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/talk-concert" className="text-sm text-ink-muted hover:text-ink-soft">
            ← 토크콘서트 일정
          </Link>
          <h1 className="mt-1 text-2xl font-black">
            {talk.mentorName ? `${talk.mentorName} 멘토 ` : ""}
            {topic}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {talk.date.slice(5).replace("-", ".")} ({weekday(talk.date)}) 19:00~22:00 · {talk.track}
            {talk.company ? ` · ${talk.company}` : ""}
          </p>
        </div>
        <span className="badge bg-amber-50 text-amber-700">테스트 교육장</span>
      </div>

      <div className="mt-4 h-[70vh] min-h-[480px]">
        <VideoRoom
          roomName={roomName}
          displayName={session.name || "참가자"}
          subject={subject}
          sessionId={talk.id}
        />
      </div>

      <p className="mt-3 text-center text-xs text-ink-muted">
        입장 시 마이크는 기본 음소거로 시작합니다. 카메라·마이크 권한을 허용해 주세요. 진행자 안내에
        따라 질문 시 음소거를 해제하세요.
      </p>
    </div>
  );
}
