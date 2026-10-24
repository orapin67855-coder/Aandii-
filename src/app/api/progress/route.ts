import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/http";
import { focusChart } from "@/lib/study/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const span = new URL(req.url).searchParams.get("span");
  const chosen = span === "month" || span === "year" ? span : "week";
  return NextResponse.json(await focusChart(user.id, chosen));
}
