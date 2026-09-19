import { auth } from "@root/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SuperAdminDashboardClient } from "./SuperAdminDashboardClient";
import { AdminWithRelations, AuthenticatedUser, OutletModel, QrCardModel } from "@/types/models";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Admin Global Control",
};

export default async function SuperAdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  // Fetch current user fresh info
  const freshCurrentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      whatsappNumber: true,
      isSuperAdminMaster: true,
      canEditLandingPage: true,
      canManagePrintTemplates: true,
      canDeleteCards: true,
      canViewAnalytics: true,
    },
  });

  // Fetch all Super Admins
  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: {
      id: true,
      fullName: true,
      email: true,
      whatsappNumber: true,
      isActive: true,
      isSuperAdminMaster: true,
      canEditLandingPage: true,
      canManagePrintTemplates: true,
      canDeleteCards: true,
      canViewAnalytics: true,
      createdAt: true,
    },
    orderBy: [{ isSuperAdminMaster: "desc" }, { createdAt: "asc" }],
  });

  // Fetch all admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    include: {
      createdBy: {
        select: { id: true, fullName: true, isSuperAdminMaster: true },
      },
      assignedCards: {
        include: { outlet: true },
      },
      createdUsers: {
        where: { role: "USER" },
        include: { outlet: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all cards
  const allCards = await prisma.qrCard.findMany({
    include: {
      assignedAdmin: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isSuperAdminMaster: true,
          isActive: true,
          createdById: true,
          createdBy: { select: { id: true, fullName: true, isSuperAdminMaster: true } },
        },
      },
      outlet: {
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
              whatsappNumber: true,
              isActive: true,
              createdById: true,
              createdBy: {
                select: {
                  id: true,
                  fullName: true,
                  role: true,
                  isSuperAdminMaster: true,
                  createdById: true,
                  createdBy: { select: { id: true, fullName: true, isSuperAdminMaster: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  // Fetch all outlets
  const rawOutlets = await prisma.outlet.findMany({
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          whatsappNumber: true,
          isActive: true,
          createdById: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
              role: true,
              isSuperAdminMaster: true,
              createdById: true,
              createdBy: { select: { id: true, fullName: true, isSuperAdminMaster: true } },
            },
          },
        },
      },
      qrCards: {
        orderBy: { createdAt: "asc" },
        include: {
          assignedAdmin: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              isSuperAdminMaster: true,
              createdById: true,
              createdBy: { select: { id: true, fullName: true, isSuperAdminMaster: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const allOutlets = rawOutlets.map((o) => ({
    ...o,
    qrCard: o.qrCards?.[0] || null,
  }));

  // Fetch site setting
  let siteSetting = await prisma.siteSetting.findUnique({
    where: { id: "default" },
  });

  if (!siteSetting) {
    siteSetting = await prisma.siteSetting.create({
      data: {
        id: "default",
        whatsappNumber: "6281234567890",
        heroBadge: "🔥 Solusi Cerdas Ulasan Bintang 5 Google Bisnis",
        heroHeadline: "Dapatkan Ratusan Ulasan Bintang 5 Dengan Sekali Tap",
        heroSubheadline:
          "Ubah setiap pelanggan yang puas menjadi ulasan bintang 5 resmi di Google Maps secara instan menggunakan Kartu Dynamic QR & Smart NFC.",
        ctaPrimaryText: "Pesan Kartu & Konsultasi WhatsApp",
        ctaSecondaryText: "Coba Scan Demo (c-001)",
        step1Title: "Letakkan di Meja / Kasir",
        step1Desc: "Pasang kartu akrilik di kasir.",
        step2Title: "Pelanggan Scan / Tap",
        step2Desc: "Pelanggan scan dengan mudah.",
        step3Title: "Pop-up Review Langsung Terbuka",
        step3Desc: "Pop-up ulasan bintang 5 langsung terbuka.",
        footerText: "Smart QR Review Platform. Seluruh hak cipta dilindungi.",
        seoTitle: "Smart QR Review — Akselerasi Ulasan Bintang 5 Google Bisnis",
        seoDescription:
          "Platform SaaS Dynamic QR Code & NFC Card untuk meningkatkan rating dan ulasan Google Review outlet Anda secara otomatis dan instan.",
      },
    });
  }

  const authUser: AuthenticatedUser = {
    id: freshCurrentUser?.id || session.user.id,
    fullName: freshCurrentUser?.fullName || session.user.fullName || "Super Admin",
    email: freshCurrentUser?.email || session.user.email || "",
    role: freshCurrentUser?.role || session.user.role || "SUPER_ADMIN",
    isSuperAdminMaster: !!freshCurrentUser?.isSuperAdminMaster,
    canEditLandingPage: !!freshCurrentUser?.canEditLandingPage,
    canManagePrintTemplates: !!freshCurrentUser?.canManagePrintTemplates,
    canDeleteCards: !!freshCurrentUser?.canDeleteCards,
    canViewAnalytics: !!freshCurrentUser?.canViewAnalytics,
  };

  return (
    <SuperAdminDashboardClient
      currentUser={authUser}
      superAdmins={superAdmins}
      admins={admins as unknown as AdminWithRelations[]}
      allCards={allCards as unknown as QrCardModel[]}
      allOutlets={allOutlets as unknown as OutletModel[]}
      siteSetting={siteSetting}
    />
  );
}
