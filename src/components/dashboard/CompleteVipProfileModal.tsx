"use client";

import { useState } from "react";
import {
  X,
  Crown,
  Store,
  User,
  Phone,
  ShieldCheck,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { updateSelfProfileAction } from "@/lib/actions/auth.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface CompleteVipProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlet: {
    id: string;
    name: string;
  };
  user: {
    fullName: string;
    email: string;
    whatsappNumber?: string | null;
  };
  onSuccess: (updatedData: { outletName: string; fullName: string; whatsappNumber: string }) => void;
}

export function CompleteVipProfileModal({
  isOpen,
  onClose,
  outlet,
  user,
  onSuccess,
}: CompleteVipProfileModalProps) {
  const isDefaultOutlet =
    !outlet.name ||
    outlet.name.trim() === "Outlet Baru" ||
    outlet.name.trim().toLowerCase().startsWith("outlet c-");
  const isDefaultOwner =
    !user.fullName || user.fullName.trim() === "Pemilik Outlet";

  const [outletName, setOutletName] = useState(isDefaultOutlet ? "" : outlet.name);
  const [fullName, setFullName] = useState(isDefaultOwner ? "" : user.fullName);
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsappNumber || "");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanOutlet = outletName.trim();
    const cleanOwner = fullName.trim();
    const cleanWa = whatsappNumber.replace(/[^0-9]/g, "");

    if (!cleanOutlet || cleanOutlet.length < 2) {
      showErrorAlert("Peringatan", "Nama Outlet / Toko minimal 2 karakter.");
      return;
    }
    if (!cleanOwner || cleanOwner.length < 2) {
      showErrorAlert("Peringatan", "Nama Lengkap Pemilik minimal 2 karakter.");
      return;
    }
    if (!cleanWa || cleanWa.length < 8) {
      showErrorAlert("Peringatan", "Nomor WhatsApp aktif minimal 8 digit.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("outletName", cleanOutlet);
      formData.set("fullName", cleanOwner);
      formData.set("whatsappNumber", cleanWa);
      formData.set("email", user.email);

      const res = await updateSelfProfileAction(formData);
      if (res.success) {
        showSuccessAlert("Data Lengkap! 🎉", "Data profil toko & WhatsApp berhasil disimpan.", 1500);
        onSuccess({
          outletName: cleanOutlet,
          fullName: cleanOwner,
          whatsappNumber: cleanWa,
        });
        onClose();
      } else {
        showErrorAlert("Gagal Menyimpan", res.message || "Silakan reload device anda.");
      }
    } catch (err) {
      console.error("CompleteVipProfileModal submit error:", err);
      showErrorAlert("Silakan Reload Device Anda", "Terjadi gangguan koneksi pada sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/85 backdrop-blur-sm flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-1.5">
                <span>Lengkapi Data Toko & WhatsApp</span>
              </h3>
              <p className="text-xs text-amber-300/80 font-medium">Syarat Wajib untuk Mengaktifkan Fitur VIP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Alasan Wajib Lengkap */}
        <div className="my-4 p-3.5 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-slate-950/80 border border-amber-500/20 rounded-2xl space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-amber-300 block mb-0.5">Kenapa data ini wajib dilengkapi?</strong>
              Fitur <strong>Smart Rating Filter</strong> akan mengarahkan komplain bintang 1-3 dari pelanggan langsung ke <strong>WhatsApp Owner</strong>, membawa pesan resmi:
              <span className="block mt-1 font-mono text-[11px] text-emerald-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                &quot;Halo [Nama Pemilik] pemilik dari outlet [Nama Toko], saya pelanggan...&quot;
              </span>
            </div>
          </div>
        </div>

        {/* Form Pelengkapan Data */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Nama Outlet / Toko */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Nama Outlet / Toko <span className="text-rose-400">*</span></span>
              <span className="text-[11px] text-slate-400">Nama resmi toko Anda</span>
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
                placeholder="Contoh: Diva Swalayan / Kopi Kenangan"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 2. Nama Lengkap Pemilik */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Nama Lengkap Pemilik Toko <span className="text-rose-400">*</span></span>
              <span className="text-[11px] text-slate-400">Nama Anda</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso / Ibu Erfaniatul"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 3. Nomor WhatsApp Aktif */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span>Nomor WhatsApp Aktif <span className="text-rose-400">*</span></span>
              <span className="text-[11px] text-emerald-400 font-medium">Tujuan Masukan Pelanggan</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Contoh: 08123456789 atau 628123456789"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Pastikan nomor aktif di WhatsApp agar notifikasi masukan ulasan langsung masuk ke HP Anda.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading || !outletName.trim() || !fullName.trim() || !whatsappNumber.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Menyimpan Data...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Simpan & Lanjutkan Aktivasi VIP 🚀</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
