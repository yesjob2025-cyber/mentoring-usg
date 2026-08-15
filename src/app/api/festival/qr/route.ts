import { NextResponse } from "next/server";
import QRCode from "qrcode";

// 입장 QR 이미지 (SVG)
//   /api/festival/qr?data=<인코딩할 문자열>
// 참가자 토큰 URL 을 그대로 담으므로 어떤 QR 앱으로 찍어도 체크인 페이지로 연결된다.
export async function GET(req: Request) {
  const data = new URL(req.url).searchParams.get("data");
  if (!data) return NextResponse.json({ error: "data 파라미터가 필요합니다." }, { status: 400 });

  const svg = await QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0A1B3D", light: "#FFFFFF" },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
