"use client";

import { useState, useEffect, useTransition } from "react";
import { X, ShieldCheck, Mail, User, Phone, Loader2, Plus, Lock, Globe, Layers, Trash2, TrendingUp } from "lucide-react";
import { createSuperAdminAction } from "@/lib/actions/auth.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface CreateSuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSuperAdminModal({ isOpen, onClose }: CreateSuperAdminModalProps) {
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [canEditLandingPage, setCanEditLandingPage] = useState(false);
  const [canManagePrintTemplates, setCanManagePrintTemplates] = useState(false);
  const [canDeleteCards, setCanDeleteCards] = useState(false);
  const [canViewAnalytics, setCanViewAnalytics] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("fullName", fullName);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("whatsappNumber", whatsappNumber);
        formData.append("canEditLandingPage", canEditLandingPage ? "true" : "false");
        formData.append("canManagePrintTemplates", canManagePrintTemplates ? "true" : "false");
        formData.append("canDeleteCards", canDeleteCards ? "true" : "false");
        formData.append("canViewAnalytics", canViewAnalytics ? "true" : "false");

        const res = await createSuperAdminAction(formData);
        if (res.success) {
          showSuccessAlert("Super Admin 2 Dibuat!", res.message, 2000);
          setFullName("");
          setEmail("");
          setPassword("");
          setWhatsappNumber("");
          setCanEditLandingPage(false);
          setCanManagePrintTemplates(false);
          setCanDeleteCards(false);
          setCanViewAnalytics(false);
          onClose();
        } else {
          showErrorAlert("Gagal Membuat Akun", res.message);
        }
      } catch {
        showErrorAlert("Kesalahan", "Terjadi kesalahan pada server saat membuat akun.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col">
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Tambah Super Admin 2</h3>
              <p className="text-xs text-slate-400">
                Buat akun Super Admin sekunder dengan hak akses operasional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info Banner Rule Super Admin 2 */}
          <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200/90 leading-relaxed">
            <p className="font-semibold text-purple-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Ketentuan Super Admin 2:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
              <li>Dapat mengelola kartu QR, outlet, dan admin lapangan.</li>
              <li><strong>Tidak bisa</strong> menghapus Super Admin 1 atau data buatan Super Admin 1.</li>
              <li><strong>Tidak bisa</strong> menambah Super Admin lain.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nama Lengkap Super Admin <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso (Co-Admin)"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Login <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                maxLength={30}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin2@domain.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password Login <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                maxLength={15}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 sampai 15 karakter"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nomor WhatsApp (Opsional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="081234567890"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          {/* Permission Toggle: Landing Page */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Izin Edit Konten Landing Page & WhatsApp</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Jika diaktifkan, Super Admin 2 ini diperbolehkan mengubah tulisan dan nomor WhatsApp di landing page.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCanEditLandingPage(!canEditLandingPage)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                canEditLandingPage ? "bg-emerald-600" : "bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  canEditLandingPage ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Permission Toggle: Print Templates */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Izin Kelola Template Cetak Multi-Ukuran</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Jika diaktifkan, Super Admin 2 ini diperbolehkan mengunggah template dan mengatur posisi QR code cetak.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCanManagePrintTemplates(!canManagePrintTemplates)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                canManagePrintTemplates ? "bg-emerald-600" : "bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  canManagePrintTemplates ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Permission Toggle: Delete Cards */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Izin Hapus Kartu QR</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Jika diaktifkan, Super Admin 2 ini diperbolehkan menghapus kartu QR secara permanen.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCanDeleteCards(!canDeleteCards)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                canDeleteCards ? "bg-emerald-600" : "bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  canDeleteCards ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Permission Toggle: View Visitor Analytics */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                <span>Izin Lihat Pengunjung Web & Analitik</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Jika diaktifkan, Super Admin 2 ini diperbolehkan melihat data statistik dan grafik pengunjung website.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCanViewAnalytics(!canViewAnalytics)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                canViewAnalytics ? "bg-emerald-600" : "bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  canViewAnalytics ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Buat Super Admin 2</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
