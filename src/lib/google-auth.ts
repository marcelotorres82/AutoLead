import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { getAuthSecretKey, isAuthorizedGoogleEmail } from "@/lib/auth";
import { env } from "@/lib/env";

export const googleOAuthStateCookie = "prospect-radar-google-oauth-state";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export type GoogleUserProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

export type OAuthStatePayload = {
  state: string;
  codeVerifier: string;
  redirectTo?: string;
};

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function generatePkceAndState() {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { state, codeVerifier, codeChallenge };
}

export async function createOAuthStateToken(
  payload: OAuthStatePayload,
): Promise<string> {
  return new SignJWT({
    state: payload.state,
    codeVerifier: payload.codeVerifier,
    redirectTo: payload.redirectTo,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getAuthSecretKey());
}

export async function verifyOAuthStateToken(
  token?: string,
): Promise<OAuthStatePayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    if (
      typeof payload.state !== "string" ||
      typeof payload.codeVerifier !== "string"
    ) {
      return null;
    }
    return {
      state: payload.state,
      codeVerifier: payload.codeVerifier,
      redirectTo:
        typeof payload.redirectTo === "string" ? payload.redirectTo : undefined,
    };
  } catch {
    return null;
  }
}

export function resolveGoogleCallbackUrl(requestUrl: string): string {
  const reqUrl = new URL(requestUrl);
  const configuredUrl = (
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  )?.trim();
  if (
    !configuredUrl ||
    (reqUrl.hostname !== "localhost" &&
      reqUrl.hostname !== "127.0.0.1" &&
      configuredUrl.includes("localhost"))
  ) {
    return `${reqUrl.origin}/api/auth/google/callback`;
  }
  const baseUrl = configuredUrl.replace(/\/$/, "");
  return `${baseUrl}/api/auth/google/callback`;
}

export function buildGoogleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  loginHint?: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  if (input.loginHint) {
    url.searchParams.set("login_hint", input.loginHint);
  }
  return url.toString();
}

export async function exchangeGoogleCodeForProfile(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<GoogleUserProfile> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({
      code: input.code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
      code_verifier: input.codeVerifier,
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!tokenResponse.ok) {
    throw new Error("GOOGLE_TOKEN_EXCHANGE_FAILED");
  }

  const tokenData = (await tokenResponse.json().catch(() => null)) as {
    access_token?: string;
    id_token?: string;
  } | null;

  if (!tokenData?.id_token && !tokenData?.access_token) {
    throw new Error("GOOGLE_TOKEN_INVALID");
  }

  let profile: GoogleUserProfile | null = null;

  if (tokenData.id_token) {
    const { payload } = await jwtVerify(tokenData.id_token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: env.GOOGLE_CLIENT_ID,
    });
    if (typeof payload.email === "string" && typeof payload.sub === "string") {
      profile = {
        sub: payload.sub,
        email: payload.email.trim().toLowerCase(),
        emailVerified: Boolean(payload.email_verified),
        name:
          typeof payload.name === "string" && payload.name.trim()
            ? payload.name.trim()
            : payload.email.split("@")[0],
        picture:
          typeof payload.picture === "string" ? payload.picture : undefined,
      };
    }
  }

  if (!profile && tokenData.access_token) {
    const userResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        authorization: `Bearer ${tokenData.access_token}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!userResponse.ok) {
      throw new Error("GOOGLE_USERINFO_FAILED");
    }
    const userInfo = (await userResponse.json().catch(() => null)) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    } | null;
    if (userInfo?.email && userInfo?.sub) {
      profile = {
        sub: userInfo.sub,
        email: userInfo.email.trim().toLowerCase(),
        emailVerified: Boolean(userInfo.email_verified),
        name: userInfo.name?.trim() || userInfo.email.split("@")[0],
        picture: userInfo.picture,
      };
    }
  }

  if (!profile) {
    throw new Error("GOOGLE_PROFILE_MISSING");
  }

  if (!profile.emailVerified) {
    throw new Error("GOOGLE_EMAIL_NOT_VERIFIED");
  }

  if (!isAuthorizedGoogleEmail(profile.email)) {
    throw new Error("GOOGLE_UNAUTHORIZED_EMAIL");
  }

  return profile;
}
