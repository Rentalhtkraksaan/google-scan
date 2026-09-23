import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { subscription, outletId } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, message: "Subscription data tidak lengkap." },
        { status: 400 }
      );
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth: authKey } = keys;

    if (!p256dh || !authKey) {
      return NextResponse.json(
        { success: false, message: "Kunci enkripsi p256dh atau auth tidak ditemukan." },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || null;
    const userId = session?.user?.id || null;

    // Simpan atau perbarui subscription perangkat ini di database
    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh,
        auth: authKey,
        outletId: outletId || null,
        userId: userId || undefined,
        userAgent,
      },
      create: {
        endpoint,
        p256dh,
        auth: authKey,
        outletId: outletId || null,
        userId: userId || null,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Perangkat berhasil didaftarkan untuk notifikasi latar belakang.",
      subscriptionId: saved.id,
    });
  } catch (error) {
    console.error("Error subscribing to web push:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mendaftarkan notifikasi push." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: "Endpoint diperlukan untuk unsubscribe." },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.delete({
      where: { endpoint },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Perangkat berhasil dihapus dari notifikasi push.",
    });
  } catch (error) {
    console.error("Error unsubscribing web push:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus langganan push." },
      { status: 500 }
    );
  }
}
