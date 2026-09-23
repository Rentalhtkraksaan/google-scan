import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWebPushToOutlet } from "@/lib/web-push";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cardCode, outletId, eventType, rating } = body;

    if (!cardCode && !outletId) {
      return NextResponse.json({ success: false, message: "Parameter tidak lengkap." }, { status: 400 });
    }

    let targetOutletId = outletId;
    let targetCardCode = cardCode;

    // Resolve outlet details to verify membership status
    let targetOutlet: { id: string; name: string; isMember: boolean } | null = null;

    if (targetOutletId) {
      targetOutlet = await prisma.outlet.findUnique({
        where: { id: targetOutletId },
        select: { id: true, name: true, isMember: true },
      });
    } else if (targetCardCode) {
      const card = await prisma.qrCard.findUnique({
        where: { code: targetCardCode },
        select: {
          outletId: true,
          outlet: { select: { id: true, name: true, isMember: true } },
        },
      });
      targetOutletId = card?.outletId;
      targetOutlet = card?.outlet || null;
    }

    const isMember = targetOutlet?.isMember ?? false;

    // 1. If 5-Star Rating Event
    if (eventType === "FIVE_STAR") {
      // Fitur Member Premium: Simpan ke database & kirim dering realtime
      if (isMember && targetOutletId) {
        // Record Activity Log specifically for outlet realtime notification
        await prisma.activityLog.create({
          data: {
            outletId: targetOutletId,
            userName: "Pengunjung Toko",
            userRole: "USER",
            action: "FIVE_STAR_REVIEW",
            title: "Ulasan Bintang 5 Baru! ⭐⭐⭐⭐⭐",
            description: targetCardCode
              ? `Pelanggan baru saja memberikan ulasan bintang 5 pada kartu "${targetCardCode}".`
              : "Pelanggan baru saja memberikan ulasan bintang 5 di Google Review.",
            targetId: targetCardCode || null,
            targetName: targetCardCode ? `Kartu ${targetCardCode}` : "Google Review",
          },
        });

        // Record in CustomerFeedback with rating 5
        await prisma.customerFeedback.create({
          data: {
            outletId: targetOutletId,
            cardCode: targetCardCode || null,
            rating: 5,
            customerName: "Pengunjung Toko",
            message: "Pelanggan memberikan rating bintang 5 via kartu ulasan.",
            isResolved: true,
          },
        });

        // 📲 WEB PUSH: Kirim sinyal push ke HP outlet (berbunyi & bergetar meskipun HP mati / aplikasi ditutup)
        try {
          await sendWebPushToOutlet(targetOutletId, {
            title: "⭐⭐⭐⭐⭐ Ulasan Bintang 5 Masuk!",
            body: targetCardCode
              ? `Pelanggan di meja "${targetCardCode}" baru saja memberi bintang 5!`
              : "Pelanggan baru saja memberikan rating bintang 5 di Google Review!",
            url: "/portal",
            action: "FIVE_STAR_REVIEW",
          });
        } catch (err) {
          console.error("WebPush 5-star error:", err);
        }
      }

      return NextResponse.json({
        success: true,
        isMember,
        message: isMember
          ? "Event ulasan bintang 5 berhasil dicatat & notifikasi dikirim."
          : "Event ulasan bintang 5 berhasil (Non-member: tanpa dering & storage).",
      });
    }

    // 2. If Scan Event
    if (eventType === "SCAN") {
      // Counter scan kartu fisik tetap dihitung
      if (targetCardCode) {
        await prisma.qrCard.update({
          where: { code: targetCardCode },
          data: { scanCount: { increment: 1 } },
        });
      }

      // Fitur Member Premium: Catat log aktivitas & kirim push notif dering
      if (isMember && targetOutletId) {
        await prisma.activityLog.create({
          data: {
            outletId: targetOutletId,
            userName: "Pengunjung Toko",
            userRole: "USER",
            action: "SCAN_CARD",
            title: "Pengunjung Scan Kartu Meja 🛎️",
            description: targetCardCode
              ? `Pengunjung baru saja scan kartu ulasan "${targetCardCode}".`
              : "Pengunjung baru saja scan kartu ulasan.",
            targetId: targetCardCode || null,
            targetName: targetCardCode ? `Kartu ${targetCardCode}` : "Scan Meja",
          },
        });

        // 📲 WEB PUSH: Beritahu HP outlet bahwa ada pengunjung scan kartu meja
        try {
          await sendWebPushToOutlet(targetOutletId, {
            title: "🛎️ Ada Pengunjung Scan Meja!",
            body: targetCardCode
              ? `Pengunjung di meja "${targetCardCode}" baru saja membuka ulasan.`
              : "Ada pengunjung sedang membuka ulasan di meja Anda.",
            url: "/portal",
            action: "SCAN_CARD",
          });
        } catch (err) {
          console.error("WebPush scan error:", err);
        }
      }

      return NextResponse.json({
        success: true,
        isMember,
        message: isMember
          ? "Event scan kartu berhasil dicatat."
          : "Event scan kartu dicatat (Non-member: tanpa dering & storage).",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging review event:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mencatat event." },
      { status: 500 }
    );
  }
}
