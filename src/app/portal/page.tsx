import { auth } from "@root/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PortalClientView } from "./PortalClientView";
import { getCachedSiteSetting } from "@/lib/site-settings-cache";
import { isOutletMemberActive } from "@/lib/membership-utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal Klien Outlet",
};

interface PortalPageProps {
  searchParams?: Promise<{ outletId?: string }>;
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const requestedOutletId = resolvedParams.outletId;

  // Parallel fetch: ambil data user outlet dan site setting serentak (Promise.all)
  const [user, siteSetting] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        whatsappNumber: true,
        outlets: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            googleReviewUrl: true,
            isMember: true,
            membershipStartedAt: true,
            membershipExpiresAt: true,
            hasClaimedFreeTrial: true,
            customVipPrice: true,
            vipPauseCount: true,
            isVipPaused: true,
            soundNotification: true,
            soundEffect: true,
            customGreetingText: true,
            enableSmartFilter: true,
            allowSmartFilter: true,
            staffPairingToken: true,
            instagramUrl: true,
            enableInstagram: true,
            tiktokUrl: true,
            enableTiktok: true,
            menuUrl: true,
            menuImages: true,
            menuTitle: true,
            enableMenu: true,
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
                    role: true,
                    avatarUrl: true,
                    isSuperAdminMaster: true,
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
            role: true,
            avatarUrl: true,
            isSuperAdminMaster: true,
          },
        },
      },
    }),
    getCachedSiteSetting(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const userOutlets = user.outlets || [];

  // If user is Admin or Super Admin without outlet, redirect to their dashboard
  if (userOutlets.length === 0 && user.role === "SUPER_ADMIN") {
    redirect("/super-admin");
  }
  if (userOutlets.length === 0 && user.role === "ADMIN") {
    redirect("/admin");
  }

  // Pilih outlet aktif berdasarkan query param atau default ke outlet pertama
  const activeRawOutlet =
    (requestedOutletId ? userOutlets.find((o) => o.id === requestedOutletId) : null) ||
    userOutlets[0] ||
    null;

  // Auto-init staffPairingToken if null
  if (activeRawOutlet && !activeRawOutlet.staffPairingToken) {
    const generatedToken = "ksr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    await prisma.outlet.update({
      where: { id: activeRawOutlet.id },
      data: { staffPairingToken: generatedToken },
    }).catch(() => {});
    activeRawOutlet.staffPairingToken = generatedToken;
  }

  // Prioritas Mitra Lapangan: Admin yang memegang salah satu kartu (assignedAdmin), jika tidak ada fallback ke pembuat akun (createdBy)
  const adminContact =
    activeRawOutlet?.qrCards?.find((c) => c.assignedAdmin)?.assignedAdmin || user.createdBy;

  const isMemberActive = activeRawOutlet ? isOutletMemberActive(activeRawOutlet) : false;

  const formattedOutlet = activeRawOutlet
    ? {
        id: activeRawOutlet.id,
        name: activeRawOutlet.name,
        logoUrl: activeRawOutlet.logoUrl || null,
        googleReviewUrl: activeRawOutlet.googleReviewUrl,
        isMember: isMemberActive,
        membershipStartedAt: activeRawOutlet.membershipStartedAt,
        membershipExpiresAt: activeRawOutlet.membershipExpiresAt,
        customVipPrice: activeRawOutlet.customVipPrice,
        vipPauseCount: activeRawOutlet.vipPauseCount ?? 0,
        isVipPaused: Boolean(activeRawOutlet.isVipPaused),
        soundNotification: activeRawOutlet.soundNotification ?? true,
        soundEffect: activeRawOutlet.soundEffect || "BELL_DOUBLE",
        customGreetingText: activeRawOutlet.customGreetingText || null,
        enableSmartFilter: activeRawOutlet.enableSmartFilter !== false,
        allowSmartFilter: Boolean(activeRawOutlet.allowSmartFilter),
        staffPairingToken: activeRawOutlet.staffPairingToken || null,
        instagramUrl: activeRawOutlet.instagramUrl || null,
        enableInstagram: activeRawOutlet.enableInstagram ?? true,
        tiktokUrl: activeRawOutlet.tiktokUrl || null,
        enableTiktok: activeRawOutlet.enableTiktok ?? true,
        menuUrl: activeRawOutlet.menuUrl || null,
        menuImages: activeRawOutlet.menuImages || null,
        menuTitle: activeRawOutlet.menuTitle || "Buku Menu & Katalog Digital",
        enableMenu: activeRawOutlet.enableMenu ?? true,
        hasPendingPayment: (activeRawOutlet.membershipPayments?.length || 0) > 0,
        qrCards: activeRawOutlet.qrCards,
        qrCard: activeRawOutlet.qrCards[0] || null,
        feedbacks: [],
      }
    : null;

  const allOutletsSummary = userOutlets.map((o) => ({
    id: o.id,
    name: o.name,
    logoUrl: o.logoUrl || null,
    isMember: isOutletMemberActive(o),
    cardCount: o.qrCards?.length || 0,
  }));

  return (
    <PortalClientView
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        whatsappNumber: user.whatsappNumber,
      }}
      outlet={formattedOutlet}
      allOutlets={allOutletsSummary}
      adminContact={adminContact}
      siteSetting={siteSetting as unknown as import("@/types/models").SiteSettingModel}
    />
  );
}
