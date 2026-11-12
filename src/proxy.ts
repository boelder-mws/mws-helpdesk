import { NextResponse, type NextRequest } from "next/server";

// Fast first check only: sends visitors without a session cookie to the
// sign-in page. Every page and action still verifies the session itself.
export function proxy(request: NextRequest) {
  if (request.cookies.has("hd_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|auth/|api/health|_next/|favicon.ico|icon.svg).*)"],
};
