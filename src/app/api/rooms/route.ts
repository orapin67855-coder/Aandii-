import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/http";
import { createRoom, listRooms } from "@/lib/rooms/store";

export const dynamic = "force-dynamic";

const Create = z.object({
  name: z.string().trim().min(1).max(40),
  displayName: z.string().trim().min(1).max(24),
  isPublic: z.boolean(),
  password: z.string().min(4).max(40).nullable(),
  showRank: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({ rooms: await listRooms() });
}

export async function POST(req: Request) {
  const parsed = Create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ชื่อห้อง ชื่อที่แสดง หรือรหัสผ่านยังไม่ครบ" }, { status: 400 });
  if (!parsed.data.isPublic && !parsed.data.password) return NextResponse.json({ error: "ห้องล็อกต้องมีรหัสผ่านอย่างน้อย 4 ตัว" }, { status: 400 });
  const user = await currentUser();
  const created = await createRoom({ ...parsed.data, userId: user?.id });
  return NextResponse.json(created);
}
