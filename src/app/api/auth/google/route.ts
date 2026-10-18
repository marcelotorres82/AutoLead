import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  buildGoogleAuthorizationUrl,
  createOAuthStateToken,
  generatePkceAndState,
  googleOAuthStateCookie,
  isGoogleOAuthConfigured,
  resolveGoogleCallbackUrl,
} from "@/lib/google-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`google-oauth-start:${ip}`, 15, 15 * 60_000);
  if (!rate.allowed) {
    return NextResponse.redirect(
      new URL("/login?error=rate_limit", request.url),
    );
  }

  if (!isGoogleOAuthConfigured() || !env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", request.url),
    );
  }

  const { state, codeVerifier, codeChallenge } = generatePkceAndState();
  const redirectUri = resolveGoogleCallbackUrl(request.url);
  const stateToken = await createOAuthStateToken({
    state,
    codeVerifier,
    redirectTo: "/dashboard",
  });

  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri,
    state,
    codeChallenge,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(googleOAuthStateCookie, stateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
