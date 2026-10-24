import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth/http";
import { deleteConversation, readConversation } from "@/lib/tutor/store";

export const dynamic = "force-dynamic";

const Id = z.string().uuid();
type Ctx = { params: Promise<{ id: string }> };
const missing = () => NextResponse.json({ error: "ไม่พบบทสนทนา" }, { status: 404 });

export async function GET(_: Request, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const id = Id.safeParse((await ctx.params).id);
  if (!id.success) return missing();
  const messages = await readConversation(user.id, id.data);
  return messages ? NextResponse.json({ messages }) : missing();
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const id = Id.safeParse((await ctx.params).id);
  if (!id.success) return missing();
  return (await deleteConversation(user.id, id.data)) ? NextResponse.json({ ok: true }) : missing();
}
