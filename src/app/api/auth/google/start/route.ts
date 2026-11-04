import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { safeReturnTo, OAUTH_STATE_COOKIE, isGoogleAuthConfigured } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

const STATE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!isGoogleAuthConfigured()) {
    const url = new URL("/dang-nhap", request.nextUrl.origin);
    url.searchParams.set("error", "not_configured");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(24).toString("base64url");
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const redirectUri = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();

  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", clientId!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    Buffer.from(JSON.stringify({ state, returnTo })).toString("base64url"),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: STATE_MAX_AGE_SECONDS,
    },
  );
  return response;
}
