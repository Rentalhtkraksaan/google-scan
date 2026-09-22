import type { DefaultSession } from "next-auth";

declare module "@auth/core/types" {
  interface User {
    id?: string;
    role?: string;
    fullName?: string;
    isSuperAdminMaster?: boolean;
    canEditLandingPage?: boolean;
    canManagePrintTemplates?: boolean;
    canDeleteCards?: boolean;
    canViewAnalytics?: boolean;
    avatarUrl?: string | null;
  }
}

declare module "@auth/core" {
  interface User {
    id?: string;
    role?: string;
    fullName?: string;
    isSuperAdminMaster?: boolean;
    canEditLandingPage?: boolean;
    canManagePrintTemplates?: boolean;
    canDeleteCards?: boolean;
    canViewAnalytics?: boolean;
    avatarUrl?: string | null;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      fullName: string;
      isSuperAdminMaster?: boolean;
      canEditLandingPage?: boolean;
      canManagePrintTemplates?: boolean;
      canDeleteCards?: boolean;
      canViewAnalytics?: boolean;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    fullName: string;
    isSuperAdminMaster?: boolean;
    canEditLandingPage?: boolean;
    canManagePrintTemplates?: boolean;
    canDeleteCards?: boolean;
    canViewAnalytics?: boolean;
    avatarUrl?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    fullName: string;
    isSuperAdminMaster?: boolean;
    canEditLandingPage?: boolean;
    canManagePrintTemplates?: boolean;
    canDeleteCards?: boolean;
    canViewAnalytics?: boolean;
    avatarUrl?: string | null;
  }
}
