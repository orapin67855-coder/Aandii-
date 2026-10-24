import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleAuthUrl, providerFlags } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!providerFlags().google) return NextResponse.json({ error: "ยังไม่ได้เชื่อม Google บนเซิร์ฟเวอร์" }, { status: 404 });
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(googleAuthUrl(new URL(req.url).origin, state));
  res.cookies.set("aandii_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600, secure: process.env.NODE_ENV === "production" });
  return res;
}
