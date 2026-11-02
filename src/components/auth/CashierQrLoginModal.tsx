"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { useRouter } from "next/navigation";
import {
  X,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  QrCode,
  Store,
  RotateCcw,
} from "lucide-react";
import { verifyCashierPairingQrAction } from "@/lib/actions/membership.actions";

interface CashierQrLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function playSuccessBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // Ignore audio context errors
  }
}

function playBlockedBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.setValueAtTime(180, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    // Ignore audio context errors
  }
}

export function CashierQrLoginModal({ isOpen, onClose }: CashierQrLoginModalProps) {
  const router = useRouter();
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [blockedError, setBlockedError] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [verifiedOutlet, setVerifiedOutlet] = useState<{
    name: string;
    redirectUrl: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isLockedRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleScannedQr = useCallback(
    async (rawText: string) => {
      if (!rawText || isLockedRef.current) return;
      isLockedRef.current = true;
      stopCamera();

      const trimmed = rawText.trim();

      // 1. FILTER KETAT LAPIS PERTAMA (Client Gatekeeper):
      // Tolak seketika semua barcode yang bukan format Pairing Kasir Outlet (/kasir/ksr_... atau ksr_...)
      if (/\/c\/[a-zA-Z0-9_-]+/i.test(trimmed)) {
        playBlockedBeep();
        setBlockedError({
          title: "QR Kartu Meja Ditolak!",
          message:
            "Ini adalah QR Kartu Meja untuk pelanggan, bukan Barcode Login Kasir. Silakan scan QR Pairing Kasir yang ada di dalam menu Dashboard Akun Outlet.",
        });
        return;
      }

      const isOutletCashierQr =
        /\/kasir\/ksr_[a-zA-Z0-9_-]+/i.test(trimmed) || /^ksr_[a-zA-Z0-9_-]+$/i.test(trimmed);

      if (!isOutletCashierQr) {
        playBlockedBeep();
        setBlockedError({
          title: "Barcode Tidak Diizinkan!",
          message:
            "Sistem memblokir semua barcode luar. Kamera ini dikunci khusus hanya untuk men-scan Barcode Pairing Kasir resmi dari Akun Outlet.",
        });
        return;
      }

      // 2. FILTER KETAT LAPIS KEDUA (Database Verification):
      // Pastikan token ksr_ benar-benar terdaftar & aktif di tabel Outlet database
      setIsVerifying(true);
      try {
        const res = await verifyCashierPairingQrAction(trimmed);
        if (!res.success || !res.redirectUrl) {
          playBlockedBeep();
          setIsVerifying(false);
          setBlockedError({
            title:
              res.reason === "VIP_EXPIRED"
                ? "Masa Aktif VIP Outlet Berakhir"
                : "Barcode Outlet Tidak Valid",
            message: res.message,
          });
          return;
        }

        // Valid & Terverifikasi milik Outlet!
        playSuccessBeep();
        setIsVerifying(false);
        setVerifiedOutlet({
          name: res.outletName || "Outlet",
          redirectUrl: res.redirectUrl,
        });

        setTimeout(() => {
          router.push(res.redirectUrl!);
        }, 600);
      } catch {
        playBlockedBeep();
        setIsVerifying(false);
        setBlockedError({
          title: "Gagal Memverifikasi Barcode",
          message: "Terjadi gangguan jaringan saat memeriksa barcode outlet. Silakan scan ulang.",
        });
      }
    },
    [router, stopCamera]
  );

  const scanVideoFrame = useCallback(() => {
    if (isLockedRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          handleScannedQr(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleScannedQr]);

  const startCamera = useCallback(
    async (facing: "environment" | "user" = cameraFacing) => {
      stopCamera();
      setCameraError(null);
      setBlockedError(null);
      setVerifiedOutlet(null);
      setIsVerifying(false);
      isLockedRef.current = false;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Browser di perangkat ini tidak mendukung akses kamera langsung.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
        }
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
          setCameraError(
            "Izin kamera ditolak oleh browser. Klik ikon gembok/kamera di pojok atas browser lalu pilih 'Izinkan Kamera'."
          );
        } else {
          setCameraError(
            "Tidak dapat membuka kamera perangkat. Pastikan kamera tidak sedang dipakai aplikasi lain."
          );
        }
      }
    },
    [cameraFacing, scanVideoFrame, stopCamera]
  );

  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(cameraFacing);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          stopCamera();
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, cameraFacing, startCamera, stopCamera, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white">Login via Kasir</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Khusus QR Outlet
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Arahkan kamera ke Barcode Pairing Kasir di Akun Outlet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Tutup Kamera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* State 1: Sedang Memverifikasi ke Database */}
          {isVerifying ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-white">Memverifikasi Barcode Outlet...</h4>
              <p className="text-xs text-slate-400">
                Memastikan barcode terdaftar resmi pada akun Outlet
              </p>
            </div>
          ) : verifiedOutlet ? (
            /* State 2: Berhasil Terhubung */
            <div className="py-10 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-base font-black text-white">Barcode Outlet Terverifikasi!</h4>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-semibold text-amber-300">
                <Store className="w-3.5 h-3.5" />
                <span>{verifiedOutlet.name}</span>
              </div>
              <p className="text-xs text-slate-400">Membuka layar monitor kasir otomatis...</p>
            </div>
          ) : blockedError ? (
            /* State 3: Barcode Ditolak / Diblokir */
            <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-rose-300">{blockedError.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{blockedError.message}</p>
              </div>
              <button
                type="button"
                onClick={() => startCamera(cameraFacing)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Scan Ulang Barcode Outlet</span>
              </button>
            </div>
          ) : cameraError ? (
            /* State 4: Kamera Gagal Dibuka */
            <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center space-y-3">
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-200 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(cameraFacing)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Buka Kamera Lagi</span>
              </button>
            </div>
          ) : (
            /* State 5: Live Camera Viewfinder */
            <div className="space-y-3">
              <div className="relative aspect-square w-full max-w-[300px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-500/40 shadow-inner">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Corner Framing Guides */}
                <div className="absolute inset-8 pointer-events-none">
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2 shadow-sm shadow-amber-400" />
                </div>

                {/* Switch Front/Back Camera Button */}
                <button
                  type="button"
                  onClick={handleToggleCameraFacing}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-white border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-lg cursor-pointer"
                  title="Putar Kamera Depan/Belakang"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Putar Kamera</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2.5 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">
                    Proteksi Khusus Barcode Outlet:
                  </span>
                  Buka <strong>Dashboard Akun Outlet</strong> &rarr; bagian{" "}
                  <strong>Layar Monitor Multi-Kasir</strong>, lalu scan QR Code yang tampil di sana.
                  Barcode selain dari akun Outlet otomatis diblokir.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

