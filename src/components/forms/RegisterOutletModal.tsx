"use client";

import { useState, useEffect } from "react";
import {
  X,
  Store,
  User,
  Phone,
  Mail,
  KeyRound,
  QrCode,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  MapPin,
  ClipboardCheck,
  ExternalLink,
  AlertCircle,
  XCircle,
} from "lucide-react";
import {
  registerOutletAndClaimCardAction,
  checkEmailAvailabilityAction,
} from "@/lib/actions/auth.actions";
import { resolveReviewUrlAction } from "@/lib/actions/places.actions";
import { formatGoogleReviewUrl } from "@/lib/google-url";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface RegisterOutletModalProps {
  prefilledCode?: string;
  blankCards?: { code: string }[];
  onClose: () => void;
  onSuccess?: () => void;
}

interface SuccessRegistrationData {
  outletName: string;
  fullName: string;
  whatsappNumber?: string;
  email: string;
  password?: string;
  cardCode: string;
}

export function RegisterOutletModal({
  prefilledCode = "",
  blankCards = [],
  onClose,
  onSuccess,
}: RegisterOutletModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState(prefilledCode);

  // Step 1: Hanya Link Google Maps Review & Kode Kartu
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [outletName, setOutletName] = useState("");
  const [detectedPlaceName, setDetectedPlaceName] = useState("");
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [isReviewConverted, setIsReviewConverted] = useState(false);

  // Step 2: Hanya Email (Gmail) & Password (Nama Pemilik & WA di-hide)
  const [email, setEmail] = useState("");
  const [emailCheckStatus, setEmailCheckStatus] = useState<
    "IDLE" | "CHECKING" | "INVALID_FORMAT" | "TAKEN" | "AVAILABLE"
  >("IDLE");
  const [emailCheckMessage, setEmailCheckMessage] = useState<string>("");

  const [password, setPassword] = useState("Admin123!");
  const [showPassword, setShowPassword] = useState(false);

  // Realtime Password Rules (min 8 huruf, huruf besar, huruf kecil, angka, kode unik)
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;

  // Default tersembunyi
  const [fullName, setFullName] = useState("Pemilik Outlet");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const [successData, setSuccessData] = useState<SuccessRegistrationData | null>(null);
  const [copied, setCopied] = useState(false);

  // Pengecekan realtime email di database (debounced 350ms)
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setEmailCheckStatus("IDLE");
      setEmailCheckMessage("");
      return;
    }

    if (!trimmed.includes("@")) {
      setEmailCheckStatus("INVALID_FORMAT");
      setEmailCheckMessage("Format email belum lengkap (harus memiliki tanda '@').");
      return;
    }

    if (!trimmed.endsWith("@gmail.com")) {
      setEmailCheckStatus("INVALID_FORMAT");
      setEmailCheckMessage("Wajib menggunakan akun Google (@gmail.com).");
      return;
    }

    const [userPart] = trimmed.split("@");
    if (!userPart || userPart.length < 3) {
      setEmailCheckStatus("INVALID_FORMAT");
      setEmailCheckMessage("Nama email sebelum '@' minimal 3 huruf.");
      return;
    }

    setEmailCheckStatus("CHECKING");
    setEmailCheckMessage("Memeriksa ketersediaan email di sistem...");

    const timer = setTimeout(async () => {
      try {
        const res = await checkEmailAvailabilityAction(trimmed);
        if (res.available) {
          setEmailCheckStatus("AVAILABLE");
          setEmailCheckMessage("Email tersedia dan siap digunakan!");
        } else {
          setEmailCheckStatus("TAKEN");
          setEmailCheckMessage(res.message || "Email ini sudah terdaftar di sistem! Gunakan email lain.");
        }
      } catch {
        setEmailCheckStatus("INVALID_FORMAT");
        setEmailCheckMessage("Gagal memeriksa ketersediaan email.");
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (prefilledCode) {
      setSelectedCode(prefilledCode);
    }
  }, [prefilledCode]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (successData) {
          onSuccess?.();
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, successData, onSuccess]);

  const getEffectiveCode = () => prefilledCode || selectedCode;

  // Helper mengekstrak nama toko dari pola link maps secara otomatis
  const extractPlaceNameFromUrl = (rawUrl: string) => {
    if (!rawUrl || !rawUrl.trim()) return;
    const trimmed = rawUrl.trim();

    // 1. Ekstrak nama tempat dari pola /place/Nama+Toko/
    const placeMatch = trimmed.match(/\/place\/([^/@?]+)/);
    if (placeMatch && placeMatch[1]) {
      try {
        const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        setDetectedPlaceName(decoded);
        setOutletName(decoded);
        return;
      } catch {
        const clean = placeMatch[1].replace(/\+/g, " ");
        setDetectedPlaceName(clean);
        setOutletName(clean);
        return;
      }
    }

    // 2. Ekstrak query param ?q= atau ?query=
    const qMatch = trimmed.match(/[?&](?:q|query)=([^&#]+)/);
    if (qMatch && qMatch[1]) {
      try {
        const decoded = decodeURIComponent(qMatch[1].replace(/\+/g, " "));
        setDetectedPlaceName(decoded);
        setOutletName(decoded);
      } catch {
        setDetectedPlaceName(qMatch[1]);
        setOutletName(qMatch[1]);
      }
    }
  };

  // Handler perubahan input link ulasan Google Maps
  const handleReviewUrlInput = async (inputVal: string) => {
    const formatted = formatGoogleReviewUrl(inputVal);
    setGoogleReviewUrl(formatted);
    setIsReviewConverted(
      formatted.includes("writereview") ||
      formatted.includes("placeid") ||
      formatted.includes("maps") ||
      formatted.includes("g.page")
    );

    extractPlaceNameFromUrl(inputVal);

    // Jika berupa shortlink (maps.app.goo.gl / goo.gl / g.page), resolve otomatis di latar belakang
    if (
      inputVal &&
      (inputVal.includes("goo.gl") || inputVal.includes("maps.app") || inputVal.includes("g.page"))
    ) {
      setIsResolvingUrl(true);
      try {
        const res = await resolveReviewUrlAction(inputVal);
        if (res.success && res.url) {
          setGoogleReviewUrl(res.url);
          setIsReviewConverted(true);
          extractPlaceNameFromUrl(res.url);
        }
      } catch (err) {
        console.error("Gagal expand shortlink Google Maps:", err);
      } finally {
        setIsResolvingUrl(false);
      }
    }
  };

  // Paste dari clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        await handleReviewUrlInput(text);
      }
    } catch {
      // Fallback
    }
  };

  // Handler Lanjut ke Step 2
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    const code = getEffectiveCode();
    if (!code || !code.trim()) {
      showErrorAlert("Peringatan", "Silakan pilih atau masukkan kode kartu QR.");
      return;
    }
    if (!googleReviewUrl || googleReviewUrl.trim().length < 5) {
      showErrorAlert("Peringatan", "Silakan masukkan link Google Maps review toko.");
      return;
    }

    // Jika outletName belum ada, gunakan nama terdeteksi atau fallback nama kartu
    if (!outletName || !outletName.trim()) {
      const fallbackName = detectedPlaceName || `Outlet ${code.toUpperCase()}`;
      setOutletName(fallbackName);
    }

    setCurrentStep(2);
  };

  // Handler Submit Pendaftaran (Step 2: Hanya Email & Password)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = getEffectiveCode();

    if (!code || !code.trim()) {
      showErrorAlert("Peringatan", "Kode kartu QR tidak valid.");
      return;
    }
    if (!email || !email.includes("@")) {
      showErrorAlert("Peringatan", "Format email login tidak valid.");
      return;
    }
    if (!password || password.length < 6) {
      showErrorAlert("Peringatan", "Password akun portal minimal 6 karakter.");
      return;
    }

    const finalOutletName = outletName.trim() || detectedPlaceName || `Outlet ${code.toUpperCase()}`;
    const finalFullName = fullName.trim() || "Pemilik Outlet";

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("code", code.trim());
      formData.set("outletName", finalOutletName);
      formData.set("googleReviewUrl", googleReviewUrl.trim());
      formData.set("fullName", finalFullName);
      formData.set("whatsappNumber", (whatsappNumber || "").trim());
      formData.set("email", email.trim().toLowerCase());
      formData.set("password", password.trim());

      const result = await registerOutletAndClaimCardAction(formData);

      if (result.success) {
        const regData: SuccessRegistrationData = {
          outletName: finalOutletName,
          fullName: finalFullName,
          whatsappNumber: (whatsappNumber || "").trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          cardCode: code.trim(),
        };

        setSuccessData(regData);
        showSuccessAlert(
          "Outlet Berhasil Didaftarkan! 🎉",
          "Kartu aktif dan akun portal pemilik siap digunakan."
        );
      } else {
        showErrorAlert("Gagal Mendaftarkan Outlet", result.message);
      }
    } catch (err) {
      console.error("Submit register outlet error:", err);
      showErrorAlert("Silakan Reload Device Anda", "Terjadi gangguan koneksi pada sistem.");
    } finally {
      setLoading(false);
    }
  };

  // Salin rincian akun untuk diserahkan ke owner
  const handleCopyMessage = async () => {
    if (!successData) return;
    const portalUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : "https://qr-inaja.vercel.app/login";

    const text = `Halo! Selamat datang di kemitraan Smart QR Review 👋
Kartu Smart QR Google Review toko Anda telah *BERHASIL DIAKTIFKAN* dan siap digunakan.

Berikut detail akun Portal Mitra Toko Anda:
🌐 *Link Login*: ${portalUrl}
📧 *Email*: ${successData.email}
🔑 *Password*: ${successData.password || "Admin123!"}
🏷️ *Kode Kartu*: ${successData.cardCode}

Silakan login untuk melengkapi nama toko & nomor WhatsApp Anda, serta mengaktifkan fitur VIP ulasan pelanggan. Terima kasih! 🚀⭐`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Gagal menyalin pesan:", err);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (successData) onSuccess?.();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Aktivasi Cepat Kartu & Outlet</h3>
              <p className="text-xs text-slate-400">Hubungkan link Google Maps & buat akun portal pemilik</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (successData) onSuccess?.();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar (Hanya tampil jika belum sukses) */}
        {!successData && (
          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                  currentStep === 1
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    currentStep === 1
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  1
                </span>
                <span>1. Link Google Maps Review</span>
              </button>

              <div className="flex-1 h-0.5 bg-slate-800 relative mx-2">
                <div
                  className={`h-full bg-emerald-500 transition-all duration-300 ${
                    currentStep === 2 ? "w-full" : "w-0"
                  }`}
                />
              </div>

              <button
                type="button"
                disabled={currentStep < 2}
                className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                  currentStep === 2
                    ? "text-emerald-400"
                    : "text-slate-500 cursor-not-allowed"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    currentStep === 2
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  2
                </span>
                <span>2. Email & Password Pemilik</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: SUCCESS STATE (DETAIL AKUN SIAP DIBERIKAN KE OWNER) */}
        {successData ? (
          <div className="py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Success Badge */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h4 className="text-xl font-black text-white tracking-tight">🎉 Kartu Berhasil Diaktifkan!</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Kartu <strong className="text-emerald-400 font-mono">{successData.cardCode}</strong> telah aktif dan terhubung ke ulasan Google Maps.
              </p>
            </div>

            {/* Detail Akses Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Rincian Akun Login (Serahkan ke Owner Toko)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Status: Siap Digunakan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Email Login Pemilik</span>
                  <span className="font-mono text-emerald-300 font-semibold truncate block">{successData.email}</span>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Password Akun</span>
                  <span className="font-mono text-amber-400 font-bold">{successData.password || "Admin123!"}</span>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Kode Kartu QR</span>
                  <span className="font-mono text-slate-200 font-bold">{successData.cardCode}</span>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/70">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Toko / Lokasi</span>
                  <span className="font-medium text-slate-200 truncate block">{successData.outletName}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Owner dapat login menggunakan email & password di atas, dan dapat melengkapi <strong>Nama Toko</strong> serta <strong>Nomor WhatsApp</strong> mereka di profil akun.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-white" />
                    <span>Rincian Akun Login Berhasil Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Salin Rincian Akun untuk Diberikan ke Owner</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
              >
                Selesai & Ke Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* FORM 2-LANGKAH */
          <div className="my-4">
            {/* STEP 1: HANYA LINK GOOGLE MAPS + AUTO MINIMAP PREVIEW */}
            {currentStep === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4 animate-in fade-in duration-200">
                {/* 1. Kode Kartu */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Pilih / Kode Kartu QR <span className="text-rose-400">*</span></span>
                    {prefilledCode && (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        <Lock className="w-3 h-3" /> Terkunci Otomatis
                      </span>
                    )}
                  </label>

                  {prefilledCode ? (
                    <div className="relative">
                      <QrCode className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        readOnly
                        value={prefilledCode}
                        className="w-full pl-9 pr-24 py-2.5 bg-slate-950/90 border border-emerald-500/40 rounded-xl text-sm text-emerald-300 font-mono font-bold cursor-not-allowed select-none focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Terkunci
                      </span>
                    </div>
                  ) : blankCards.length > 0 ? (
                    <div className="relative">
                      <QrCode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        required
                        value={selectedCode}
                        onChange={(e) => setSelectedCode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Pilih Kartu Kosong Dari Jatah Anda --</option>
                        {blankCards.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} (Status: Kosong / Siap Digunakan)
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="relative">
                      <QrCode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={selectedCode}
                        onChange={(e) => setSelectedCode(e.target.value)}
                        placeholder="Contoh: c-001"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Input Link Google Maps Review */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>Link Google Maps Review <span className="text-rose-400">*</span></span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      {isResolvingUrl ? (
                        <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Membaca link...
                        </span>
                      ) : isReviewConverted ? (
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Pop-up Bintang 5 Aktif
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={googleReviewUrl}
                      onChange={(e) => handleReviewUrlInput(e.target.value)}
                      placeholder="Paste link Google Maps ulasan toko di sini..."
                      className="w-full pl-3 pr-24 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePasteClipboard}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Paste link dari clipboard"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Paste</span>
                      </button>

                      {googleReviewUrl && (
                        <a
                          href={googleReviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs transition-colors flex items-center justify-center cursor-pointer"
                          title="Buka link di tab baru"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {detectedPlaceName && (
                    <div className="pt-1 flex items-center gap-1.5 text-xs text-emerald-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-slate-400">Toko Terdeteksi:</span>
                      <strong className="text-white truncate">{detectedPlaceName}</strong>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 leading-tight">
                    💡 Cukup masukkan link Google Maps ulasan toko Anda (link share / ulasan), sistem otomatis mengaktifkan pop-up ulasan bintang 5.
                  </p>
                </div>

                {/* Tombol Aksi Step 1 */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={!getEffectiveCode() || !googleReviewUrl.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <span>Lanjut ke Akun Pemilik</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: HANYA EMAIL (GMAIL) & PASSWORD (NAMA & WA DI-HIDE) */}
            {currentStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
                {/* Ringkasan Step 1 */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {outletName || detectedPlaceName || `Outlet ${getEffectiveCode().toUpperCase()}`}
                      </span>
                      <span className="text-[10px] text-emerald-300 font-mono block">
                        Kartu: {getEffectiveCode()} • Link Maps Terhubung
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold shrink-0 cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3.5">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-200">
                      Buat Akun Login Pemilik Toko
                    </span>
                  </div>

                  {/* Email Login Portal (Gmail) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Email Login Pemilik (Gmail) <span className="text-rose-400">*</span></span>
                      {emailCheckStatus === "CHECKING" && (
                        <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Memeriksa sistem...
                        </span>
                      )}
                      {emailCheckStatus === "AVAILABLE" && (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Tersedia
                        </span>
                      )}
                      {emailCheckStatus === "TAKEN" && (
                        <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          Sudah Terdaftar
                        </span>
                      )}
                      {emailCheckStatus === "INVALID_FORMAT" && (
                        <span className="text-[11px] text-amber-400 font-medium">
                          Format Belum Sesuai
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        maxLength={30}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="pemilik.toko@gmail.com"
                        className={`w-full pl-9 pr-10 py-2.5 bg-slate-900 border rounded-xl text-sm font-mono placeholder:text-slate-500 focus:outline-none transition-colors ${
                          emailCheckStatus === "AVAILABLE"
                            ? "border-emerald-500/70 bg-emerald-950/10 focus:border-emerald-500 text-emerald-300"
                            : emailCheckStatus === "TAKEN" || emailCheckStatus === "INVALID_FORMAT"
                            ? "border-rose-500/60 bg-rose-950/10 focus:border-rose-500 text-rose-200"
                            : "border-slate-700 focus:border-emerald-500 text-slate-100"
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailCheckStatus === "CHECKING" && (
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        )}
                        {emailCheckStatus === "AVAILABLE" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {emailCheckStatus === "TAKEN" && (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                    </div>

                    {/* Pesan Keterangan Status Email Realtime */}
                    {emailCheckMessage && (
                      <p
                        className={`text-[11px] mt-1.5 flex items-center gap-1.5 ${
                          emailCheckStatus === "AVAILABLE"
                            ? "text-emerald-400 font-medium"
                            : emailCheckStatus === "TAKEN"
                            ? "text-rose-400 font-semibold"
                            : emailCheckStatus === "INVALID_FORMAT"
                            ? "text-amber-400"
                            : "text-slate-400"
                        }`}
                      >
                        <span>{emailCheckMessage}</span>
                      </p>
                    )}
                  </div>

                  {/* Password Akun */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Password Akun Portal <span className="text-rose-400">*</span>
                      </label>
                      {isPasswordValid ? (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Password Kuat & Valid
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400 font-medium">
                          Wajib 5 Syarat
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        maxLength={30}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contoh: Admin123!"
                        className={`w-full pl-9 pr-10 py-2.5 bg-slate-900 border rounded-xl text-sm font-mono placeholder:text-slate-500 focus:outline-none transition-colors ${
                          isPasswordValid
                            ? "border-emerald-500/70 bg-emerald-950/10 focus:border-emerald-500 text-emerald-300"
                            : password.length > 0
                            ? "border-amber-500/60 focus:border-amber-500 text-slate-100"
                            : "border-slate-700 focus:border-emerald-500 text-slate-100"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                        title={showPassword ? "Sembunyikan password" : "Lihat password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Realtime Checklist Password (min 8 huruf, besar, kecil, angka, kode unik) */}
                    <div className="mt-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="uppercase font-bold tracking-wider text-slate-400">
                          Syarat Wajib Password:
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {[hasMinLen, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length}/5 Terpenuhi
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {/* 1. Min 8 Karakter */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
                            hasMinLen
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-slate-950 text-slate-500 border-slate-800"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              hasMinLen ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {hasMinLen ? "✓" : "•"}
                          </span>
                          <span className="font-medium">Min. 8 Huruf</span>
                        </div>

                        {/* 2. Huruf Besar */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
                            hasUpper
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-slate-950 text-slate-500 border-slate-800"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              hasUpper ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {hasUpper ? "✓" : "•"}
                          </span>
                          <span className="font-medium">Huruf Besar (A-Z)</span>
                        </div>

                        {/* 3. Huruf Kecil */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
                            hasLower
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-slate-950 text-slate-500 border-slate-800"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              hasLower ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {hasLower ? "✓" : "•"}
                          </span>
                          <span className="font-medium">Huruf Kecil (a-z)</span>
                        </div>

                        {/* 4. Angka */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
                            hasNumber
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-slate-950 text-slate-500 border-slate-800"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              hasNumber ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {hasNumber ? "✓" : "•"}
                          </span>
                          <span className="font-medium">Angka (0-9)</span>
                        </div>

                        {/* 5. Simbol / Kode Unik */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border col-span-2 transition-all ${
                            hasSpecial
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-slate-950 text-slate-500 border-slate-800"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              hasSpecial ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {hasSpecial ? "✓" : "•"}
                          </span>
                          <span className="font-medium">Kode Unik / Karakter Khusus (!@#$%^&*_)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nama Toko & No. WhatsApp diisi mandiri oleh Owner:</span>
                    </p>
                    <p className="text-slate-400">
                      Setelah akun dibuat, owner dapat langsung login dan melengkapi Nama Toko serta Nomor WhatsApp mereka di menu profil akun.
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi Step 2 */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || emailCheckStatus !== "AVAILABLE" || !isPasswordValid}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mendaftarkan Outlet...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Daftarkan & Selesaikan Akun 🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
