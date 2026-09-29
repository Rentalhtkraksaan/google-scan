import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AffiliateDashboardClient } from "./AffiliateDashboardClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Mitra Affiliate — Smart QR Review",
  description: "Portal mitra affiliate untuk memantau kode referral, komisi per penjualan kartu, saldo, dan riwayat pesanan.",
};

export default async function AffiliatePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Cari akun affiliate berdasarkan email atau id
  const affiliate = await prisma.affiliateAccount.findFirst({
    where: {
      OR: [
        { email: session.user.email?.toLowerCase().trim() },
        { id: session.user.id },
      ],
    },
  });

  if (!affiliate) {
    // Jika Super Admin melihat /affiliate tapi bukan akun affiliate, redirect ke super-admin
    if (session.user.role === "SUPER_ADMIN") {
      redirect("/super-admin");
    }
    redirect("/login");
  }

  // Ambil data pesanan referral
  const orders = await prisma.resellerOrder.findMany({
    where: {
      affiliateCode: affiliate.referralCode,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      totalQuantity: true,
      totalAmount: true,
      paymentStatus: true,
      orderStatus: true,
      affiliateCommission: true,
      createdAt: true,
    },
  });

  const siteSetting = await prisma.siteSetting.findUnique({
    where: { id: "default" },
    select: {
      whatsappNumber: true,
      affiliateShippingDiscount: true,
      landingPageLogoUrl: true,
    },
  });

  return (
    <AffiliateDashboardClient
      affiliate={{
        id: affiliate.id,
        fullName: affiliate.fullName,
        phone: affiliate.phone,
        email: affiliate.email,
        referralCode: affiliate.referralCode,
        followersCount: affiliate.followersCount,
        commissionPerPcs: affiliate.commissionPerPcs,
        balance: affiliate.balance,
        totalEarned: affiliate.totalEarned,
        totalWithdrawn: affiliate.totalWithdrawn,
        bankName: affiliate.bankName,
        accountNumber: affiliate.accountNumber,
        accountHolder: affiliate.accountHolder,
        status: affiliate.status,
        createdAt: affiliate.createdAt.toISOString(),
      }}
      orders={orders.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
      }))}
      siteSetting={siteSetting || undefined}
    />
  );
}
