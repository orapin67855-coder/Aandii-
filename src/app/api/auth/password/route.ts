import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin, sessionCookie } from "@/lib/auth/http";
import { changePassword } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

const Body = z.object({ current: z.string(), next: z.string() });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "กรอกรหัสผ่านให้ครบ" }, { status: 400 });
  const result = await changePassword(user.id, parsed.data.current, parsed.data.next);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  const cookie = sessionCookie(result.token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
