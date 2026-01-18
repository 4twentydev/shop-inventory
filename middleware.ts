import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/lock", "/api/auth/pin"];
const ADMIN_PATHS = ["/admin", "/api/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("shop_session")?.value;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Redirect to lock if no session
  if (!sessionToken) {
    const lockUrl = new URL("/lock", request.url);
    lockUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(lockUrl);
  }

  // Note: Admin role check is done at the page/API level since we can't
  // do async DB calls in edge middleware without additional setup

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
