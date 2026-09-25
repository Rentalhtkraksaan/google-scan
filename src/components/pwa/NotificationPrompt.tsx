"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellRing, Volume2 } from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import {
  playCashierDing,
  speakVoiceAnnouncement,
  triggerSmartphoneVibration,
  sendSmartphoneNotification,
  unlockAudioContext,
} from "@/lib/notification-sound";

interface NotificationPromptProps {
  outletName?: string;
  outletId?: string;
  className?: string;
}

// Helper untuk konversi VAPID public key base64 URL-safe ke Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationPrompt({
  outletName = "Outlet Anda",
  outletId,
  className = "",
}: NotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Mendaftarkan / Menyinkronkan Push Subscription ke Server
  const registerPushSubscription = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BB_lciCSON3uC9OmSIiGaIVzWFOOWVxbMarjd2u6EPYFlXBQdXuIza5h1BujaKOawe10bu9vabyeN--drSgPiOU";

      if (vapidPublicKey) {
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

        if (!subscription) {
          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey as unknown as BufferSource,
            });
          } catch (subErr) {
            console.warn("Subscribing with key failed, attempting fresh subscribe:", subErr);
            const existing = await registration.pushManager.getSubscription();
            if (existing) {
              await existing.unsubscribe().catch(() => {});
            }
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey as unknown as BufferSource,
            });
          }
        }
      }

      if (subscription) {
        // Kirim subscription ke backend untuk disimpan di database
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription,
            outletId,
          }),
        });
        return subscription;
      }
    } catch (err) {
      console.error("Gagal mendaftarkan Push Subscription:", err);
    }
    return null;
  }, [outletId]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      if (Notification.permission === "granted") {
        registerPushSubscription();
      }
    }
  }, [registerPushSubscription]);

  const requestPermission = async () => {
    unlockAudioContext();

    if (!isSupported) {
      playCashierDing();
      speakVoiceAnnouncement("Sistem suara ulasan telah aktif.");
      showSuccessAlert(
        "Suara Kasir Aktif! 🔊",
        "Lonceng ulasan akan berbunyi di HP ini setiap ada pengunjung memberikan ulasan."
      );
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      // Play local chime and vibration
      playCashierDing();
      triggerSmartphoneVibration();

      if (result === "granted") {
        // Register Web Push ke server untuk background notification saat app ditutup
        await registerPushSubscription();

        speakVoiceAnnouncement("Notifikasi dan lonceng toko berhasil diaktifkan.");
        sendSmartphoneNotification(
          "🔔 Notifikasi Toko Aktif!",
          `Selamat! Anda akan menerima dering pemberitahuan setiap ada ulasan masuk di ${outletName}.`
        );
        showSuccessAlert(
          "Notifikasi Latar Belakang Aktif! 🎉",
          "Smartphone Anda sekarang akan berdering dan bergetar setiap ada pengunjung scan atau ulasan bintang 5 baru, bahkan saat aplikasi ini ditutup total!"
        );
      } else if (result === "denied") {
        showErrorAlert(
          "Izin Notifikasi Diblokir",
          "Izin pop-up notifikasi sistem diblokir browser. Namun suara lonceng kasir tetap akan berbunyi saat portal toko ini dibuka."
        );
      }
    } catch (err) {
      console.error("Gagal meminta izin notifikasi:", err);
    }
  };

  const handleTestSound = async () => {
    setIsTesting(true);
    unlockAudioContext();

    // 1. Play Local Audio Chime & Vibration
    playCashierDing();
    triggerSmartphoneVibration();
    speakVoiceAnnouncement("Tes notifikasi dan dering ulasan bekerja!");

    // 2. Kirim Server-side Web Push (uji kemampuan notifikasi saat background)
    try {
      const registration = await navigator.serviceWorker?.ready;
      const currentSub = await registration?.pushManager?.getSubscription();

      await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          outletName,
          subscription: currentSub,
        }),
      });
    } catch {
      // Fallback local notification
      sendSmartphoneNotification(
        "⭐⭐⭐⭐⭐ Tes Notifikasi Ulasan Toko!",
        `Ini adalah contoh pemberitahuan ulasan untuk ${outletName}. Lonceng dan dering bekerja sempurna!`
      );
    }

    setTimeout(() => {
      setIsTesting(false);
    }, 2000);
  };

  if (permission === "granted") {
    return (
      <div className={`inline-flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 shrink-0 ${className}`}>
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold px-1">
          <BellRing className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span>Dering & Notif Aktif</span>
        </div>
        <button
          type="button"
          onClick={handleTestSound}
          disabled={isTesting}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
          title="Uji dering lonceng & notifikasi ulasan di smartphone Anda"
        >
          <Volume2 className="w-3.5 h-3.5 shrink-0" />
          <span>{isTesting ? "Menderit..." : "Tes Dering HP 🔊"}</span>
        </button>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs shrink-0 ${className}`}>
        <button
          type="button"
          onClick={handleTestSound}
          disabled={isTesting}
          className="inline-flex items-center gap-1.5 text-amber-300 font-semibold cursor-pointer hover:text-white transition-colors shrink-0"
        >
          <Volume2 className="w-3.5 h-3.5 shrink-0" />
          <span>{isTesting ? "Berdering..." : "Tes Suara 🔊"}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestPermission}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0 ${className}`}
      title="Aktifkan notifikasi & lonceng di HP bahkan saat aplikasi ditutup"
    >
      <Bell className="w-3.5 h-3.5 text-sky-200 shrink-0 animate-bounce" />
      <span>Aktifkan Dering & Notif HP</span>
    </button>
  );
}
