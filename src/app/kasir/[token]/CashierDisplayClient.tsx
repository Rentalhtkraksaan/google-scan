"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Volume2,
  VolumeX,
  Sparkles,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Store,
  Zap,
  Download,
  X,
  Share,
  PlusSquare,
  Megaphone,
  Radio,
} from "lucide-react";
import {
  unlockAudioContext,
  playSoundEffect,
  triggerSmartphoneVibration,
  SOUND_EFFECT_OPTIONS,
} from "@/lib/notification-sound";
import { usePwaInstall } from "@/components/pwa/InstallPwaPrompt";

interface CashierDisplayClientProps {
  outlet: {
    id: string;
    name: string;
    soundEffect: string;
  };
}

interface RealtimeAlert {
  id: string;
  title: string;
  description: string;
  action: string;
  timestamp: string;
}

export function CashierDisplayClient({ outlet }: CashierDisplayClientProps) {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<number>(Date.now());
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [isSpeakerAnnouncement, setIsSpeakerAnnouncement] = useState(true);

  // Load Bluetooth Speaker Announcement preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`cashier_speaker_mode_${outlet.id}`);
        if (saved !== null) {
          setIsSpeakerAnnouncement(saved === "true");
        }
      } catch {}
    }
  }, [outlet.id]);

  const handleToggleSpeakerAnnouncement = () => {
    const nextVal = !isSpeakerAnnouncement;
    setIsSpeakerAnnouncement(nextVal);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`cashier_speaker_mode_${outlet.id}`, String(nextVal));
      } catch {}
    }
  };

  // Helper: Announce 5-star review via Web Speech API (Bluetooth/AUX speaker connected)
  const speakSpeakerAnnouncement = (outletName: string, isFiveStar: boolean = true) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = isFiveStar
        ? `Perhatian! Baru saja ada ulasan bintang 5 untuk ${outletName}. Terima kasih banyak atas kunjungannya!`
        : `Pemberitahuan. Ada pelanggan baru saja memindai kartu ulasan di ${outletName}.`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.92;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) => v.lang === "id-ID" || v.lang.startsWith("id"));
      if (idVoice) {
        utterance.voice = idVoice;
      }

      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 700);
    } catch (e) {
      console.error("Speaker announcement error:", e);
    }
  };

  const { isInstalled, isIOS, showIOSModal, setShowIOSModal, triggerInstall } = usePwaInstall();

  const soundOption =
    SOUND_EFFECT_OPTIONS.find((s) => s.id === outlet.soundEffect) ||
    SOUND_EFFECT_OPTIONS[0];

  // Auto unlock audio context on first interaction
  const handleUnlockAudio = () => {
    unlockAudioContext();
    setAudioUnlocked(true);
    if (!isMuted) {
      playSoundEffect(outlet.soundEffect);
    }
  };

  // Test sound chime
  const handleTestChime = () => {
    unlockAudioContext();
    setAudioUnlocked(true);
    playSoundEffect(outlet.soundEffect);
    triggerSmartphoneVibration([200, 100, 200]);
  };

  // Check Web Push Notification status
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        setIsPushSubscribed(true);
      }
    }
  }, []);

  // Web Push Subscription for Cashier Device
  const handleSubscribePush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Browser ini tidak mendukung notifikasi push.");
      return;
    }

    try {
      setIsPushLoading(true);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Izin notifikasi tidak diberikan.");
        setIsPushLoading(false);
        return;
      }

      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        let sub = await registration.pushManager.getSubscription();

        if (!sub) {
          const res = await fetch("/api/web-push/public-key");
          const { publicKey } = await res.json();

          if (publicKey) {
            sub = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: publicKey,
            });
          }
        }

        if (sub) {
          await fetch("/api/web-push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outletId: outlet.id,
              subscription: sub,
            }),
          });
          setIsPushSubscribed(true);
          alert("✅ Berhasil! HP Kasir ini akan berdering saat layar mati.");
        }
      }
    } catch (err) {
      console.error("Push subscribe error:", err);
      alert("Gagal mengaktifkan notifikasi latar belakang.");
    } finally {
      setIsPushLoading(false);
    }
  };

  // Polling In-memory realtime bus (0 DB queries & 0 latency)
  useEffect(() => {
    let isCancelled = false;

    const pollEvents = async () => {
      try {
        const res = await fetch(
          `/api/portal/realtime?outletId=${outlet.id}&since=${lastCheckTime}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (isCancelled) return;

        if (data.serverTime) {
          setLastCheckTime(data.serverTime);
        }

        if (data.events && data.events.length > 0) {
          // Ada event ulasan atau scan baru!
          data.events.forEach((ev: { action: string; title: string; description: string; timestamp?: string }) => {
            const newAlert: RealtimeAlert = {
              id: `${Date.now()}-${Math.random()}`,
              title: ev.title || "Notifikasi Baru",
              description: ev.description || "",
              action: ev.action,
              timestamp: new Date().toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            };

            setAlerts((prev) => [newAlert, ...prev.slice(0, 19)]);

            // Trigger ring & flash & Bluetooth Speaker Announcement
            if (!isMuted) {
              playSoundEffect(outlet.soundEffect);
              if (isSpeakerAnnouncement) {
                speakSpeakerAnnouncement(outlet.name, ev.action.includes("FIVE_STAR") || ev.action.includes("FOUR_STAR"));
              }
            }
            triggerSmartphoneVibration([300, 150, 300, 150, 500]);
            setIsFlashing(true);
            setTimeout(() => setIsFlashing(false), 2500);
          });
        }
      } catch (err) {
        // network silent ignore
      }
    };

    const interval = setInterval(pollEvents, 3000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [outlet.id, outlet.soundEffect, isMuted, lastCheckTime]);

  return (
    <div
      onClick={() => {
        if (!audioUnlocked) handleUnlockAudio();
      }}
      className={`min-h-screen transition-colors duration-500 font-sans ${
        isFlashing
          ? "bg-amber-600/90"
          : "bg-slate-950"
      } text-white flex flex-col justify-between`}
    >
      {/* Top Navbar */}
      <header className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-lg shadow-lg shadow-amber-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                  {outlet.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black tracking-wide">
                  HP KASIR AKTIF
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Mode Siaga Dering Lonceng & Getar Otomatis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isInstalled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerInstall();
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                title="Pasang Aplikasi Kasir di Layar Utama HP"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pasang Aplikasi</span>
                <span className="sm:hidden">Pasang APK</span>
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">Aplikasi Terpasang</span>
                <span className="sm:hidden">Terpasang</span>
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className={`p-2 rounded-xl border transition-all ${
                isMuted
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
              title={isMuted ? "Suara Dering Dimatikan" : "Suara Dering Aktif"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-5 flex-1">
        {/* Banner Pasang Aplikasi Kasir */}
        {!isInstalled && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-950/30 border-2 border-amber-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-bold text-2xl shadow-lg shadow-amber-500/30 shrink-0">
                📲
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Pasang Aplikasi Kasir di HP Ini
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wide">
                    Rekomendasi
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Tambahkan ke beranda HP kasir agar langsung terbuka tanpa buka browser & dering saat layar mati lebih stabil.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerInstall();
              }}
              className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Pasang Aplikasi Sekarang 🚀</span>
            </button>
          </div>
        )}
        {/* Status Audio Box */}
        {!audioUnlocked && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shrink-0">
                🔔
              </div>
              <p className="text-xs text-amber-200">
                Ketuk tombol ini sekali agar HP kasir diizinkan memutar suara dering lonceng.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUnlockAudio();
              }}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow cursor-pointer"
            >
              Aktifkan Audio 🔊
            </button>
          </div>
        )}

        {/* Big Alert Display Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Terhubung ke Sinyal Meja Real-time</span>
          </div>

          <div className="py-4">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-2 border-amber-500/40 flex items-center justify-center text-4xl shadow-2xl shadow-amber-500/20">
              {soundOption.icon}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-4">
              {soundOption.name}
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              HP kasir ini akan otomatis berdering & bergetar seketika setiap kali pelanggan memberi ulasan bintang 5 di meja.
            </p>
          </div>

          {/* Action Buttons - Equal Min-Height Precision */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTestChime();
              }}
              className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>Tes Dering Suara ({soundOption.icon})</span>
            </button>

            <button
              type="button"
              disabled={isPushSubscribed || isPushLoading}
              onClick={(e) => {
                e.stopPropagation();
                handleSubscribePush();
              }}
              className={`w-full min-h-[46px] py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isPushSubscribed
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-800 hover:bg-slate-750 border-slate-700 text-white"
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>
                {isPushSubscribed
                  ? "Dering Layar Mati Aktif ✅"
                  : isPushLoading
                  ? "Memproses..."
                  : "Aktifkan Dering HP Mati 📲"}
              </span>
            </button>
          </div>
        </div>

        {/* Mode Sambungan Speaker Toko (Bluetooth Announcement) - VIP Killer Feature */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border-2 border-indigo-500/30 shadow-xl space-y-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xl shadow-lg shrink-0">
                📢
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Mode Speaker Bluetooth Toko
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${
                    isSpeakerAnnouncement
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {isSpeakerAnnouncement ? "🔊 SPEAKER AKTIF" : "NONAKTIF"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Suara pengumuman ulasan bintang 5 otomatis tersambung ke sound system kafe
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSpeakerAnnouncement();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer self-start sm:self-auto shrink-0 ${
                isSpeakerAnnouncement
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-600/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
            >
              {isSpeakerAnnouncement ? "Matikan Pengumuman" : "Aktifkan Mode Speaker"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <span>🔊 Contoh Suara Speaker Kafe:</span>
              </div>
              <p className="text-slate-400 italic">
                &ldquo;Ting tong! Perhatian, baru saja ada ulasan bintang 5 untuk {outlet.name}. Terima kasih banyak atas kunjungannya!&rdquo;
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!audioUnlocked) handleUnlockAudio();
                playSoundEffect(outlet.soundEffect);
                speakSpeakerAnnouncement(outlet.name, true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-indigo-400" />
              <span>Tes Pengumuman Speaker 📢</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 text-[11px] text-slate-400 flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">💡 TIPS:</span>
            <span>
              Cukup sambungkan HP kasir ini ke <strong>Speaker Bluetooth</strong> kafe atau colokkan kabel AUX ke sound system. Setiap ada ulasan bintang 5 di meja makan, speaker toko langsung mengumumkan ucapan terima kasih ke seluruh ruangan kafe!
            </span>
          </div>
        </div>

        {/* Live Event Feed for this Shift */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Aktivitas Shift Ini</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              {alerts.length} Notifikasi Masuk
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto text-sm">
                🕒
              </div>
              <p className="text-xs text-slate-300 font-medium">Belum Ada Ulasan Masuk</p>
              <p className="text-[11px] text-slate-500">
                Begitu pelanggan scan kartu meja atau memberi bintang 5, dering dan notifikasi akan tampil di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      ⭐
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{alert.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{alert.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 pl-2">
                    {alert.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="p-4 border-t border-slate-900 text-center text-[11px] text-slate-500 space-y-1">
        <p>🔒 Layar Khusus Kasir & Staf (Aman tanpa akses password & pengaturan toko)</p>
        <p className="text-[10px] text-slate-600">Smart QR Review &bull; Multi-Kasir System</p>
      </footer>

      {/* Modal Panduan Pasang di iPhone / Browser Manual */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/25">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Pasang Aplikasi Layar Kasir
                  </h3>
                  <span className="text-[10px] text-amber-400 font-medium">
                    Akses Cepat Seperti Aplikasi Play Store
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ikuti langkah mudah ini untuk memasang layar kasir <strong>&quot;{outlet.name}&quot;</strong> langsung di beranda HP Anda:
            </p>

            <div className="space-y-2.5 text-xs text-slate-200">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-semibold text-white block">
                    {isIOS ? "Ketuk Ikon Bagikan (Share)" : "Buka Menu Browser (Titik Tiga)"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isIOS
                      ? "Ketuk tombol kotak berpanah atas [ ⎋ ] di bilah bawah browser Safari Anda."
                      : "Ketuk ikon menu titik tiga [ ⋮ ] di pojok kanan atas browser Chrome Anda."}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-semibold text-white block">
                    Pilih &ldquo;Tambahkan ke Layar Utama&rdquo; (Add to Home Screen)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Gulir menu ke bawah lalu ketuk opsi <strong>&ldquo;Add to Home Screen / Tambahkan ke Layar Utama&rdquo;</strong>.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-semibold text-white block">
                    Ketuk &ldquo;Tambah&rdquo; (Add)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ikon aplikasi Layar Kasir akan langsung muncul di beranda HP kasir Anda!
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/30 cursor-pointer text-center"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
