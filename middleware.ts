import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/admin/:path*",
    "/claim/:path*",
    "/portal/:path*",
    "/user/:path*",
  ],
};
