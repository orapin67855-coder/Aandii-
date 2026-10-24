import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/http";
import { getRoom, joinRoom, ownerInvite, setShowRank, tickRoom, addRoomSubject, leaveRoom } from "@/lib/rooms/store";
import { subjectName } from "@/lib/rooms/rules";
import { syncFocusFromRoom } from "@/lib/study/store";

export const dynamic = "force-dynamic";

const Join = z.object({
  displayName: z.string().trim().min(1).max(24),
  password: z.string().max(40).nullable(),
  invite: z.string().max(80).nullable().optional(),
});

const Tick = z.object({
  seatId: z.string().uuid(),
  reading: z.boolean(),
  subjectId: z.string().nullable(),
});

const Add = z.object({
  seatId: z.string().uuid(),
  name: z.string().trim().min(1).max(30),
});

const Leave = z.object({
  seatId: z.string().uuid(),
  leave: z.literal(true),
});

const Rank = z.object({
  seatId: z.string().uuid(),
  showRank: z.boolean(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const room = await getRoom(id);
  if (!room) return NextResponse.json({ error: "ไม่พบห้องนี้" }, { status: 404 });
  const user = await currentUser();
  const inviteToken = user ? await ownerInvite(id, user.id) : null;
  return NextResponse.json({ room, inviteToken });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = Join.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ใส่ชื่อที่จะแสดงบนโต๊ะ" }, { status: 400 });
  const user = await currentUser();
  const result = await joinRoom(id, parsed.data.displayName, parsed.data.password, user?.id, parsed.data.invite);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ room: result.room, seatId: result.seatId });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const leaving = Leave.safeParse(body);
  if (leaving.success) {
    const result = await leaveRoom(id, leaving.data.seatId);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json({ ok: true });
  }
  const added = Add.safeParse(body);
  if (added.success && !("reading" in (body as object))) {
    const result = await addRoomSubject(id, added.data.seatId, added.data.name);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json({ room: result.room, subject: result.subject });
  }
  const rank = Rank.safeParse(body);
  if (rank.success) {
    const result = await setShowRank(id, rank.data.seatId, rank.data.showRank);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json({ room: result.room });
  }
  const parsed = Tick.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลการอ่านไม่ถูกต้อง" }, { status: 400 });
  const user = await currentUser();
  const result = await tickRoom(id, parsed.data.seatId, parsed.data.reading, parsed.data.subjectId, user?.id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  if (user) {
    const name = result.room.subjects.find((subject) => subject.id === parsed.data.subjectId)?.name ?? subjectName(parsed.data.subjectId);
    await syncFocusFromRoom(user.id, parsed.data.reading ? name : null, parsed.data.reading);
    const room = await getRoom(id);
    return NextResponse.json({ room: room ?? result.room });
  }
  return NextResponse.json({ room: result.room });
}
