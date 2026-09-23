import { NextRequest, NextResponse } from "next/server";
import { sendWebPushToOutlet, sendWebPushDirect } from "@/lib/web-push";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outletId, subscription, outletName } = body;

    const payload = {
      title: "🛎️ Tes Dering & Getar Smart QR!",
      body: `Notifikasi latar belakang ${outletName || "Outlet"} aktif sempurna! HP akan berdering dan bergetar saat ulasan masuk.`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      url: "/portal",
      action: "TEST_NOTIFICATION" as const,
    };

    if (subscription && subscription.endpoint && subscription.keys) {
      const res = await sendWebPushDirect(subscription, payload);
      return NextResponse.json(res);
    } else if (outletId) {
      const res = await sendWebPushToOutlet(outletId, payload);
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
