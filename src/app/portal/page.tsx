import { auth } from "@root/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PortalClientView } from "./PortalClientView";
import { getCachedSiteSetting } from "@/lib/site-settings-cache";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal Klien Outlet",
};

export default async function PortalPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Parallel fetch: ambil data user outlet dan site setting serentak (Promise.all)
  // Optimal: Hanya select kolom yang benar-benar dipakai untuk render portal (0ms lag, tanpa load riwayat feedback berlebih)
  const [user, siteSetting] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        whatsappNumber: true,
        outlet: {
          select: {
            id: true,
            name: true,
            googleReviewUrl: true,
            isMember: true,
            membershipStartedAt: true,
            membershipExpiresAt: true,
            membershipPayments: {
              where: { status: "PENDING" },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
            qrCards: {
              select: {
                code: true,
                status: true,
                scanCount: true,
                assignedAdmin: {
                  select: {
                    fullName: true,
                    whatsappNumber: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            fullName: true,
            whatsappNumber: true,
            email: true,
          },
        },
      },
    }),
    getCachedSiteSetting(),
  ]);

  if (!user) {
    redirect("/login");
  }

  // If user is Admin or Super Admin without outlet, redirect to their dashboard
  if (!user.outlet && user.role === "SUPER_ADMIN") {
    redirect("/super-admin");
  }
  if (!user.outlet && user.role === "ADMIN") {
    redirect("/admin");
  }

  // Prioritas Mitra Lapangan: Admin yang memegang salah satu kartu (assignedAdmin), jika tidak ada fallback ke pembuat akun (createdBy)
  const adminContact =
    user.outlet?.qrCards?.find((c) => c.assignedAdmin)?.assignedAdmin || user.createdBy;

  const formattedOutlet = user.outlet
    ? {
        id: user.outlet.id,
        name: user.outlet.name,
        googleReviewUrl: user.outlet.googleReviewUrl,
        isMember: user.outlet.isMember,
        membershipStartedAt: user.outlet.membershipStartedAt,
        membershipExpiresAt: user.outlet.membershipExpiresAt,
        hasPendingPayment: (user.outlet.membershipPayments?.length || 0) > 0,
        qrCards: user.outlet.qrCards,
        qrCard: user.outlet.qrCards[0] || null,
        feedbacks: [],
      }
    : null;

  return (
    <PortalClientView
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        whatsappNumber: user.whatsappNumber,
      }}
      outlet={formattedOutlet}
      adminContact={adminContact}
      siteSetting={siteSetting as unknown as import("@/types/models").SiteSettingModel}
    />
  );
}
