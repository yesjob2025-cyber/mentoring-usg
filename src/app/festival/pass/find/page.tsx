import type { Metadata } from "next";
import { PageHero } from "@/components/festival/page-hero";
import { FestLink } from "@/components/festival/fest-link";
import { FindPassForm } from "./find-form";

export const metadata: Metadata = {
  title: "내 입장권 찾기",
};

export default function FindPassPage() {
  return (
    <>
      <PageHero
        eyebrow="My pass"
        title="내 입장권 찾기"
        description="사전등록할 때 입력한 이름과 휴대전화 번호로 입장 QR 을 다시 불러올 수 있습니다."
      />
      <div className="fest-container py-10 sm:py-14">
        <div className="mx-auto max-w-md">
          <div className="fest-card p-6 sm:p-8">
            <FindPassForm />
          </div>
          <p className="mt-5 text-center text-sm text-fest-muted">
            아직 사전등록을 하지 않으셨나요?{" "}
            <FestLink href="/register" className="font-bold text-fest-blue hover:underline">
              사전등록 하기
            </FestLink>
          </p>
        </div>
      </div>
    </>
  );
}
