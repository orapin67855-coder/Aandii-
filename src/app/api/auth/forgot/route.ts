import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/auth/http";
import { requestReset } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

const Body = z.object({ email: z.string() });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ใส่อีเมลให้ถูกต้อง" }, { status: 400 });
  const result = await requestReset(parsed.data.email);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ code: result.code });
}
