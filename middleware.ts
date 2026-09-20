import { NextResponse } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

function hasDisplayName(displayName: string | null | undefined) {
  return Boolean(displayName?.trim());
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);
  const named = hasDisplayName(req.auth?.user?.displayName);

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/user/display-name")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (PUBLIC_PATHS.has(pathname)) {
      return NextResponse.next();
    }
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (!named) {
    if (pathname === "/onboarding") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
  }

  if (PUBLIC_PATHS.has(pathname) || pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
