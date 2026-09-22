import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cardCode, outletId, eventType, rating } = body;

    if (!cardCode && !outletId) {
      return NextResponse.json({ success: false, message: "Parameter tidak lengkap." }, { status: 400 });
    }

    let targetOutletId = outletId;
    let targetCardCode = cardCode;

    // If outletId is not passed, resolve from cardCode
    if (!targetOutletId && targetCardCode) {
      const card = await prisma.qrCard.findUnique({
        where: { code: targetCardCode },
        select: { outletId: true },
      });
      targetOutletId = card?.outletId;
    }

    // 1. If 5-Star Rating Event
    if (eventType === "FIVE_STAR") {
      // Record Activity Log specifically for outlet realtime notification
      await prisma.activityLog.create({
        data: {
          outletId: targetOutletId || null,
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
      if (targetOutletId) {
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
      }

      return NextResponse.json({
        success: true,
        message: "Event ulasan bintang 5 berhasil dicatat.",
      });
    }

    // 2. If Scan Event
    if (eventType === "SCAN") {
      if (targetCardCode) {
        await prisma.qrCard.update({
          where: { code: targetCardCode },
          data: { scanCount: { increment: 1 } },
        });
      }

      await prisma.activityLog.create({
        data: {
          outletId: targetOutletId || null,
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

      return NextResponse.json({
        success: true,
        message: "Event scan kartu berhasil dicatat.",
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
