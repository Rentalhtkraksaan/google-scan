"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, BellOff, Volume2 } from "lucide-react";
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
    unlockAudioContext();

    if (!isSupported) {
      // Audio still works even without system notification support
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

      // Play test ding and vibration
      playCashierDing();
      triggerSmartphoneVibration();

      if (result === "granted") {
        speakVoiceAnnouncement("Notifikasi dan lonceng toko berhasil diaktifkan.");
        sendSmartphoneNotification(
          "🔔 Notifikasi Toko Aktif!",
          `Selamat! Anda akan menerima dering pemberitahuan setiap ada ulasan masuk di ${outletName}.`
        );
        showSuccessAlert(
          "Notifikasi Diaktifkan! 🎉",
          "Smartphone Anda sekarang akan berdering dan bergetar setiap ada scan atau ulasan bintang 5 baru."
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

  const handleTestSound = () => {
    setIsTesting(true);
    unlockAudioContext();

    // 1. Play Cashier Ding Sound
    playCashierDing();

    // 2. Play Physical Vibration
    triggerSmartphoneVibration();

    // 3. Voice Announcement
    speakVoiceAnnouncement("Tes ulasan bintang 5. Sistem suara dan notifikasi toko Anda bekerja sempurna!");

    // 4. Send System Notification
    sendSmartphoneNotification(
      "⭐⭐⭐⭐⭐ Tes Notifikasi Ulasan Toko!",
      `Ini adalah contoh pemberitahuan bintang 5 untuk ${outletName}. Lonceng dan suara kasir berbunyi sempurna!`
    );

    setTimeout(() => {
      setIsTesting(false);
    }, 2000);
  };

  if (permission === "granted") {
    return (
      <div className={`inline-flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 ${className}`}>
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold px-1">
          <BellRing className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="hidden sm:inline">Notif & Lonceng Aktif</span>
          <span className="sm:hidden">Notif Aktif</span>
        </div>
        <button
          type="button"
          onClick={handleTestSound}
          disabled={isTesting}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-[10.5px] border border-emerald-500/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Uji bunyi lonceng & notifikasi ulasan di smartphone Anda"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{isTesting ? "Berdering..." : "Tes Bunyi 🔊"}</span>
        </button>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs ${className}`}>
        <button
          type="button"
          onClick={handleTestSound}
          disabled={isTesting}
          className="inline-flex items-center gap-1 text-amber-300 font-semibold cursor-pointer hover:text-white transition-colors"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{isTesting ? "Berdering..." : "Tes Suara 🔊"}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={requestPermission}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${className}`}
      title="Aktifkan pemberitahuan & lonceng di HP setiap ada ulasan masuk"
    >
      <Bell className="w-3.5 h-3.5 text-sky-200 shrink-0 animate-bounce" />
      <span>Aktifkan Notifikasi & Suara HP</span>
    </button>
  );
}
