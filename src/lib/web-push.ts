import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@smartqr.id";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn("⚠️ VAPID keys not fully configured for Web Push!");
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  action?: "FIVE_STAR_REVIEW" | "SCAN_CARD" | "TEST_NOTIFICATION";
  tag?: string;
}

/**
 * Kirim notifikasi Web Push ke seluruh smartphone/perangkat terdaftar milik outlet ini.
 * Bekerja meskipun aplikasi PWA ditutup total, layar HP mati, atau di background.
 */
export async function sendWebPushToOutlet(
  outletId: string,
  payload: PushNotificationPayload
) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { outletId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const notificationString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/api/og",
      badge: payload.badge || "/api/og",
      url: payload.url || "/portal",
      tag: payload.tag || `outlet-alert-${Date.now()}`,
      action: payload.action,
    });

    let sentCount = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, notificationString, {
            urgency: "high", // Pastikan HP segera berdering/bergetar
            TTL: 60 * 60 * 24, // 24 jam
          });
          sentCount++;
        } catch (err: any) {
          // Status 410 (Gone) atau 404 berarti user sudah uninstall / clear data browser
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredIds.push(sub.id);
          } else {
            console.error("Gagal mengirim web push ke device:", err?.message || err);
          }
        }
      })
    );

    // Bersihkan device subscription yang sudah mati
    if (expiredIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      }).catch(() => {});
    }

    return { success: true, sentCount };
  } catch (error) {
    console.error("Error in sendWebPushToOutlet:", error);
    return { success: false, error };
  }
}

/**
 * Kirim notifikasi Web Push langsung ke single subscription (biasanya untuk Tes Bunyi / Verifikasi)
 */
export async function sendWebPushDirect(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushNotificationPayload
) {
  try {
    const notificationString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/api/og",
      badge: payload.badge || "/api/og",
      url: payload.url || "/portal",
      tag: payload.tag || `direct-alert-${Date.now()}`,
      action: payload.action,
    });

    await webpush.sendNotification(subscription, notificationString, {
      urgency: "high",
      TTL: 60 * 60,
    });

    return { success: true };
  } catch (error: any) {
    console.error("sendWebPushDirect error:", error?.message || error);
    return { success: false, error: error?.message || "Gagal mengirim push" };
  }
}
