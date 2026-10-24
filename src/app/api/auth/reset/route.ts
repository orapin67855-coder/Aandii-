import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, sessionCookie } from "@/lib/auth/http";
import { resetPassword } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string(),
  code: z.string(),
  password: z.string(),
  confirm: z.string(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "กรอกข้อมูลให้ครบ" }, { status: 400 });
  const result = await resetPassword(parsed.data.email, parsed.data.code, parsed.data.password, parsed.data.confirm);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  const cookie = sessionCookie(result.token);
  const res = NextResponse.json({ user: result.user });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
