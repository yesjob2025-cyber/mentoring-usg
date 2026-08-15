import { NextResponse } from "next/server";
import { isFestAdmin } from "@/lib/festival/session";
import {
  listAllApplications,
  listAllCheckins,
  listSurveys,
  listVisitors,
} from "@/lib/festival/repo";

// 운영 관리자 전용 CSV 내보내기
//   /api/festival/export?type=visitors|applications|checkins|surveys

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("|") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export async function GET(req: Request) {
  if (!(await isFestAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const type = new URL(req.url).searchParams.get("type") ?? "visitors";
  let rows: Record<string, unknown>[] = [];

  if (type === "visitors") {
    rows = (await listVisitors()).map((v) => ({ ...v, token: undefined }));
  } else if (type === "applications") {
    rows = (await listAllApplications()) as unknown as Record<string, unknown>[];
  } else if (type === "checkins") {
    rows = (await listAllCheckins()) as unknown as Record<string, unknown>[];
  } else if (type === "surveys") {
    rows = (await listSurveys()) as unknown as Record<string, unknown>[];
  } else {
    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  }

  // 엑셀 한글 깨짐 방지용 BOM
  const csv = `﻿${toCsv(rows)}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobfestival-${type}.csv"`,
    },
  });
}
