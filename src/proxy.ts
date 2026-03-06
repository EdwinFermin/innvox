import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const proxy = auth((request) => {
  const isAuthenticated = Boolean(request.auth?.user);
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
