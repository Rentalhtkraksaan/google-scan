import { NextRequest, NextResponse } from "next/server";
import { sendWebPushToOutlet, sendWebPushDirect } from "@/lib/web-push";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown_ip";
    const rateCheck = checkRateLimit(`push_test_${ip}`, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak permintaan uji notifikasi. Silakan tunggu 1 menit." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { outletId, subscription, outletName } = body;

    const payload = {
      title: "🛎️ Tes Dering & Getar Smart QR!",
      body: `Notifikasi latar belakang ${outletName || "Outlet"} aktif sempurna! HP akan berdering dan bergetar saat ulasan masuk.`,
      icon: "/api/logo/landing",
      badge: "/api/logo/landing",
      url: "/portal",
      action: "TEST_NOTIFICATION" as const,
    };

    if (outletId) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ success: false, message: "Akses ditolak: Silakan login terlebih dahulu." }, { status: 401 });
      }

      if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
        const outlet = await prisma.outlet.findUnique({
          where: { id: outletId },
          select: { ownerId: true },
        });
        if (!outlet || outlet.ownerId !== session.user.id) {
          return NextResponse.json({ success: false, message: "Akses ditolak: Anda tidak memiliki akses ke outlet ini." }, { status: 403 });
        }
      }

      const res = await sendWebPushToOutlet(outletId, payload);
      return NextResponse.json(res);
    } else if (subscription && subscription.endpoint && subscription.keys) {
      const res = await sendWebPushDirect(subscription, payload);
      return NextResponse.json(res);
    }

    return NextResponse.json(
      { success: false, message: "outletId atau subscription diperlukan." },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirim tes notifikasi.";
    console.error("Error in test push route:", error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
