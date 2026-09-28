import { auth } from "@root/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { AdminDashboardClient } from "./AdminDashboardClient";
import { ResellerActivationLockView } from "@/components/dashboard/ResellerActivationLockView";
import { AuthenticatedUser, OutletUserItem, QrCardModel, SiteSettingModel } from "@/types/models";
import { getCachedSiteSetting } from "@/lib/site-settings-cache";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard Admin Lapangan",
};

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Ensure Admin or Super Admin
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/portal");
  }

  const adminId = session.user.id;

  // Parallel fetch: jalankan seluruh query Admin Lapangan serentak (Promise.all)
  const [
    assignedCards,
    rawUsers,
    currentAdminUser,
    masterSuperAdmin,
    siteSetting,
  ] = await Promise.all([
    // 1. Fetch all cards allocated to this admin
    prisma.qrCard.findMany({
      where: { assignedAdminId: adminId },
      include: {
        assignedAdmin: {
          select: { id: true, fullName: true, email: true },
        },
        outlet: {
          include: {
            owner: {
              select: { id: true, fullName: true, email: true, whatsappNumber: true },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    }),

    // 2. Fetch all outlets/users associated with this admin
    prisma.user.findMany({
      where: {
        role: "USER",
        OR: [
          { createdById: adminId },
          {
            outlet: {
              qrCards: {
                some: {
                  assignedAdminId: adminId,
                },
              },
            },
          },
        ],
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            role: true,
            avatarUrl: true,
            isSuperAdminMaster: true,
          },
        },
        outlet: {
          include: {
            qrCards: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 3. Fetch current admin info along with its creator (Super Admin)
    prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        fullName: true,
        email: true,
        whatsappNumber: true,
        avatarUrl: true,
        isResellerUnlocked: true,
        resellerVipRewardsClaimed: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            whatsappNumber: true,
            email: true,
            avatarUrl: true,
            isSuperAdminMaster: true,
          },
        },
      },
    }),

    // 4. Fallback: master super admin
    prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", isSuperAdminMaster: true },
      select: {
        id: true,
        fullName: true,
        whatsappNumber: true,
        email: true,
        avatarUrl: true,
      },
    }),

    // 5. Cached site setting
    getCachedSiteSetting(),
  ]);

  const createdUsers = rawUsers.map((u) => ({
    ...u,
    outlet: u.outlet
      ? {
          ...u.outlet,
          qrCards: u.outlet.qrCards,
          qrCard: u.outlet.qrCards?.[0] || null,
        }
      : null,
  }));

  const superAdminContact = currentAdminUser?.createdBy || masterSuperAdmin || {
    fullName: "Super Admin",
    whatsappNumber: siteSetting?.whatsappNumber || null,
    email: "",
  };

  const authUser: AuthenticatedUser = {
    id: adminId,
    fullName: session.user.fullName || "Admin Lapangan",
    email: session.user.email || "",
    role: session.user.role || "ADMIN",
    avatarUrl: currentAdminUser?.avatarUrl ? `/api/user/${adminId}/avatar` : (session.user.avatarUrl || null),
    isResellerUnlocked: currentAdminUser?.isResellerUnlocked ?? true,
    resellerVipRewardsClaimed: currentAdminUser?.resellerVipRewardsClaimed ?? 0,
  };

  // Jika akun Admin Lapangan masih terkunci (belum bayar modul & belum dibuka oleh Super Admin)
  if (session.user.role === "ADMIN" && currentAdminUser?.isResellerUnlocked === false) {
    return (
      <ResellerActivationLockView
        user={authUser}
        siteSetting={siteSetting as unknown as SiteSettingModel}
        superAdminContact={superAdminContact}
      />
    );
  }

  // Hitung jumlah outlet binaan yang aktif VIP
  const now = Date.now();
  const vipOutletsCount = rawUsers.filter(
    (u) =>
      u.outlet?.isMember &&
      u.outlet?.membershipExpiresAt &&
      new Date(u.outlet.membershipExpiresAt).getTime() > now
  ).length;

  return (
    <AdminDashboardClient
      currentAdmin={{
        id: adminId,
        fullName: session.user.fullName || "Admin Lapangan",
        email: session.user.email || "",
        whatsappNumber: currentAdminUser?.whatsappNumber,
        avatarUrl: currentAdminUser?.avatarUrl ? `/api/user/${adminId}/avatar` : (session.user.avatarUrl || null),
        isResellerUnlocked: currentAdminUser?.isResellerUnlocked ?? true,
        resellerVipRewardsClaimed: currentAdminUser?.resellerVipRewardsClaimed ?? 0,
      }}
      superAdminContact={superAdminContact}
      assignedCards={assignedCards as unknown as QrCardModel[]}
      createdUsers={createdUsers as unknown as OutletUserItem[]}
      siteSetting={siteSetting as unknown as SiteSettingModel}
      vipOutletsCount={vipOutletsCount}
    />
  );
}
