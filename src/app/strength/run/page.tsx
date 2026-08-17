import type { Metadata } from "next";
import { StrengthWizard } from "./wizard";

export const metadata: Metadata = {
  title: "일 강점 진단 진행",
  description:
    "30문항 진단 → 검사 결과 교차분석 → 나의 일 강점 유형·무기 확정 → 사례 확인 → 내 경험 정리 → 입사서류 전략까지 한 번에.",
};

export default function StrengthRunPage() {
  return <StrengthWizard />;
}
