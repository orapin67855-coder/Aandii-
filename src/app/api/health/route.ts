import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/tutor/provider";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, ai: aiConfigured(), time: new Date().toISOString() });
}
