import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { destroySession } from "@/lib/auth/session";

export async function POST(request: Request) {
  // Only accept sign-out posts that come from this site.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(env.appUrl).origin) {
    return new NextResponse("Bad origin", { status: 403 });
  }
  await destroySession();
  return NextResponse.redirect(`${env.appUrl}/login?signed_out=1`, 303);
}
