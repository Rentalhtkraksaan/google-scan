"use client";

import { useState, useEffect } from "react";
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(Boolean(isStandalone));

      // Check iOS user agent
      const ua = window.navigator.userAgent.toLowerCase();
      const isAppleDevice = /iphone|ipad|ipod/.test(ua);
      setIsIOS(isAppleDevice);

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      window.addEventListener("appinstalled", () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Gagal memicu install prompt:", err);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowIOSModal(true);
    }
  };

  return {
    isInstalled,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    triggerInstall,
    hasNativePrompt: Boolean(deferredPrompt),
  };
}

interface InstallPwaButtonProps {
  className?: string;
  variant?: "primary" | "secondary" | "compact" | "drawer";
  label?: string;
}

export function InstallPwaButton({
  className = "",
  variant = "primary",
  label = "Pasang Aplikasi di HP",
}: InstallPwaButtonProps) {
  const { isInstalled, isIOS, showIOSModal, setShowIOSModal, triggerInstall } = usePwaInstall();

  // If already installed, don't show prompt
  if (isInstalled) {
    return null;
  }

  let buttonStyle = "";
  if (variant === "primary") {
    buttonStyle =
      "inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer";
  } else if (variant === "compact") {
    buttonStyle =
      "inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold text-[11px] sm:text-xs rounded-xl border border-emerald-500/30 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer";
  } else if (variant === "drawer") {
    buttonStyle =
      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer text-left shadow-sm group";
  } else {
    buttonStyle =
      "inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer shadow-sm";
  }

  return (
    <>
      <button
        type="button"
        onClick={triggerInstall}
        className={`${buttonStyle} ${className}`}
        title="Pasang aplikasi Smart QR Review langsung di layar utama smartphone"
      >
        {variant === "drawer" ? (
          <>
            <div className="flex items-center gap-3 truncate">
              <Smartphone className="w-4 h-4 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="truncate">{label}</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              PWA
            </span>
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4 shrink-0 text-emerald-300" />
            <span className="whitespace-nowrap">{label}</span>
          </>
        )}
      </button>

      {/* Modal Panduan Instalasi (Khusus iPhone / Safari & Browser Lain) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Pasang di Layar Utama HP
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    Akses Cepat Seperti Aplikasi Play Store / App Store
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
              Pasang <strong>Smart QR Review</strong> langsung di layar HP Anda tanpa perlu membuka browser lagi:
            </p>

            {/* Langkah-langkah Visual */}
            <div className="space-y-2.5 text-xs text-slate-200">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
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
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-semibold text-white block">
                    Pilih &ldquo;Tambahkan ke Layar Utama&rdquo;
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Geser menu ke bawah lalu ketuk opsi <strong>&ldquo;Add to Home Screen / Tambahkan ke Layar Utama&rdquo;</strong>.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-semibold text-white block">
                    Ketuk &ldquo;Tambah&rdquo; (Add)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Icon aplikasi Smart QR Review akan langsung muncul di beranda smartphone Anda!
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer text-center"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
