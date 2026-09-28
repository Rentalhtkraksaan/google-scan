import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { formatMembershipExpiry } from "@/lib/membership-utils";
import { sendWebPushToSuperAdmins } from "@/lib/web-push";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id,
      fraud_status,
      payment_type,
    } = body;

    if (!order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    }

    // Ambil SiteSetting untuk mengambil server key
    const siteSetting = await prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: {
        midtransServerKey: true,
        resellerVipDiscountPerCard: true,
      },
    });

    const serverKey = siteSetting?.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || "";

    if (!serverKey) {
      console.error("[Midtrans Webhook] Midtrans Server Key is not configured on server.");
      return NextResponse.json({ error: "Midtrans Server Key not configured" }, { status: 500 });
    }

    if (!signature_key) {
      console.warn("[Midtrans Webhook] Missing signature_key for order_id:", order_id);
      return NextResponse.json({ error: "Missing signature key" }, { status: 401 });
    }

    // Validasi SHA512 signature secara ketat
    const hash = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (hash !== signature_key) {
      console.warn("[Midtrans Webhook] Invalid signature key for order_id:", order_id);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");
    const isPending = transaction_status === "pending";
    const isFailed =
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire";

    // 1. Cek jika transaksi adalah Pembelian Modul Reseller
    if (order_id.startsWith("MODUL-")) {
      const resellerPayment = await prisma.resellerModulePayment.findFirst({
        where: {
          OR: [
            { midtransOrderId: order_id },
            { id: order_id },
          ],
        },
        include: { user: true },
      });

      if (!resellerPayment || !resellerPayment.user) {
        console.warn("[Midtrans Webhook] Reseller payment/User not found for order_id:", order_id);
        return NextResponse.json({ error: "Reseller payment record not found" }, { status: 404 });
      }

      if (resellerPayment.status === "APPROVED" && isSuccess) {
        return NextResponse.json({ status: "OK", message: "Transaksi modul sudah pernah diproses sebelumnya." });
      }

      if (isSuccess) {
        const now = new Date();
        await prisma.$transaction([
          prisma.resellerModulePayment.update({
            where: { id: resellerPayment.id },
            data: {
              status: "APPROVED",
              midtransTransactionId: transaction_id || undefined,
              adminNotes: `Sukses via Midtrans ${payment_type || "QRIS"} pada ${now.toLocaleString("id-ID")}`,
            },
          }),
          prisma.user.update({
            where: { id: resellerPayment.userId },
            data: {
              isResellerUnlocked: true,
            },
          }),
          prisma.activityLog.create({
            data: {
              userId: resellerPayment.userId,
              userName: resellerPayment.user.fullName,
              userRole: "ADMIN",
              action: "UPDATE_STATUS",
              title: "Aktivasi Modul Reseller Otomatis (Midtrans QRIS) ⚡",
              description: `Mitra Lapangan "${resellerPayment.user.fullName}" berhasil membayar Modul Reseller via ${payment_type?.toUpperCase() || "QRIS"} Midtrans sebesar Rp ${resellerPayment.amount.toLocaleString("id-ID")}. Akun resmi terbuka & aktif.`,
              targetId: resellerPayment.id,
              targetName: "Modul Reseller Midtrans",
            },
          }),
        ]);

        // Kirim Web Push Notification Realtime ke Super Admin (HP berdering meskipun dikunci / di background)
        await sendWebPushToSuperAdmins({
          title: "💰 Pembayaran Modul Reseller Berhasil (QRIS)! ⚡",
          body: `Mitra "${resellerPayment.user.fullName}" berhasil membayar Modul Reseller Rp ${resellerPayment.amount.toLocaleString("id-ID")} via ${payment_type?.toUpperCase() || "QRIS"} Midtrans. Akun langsung aktif!`,
          url: "/super-admin",
          tag: `qris-reseller-${resellerPayment.id}`,
          action: "NEW_PAYMENT",
        }).catch((pushErr) => console.error("Push notification to super admin error:", pushErr));

        console.log(`[Midtrans Webhook] SUCCESS: Reseller "${resellerPayment.user.fullName}" unlocked`);
        return NextResponse.json({ status: "OK", transaction_status });
      } else if (isFailed) {
        await prisma.resellerModulePayment.update({
          where: { id: resellerPayment.id },
          data: {
            status: "REJECTED",
            adminNotes: `Transaksi dibatalkan / kadaluarsa oleh Midtrans (${transaction_status})`,
          },
        });
        return NextResponse.json({ status: "OK", transaction_status });
      }

      return NextResponse.json({ status: "OK", transaction_status });
    }

    // 2. Cek jika transaksi adalah Pesanan Keranjang Produk Reseller
    if (order_id.startsWith("RSLORD-")) {
      const resellerOrder = await prisma.resellerOrder.findFirst({
        where: {
          OR: [
            { midtransOrderId: order_id },
            { id: order_id },
            { orderNumber: order_id },
          ],
        },
        include: { admin: true },
      });

      if (!resellerOrder) {
        console.warn("[Midtrans Webhook] Reseller order not found for order_id:", order_id);
        return NextResponse.json({ error: "Reseller order record not found" }, { status: 404 });
      }

      if (resellerOrder.paymentStatus === "PAID" && isSuccess) {
        return NextResponse.json({ status: "OK", message: "Pesanan sudah berstatus lunas sebelumnya." });
      }

      if (isSuccess) {
        // Jika pesanan menggunakan diskon reward VIP, update klaim reward admin
        if (resellerOrder.discountAmount > 0 && resellerOrder.adminId) {
          const discountPerCard = siteSetting?.resellerVipDiscountPerCard || 5000;
          const claimedCards = Math.floor(resellerOrder.discountAmount / discountPerCard);
          if (claimedCards > 0) {
            await prisma.user.update({
              where: { id: resellerOrder.adminId },
              data: {
                resellerVipRewardsClaimed: { increment: claimedCards },
              },
            }).catch(() => {});
          }
        }

        await prisma.$transaction([
          prisma.resellerOrder.update({
            where: { id: resellerOrder.id },
            data: {
              paymentStatus: "PAID",
              orderStatus: "PROCESSING",
              midtransTransactionId: transaction_id || undefined,
            },
          }),
          prisma.activityLog.create({
            data: {
              userId: resellerOrder.adminId,
              userName: resellerOrder.customerName,
              userRole: "ADMIN",
              action: "UPDATE_STATUS",
              title: "Pembayaran Pesanan Produk Berhasil (Midtrans QRIS) ⚡",
              description: `Pesanan #${resellerOrder.orderNumber} sebesar Rp ${resellerOrder.totalAmount.toLocaleString("id-ID")} berhasil dibayar lunas via Midtrans ${payment_type?.toUpperCase() || "QRIS"}. Status: Diproses.`,
              targetId: resellerOrder.id,
              targetName: resellerOrder.orderNumber,
            },
          }),
        ]);

        // Kirim Web Push Notification Realtime ke Super Admin (HP berdering meskipun dikunci / di background)
        await sendWebPushToSuperAdmins({
          title: "💰 Pembayaran Pesanan Produk Lunas (QRIS)! ⚡",
          body: `Pesanan #${resellerOrder.orderNumber} dari "${resellerOrder.customerName}" (${resellerOrder.totalQuantity} pcs • Rp ${resellerOrder.totalAmount.toLocaleString("id-ID")}) telah lunas dibayar via ${payment_type?.toUpperCase() || "QRIS"}.`,
          url: "/super-admin",
          tag: `qris-order-${resellerOrder.id}`,
          action: "NEW_ORDER",
        }).catch((pushErr) => console.error("Push notification to super admin error:", pushErr));

        console.log(`[Midtrans Webhook] SUCCESS: Reseller Order #${resellerOrder.orderNumber} marked PAID`);
        return NextResponse.json({ status: "OK", transaction_status });
      } else if (isFailed) {
        await prisma.resellerOrder.update({
          where: { id: resellerOrder.id },
          data: {
            paymentStatus: "REJECTED",
            orderStatus: "CANCELLED",
            notes: `Gagal / Dibatalkan via Midtrans (${transaction_status})`,
          },
        });
        return NextResponse.json({ status: "OK", transaction_status });
      }

      return NextResponse.json({ status: "OK", transaction_status });
    }

    // 3. Transaksi Outlet Membership VIP
    const payment = await prisma.membershipPayment.findFirst({
      where: {
        OR: [
          { midtransOrderId: order_id },
          { id: order_id },
        ],
      },
      include: {
        outlet: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!payment || !payment.outlet) {
      console.warn("[Midtrans Webhook] Payment/Outlet not found for order_id:", order_id);
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const outlet = payment.outlet;

    // Idempotency: Jika pembayaran sudah disetujui sebelumnya, cegah penambahan masa aktif berulang kali akibat webhook retry
    if (payment.status === "APPROVED" && isSuccess) {
      return NextResponse.json({ status: "OK", message: "Transaksi sudah pernah diproses sebelumnya." });
    }

    // Validasi nominal pembayaran tidak boleh kurang dari tagihan payment
    if (isSuccess && gross_amount) {
      const paidAmount = Math.round(parseFloat(gross_amount));
      if (paidAmount < payment.amount) {
        console.warn(`[Midtrans Webhook] Amount mismatch for order ${order_id}: paid ${paidAmount}, expected ${payment.amount}`);
        return NextResponse.json({ error: "Nominal pembayaran tidak sesuai tagihan." }, { status: 400 });
      }
    }

    if (isSuccess) {
      // Hitung perpanjangan masa aktif (+30 hari)
      const now = new Date();
      let newExpiresAt: Date;

      if (outlet.membershipExpiresAt && new Date(outlet.membershipExpiresAt).getTime() > now.getTime()) {
        // Jika masih aktif, tambahkan 30 hari dari tanggal kadaluarsa saat ini
        newExpiresAt = new Date(new Date(outlet.membershipExpiresAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        // Jika sudah kadaluarsa atau baru pertama kali, hitung 30 hari dari sekarang
        newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      await prisma.$transaction([
        prisma.membershipPayment.update({
          where: { id: payment.id },
          data: {
            status: "APPROVED",
            midtransTransactionId: transaction_id || undefined,
            adminNotes: `Sukses via Midtrans ${payment_type || "QRIS"} pada ${now.toLocaleString("id-ID")}`,
          },
        }),
        prisma.outlet.update({
          where: { id: outlet.id },
          data: {
            isMember: true,
            membershipStartedAt: outlet.membershipStartedAt || now,
            membershipExpiresAt: newExpiresAt,
          },
        }),
        prisma.activityLog.create({
          data: {
            outletId: outlet.id,
            userId: outlet.ownerId,
            userName: outlet.owner?.fullName || outlet.name,
            userRole: "USER",
            action: "VIP_RENEWAL_MIDTRANS",
            title: "Perpanjangan Member VIP Berhasil (Midtrans QRIS) ⚡",
            description: `Outlet "${outlet.name}" berhasil memperpanjang Member VIP via ${payment_type?.toUpperCase() || "QRIS"} Midtrans sebesar Rp ${payment.amount.toLocaleString("id-ID")}. Masa aktif kini berlaku hingga ${formatMembershipExpiry(newExpiresAt)}.`,
            targetId: payment.id,
            targetName: "Midtrans QRIS",
          },
        }),
      ]);

      // Kirim Web Push Notification Realtime ke Super Admin (HP berdering meskipun dikunci / di background)
      await sendWebPushToSuperAdmins({
        title: "💰 Pembayaran Member VIP Sukses (QRIS)! ⚡",
        body: `Outlet "${outlet.name}" (${outlet.owner?.fullName || "Pemilik"}) berhasil memperpanjang Member VIP Rp ${payment.amount.toLocaleString("id-ID")} via ${payment_type?.toUpperCase() || "QRIS"}.`,
        url: "/super-admin",
        tag: `qris-vip-${payment.id}`,
        action: "NEW_PAYMENT",
      }).catch((pushErr) => console.error("Push notification to super admin error:", pushErr));

      console.log(`[Midtrans Webhook] SUCCESS: Outlet "${outlet.name}" VIP renewed until ${newExpiresAt.toISOString()}`);
    } else if (isFailed) {
      await prisma.membershipPayment.update({
        where: { id: payment.id },
        data: {
          status: "REJECTED",
          adminNotes: `Transaksi dibatalkan / gagal oleh Midtrans (${transaction_status})`,
        },
      });
      console.log(`[Midtrans Webhook] FAILED/EXPIRED: Order "${order_id}"`);
    } else if (isPending) {
      await prisma.membershipPayment.update({
        where: { id: payment.id },
        data: {
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({ status: "OK", transaction_status });
  } catch (error) {
    console.error("[Midtrans Webhook] Internal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
