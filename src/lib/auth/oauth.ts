export function providerFlags() {
  return {
    google: Boolean(process.env.AUTH_GOOGLE_CLIENT_ID && process.env.AUTH_GOOGLE_CLIENT_SECRET),
    apple: Boolean(process.env.AUTH_APPLE_CLIENT_ID && process.env.AUTH_APPLE_CLIENT_SECRET),
  };
}

export function googleAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${origin}/api/auth/oauth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function appleAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_APPLE_CLIENT_ID ?? "",
    redirect_uri: `${origin}/api/auth/oauth/apple/callback`,
    response_type: "code",
    response_mode: "form_post",
    scope: "name email",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}

export async function googleIdentity(origin: string, code: string): Promise<{ subject: string; email: string } | null> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.AUTH_GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.AUTH_GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: `${origin}/api/auth/oauth/google/callback`,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  if (!tokenRes.ok) return null;
  const token = await tokenRes.json() as { access_token?: string };
  if (!token.access_token) return null;
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!infoRes.ok) return null;
  const info = await infoRes.json() as { sub?: string; email?: string; email_verified?: boolean };
  if (!info.sub || !info.email || info.email_verified === false) return null;
  return { subject: info.sub, email: info.email };
}

export async function appleIdentity(origin: string, code: string): Promise<{ subject: string; email: string } | null> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.AUTH_APPLE_CLIENT_ID ?? "",
    client_secret: process.env.AUTH_APPLE_CLIENT_SECRET ?? "",
    redirect_uri: `${origin}/api/auth/oauth/apple/callback`,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://appleid.apple.com/auth/token", { method: "POST", body });
  if (!tokenRes.ok) return null;
  const token = await tokenRes.json() as { id_token?: string };
  if (!token.id_token) return null;
  const payload = token.id_token.split(".")[1];
  if (!payload) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; email?: string; iss?: string; aud?: string; exp?: number };
  const audience = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud;
  if (claims.iss !== "https://appleid.apple.com") return null;
  if (audience !== process.env.AUTH_APPLE_CLIENT_ID) return null;
  if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
  if (!claims.sub || !claims.email) return null;
  return { subject: claims.sub, email: claims.email };
}
