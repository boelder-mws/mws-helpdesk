import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  client,
  getOidcConfig,
  OIDC_COOKIE,
  redirectUri,
  SignInError,
  upsertUserFromClaims,
} from "@/lib/auth/oidc";
import { createSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const raw = jar.get(OIDC_COOKIE)?.value;
  jar.delete({ name: OIDC_COOKIE, path: "/auth" });

  const fail = (code: string) => NextResponse.redirect(`${env.appUrl}/login?error=${code}`);

  let pending: { verifier: string; state: string; nonce: string; next: string };
  try {
    pending = JSON.parse(raw ?? "");
  } catch {
    return fail("expired");
  }

  try {
    const config = await getOidcConfig();
    // Rebuilt from APP_URL: behind a reverse proxy the request's own URL is internal.
    const currentUrl = new URL(redirectUri() + request.nextUrl.search);
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: pending.verifier,
      expectedState: pending.state,
      expectedNonce: pending.nonce,
      idTokenExpected: true,
    });
    const idClaims = tokens.claims();
    if (!idClaims) return fail("signin_failed");

    let claims: Record<string, unknown> = { ...idClaims };
    if (!claims.email || !claims.name) {
      try {
        const info = await client.fetchUserInfo(config, tokens.access_token, idClaims.sub);
        claims = { ...info, ...claims };
      } catch {
        // Userinfo is optional; the ID token may already be enough.
      }
    }

    const user = await upsertUserFromClaims(claims);
    await createSession(user.id);
    return NextResponse.redirect(`${env.appUrl}${pending.next || "/"}`);
  } catch (err) {
    if (err instanceof SignInError) return fail(err.code);
    console.error("[auth] sign-in failed", err);
    return fail("signin_failed");
  }
}
