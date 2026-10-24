import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, sessionCookie } from "@/lib/auth/http";
import { completeOAuth, pendingEmail } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const id = jar.get("aandii_pending")?.value;
  if (!id) return NextResponse.json({ pending: false });
  const email = await pendingEmail(id);
  if (!email) return NextResponse.json({ pending: false });
  return NextResponse.json({ pending: true, email });
}

const Body = z.object({ username: z.string(), educationLevel: z.string(), age: z.number() });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const jar = await cookies();
  const id = jar.get("aandii_pending")?.value;
  if (!id) return NextResponse.json({ error: "ไม่พบการยืนยันตัวตน" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "กรอกข้อมูลให้ครบ" }, { status: 400 });
  const result = await completeOAuth(id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  const cookie = sessionCookie(result.token);
  const res = NextResponse.json({ user: result.user });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  res.cookies.set("aandii_pending", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
