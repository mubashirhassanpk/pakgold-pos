import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "pakgold_session";

/**
 * Edge gate: if there is no session cookie, bounce to /login.
 * Full validation (DB lookup + expiry + active) happens in the layout via
 * getCurrentUser(); the middleware just blocks obviously-unauthenticated access.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except the login page, Next internals, PWA assets, and static files.
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|favicon.png|manifest.webmanifest|sw.js|offline.html|icons).*)",
  ],
};
