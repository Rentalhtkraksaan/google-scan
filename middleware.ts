import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;

  // 1. Login ("/login") Instant Redirect if Already Logged In
  if (pathname === "/login") {
    if (isLoggedIn) {
      const target =
        role === "SUPER_ADMIN" ? "/super-admin" : role === "ADMIN" ? "/admin" : role === "AFFILIATE" ? "/affiliate" : "/portal";
      return NextResponse.redirect(new URL(target, req.nextUrl));
    }
    return NextResponse.next();
  }

  // 2. Route Protection
  if (pathname.startsWith("/super-admin")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.nextUrl));
    if (role !== "SUPER_ADMIN") return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/claim")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.nextUrl));
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (pathname.startsWith("/affiliate") && !pathname.startsWith("/affiliate/register")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.nextUrl));
    if (role !== "AFFILIATE" && role !== "SUPER_ADMIN") return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (pathname.startsWith("/portal") || pathname.startsWith("/user")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/super-admin/:path*",
    "/admin/:path*",
    "/claim/:path*",
    "/affiliate/:path*",
    "/portal/:path*",
    "/user/:path*",
  ],
};

