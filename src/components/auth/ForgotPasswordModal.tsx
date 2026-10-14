"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  X,
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Lock,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import {
  getLoginRedirectPath,
  checkRegisteredEmailForResetAction,
  requestPasswordResetOtpAction,
  verifyOtpCodeOnlyAction,
  verifyOtpAndResetPasswordAction,
} from "@/lib/actions/auth.actions";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
}

type EmailCheckStatus = "IDLE" | "CHECKING" | "INVALID_FORMAT" | "NOT_FOUND" | "FOUND";

export function ForgotPasswordModal({
  isOpen,
  initialEmail = "",
  onClose,
}: ForgotPasswordModalProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  // Step state: 1 = Email & OTP, 2 = Set Password Baru
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [email, setEmail] = useState(initialEmail);
  const [emailCheckStatus, setEmailCheckStatus] = useState<EmailCheckStatus>("IDLE");
  const [emailFeedback, setEmailFeedback] = useState("");
  const [accountOwnerName, setAccountOwnerName] = useState("");

  // OTP states (di Step 1)
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password states (di Step 2)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const startingEmail = initialEmail || "";
      setEmail(startingEmail);
      setStep(1);
      setIsOtpSent(false);
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResendCooldown(0);

      if (startingEmail.endsWith("@gmail.com")) {
        triggerEmailCheck(startingEmail);
      } else {
        setEmailCheckStatus("IDLE");
        setEmailFeedback("");
        setAccountOwnerName("");
      }
    } else {
      document.body.style.overflow = "unset";
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    }
  }, [isOpen, initialEmail]);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ─── Realtime Email Check (Debounced 350ms) ─────────────────────────────────
  const triggerEmailCheck = (value: string) => {
    const clean = value.trim().toLowerCase();

    if (!clean) {
      setEmailCheckStatus("IDLE");
      setEmailFeedback("");
      setAccountOwnerName("");
      return;
    }

    if (!clean.includes("@") || !clean.endsWith("@gmail.com")) {
      setEmailCheckStatus("INVALID_FORMAT");
      setEmailFeedback("Format email tidak valid. Wajib akun Google (@gmail.com).");
      setAccountOwnerName("");
      return;
    }

    const [userPart] = clean.split("@");
    if (!userPart || userPart.length < 3) {
      setEmailCheckStatus("INVALID_FORMAT");
      setEmailFeedback("Nama email terlalu pendek (minimal 3 huruf sebelum @gmail.com).");
      setAccountOwnerName("");
      return;
    }

    setEmailCheckStatus("CHECKING");
    setEmailFeedback("Memeriksa email di sistem...");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkRegisteredEmailForResetAction(clean);
        if (res.exists) {
          setEmailCheckStatus("FOUND");
          setAccountOwnerName(res.fullName || "");
          setEmailFeedback(
            res.fullName
              ? `Email terdaftar atas nama: ${res.fullName}`
              : "Email terdaftar di sistem. Siap menerima kode OTP."
          );
        } else {
          setEmailCheckStatus("NOT_FOUND");
          setAccountOwnerName("");
          setEmailFeedback(
            res.message || "Email belum terdaftar di sistem. Gunakan email yang dipakai saat aktivasi."
          );
        }
      } catch (err) {
        console.error("Email check error:", err);
        setEmailCheckStatus("IDLE");
        setEmailFeedback("");
      }
    }, 350);
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    triggerEmailCheck(val);
  };

  // ─── Password Strength Checklist (5 Rules) ──────────────────────────────────
  const passwordRules = useMemo(() => {
    const hasMinLen = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const allValid = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;
    return { hasMinLen, hasUpper, hasLower, hasNumber, hasSpecial, allValid };
  }, [newPassword]);

  if (!isOpen) return null;

  // ─── Step 1A: Kirim Kode OTP ───────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (isSendingOtp) return;
    const cleanEmail = email.trim().toLowerCase();

    if (emailCheckStatus !== "FOUND") {
      await showErrorAlert(
        "Email Belum Valid",
        "Pastikan email yang Anda masukkan sudah terdaftar di sistem."
      );
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await requestPasswordResetOtpAction(cleanEmail);

      if (!res.success) {
        setIsSendingOtp(false);
        await showErrorAlert("Gagal Mengirim OTP", res.message);
        return;
      }

      setIsOtpSent(true);
      setResendCooldown(60); // 60 detik cooldown
      showSuccessAlert(
        "OTP Terkirim!",
        `Kode verifikasi 6 digit telah dikirim ke ${cleanEmail}. Periksa folder Kotak Masuk atau Spam.`
      );
    } catch (err: unknown) {
      console.error("handleSendOtp error:", err);
      await showErrorAlert("Terjadi Kesalahan", "Gagal menghubungi server untuk mengirim OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ─── Step 1B: Verifikasi Kode OTP (Untuk Pindah ke Step 2) ───────────────────
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifyingOtp) return;

    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      await showErrorAlert(
        "Kode OTP Tidak Lengkap",
        "Silakan ketik 6 digit kode angka verifikasi yang dikirim ke email."
      );
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await verifyOtpCodeOnlyAction(cleanEmail, cleanOtp);

      if (!res.success) {
        setIsVerifyingOtp(false);
        await showErrorAlert("Verifikasi OTP Gagal", res.message);
        return;
      }

      // Sukses verifikasi OTP! Pindah langsung ke Step 2
      setIsVerifyingOtp(false);
      setStep(2);
    } catch (err: unknown) {
      console.error("handleVerifyOtp error:", err);
      setIsVerifyingOtp(false);
      await showErrorAlert("Terjadi Kesalahan", "Gagal memverifikasi kode OTP.");
    }
  };

  // ─── Step 2: Simpan Kata Sandi Baru ─────────────────────────────────────────
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPassword) return;

    if (!passwordRules.allValid) {
      await showErrorAlert(
        "Password Belum Memenuhi Syarat",
        "Pastikan kata sandi baru telah memenuhi ke-5 syarat keamanan."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      await showErrorAlert(
        "Konfirmasi Password Tidak Cocok",
        "Kata sandi baru dan konfirmasi kata sandi tidak sama."
      );
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otpCode.trim();

      const res = await verifyOtpAndResetPasswordAction({
        email: cleanEmail,
        otpCode: cleanOtp,
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        setIsSubmittingPassword(false);
        await showErrorAlert("Gagal Menyimpan Sandi", res.message);
        return;
      }

      // Berhasil reset sandi! Coba langsung auto-login
      showSuccessAlert(
        "Kata Sandi Berhasil Dibuat!",
        "Kata sandi akun Anda telah diperbarui. Menghubungkan ke sesi dashboard..."
      );

      try {
        const loginRes = await signIn("credentials", {
          loginType: "password",
          email: cleanEmail,
          password: newPassword,
          redirect: false,
        });

        if (!loginRes?.error) {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("just_logged_in", "true");
          }
          let targetUrl = callbackUrl;
          if (!targetUrl) {
            targetUrl = await getLoginRedirectPath(cleanEmail);
          }
          setTimeout(() => {
            window.location.href = targetUrl!;
          }, 400);
          return;
        }
      } catch (loginErr) {
        console.warn("Auto-login error after reset:", loginErr);
      }

      setIsSubmittingPassword(false);
      onClose();
    } catch (err: unknown) {
      console.error("handleSaveNewPassword error:", err);
      setIsSubmittingPassword(false);
      await showErrorAlert("Terjadi Kesalahan", "Gagal memperbarui kata sandi.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">
                {step === 1 ? "Lupa Kata Sandi" : "Buat Kata Sandi Baru"}
              </h3>
              <p className="text-xs text-slate-400">
                {step === 1
                  ? "Langkah 1 dari 2: Verifikasi Email & OTP"
                  : "Langkah 2 dari 2: Tentukan Kata Sandi Baru"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── STEP PROGRESS BAR ─── */}
        <div className="my-4 flex items-center gap-2">
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              step >= 1 ? "bg-gradient-to-r from-indigo-500 to-sky-500" : "bg-slate-800"
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              step >= 2 ? "bg-gradient-to-r from-sky-500 to-emerald-500" : "bg-slate-800"
            }`}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: MASUKKAN EMAIL DENGAN CEK REALTIME & ISI OTP DI SINI       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl text-xs text-indigo-200 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Masukkan email Google terdaftar. Sistem akan memeriksa keberadaan akun secara
                real-time, lalu mengirimkan 6 digit kode OTP verifikasi.
              </span>
            </div>

            {/* Input Email + Cek Realtime */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Alamat Email Terdaftar <span className="text-rose-400">*</span>
                </label>
                {isOtpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtpCode("");
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1 hover:underline"
                  >
                    <ArrowLeft className="w-3 h-3" /> Ganti Email
                  </button>
                )}
              </div>

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  disabled={isOtpSent}
                  maxLength={50}
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="contoh: outletanda@gmail.com"
                  className={`w-full pl-9 pr-10 py-2.5 bg-slate-950 border rounded-xl text-sm transition-all focus:outline-none ${
                    isOtpSent
                      ? "opacity-60 cursor-not-allowed border-slate-800 text-slate-400 font-mono"
                      : emailCheckStatus === "FOUND"
                      ? "border-emerald-500/70 text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                      : emailCheckStatus === "NOT_FOUND" || emailCheckStatus === "INVALID_FORMAT"
                      ? "border-rose-500/70 text-rose-100 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
                      : "border-slate-800 text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                  }`}
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {emailCheckStatus === "CHECKING" && (
                    <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                  )}
                  {emailCheckStatus === "FOUND" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {(emailCheckStatus === "NOT_FOUND" ||
                    emailCheckStatus === "INVALID_FORMAT") && (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
              </div>

              {/* Status Pengecekan Realtime Email */}
              {emailFeedback && (
                <div
                  className={`mt-1.5 flex items-center gap-1.5 text-[11px] leading-tight transition-all ${
                    emailCheckStatus === "FOUND"
                      ? "text-emerald-400 font-medium"
                      : emailCheckStatus === "CHECKING"
                      ? "text-sky-400 font-medium"
                      : "text-rose-400 font-medium"
                  }`}
                >
                  {emailCheckStatus === "FOUND" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  {emailCheckStatus === "CHECKING" && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                  {(emailCheckStatus === "NOT_FOUND" || emailCheckStatus === "INVALID_FORMAT") && (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{emailFeedback}</span>
                </div>
              )}
            </div>

            {/* Tombol Kirim OTP (Muncul jika belum klik kirim OTP) */}
            {!isOtpSent && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || emailCheckStatus !== "FOUND"}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim Kode OTP ke Email...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirim Kode OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Bagian Input Kode OTP (Muncul setelah OTP berhasil dikirim) */}
            {isOtpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in slide-in-from-top-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Masukkan 6-Digit Kode OTP <span className="text-rose-400">*</span>
                    </label>
                    {resendCooldown > 0 ? (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Kirim ulang ({resendCooldown}s)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp}
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Kirim Ulang OTP
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full text-center py-2.5 bg-slate-950 border border-indigo-500/50 rounded-xl text-xl font-mono font-bold tracking-[8px] text-sky-400 placeholder:text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Cek pesan masuk dari <strong>Smart QR Review Official</strong> (berlaku 10 menit).
                  </p>
                </div>

                {/* Tombol Verifikasi OTP untuk lanjut ke Step 2 */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Memverifikasi OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Verifikasi & Lanjut</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STEP 2: BUAT KATA SANDI BARU & SELESAI                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <form onSubmit={handleSaveNewPassword} className="space-y-4 my-2" suppressHydrationWarning>
            {/* Header Ringkasan Akun */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Reset Sandi Akun
                  </p>
                  <p className="text-xs text-slate-200 truncate font-mono">{email}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                OTP Terverifikasi
              </span>
            </div>

            {/* Input Password Baru */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi Baru <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Buat kata sandi baru"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Live Checklist 5 Syarat Keamanan Sandi */}
              <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 mb-1">
                  Syarat Keamanan Kata Sandi Baru:
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasMinLen ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasMinLen ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Min. 8 Huruf</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasUpper ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasUpper ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Huruf Besar (A-Z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasLower ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasLower ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Huruf Kecil (a-z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasNumber ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasNumber ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Angka (0-9)</span>
                  </div>

                  <div
                    className={`col-span-2 flex items-center gap-1.5 transition-colors ${
                      passwordRules.hasSpecial ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {passwordRules.hasSpecial ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />
                    )}
                    <span>Kode Unik / Karakter Khusus (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Konfirmasi Password Baru */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Konfirmasi Kata Sandi Baru <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang sandi baru"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p
                  className={`text-[11px] mt-1 flex items-center gap-1 ${
                    confirmPassword === newPassword ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {confirmPassword === newPassword ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Konfirmasi kata sandi cocok
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> Konfirmasi kata sandi belum sama
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Actions Step 2 */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Kembali
              </button>

              <button
                type="submit"
                disabled={
                  isSubmittingPassword ||
                  !passwordRules.allValid ||
                  newPassword !== confirmPassword
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Sandi...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan & Masuk</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
