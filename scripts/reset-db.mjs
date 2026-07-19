// 개발용: 로컬 JSON 데이터 스토어를 삭제 → 다음 서버 기동 시 시드에서 재생성
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), ".data");
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("✓ .data 삭제됨 — 다음 실행 시 시드 데이터로 재생성됩니다.");
} else {
  console.log("· .data 가 없습니다. (이미 초기 상태)");
}
