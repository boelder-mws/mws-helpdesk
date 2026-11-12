import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { client, getOidcConfig, OIDC_COOKIE, oidcConfigured, redirectUri } from "@/lib/auth/oidc";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

export async function GET(request: NextRequest) {
  const fail = (code: string) => NextResponse.redirect(`${env.appUrl}/login?error=${code}`);
  if (!oidcConfigured()) return fail("not_configured");

  let config;
  try {
    config = await getOidcConfig();
  } catch (err) {
    console.error("[auth] OIDC discovery failed", err);
    return fail("provider_unreachable");
  }

  const verifier = client.randomPKCECodeVerifier();
  const state = client.randomState();
  const nonce = client.randomNonce();
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(),
    scope: env.oidcScopes,
    code_challenge: await client.calculatePKCECodeChallenge(verifier),
    code_challenge_method: "S256",
    state,
    nonce,
  });

  (await cookies()).set(
    OIDC_COOKIE,
    JSON.stringify({ verifier, state, nonce, next: safeNext(request.nextUrl.searchParams.get("next")) }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: env.appUrl.startsWith("https://"),
      path: "/auth",
      maxAge: 600,
    },
  );
  return NextResponse.redirect(url);
}
