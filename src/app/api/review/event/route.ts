import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWebPushToOutlet } from "@/lib/web-push";
import { isOutletMemberActive } from "@/lib/membership-utils";
import { broadcastRealtimeReviewEvent } from "@/lib/realtime-events";

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
    let targetOutlet: { id: string; name: string; isMember: boolean; membershipExpiresAt: Date | null } | null = null;

    if (targetOutletId) {
      targetOutlet = await prisma.outlet.findUnique({
        where: { id: targetOutletId },
        select: { id: true, name: true, isMember: true, membershipExpiresAt: true },
      });
    } else if (targetCardCode) {
      const card = await prisma.qrCard.findUnique({
        where: { code: targetCardCode },
        select: {
          outletId: true,
          outlet: { select: { id: true, name: true, isMember: true, membershipExpiresAt: true } },
        },
      });
      targetOutletId = card?.outletId;
      targetOutlet = card?.outlet || null;
    }

    const isMember = isOutletMemberActive(targetOutlet);

    // 1. If 4-Star or 5-Star Rating Event
    if (eventType === "FIVE_STAR" || eventType === "FOUR_STAR" || (typeof rating === "number" && rating >= 4)) {
      const isFourStar = eventType === "FOUR_STAR" || rating === 4;
      const starCount = isFourStar ? 4 : 5;
      const starIcons = isFourStar ? "⭐⭐⭐⭐" : "⭐⭐⭐⭐⭐";
      const actionType = isFourStar ? "FOUR_STAR_REVIEW" : "FIVE_STAR_REVIEW";
      const titleText = `Ulasan Bintang ${starCount} Baru! ${starIcons}`;
      const descText = targetCardCode
        ? `Pelanggan baru saja memberikan ulasan bintang ${starCount} pada kartu "${targetCardCode}".`
        : `Pelanggan baru saja memberikan ulasan bintang ${starCount} di Google Review.`;

      // Fitur Member Premium: Broadcast ke in-memory bus & kirim notifikasi push (Murni realtime, 0 DB storage!)
      if (isMember && targetOutletId) {
        // 1. Broadcast ke in-memory RAM event bus untuk portal yang sedang terbuka
        broadcastRealtimeReviewEvent({
          outletId: targetOutletId,
          action: actionType,
          title: titleText,
          description: descText,
          targetId: targetCardCode || null,
        });

        // 2. 📲 WEB PUSH: Kirim sinyal push ke HP outlet (berbunyi & bergetar meskipun HP mati / aplikasi ditutup)
        try {
          await sendWebPushToOutlet(targetOutletId, {
            title: `${starIcons} Ulasan Bintang ${starCount} Masuk!`,
            body: targetCardCode
              ? `Pelanggan di meja "${targetCardCode}" baru saja memberi bintang ${starCount}!`
              : `Pelanggan baru saja memberikan rating bintang ${starCount} di Google Review!`,
            icon: "/api/logo/landing",
            badge: "/api/logo/landing",
            url: "/portal",
            action: actionType as "FIVE_STAR_REVIEW",
          });
        } catch (err) {
          console.error(`WebPush ${starCount}-star error:`, err);
        }
      }

      return NextResponse.json({
        success: true,
        isMember,
        message: isMember
          ? `Notifikasi ulasan bintang ${starCount} berhasil dikirim (Murni realtime, bebas simpan DB).`
          : `Event ulasan bintang ${starCount} berhasil (Non-member: tanpa dering).`,
      });
    }

    // 2. If Scan Event
    if (eventType === "SCAN") {
      // Counter total scan kartu fisik tetap dihitung agar statistik akurat
      if (targetCardCode) {
        await prisma.qrCard.update({
          where: { code: targetCardCode },
          data: { scanCount: { increment: 1 } },
        });
      }

      // Fitur Member Premium: Broadcast ke in-memory bus & kirim notifikasi push (Murni realtime, 0 DB storage!)
      if (isMember && targetOutletId) {
        // 1. Broadcast ke in-memory RAM event bus
        broadcastRealtimeReviewEvent({
          outletId: targetOutletId,
          action: "SCAN_CARD",
          title: "Pengunjung Scan Kartu Meja 🛎️",
          description: targetCardCode
            ? `Pengunjung baru saja scan kartu ulasan "${targetCardCode}".`
            : "Pengunjung baru saja scan kartu ulasan.",
          targetId: targetCardCode || null,
        });

        // 2. 📲 WEB PUSH: Beritahu HP outlet bahwa ada pengunjung scan kartu meja
        try {
          await sendWebPushToOutlet(targetOutletId, {
            title: "🛎️ Ada Pengunjung Scan Meja!",
            body: targetCardCode
              ? `Pengunjung di meja "${targetCardCode}" baru saja membuka ulasan.`
              : "Ada pengunjung sedang membuka ulasan di meja Anda.",
            icon: "/api/logo/landing",
            badge: "/api/logo/landing",
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
          ? "Notifikasi scan kartu berhasil dikirim (Murni realtime, bebas simpan DB)."
          : "Event scan kartu (Non-member: tanpa dering).",
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
