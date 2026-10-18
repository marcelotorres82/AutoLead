import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit-log";
import { createSession, sessionCookie } from "@/lib/auth";
import {
  exchangeGoogleCodeForProfile,
  googleOAuthStateCookie,
  resolveGoogleCallbackUrl,
  verifyOAuthStateToken,
} from "@/lib/google-auth";
import { checkRateLimit, getClientIp, resetRateLimit } from "@/lib/rate-limit";
import { safeCompareSecrets } from "@/lib/security";

function redirectWithClearCookie(requestUrl: string, targetPath: string) {
  const response = NextResponse.redirect(new URL(targetPath, requestUrl));
  response.cookies.set(googleOAuthStateCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
  return response;
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`google-oauth-cb:${ip}`, 15, 15 * 60_000);
  if (!rate.allowed) {
    return redirectWithClearCookie(request.url, "/login?error=rate_limit");
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return redirectWithClearCookie(
      request.url,
      "/login?error=google_access_denied",
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stateToken = cookieStore.get(googleOAuthStateCookie)?.value;
  const savedState = await verifyOAuthStateToken(stateToken);

  if (
    !code ||
    !state ||
    !savedState ||
    !safeCompareSecrets(state, savedState.state)
  ) {
    return redirectWithClearCookie(
      request.url,
      "/login?error=google_invalid_state",
    );
  }

  try {
    const redirectUri = resolveGoogleCallbackUrl(request.url);
    const profile = await exchangeGoogleCodeForProfile({
      code,
      codeVerifier: savedState.codeVerifier,
      redirectUri,
    });

    resetRateLimit(`google-oauth-cb:${ip}`);
    resetRateLimit(`google-oauth-start:${ip}`);

    await recordAuditLog({
      actorEmail: profile.email,
      actorName: profile.name,
      action: "AUTH_LOGIN_GOOGLE_SUCCESS",
      entity: "users",
      entityId: profile.email,
      metadata: { provider: "google", sub: profile.sub },
      ip,
    });

    const sessionToken = await createSession({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      provider: "google",
      role: "admin",
    });

    const destination =
      savedState.redirectTo && savedState.redirectTo.startsWith("/")
        ? savedState.redirectTo
        : "/dashboard";

    const response = redirectWithClearCookie(request.url, destination);
    response.cookies.set(sessionCookie, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    const codeMessage =
      error instanceof Error ? error.message : "GOOGLE_OAUTH_FAILED";

    if (codeMessage === "GOOGLE_UNAUTHORIZED_EMAIL") {
      await recordAuditLog({
        action: "AUTH_LOGIN_GOOGLE_REJECTED",
        entity: "users",
        metadata: { reason: "GOOGLE_UNAUTHORIZED_EMAIL" },
        ip,
      });
      return redirectWithClearCookie(
        request.url,
        "/login?error=google_unauthorized",
      );
    }

    if (codeMessage === "GOOGLE_EMAIL_NOT_VERIFIED") {
      return redirectWithClearCookie(
        request.url,
        "/login?error=google_unverified",
      );
    }

    console.error(
      JSON.stringify({
        level: "error",
        message: "google_oauth_callback_failed",
        error: codeMessage,
      }),
    );
    return redirectWithClearCookie(
      request.url,
      "/login?error=google_oauth_failed",
    );
  }
}
