import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/auth/login") ||
    req.nextUrl.pathname.startsWith("/auth/register");

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isAuthPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
