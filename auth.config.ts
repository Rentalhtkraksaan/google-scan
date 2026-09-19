import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no Prisma, no bcrypt)
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const role = auth?.user?.role;

      // Protect super-admin routes
      if (path.startsWith("/super-admin")) {
        if (!isLoggedIn) return false;
        return role === "SUPER_ADMIN";
      }

      // Protect admin routes
      if (path.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        return role === "ADMIN" || role === "SUPER_ADMIN";
      }

      // Protect claim route
      if (path.startsWith("/claim")) {
        if (!isLoggedIn) return false;
        return role === "ADMIN" || role === "SUPER_ADMIN";
      }

      // Protect portal & user routes
      if (path.startsWith("/portal") || path.startsWith("/user")) {
        return isLoggedIn;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.fullName = user.fullName;
        token.isSuperAdminMaster = (user as unknown as { isSuperAdminMaster?: boolean }).isSuperAdminMaster;
        token.canEditLandingPage = (user as unknown as { canEditLandingPage?: boolean }).canEditLandingPage;
        token.canManagePrintTemplates = (user as unknown as { canManagePrintTemplates?: boolean }).canManagePrintTemplates;
        token.canDeleteCards = (user as unknown as { canDeleteCards?: boolean }).canDeleteCards;
        token.canViewAnalytics = (user as unknown as { canViewAnalytics?: boolean }).canViewAnalytics;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.fullName = token.fullName as string;
        (session.user as unknown as { isSuperAdminMaster?: boolean }).isSuperAdminMaster = !!token.isSuperAdminMaster;
        (session.user as unknown as { canEditLandingPage?: boolean }).canEditLandingPage = !!token.canEditLandingPage;
        (session.user as unknown as { canManagePrintTemplates?: boolean }).canManagePrintTemplates = !!token.canManagePrintTemplates;
        (session.user as unknown as { canDeleteCards?: boolean }).canDeleteCards = !!token.canDeleteCards;
        (session.user as unknown as { canViewAnalytics?: boolean }).canViewAnalytics = !!token.canViewAnalytics;
      }
      return session;
    },
  },
  providers: [], // populated in auth.ts
};
