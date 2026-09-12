"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  Upload,
  Keyboard,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Building,
  User,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
} from "lucide-react";
import Swal from "sweetalert2";
import { lookupScannedCardAction, restoreOrRegisterCardAction, ScannedCardResult } from "@/lib/actions/qr.actions";

interface AdminOption {
  id: string;
  fullName: string;
  email: string;
}

interface OutletOption {
  id: string;
  name: string;
}

interface QrCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: "SUPER_ADMIN" | "ADMIN";
  isMaster?: boolean;
  admins?: AdminOption[];
  outlets?: OutletOption[];
  onCardRestored?: () => void;
}

// Play soft premium sound on QR detection
function playScanSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Ignore audio context errors
  }
}

export function QrCameraScannerModal({
  isOpen,
  onClose,
  currentUserRole,
  isMaster = false,
  admins = [],
  outlets = [],
  onCardRestored,
}: QrCameraScannerModalProps) {
  const [activeMode, setActiveMode] = useState<"camera" | "upload" | "manual">("camera");
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedCardResult | null>(null);

  // Manual input state
  const [manualCode, setManualCode] = useState("");

  // Restore form state
  const [selectedAdminId, setSelectedAdminId] = useState<string>(
    currentUserRole === "ADMIN" ? "" : (admins[0]?.id || "unassigned")
  );
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState(false);

  // Video, Canvas and Logic references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const scannedResultRef = useRef<ScannedCardResult | null>(null);

  // Stop camera stream cleanly
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

  // Process decoded QR text/URL
  const handleDecodedCode = useCallback(async (rawText: string) => {
    if (!rawText || isProcessingRef.current) return;
    isProcessingRef.current = true;
    stopCamera();
    playScanSound();
    setIsProcessing(true);

    try {
      const res = await lookupScannedCardAction(rawText);
      if (res.success && res.data) {
        const cardData = res.data;
        scannedResultRef.current = cardData;
        setScannedResult(cardData);
        if (cardData.suggestedAdminId && admins.some((a) => a.id === cardData.suggestedAdminId)) {
          setSelectedAdminId(cardData.suggestedAdminId);
        }
      } else {
        await Swal.fire({
          icon: "error",
          title: "Gagal Membaca Kartu",
          text: res.message || "Kartu tidak dikenali.",
          background: "#0f172a",
          color: "#f8fafc",
          confirmButtonColor: "#4f46e5",
        });
      }
    } catch (err) {
      console.error("Lookup error:", err);
      await Swal.fire({
        icon: "error",
        title: "Kesalahan Sistem",
        text: "Terjadi kesalahan saat memeriksa data kartu.",
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonColor: "#4f46e5",
      });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [admins, stopCamera]);

  // Video frame scanning loop
  const scanVideoFrame = useCallback(() => {
    if (scannedResultRef.current || isProcessingRef.current || activeMode !== "camera") return;

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
          handleDecodedCode(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  }, [activeMode, handleDecodedCode]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Browser Anda tidak mendukung akses kamera langsung.");
      setActiveMode("upload");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        setCameraError("Izin akses kamera belum diberikan atau ditutup. Silakan pilih tab 'Upload Gambar QR' atau 'Input Manual'.");
      } else {
        setCameraError("Tidak dapat mengakses kamera. Pastikan browser Anda mengizinkan akses kamera.");
      }
    }
  }, [cameraFacing, scanVideoFrame, stopCamera]);

  // Reset scanner state to scan again
  const handleResetScan = () => {
    scannedResultRef.current = null;
    setScannedResult(null);
    setManualCode("");
    setSelectedOutletId("");
    if (activeMode === "camera") {
      startCamera();
    }
  };

  // Switch mode
  const handleSwitchMode = (mode: "camera" | "upload" | "manual") => {
    setActiveMode(mode);
    setScannedResult(null);
    if (mode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Handle Photo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleDecodedCode(code.data);
        } else {
          Swal.fire({
            icon: "warning",
            title: "QR Tidak Terbaca",
            text: "Tidak ditemukan kode QR pada gambar yang diunggah. Pastikan foto jelas dan terang.",
            background: "#0f172a",
            color: "#f8fafc",
            confirmButtonColor: "#4f46e5",
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  // Handle Manual Code Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDecodedCode(manualCode.trim());
  };

  // Handle Restore Card
  const handleRestoreCard = async () => {
    if (!scannedResult) return;
    setIsRestoring(true);

    try {
      const res = await restoreOrRegisterCardAction({
        code: scannedResult.code,
        assignedAdminId: currentUserRole === "SUPER_ADMIN" ? selectedAdminId : undefined,
        outletId: selectedOutletId || undefined,
      });

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Kartu Berhasil Dipulihkan! 🎉",
          text: res.message,
          background: "#0f172a",
          color: "#f8fafc",
          confirmButtonColor: "#10b981",
        });
        if (onCardRestored) onCardRestored();
        handleResetScan();
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal Memulihkan",
          text: res.message,
          background: "#0f172a",
          color: "#f8fafc",
          confirmButtonColor: "#4f46e5",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Kesalahan Sistem",
        text: "Terjadi kesalahan saat memproses pemulihan kartu.",
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonColor: "#4f46e5",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Lifecycle on modal open/close
  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      if (activeMode === "camera") {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 text-indigo-400 border border-indigo-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Scanner Kamera QR Kartu Fisik</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  AI Guard
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pindai kartu fisik untuk cek status, validasi hak akses, atau pulihkan kartu terhapus.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => handleSwitchMode("camera")}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === "camera"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera Live</span>
          </button>

          <button
            onClick={() => handleSwitchMode("upload")}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === "upload"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Foto QR</span>
          </button>

          <button
            onClick={() => handleSwitchMode("manual")}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === "manual"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Input Kode</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Processing State */}
          {isProcessing ? (
            <div className="py-16 text-center space-y-4 animate-in fade-in duration-150">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin flex items-center justify-center">
                  <Camera className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Memeriksa Status Kartu...</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Memvalidasi riwayat database & hak akses kepemilikan
                </p>
              </div>
            </div>
          ) : scannedResult ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Access Denied Alert */}
              {scannedResult.status === "ACCESS_DENIED" && (
                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-200">Akses Ditolak (Proteksi Kepemilikan)</h3>
                      <p className="text-xs font-mono font-bold text-rose-400 mt-0.5">
                        Kode Kartu: {scannedResult.code}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-rose-300 leading-relaxed bg-rose-950/40 p-3 rounded-xl border border-rose-500/20">
                    {scannedResult.message}
                  </p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Sistem isolasi hierarki mencegah akses lintas jatah Super Admin & Admin Lapangan.</span>
                  </div>
                </div>
              )}

              {/* Existing Active Card */}
              {scannedResult.status === "EXISTING_ACTIVE" && scannedResult.card && (
                <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-200 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Kartu Aktif di Sistem</h3>
                        <p className="text-xs font-mono font-extrabold text-sky-400">
                          {scannedResult.card.code}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Aktif ({scannedResult.card.scanCount} Scan)
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-sky-400" />
                        Outlet Terhubung:
                      </span>
                      <strong className="text-white font-semibold">
                        {scannedResult.card.outlet?.name || "-"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Admin Pemegang:
                      </span>
                      <strong className="text-amber-300 font-semibold">
                        {scannedResult.card.assignedAdmin?.fullName || "Belum Dialokasikan"}
                      </strong>
                    </div>

                    {scannedResult.card.outlet?.owner && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Pemilik Outlet:</span>
                        <span className="text-slate-300 font-medium">
                          {scannedResult.card.outlet.owner.fullName}
                        </span>
                      </div>
                    )}
                  </div>

                  {scannedResult.card.outlet?.googleReviewUrl && (
                    <a
                      href={`/c/${scannedResult.card.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-sky-600/20 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Uji Coba Scan QR & Buka Ulasan (Tambah Scan +1)</span>
                    </a>
                  )}
                </div>
              )}

              {/* Existing Empty Card (Ready to Assign) */}
              {scannedResult.status === "EXISTING_EMPTY" && scannedResult.card && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Kartu Kosong Siap Pakai</h3>
                      <p className="text-xs font-mono font-extrabold text-amber-400">
                        {scannedResult.card.code}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-amber-200/90 leading-relaxed bg-amber-950/30 p-3 rounded-xl border border-amber-500/20">
                    Kartu fisik ini sudah ada di sistem dan siap dihubungkan ke Outlet baru melalui menu pendaftaran outlet atau tombol <strong>+ Kartu</strong>.
                  </p>
                </div>
              )}

              {/* Deleted / Recoverable Card Form */}
              {(scannedResult.status === "DELETED_RECOVERABLE" || scannedResult.status === "NEW_AVAILABLE") && (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-100">
                        {scannedResult.status === "DELETED_RECOVERABLE"
                          ? "Kartu Fisik Terdeteksi (Dapat Dipulihkan) 🔄"
                          : "Daftarkan Sebagai Kartu Baru ✨"}
                      </h3>
                      <p className="text-xs font-mono font-extrabold text-emerald-400">
                        Kode: {scannedResult.code}
                      </p>
                    </div>
                  </div>

                  {scannedResult.lastKnownHistory && (
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300">
                      <div className="text-slate-400 font-semibold">Riwayat Terakhir:</div>
                      <p className="text-[11px] text-slate-300">
                        {scannedResult.lastKnownHistory.description}
                      </p>
                      <div className="text-[10px] text-slate-500">
                        {new Date(scannedResult.lastKnownHistory.date).toLocaleString("id-ID")}
                      </div>
                    </div>
                  )}

                  {/* Options for Recovery */}
                  <div className="space-y-3 pt-1">
                    {currentUserRole === "SUPER_ADMIN" && admins.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Alokasikan ke Admin Lapangan:
                        </label>
                        <select
                          value={selectedAdminId}
                          onChange={(e) => setSelectedAdminId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="unassigned">Pool Umum (Belum Dialokasikan)</option>
                          {admins.map((adm) => (
                            <option key={adm.id} value={adm.id}>
                              {adm.fullName} ({adm.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {outlets.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Langsung Hubungkan ke Outlet (Opsional):
                        </label>
                        <select
                          value={selectedOutletId}
                          onChange={(e) => setSelectedOutletId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Biarkan sebagai Kartu Kosong --</option>
                          {outlets.map((outl) => (
                            <option key={outl.id} value={outl.id}>
                              {outl.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={handleRestoreCard}
                      disabled={isRestoring}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sedang Memulihkan Kartu...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Pulihkan & Aktifkan Kartu {scannedResult.code}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Action: Scan Next Card */}
              <button
                onClick={handleResetScan}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pindai Kartu Fisik Lainnya</span>
              </button>
            </div>
          ) : (
            <>
              {/* Camera Scanner Mode */}
              {activeMode === "camera" && (
                <div className="space-y-3">
                  {cameraError ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-3 text-center">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                      <p>{cameraError}</p>
                      <button
                        onClick={() => handleSwitchMode("upload")}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl inline-flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Gunakan Upload Foto Sebagai Ganti</span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative aspect-video sm:aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner flex items-center justify-center">
                      {/* Video Element */}
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                      />

                      {/* Hidden Canvas for QR Extraction */}
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Viewfinder Target Laser Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                        <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center">
                          {/* Corner Borders */}
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr" />
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br" />

                          {/* Laser Scanning Line Animation */}
                          <div className="absolute top-0 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-[bounce_2s_infinite]" />

                          <span className="text-[11px] font-semibold text-indigo-200/90 bg-slate-950/80 px-2.5 py-1 rounded-full border border-indigo-500/30 backdrop-blur-sm">
                            Arahkan ke Kartu QR
                          </span>
                        </div>
                      </div>

                      {/* Camera Controls Overlay */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"));
                          }}
                          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs flex items-center gap-1 backdrop-blur-md cursor-pointer"
                          title="Ganti Kamera Depan/Belakang"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-center text-[11px] text-slate-400">
                    Posisikan kartu QR fisik di dalam kotak pemindai hingga terdeteksi secara otomatis.
                  </p>
                </div>
              )}

              {/* Photo Upload Mode */}
              {activeMode === "upload" && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/60 hover:bg-indigo-950/20 rounded-2xl p-8 text-center transition-all cursor-pointer group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform mx-auto flex items-center justify-center mb-3 border border-indigo-500/20">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Klik untuk Pilih Foto / Screenshot QR
                    </h3>
                    <p className="text-xs text-slate-400">
                      Format PNG, JPG, JPEG, WEBP didukung
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Input Mode */}
              {activeMode === "manual" && (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Ketik Kode Kartu atau Tempel URL QR:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: c-017 atau http://localhost:3000/c/c-017"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!manualCode.trim() || isProcessing}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memeriksa Kode...</span>
                      </>
                    ) : (
                      <>
                        <span>Periksa Status Kartu</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hak akses terlindungi ({currentUserRole === "SUPER_ADMIN" ? (isMaster ? "Super Admin 1 (Master)" : "Super Admin 2") : "Admin Lapangan"})</span>
          </span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-white font-medium cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
