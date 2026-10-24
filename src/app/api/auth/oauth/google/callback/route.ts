import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleIdentity } from "@/lib/auth/oauth";
import { sessionCookie } from "@/lib/auth/http";
import { loginWithProvider } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("aandii_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }
  const identity = await googleIdentity(url.origin, code);
  if (!identity) return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  const result = await loginWithProvider("google", identity.subject, identity.email);
  const res = "token" in result
    ? NextResponse.redirect(new URL("/home", url.origin))
    : NextResponse.redirect(new URL("/signup?welcome=1", url.origin));
  res.cookies.set("aandii_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
  if ("token" in result) {
    const cookie = sessionCookie(result.token);
    res.cookies.set(cookie.name, cookie.value, cookie.options);
  } else {
    res.cookies.set("aandii_pending", result.pendingId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 900, secure: process.env.NODE_ENV === "production" });
  }
  return res;
}
