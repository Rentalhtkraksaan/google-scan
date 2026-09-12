"use client";

import { useState, useEffect } from "react";
import { X, Store, User, Phone, Mail, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { updateOutletAction } from "@/lib/actions/auth.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { GooglePlaceSearchInput } from "./GooglePlaceSearchInput";

interface EditOutletModalProps {
  outlet: {
    id: string;
    name: string;
    googleReviewUrl: string;
    owner: {
      fullName: string;
      whatsappNumber: string | null;
      email: string;
    };
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditOutletModal({ outlet, onClose, onSuccess }: EditOutletModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(outlet.name);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(outlet.googleReviewUrl);
  const [fullName, setFullName] = useState(outlet.owner.fullName);
  const [email, setEmail] = useState(outlet.owner.email || "");
  const [whatsappNumber, setWhatsappNumber] = useState(outlet.owner.whatsappNumber || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      formData.set("name", name);
      formData.set("googleReviewUrl", googleReviewUrl);
      formData.set("fullName", fullName);
      formData.set("email", email);
      formData.set("whatsappNumber", whatsappNumber);
      if (password) {
        formData.set("password", password);
      }

      const result = await updateOutletAction(outlet.id, formData);

      if (result.success) {
        onSuccess?.();
        onClose();
        showSuccessAlert("Berhasil Diperbarui", result.message, 1800);
      } else {
        showErrorAlert("Gagal Memperbarui", result.message);
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Kesalahan Server", "Terjadi kesalahan sistem saat memperbarui data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Edit Informasi Outlet</h3>
              <p className="text-xs text-slate-400">{email || outlet.owner.email}</p>
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
          <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <GooglePlaceSearchInput
              outletName={name}
              setOutletName={setName}
              reviewUrl={googleReviewUrl}
              setReviewUrl={setGoogleReviewUrl}
            />
          </div>

          {/* Nama Pemilik & Email Login */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Lengkap Pemilik <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Login Akun <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  maxLength={30}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pemilik@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

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
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Ubah Password Akun Pemilik */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Ubah Password Akun Pemilik (Opsional)</span>
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
                className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
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

          <div className="pt-2 flex justify-end gap-3">
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
