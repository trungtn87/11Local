import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { createUserSession, safeReturnTo, userCookie } from "@/lib/user-auth";
import { OAUTH_STATE_COOKIE, isValidGoogleIdentity, type GoogleTokenInfo } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

function equalState(a?: string, b?: string) {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function loginRedirect(request: NextRequest, error: string) {
  const url = new URL("/dang-nhap", request.nextUrl.origin);
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginRedirect(request, "not_configured");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) return loginRedirect(request, "cancelled");
  if (!code || !state) return loginRedirect(request, "invalid_callback");

  let savedState = "";
  let returnTo = "/tai-khoan";
  try {
    const cookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
    const parsed = cookie ? JSON.parse(Buffer.from(cookie, "base64url").toString("utf8")) : null;
    savedState = typeof parsed?.state === "string" ? parsed.state : "";
    returnTo = safeReturnTo(typeof parsed?.returnTo === "string" ? parsed.returnTo : null);
  } catch {
    return loginRedirect(request, "invalid_state");
  }
  if (!equalState(state, savedState)) return loginRedirect(request, "invalid_state");

  const redirectUri = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) return loginRedirect(request, "token_exchange_failed");

    const tokenBody = await tokenResponse.json() as { id_token?: string };
    if (!tokenBody.id_token) return loginRedirect(request, "missing_identity");

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenBody.id_token)}`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
    if (!tokenInfoResponse.ok) return loginRedirect(request, "invalid_identity");

    const profile = await tokenInfoResponse.json() as GoogleTokenInfo;
    if (!isValidGoogleIdentity(profile, clientId)) return loginRedirect(request, "invalid_identity");

    const sql = db();
    const rows = await sql`
      INSERT INTO users (google_sub, email, display_name, avatar_url)
      VALUES (
        ${profile.sub},
        ${profile.email},
        ${profile.name || profile.email.split("@")[0]},
        ${profile.picture || null}
      )
      ON CONFLICT (google_sub) DO UPDATE
      SET email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = now(),
          last_login_at = now()
      RETURNING id, email, display_name, avatar_url
    `;
    const row = rows[0];
    if (!row) return loginRedirect(request, "account_failed");

    const response = NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
    response.cookies.set(
      userCookie.name,
      createUserSession({
        id: String(row.id),
        email: String(row.email),
        name: String(row.display_name),
        avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: userCookie.maxAge,
      },
    );
    response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error instanceof Error ? error.name : "UnknownError");
    return loginRedirect(request, "auth_failed");
  }
}
