import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/http";
import { listConversations } from "@/lib/tutor/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const threads = await listConversations(user.id);
  return NextResponse.json({ threads });
}
