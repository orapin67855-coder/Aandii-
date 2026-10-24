import { NextResponse } from "next/server";
import { sameOrigin, sessionToken } from "@/lib/auth/http";
import { logout } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  await logout(await sessionToken());
  const res = NextResponse.json({ ok: true });
  res.cookies.set("aandii_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
