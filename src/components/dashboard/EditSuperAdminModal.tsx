"use client";

import { useState, useEffect } from "react";
import { X, ShieldCheck, Mail, User, Phone, KeyRound, Eye, EyeOff, Loader2, Globe, Layers, Trash2, TrendingUp } from "lucide-react";
import { updateSuperAdminUserAction } from "@/lib/actions/auth.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { SuperAdminItem } from "@/types/models";

interface EditSuperAdminModalProps {
  admin: SuperAdminItem;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditSuperAdminModal({ admin, onClose, onSuccess }: EditSuperAdminModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState(admin.fullName);
  const [email, setEmail] = useState(admin.email);
  const [whatsappNumber, setWhatsappNumber] = useState(admin.whatsappNumber || "");
  const [canEditLandingPage, setCanEditLandingPage] = useState(!!admin.canEditLandingPage);
  const [canManagePrintTemplates, setCanManagePrintTemplates] = useState(!!admin.canManagePrintTemplates);
  const [canDeleteCards, setCanDeleteCards] = useState(!!admin.canDeleteCards);
  const [canViewAnalytics, setCanViewAnalytics] = useState(!!admin.canViewAnalytics);
  const [password, setPassword] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("email", email);
      formData.set("whatsappNumber", whatsappNumber);
      formData.set("canEditLandingPage", String(canEditLandingPage));
      formData.set("canManagePrintTemplates", String(canManagePrintTemplates));
      formData.set("canDeleteCards", String(canDeleteCards));
      formData.set("canViewAnalytics", String(canViewAnalytics));
      if (password) {
        formData.set("password", password);
      }

      const result = await updateSuperAdminUserAction(admin.id, formData);

      if (result.success) {
        onSuccess?.();
        onClose();
        showSuccessAlert("Data Super Admin Diperbarui", result.message, 1800);
      } else {
        showErrorAlert("Gagal Memperbarui Super Admin", result.message);
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Kesalahan Server", "Terjadi kesalahan pada sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Edit Data Super Admin 2</h3>
              <p className="text-xs text-slate-400">{admin.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-5">
          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nama Lengkap Super Admin <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama Super Admin 2"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Email Login */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Login <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                maxLength={30}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin2@email.com"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Nomor WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nomor WhatsApp
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="08123456789"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Izin Edit Landing Page */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Izin Edit Landing Page & WhatsApp</span>
                <span className="text-[11px] text-slate-400">Bolehkan Super Admin 2 mengatur landing page</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={canEditLandingPage}
                onChange={(e) => setCanEditLandingPage(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Izin Kelola Template Cetak */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-sky-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Izin Kelola Template Cetak</span>
                <span className="text-[11px] text-slate-400">Bolehkan Super Admin 2 mengatur template & posisi QR</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={canManagePrintTemplates}
                onChange={(e) => setCanManagePrintTemplates(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          {/* Izin Hapus Kartu */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Izin Hapus Kartu QR</span>
                <span className="text-[11px] text-slate-400">Bolehkan Super Admin 2 menghapus kartu QR permanen</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={canDeleteCards}
                onChange={(e) => setCanDeleteCards(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Izin Pengunjung Web / Analitik */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Izin Pengunjung Web & Analitik</span>
                <span className="text-[11px] text-slate-400">Bolehkan Super Admin 2 melihat grafik & analitik web</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={canViewAnalytics}
                onChange={(e) => setCanViewAnalytics(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Ubah Password Baru */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Ubah Password Baru (Opsional)</span>
              <span className="text-[11px] text-slate-500 font-normal">Kosongkan jika tidak ingin diubah</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                maxLength={15}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ketik password baru jika ingin diubah"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
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
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
