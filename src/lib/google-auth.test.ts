import { describe, expect, it } from "vitest";
import {
  createSession,
  isAuthorizedGoogleEmail,
  PRIMARY_AUTHORIZED_EMAIL,
  verifySession,
} from "@/lib/auth";
import {
  buildGoogleAuthorizationUrl,
  createOAuthStateToken,
  generatePkceAndState,
  verifyOAuthStateToken,
} from "@/lib/google-auth";

describe("Google OAuth 2.0 & Authorization Policy", () => {
  it("permite exclusivamente marcelotorres1982@gmail.com no login Google OAuth", () => {
    expect(PRIMARY_AUTHORIZED_EMAIL).toBe("marcelotorres1982@gmail.com");
    expect(isAuthorizedGoogleEmail("marcelotorres1982@gmail.com")).toBe(true);
    expect(isAuthorizedGoogleEmail("  MarceloTorres1982@gmail.com ")).toBe(
      true,
    );
    expect(isAuthorizedGoogleEmail("outro.usuario@gmail.com")).toBe(false);
    expect(isAuthorizedGoogleEmail("demo@prospectradar.local")).toBe(false);
    expect(isAuthorizedGoogleEmail("")).toBe(false);
    expect(isAuthorizedGoogleEmail(null)).toBe(false);
  });

  it("gera parâmetros PKCE (S256) e assina/valida o state token OAuth", async () => {
    const { state, codeVerifier, codeChallenge } = generatePkceAndState();
    expect(state.length).toBeGreaterThanOrEqual(32);
    expect(codeVerifier.length).toBeGreaterThanOrEqual(32);
    expect(codeChallenge.length).toBeGreaterThanOrEqual(32);
    expect(codeChallenge).not.toBe(codeVerifier);

    const token = await createOAuthStateToken({
      state,
      codeVerifier,
      redirectTo: "/dashboard",
    });
    const verified = await verifyOAuthStateToken(token);
    expect(verified).toEqual({
      state,
      codeVerifier,
      redirectTo: "/dashboard",
    });
    expect(await verifyOAuthStateToken("token-invalido")).toBeNull();
  });

  it("constrói a URL de autorização do Google OAuth 2.0 com PKCE S256", () => {
    const authUrl = new URL(
      buildGoogleAuthorizationUrl({
        clientId: "client-123.apps.googleusercontent.com",
        redirectUri: "http://localhost:3000/api/auth/google/callback",
        state: "state-xyz",
        codeChallenge: "challenge-abc",
      }),
    );
    expect(authUrl.origin).toBe("https://accounts.google.com");
    expect(authUrl.pathname).toBe("/o/oauth2/v2/auth");
    expect(authUrl.searchParams.get("client_id")).toBe(
      "client-123.apps.googleusercontent.com",
    );
    expect(authUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/google/callback",
    );
    expect(authUrl.searchParams.get("response_type")).toBe("code");
    expect(authUrl.searchParams.get("scope")).toBe("openid email profile");
    expect(authUrl.searchParams.get("state")).toBe("state-xyz");
    expect(authUrl.searchParams.get("code_challenge")).toBe("challenge-abc");
    expect(authUrl.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("cria e verifica sessão JWT enriquecida para usuário autenticado via Google", async () => {
    const sessionToken = await createSession({
      email: "marcelotorres1982@gmail.com",
      name: "Marcelo Torres",
      picture: "https://lh3.googleusercontent.com/a/default-user",
      provider: "google",
      role: "admin",
    });
    const payload = await verifySession(sessionToken);
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe("marcelotorres1982@gmail.com");
    expect(payload?.name).toBe("Marcelo Torres");
    expect(payload?.provider).toBe("google");
    expect(payload?.role).toBe("admin");
  });
});
