"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  X,
  Mail,
  Phone,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { getLoginRedirectPath } from "@/lib/actions/auth.actions";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
}

export function ForgotPasswordModal({
  isOpen,
  initialEmail = "",
  onClose,
}: ForgotPasswordModalProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState(initialEmail);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setEmail(initialEmail);
      setWhatsappNumber("");
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanWa = whatsappNumber.trim();

    // Validasi Keamanan Input (Anti-Script / Anti-PHP Injection)
    if (
      cleanEmail.includes(".php")
    ) {
      await showErrorAlert("Input Ditolak", "Karakter atau format input tidak diizinkan.");
      return;
    }

    if (cleanEmail.length < 5 || cleanEmail.length > 30) {
      await showErrorAlert("Email Tidak Valid", "Email harus terdiri dari 5-30 karakter.");
      return;
    }

    if (cleanWa.length < 8 || cleanWa.length > 16) {
      await showErrorAlert("WhatsApp Tidak Valid", "Nomor WhatsApp harus terdiri dari 8-16 digit angka.");
      return;
    }


    setLoading(true);

    try {
      const res = await signIn("credentials", {
        loginType: "recovery",
        email: cleanEmail,
        whatsappNumber: cleanWa,
        redirect: false,
      });

      if (res?.error) {
        setLoading(false);
        await showErrorAlert(
          "Data Tidak Cocok",
          "Email, Nama Lengkap, atau No. WhatsApp tidak cocok dengan data akun terdaftar. Pastikan data yang dimasukkan benar."
        );
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("just_logged_in", "true");
      }

      let targetUrl = callbackUrl;
      if (!targetUrl) {
        targetUrl = await getLoginRedirectPath(cleanEmail);
      }

      showSuccessAlert(
        "Verifikasi Berhasil!",
        "Identitas terkonfirmasi. Mengalihkan ke dashboard...",
        800
      );

      setTimeout(() => {
        window.location.href = targetUrl!;
      }, 300);
    } catch (err) {
      console.error("Recovery login error:", err);
      setLoading(false);
      await showErrorAlert("Terjadi Kesalahan", "Gagal menghubungi server.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Login Darurat / Lupa Password</h3>
              <p className="text-xs text-slate-400">Verifikasi 3 data kepemilikan akun</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-4" suppressHydrationWarning>
          {/* Info Box */}
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-xs text-indigo-200 leading-relaxed">
            Lupa password? Masukkan 3 data akun yang sesuai saat pendaftaran untuk langsung login ke dashboard Anda.
          </div>

          {/* 1. Email */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                1. Alamat Email Terdaftar <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-slate-500">{email.length}/30</span>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                maxLength={30}
                value={email}
                onChange={(e) => {
                  // Filter karakter berbahaya dan batasi maks 30 karakter
                  const val = e.target.value.replace(/[<>"'`;%${}()[\]\\]/g, "").slice(0, 30);
                  setEmail(val);
                }}
                placeholder="nama@email.com"
                suppressHydrationWarning
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* 2. Nomor WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                2. Nomor WhatsApp Terdaftar <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-slate-500">{whatsappNumber.length}/16 digit</span>
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                maxLength={16}
                value={whatsappNumber}
                onChange={(e) => {
                  // Hanya izinkan angka dan tanda + di awal
                  const val = e.target.value.replace(/[^0-9+]/g, "").slice(0, 16);
                  setWhatsappNumber(val);
                }}
                placeholder="Contoh: 08123456789 atau +628123456789"
                suppressHydrationWarning
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>



          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              suppressHydrationWarning
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Verifikasi & Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
