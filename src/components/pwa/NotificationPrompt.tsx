"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellRing, BellOff, Volume2, Check, AlertCircle } from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface NotificationPromptProps {
  outletName?: string;
  className?: string;
}

export function NotificationPrompt({
  outletName = "Outlet Anda",
  className = "",
}: NotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      showErrorAlert(
        "Browser Tidak Mendukung",
        "Perangkat Anda belum mendukung fitur Notifikasi Web. Pastikan menggunakan Chrome / Safari versi terbaru."
      );
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // Show immediate welcome notification test
        sendNotification(
          "🔔 Notifikasi Toko Aktif!",
          `Selamat! Anda akan menerima dering pemberitahuan setiap ada ulasan masuk di ${outletName}.`
        );
        showSuccessAlert(
          "Notifikasi Diaktifkan! 🎉",
          "Smartphone Anda sekarang akan berdering setiap ada aktivitas ulasan baru."
        );
      } else if (result === "denied") {
        showErrorAlert(
          "Izin Notifikasi Ditolak",
          "Anda telah memblokir izin notifikasi. Silakan buka pengaturan izin situs di browser Anda untuk mengaktifkannya."
        );
      }
    } catch (err) {
      console.error("Gagal meminta izin notifikasi:", err);
    }
  };

  const sendNotification = (title: string, body: string) => {
    try {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        // Try via Service Worker if available
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "SHOW_NOTIFICATION",
            title,
            body,
          });
        }

        // Native Notification fallback
        const notif = new Notification(title, {
          body,
          icon: "/api/og",
          badge: "/api/og",
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch (err) {
      console.error("Gagal mengirim notifikasi:", err);
    }
  };

  const handleTestSound = () => {
    setIsTesting(true);
    sendNotification(
      "🔔 Tes Notifikasi Smart QR!",
      `Ini adalah contoh pemberitahuan ulasan baru untuk ${outletName}. Sistem notifikasi bekerja sempurna!`
    );

    setTimeout(() => {
      setIsTesting(false);
    }, 1500);
  };

  if (!isSupported) {
    return null;
  }

  if (permission === "granted") {
    return (
      <div className={`inline-flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 ${className}`}>
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold px-1">
          <BellRing className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="hidden sm:inline">Notifikasi HP Aktif</span>
          <span className="sm:hidden">Notif Aktif</span>
        </div>
        <button
          type="button"
          onClick={handleTestSound}
          disabled={isTesting}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-[10.5px] border border-emerald-500/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Uji bunyi notifikasi di smartphone Anda"
        >
          <Volume2 className="w-3 h-3" />
          <span>{isTesting ? "Berdering..." : "Tes Bunyi"}</span>
        </button>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs ${className}`}>
        <BellOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span className="text-[11px]">Izin Notifikasi Diblokir</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestPermission}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${className}`}
      title="Aktifkan pemberitahuan di HP setiap ada ulasan masuk"
    >
      <Bell className="w-3.5 h-3.5 text-sky-200 shrink-0 animate-bounce" />
      <span>Aktifkan Notifikasi HP</span>
    </button>
  );
}
