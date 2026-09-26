import { auth } from "@root/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { AdminDashboardClient } from "./AdminDashboardClient";
import { AuthenticatedUser, OutletUserItem, QrCardModel } from "@/types/models";
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
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      <Navbar user={authUser} siteSetting={siteSetting as unknown as import("@/types/models").SiteSettingModel} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboardClient
          currentAdmin={{
            id: adminId,
            fullName: session.user.fullName || "Admin Lapangan",
            email: session.user.email || "",
            whatsappNumber: currentAdminUser?.whatsappNumber,
          }}
          superAdminContact={superAdminContact}
          assignedCards={assignedCards as unknown as QrCardModel[]}
          createdUsers={createdUsers as unknown as OutletUserItem[]}
        />
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Smart QR Review Platform. Dashboard Admin Lapangan.
      </footer>
    </div>
  );
}
