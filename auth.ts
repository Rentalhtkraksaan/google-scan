import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./src/lib/prisma";
import { authConfig } from "./auth.config";
import { loginSchema } from "./src/lib/validations";
import { checkRateLimit, resetRateLimit } from "./src/lib/rate-limit";

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  console.warn("⚠️ [SECURITY WARNING] AUTH_SECRET is not configured in production! Please set AUTH_SECRET.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET || "dev-secret-key-change-in-production-32chars!!",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const data = parsed.data;
        const emailKey = data.email.toLowerCase().trim();
        const rateLimitKey = `auth_login_${emailKey}`;

        // Rate limit: max 10 failed login attempts per 15 minutes per email
        const rateCheck = checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000);
        if (!rateCheck.allowed) {
          console.warn(`[SECURITY ALERT] Rate limit exceeded for login on ${emailKey}. Retry in ${rateCheck.retryAfterSeconds}s`);
          return null;
        }

        if (data.loginType === "recovery") {
          const { email, whatsappNumber } = data;
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
          });

          if (!user || user.isActive === false) return null;

          // CRITICAL SECURITY FIX: Administrative accounts (SUPER_ADMIN and ADMIN) CANNOT use recovery login!
          if (user.role !== "USER") {
            console.warn(`[SECURITY ALERT] Blocked recovery login attempt on administrative account: ${user.email} (${user.role})`);
            return null;
          }

          let cleanInputWa = whatsappNumber.replace(/[^0-9]/g, "");
          if (cleanInputWa.startsWith("08")) cleanInputWa = "62" + cleanInputWa.slice(1);

          let cleanUserWa = user.whatsappNumber ? user.whatsappNumber.replace(/[^0-9]/g, "") : "";
          if (cleanUserWa.startsWith("08")) cleanUserWa = "62" + cleanUserWa.slice(1);

          if (cleanInputWa !== cleanUserWa) return null;

          // Clear failed attempts counter upon successful recovery login
          resetRateLimit(rateLimitKey);

          const roleLabel = "Pemilik Outlet";

          try {
            await prisma.activityLog.create({
              data: {
                userId: user.id,
                userName: user.fullName,
                userRole: user.role,
                action: "AUTH_LOGIN",
                title: "Login ke Akun",
                description: `${roleLabel} "${user.fullName}" (${user.email}) berhasil masuk ke sistem via pemulihan akun.`,
                targetId: user.id,
                targetName: user.fullName,
                adminId: user.createdById || null,
                superAdminId: null,
              },
            });
          } catch (e) {
            console.error("Gagal mencatat log login:", e);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            fullName: user.fullName,
            isSuperAdminMaster: user.isSuperAdminMaster,
            canEditLandingPage: user.canEditLandingPage,
            canManagePrintTemplates: user.canManagePrintTemplates,
          };
        } else {
          const { email, password } = data;

          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
          });

          if (!user || user.isActive === false) return null;

          const passwordMatch = await bcrypt.compare(password, user.password);
          if (!passwordMatch) return null;

          // Clear failed attempts counter upon successful authentication
          resetRateLimit(rateLimitKey);

          const roleLabel =
            user.role === "SUPER_ADMIN"
              ? user.isSuperAdminMaster
                ? "Super Admin 1 (Master)"
                : "Super Admin 2"
              : user.role === "ADMIN"
              ? "Admin Lapangan"
              : "Pemilik Outlet";

          try {
            await prisma.activityLog.create({
              data: {
                userId: user.id,
                userName: user.fullName,
                userRole: user.role,
                action: "AUTH_LOGIN",
                title: "Login ke Akun",
                description: `${roleLabel} "${user.fullName}" (${user.email}) berhasil masuk ke sistem.`,
                targetId: user.id,
                targetName: user.fullName,
                adminId: user.role === "ADMIN" ? user.id : (user.createdById || null),
                superAdminId: user.role === "SUPER_ADMIN" ? user.id : null,
              },
            });
          } catch (e) {
            console.error("Gagal mencatat log login:", e);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            fullName: user.fullName,
            isSuperAdminMaster: user.isSuperAdminMaster,
            canEditLandingPage: user.canEditLandingPage,
            canManagePrintTemplates: user.canManagePrintTemplates,
          };
        }
      },
    }),
  ],
});
