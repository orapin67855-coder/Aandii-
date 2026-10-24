import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth/http";
import { updateProfile } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

const Body = z.object({ username: z.string(), educationLevel: z.string(), age: z.number() });

export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "กรอกข้อมูลให้ครบ" }, { status: 400 });
  const result = await updateProfile(user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ user: result.user });
}
