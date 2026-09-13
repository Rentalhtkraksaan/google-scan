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
  CheckSquare,
  Square,
  ListPlus,
  RotateCcw,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  lookupScannedCardAction,
  restoreOrRegisterCardAction,
  batchLookupScannedCardsAction,
  batchRestoreOrRegisterCardsAction,
  ScannedCardResult,
} from "@/lib/actions/qr.actions";
import { parseMultipleCardCodes } from "@/lib/card-code";

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

  // Manual input & Range Generator state
  const [manualCode, setManualCode] = useState("");
  const [showRangeHelper, setShowRangeHelper] = useState(false);
  const [rangePrefix, setRangePrefix] = useState("c-");
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("20");
  const [rangePad, setRangePad] = useState<number>(3);

  // Batch states
  const [batchResults, setBatchResults] = useState<ScannedCardResult[] | null>(null);
  const [selectedBatchCodes, setSelectedBatchCodes] = useState<string[]>([]);
  const [isBatchRestoring, setIsBatchRestoring] = useState(false);

  // Restore form state
  const [selectedAdminId, setSelectedAdminId] = useState<string>(
    currentUserRole === "ADMIN" ? "" : (admins[0]?.id || "unassigned")
  );
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState(false);

  // Memoized detected codes from manual textarea input
  const detectedCodes = React.useMemo(() => {
    return parseMultipleCardCodes(manualCode);
  }, [manualCode]);

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
    setBatchResults(null);
    setSelectedBatchCodes([]);
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
    setBatchResults(null);
    setSelectedBatchCodes([]);
    if (mode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Range generator handler
  const handleApplyRange = (mode: "replace" | "append") => {
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    if (isNaN(start) || isNaN(end) || start > end) {
      Swal.fire({
        icon: "warning",
        title: "Rentang Tidak Valid",
        text: "Pastikan nomor awal lebih kecil atau sama dengan nomor akhir.",
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }
    const count = end - start + 1;
    if (count > 200) {
      Swal.fire({
        icon: "warning",
        title: "Terlalu Banyak",
        text: "Maksimal 200 kartu per rentang generasi.",
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    const generated: string[] = [];
    for (let i = start; i <= end; i++) {
      const numStr = rangePad > 0 ? String(i).padStart(rangePad, "0") : String(i);
      generated.push(`${rangePrefix.trim()}${numStr}`);
    }

    if (mode === "replace") {
      setManualCode(generated.join("\n"));
    } else {
      setManualCode((prev) =>
        prev.trim() ? `${prev.trim()}\n${generated.join("\n")}` : generated.join("\n")
      );
    }
    setShowRangeHelper(false);
  };

  // Batch item selection helpers
  const toggleSelectBatchCode = (code: string) => {
    setSelectedBatchCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleSelectAllRecoverable = () => {
    if (!batchResults) return;
    const recoverable = batchResults.filter((c) => c.canRestore).map((c) => c.code);
    const allSelected =
      recoverable.length > 0 && recoverable.every((c) => selectedBatchCodes.includes(c));
    if (allSelected) {
      setSelectedBatchCodes((prev) => prev.filter((c) => !recoverable.includes(c)));
    } else {
      setSelectedBatchCodes(recoverable);
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

  // Handle Manual Code Submit (Single vs Batch)
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (detectedCodes.length === 0) return;

    if (detectedCodes.length === 1) {
      handleDecodedCode(detectedCodes[0]);
      return;
    }

    // Multiple codes batch inspection
    setIsProcessing(true);
    setScannedResult(null);

    try {
      const res = await batchLookupScannedCardsAction(detectedCodes);
      if (res.success && res.data) {
        setBatchResults(res.data);
        const recoverable = res.data.filter((c) => c.canRestore).map((c) => c.code);
        setSelectedBatchCodes(recoverable);

        const firstSuggested = res.data.find((c) => c.suggestedAdminId)?.suggestedAdminId;
        if (firstSuggested && admins.some((a) => a.id === firstSuggested)) {
          setSelectedAdminId(firstSuggested);
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Pemeriksaan Gagal",
          text: res.message || "Gagal memeriksa daftar kartu.",
          background: "#0f172a",
          color: "#f8fafc",
          confirmButtonColor: "#4f46e5",
        });
      }
    } catch (err) {
      console.error("Batch lookup error:", err);
      Swal.fire({
        icon: "error",
        title: "Kesalahan Sistem",
        text: "Terjadi kesalahan saat memeriksa daftar kartu.",
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonColor: "#4f46e5",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Single Card Restore
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

  // Handle Batch Restore
  const handleBatchRestore = async () => {
    if (selectedBatchCodes.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Kartu Terlebih Dahulu",
        text: "Silakan centang minimal 1 kartu yang siap dipulihkan.",
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    const assignedAdminName =
      currentUserRole === "SUPER_ADMIN"
        ? selectedAdminId === "unassigned"
          ? "Pool Umum (Belum Dialokasikan)"
          : admins.find((a) => a.id === selectedAdminId)?.fullName || "Admin Terpilih"
        : "Akun Anda Sendiri";

    const outletName = selectedOutletId
      ? outlets.find((o) => o.id === selectedOutletId)?.name || "Outlet Terpilih"
      : "Tanpa Outlet (Kartu Kosong Siap Pakai)";

    const confirm = await Swal.fire({
      icon: "question",
      title: `Pulihkan ${selectedBatchCodes.length} Kartu Sekaligus?`,
      html: `
        <div class="text-left text-xs space-y-2 mt-2 p-3 bg-slate-950/80 rounded-xl border border-slate-700 text-slate-300">
          <div><strong>Jumlah Kartu:</strong> <span class="text-emerald-400 font-bold">${selectedBatchCodes.length} Kartu</span></div>
          <div><strong>Alokasi Admin:</strong> <span class="text-amber-300 font-semibold">${assignedAdminName}</span></div>
          <div><strong>Outlet:</strong> <span class="text-sky-300 font-semibold">${outletName}</span></div>
        </div>
        <p class="text-xs text-slate-400 mt-3">Kartu-kartu fisik ini akan langsung diaktifkan kembali ke sistem dan siap digunakan.</p>
      `,
      showCancelButton: true,
      confirmButtonText: `Ya, Pulihkan ${selectedBatchCodes.length} Kartu`,
      cancelButtonText: "Batal",
      background: "#0f172a",
      color: "#f8fafc",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#64748b",
    });

    if (!confirm.isConfirmed) return;

    setIsBatchRestoring(true);
    try {
      const res = await batchRestoreOrRegisterCardsAction({
        codes: selectedBatchCodes,
        assignedAdminId: currentUserRole === "SUPER_ADMIN" ? selectedAdminId : undefined,
        outletId: selectedOutletId || undefined,
      });

      if (res.success) {
        await Swal.fire({
          icon: "success",
          title: "Pemulihan Massal Berhasil! 🎉",
          text: res.message,
          background: "#0f172a",
          color: "#f8fafc",
          confirmButtonColor: "#10b981",
        });

        if (onCardRestored) onCardRestored();

        // Refresh batch results so user sees updated status immediately
        if (batchResults) {
          const reCheck = await batchLookupScannedCardsAction(batchResults.map((b) => b.code));
          if (reCheck.success && reCheck.data) {
            setBatchResults(reCheck.data);
            setSelectedBatchCodes([]);
          } else {
            handleResetScan();
          }
        }
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
    } catch (err) {
      console.error("Batch restore error:", err);
      Swal.fire({
        icon: "error",
        title: "Kesalahan Sistem",
        text: "Terjadi kesalahan saat memulihkan daftar kartu.",
        background: "#0f172a",
        color: "#f8fafc",
        confirmButtonColor: "#4f46e5",
      });
    } finally {
      setIsBatchRestoring(false);
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
      <div
        className={`relative w-full ${
          batchResults ? "max-w-2xl sm:max-w-3xl" : "max-w-xl"
        } bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300`}
      >
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
                <h3 className="text-sm font-bold text-white">
                  {detectedCodes.length > 1
                    ? `Memeriksa Status ${detectedCodes.length} Kartu...`
                    : "Memeriksa Status Kartu..."}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Memvalidasi riwayat database & hak akses kepemilikan
                </p>
              </div>
            </div>
          ) : batchResults ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Header Bar */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setBatchResults(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Edit / Tambah Kode</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Hasil Pemeriksaan Massal
                  </span>
                  <button
                    type="button"
                    onClick={handleResetScan}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Reset Semua"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Kartu</div>
                  <div className="text-xl font-black text-white mt-0.5">{batchResults.length}</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Siap Pulihkan</div>
                  <div className="text-xl font-black text-emerald-300 mt-0.5">
                    {batchResults.filter((c) => c.canRestore).length}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30">
                  <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Sudah Aktif</div>
                  <div className="text-xl font-black text-sky-300 mt-0.5">
                    {batchResults.filter((c) => c.status === "EXISTING_ACTIVE" || c.status === "EXISTING_EMPTY").length}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                  <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Ditolak / Blokir</div>
                  <div className="text-xl font-black text-rose-300 mt-0.5">
                    {batchResults.filter((c) => c.status === "ACCESS_DENIED").length}
                  </div>
                </div>
              </div>

              {/* Recovery Configuration (if any recoverable cards exist) */}
              {batchResults.some((c) => c.canRestore) && (
                <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-emerald-200">
                        Opsi Pemulihan Massal ({selectedBatchCodes.length} Terpilih)
                      </h3>
                    </div>
                    {currentUserRole === "SUPER_ADMIN" && (
                      <span className="text-[10px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
                        Hierarki: {isMaster ? "Super Admin 1 (Master)" : "Super Admin 2"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentUserRole === "SUPER_ADMIN" && admins.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
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
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Hubungkan ke Outlet (Opsional):
                        </label>
                        <select
                          value={selectedOutletId}
                          onChange={(e) => setSelectedOutletId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Biarkan sebagai Kartu Kosong Siap Pakai --</option>
                          {outlets.map((outl) => (
                            <option key={outl.id} value={outl.id}>
                              {outl.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleBatchRestore}
                      disabled={isBatchRestoring || selectedBatchCodes.length === 0}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {isBatchRestoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sedang Memulihkan {selectedBatchCodes.length} Kartu...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Pulihkan {selectedBatchCodes.length} Kartu Terpilih Sekaligus</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Select All & Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 text-xs">
                  <button
                    type="button"
                    onClick={toggleSelectAllRecoverable}
                    disabled={!batchResults.some((c) => c.canRestore)}
                    className="flex items-center gap-1.5 font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {batchResults.filter((c) => c.canRestore).length > 0 &&
                    batchResults
                      .filter((c) => c.canRestore)
                      .every((c) => selectedBatchCodes.includes(c.code)) ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                    <span>Pilih Semua yang Siap Pulihkan</span>
                  </button>

                  <span className="text-slate-400 text-[11px]">
                    Terpilih: <strong className="text-emerald-400 font-bold">{selectedBatchCodes.length}</strong> dari{" "}
                    {batchResults.filter((c) => c.canRestore).length}
                  </span>
                </div>

                {/* List of Cards */}
                <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1">
                  {batchResults.map((card) => {
                    const isSelected = selectedBatchCodes.includes(card.code);
                    return (
                      <div
                        key={card.code}
                        onClick={() => {
                          if (card.canRestore) toggleSelectBatchCode(card.code);
                        }}
                        className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          card.canRestore
                            ? isSelected
                              ? "bg-emerald-500/10 border-emerald-500/40 cursor-pointer"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700 cursor-pointer"
                            : "bg-slate-950/30 border-slate-800/60 opacity-70 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {card.canRestore ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectBatchCode(card.code);
                              }}
                              className="text-slate-400 hover:text-white shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                          ) : (
                            <div className="w-4 h-4 rounded border border-slate-700 bg-slate-900/60 shrink-0" />
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs sm:text-sm text-white truncate">
                                {card.code}
                              </span>
                              {card.card?.outlet && (
                                <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                  <Building className="w-3 h-3 text-slate-500 shrink-0" />
                                  {card.card.outlet.name}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                              {card.message}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {card.status === "DELETED_RECOVERABLE" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Dapat Dipulihkan
                            </span>
                          )}
                          {card.status === "NEW_AVAILABLE" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Daftar Baru
                            </span>
                          )}
                          {card.status === "EXISTING_ACTIVE" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              Sudah Aktif
                            </span>
                          )}
                          {card.status === "EXISTING_EMPTY" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Kartu Kosong
                            </span>
                          )}
                          {card.status === "ACCESS_DENIED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Akses Ditolak
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom scan next button */}
              <button
                type="button"
                onClick={handleResetScan}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pindai / Periksa Kartu Lainnya</span>
              </button>
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
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Ketik Kode Kartu atau Tempel URL QR (Bisa Banyak Sekaligus):</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {detectedCodes.length > 0 && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {detectedCodes.length} kode terdeteksi
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowRangeHelper((v) => !v)}
                          className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/20 transition-colors"
                        >
                          <ListPlus className="w-3 h-3" />
                          <span>{showRangeHelper ? "Tutup Generator" : "+ Rentang Kode"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Range Generator Helper */}
                    {showRangeHelper && (
                      <div className="mb-3 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Generator Rentang Kode Otomatis</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowRangeHelper(false)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">Prefix</label>
                            <input
                              type="text"
                              value={rangePrefix}
                              onChange={(e) => setRangePrefix(e.target.value)}
                              placeholder="c-"
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">Dari No.</label>
                            <input
                              type="number"
                              value={rangeStart}
                              onChange={(e) => setRangeStart(e.target.value)}
                              min="1"
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">Sampai No.</label>
                            <input
                              type="number"
                              value={rangeEnd}
                              onChange={(e) => setRangeEnd(e.target.value)}
                              min="1"
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">Format Digit</label>
                            <select
                              value={rangePad}
                              onChange={(e) => setRangePad(Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value={3}>3 digit (001)</option>
                              <option value={2}>2 digit (01)</option>
                              <option value={4}>4 digit (0001)</option>
                              <option value={0}>Tanpa nol (1)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleApplyRange("replace")}
                            className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Ganti Input dengan Rentang Ini
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyRange("append")}
                            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            + Sisipkan ke Bawah
                          </button>
                        </div>
                      </div>
                    )}

                    <textarea
                      rows={4}
                      placeholder={`Contoh input banyak kartu:\nc-001\nc-002\nc-003\natau pisahkan koma: c-001, c-002, c-003\natau tempel link URL: http://localhost:3000/c/c-017`}
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      autoFocus
                    />

                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Mendukung copy-paste banyak baris dari Excel / Notepad, dipisah koma / spasi, atau URL lengkap.</span>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={detectedCodes.length === 0 || isProcessing}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memeriksa {detectedCodes.length} Kartu...</span>
                      </>
                    ) : detectedCodes.length > 1 ? (
                      <>
                        <span>Periksa Status {detectedCodes.length} Kartu Sekaligus</span>
                        <ArrowRight className="w-4 h-4" />
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
