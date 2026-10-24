import { cookies } from "next/headers";
import type { PublicUser } from "@/lib/auth/rules";
import { userFromToken } from "@/lib/auth/store";

const COOKIE = "aandii_session";

export function sessionCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 14,
    },
  };
}

export async function currentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  return userFromToken(jar.get(COOKIE)?.value);
}

export async function sessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value;
}

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
