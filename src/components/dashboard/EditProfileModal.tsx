"use client";

import { useState, useEffect } from "react";
import { X, UserCheck, KeyRound, User, Mail, Phone, Eye, EyeOff, Loader2 } from "lucide-react";
import { updateSelfProfileAction } from "@/lib/actions/auth.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface EditProfileModalProps {
  user: {
    fullName: string;
    email: string;
    whatsappNumber?: string | null;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditProfileModal({ user, onClose, onSuccess }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsappNumber || "");
  const [currentPassword, setCurrentPassword] = useState("");
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
      if (password) {
        formData.set("currentPassword", currentPassword);
        formData.set("password", password);
      }

      const result = await updateSelfProfileAction(formData);

      if (result.success) {
        onSuccess?.();
        onClose();
        showSuccessAlert("Profil Diperbarui", result.message, 1800);
      } else {
        showErrorAlert("Gagal Memperbarui Profil", result.message);
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
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Edit Profil Saya</h3>
              <p className="text-xs text-slate-400">{user.email}</p>
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
              Nama Lengkap <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama Lengkap Anda"
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
                placeholder="nama@email.com"
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

          {/* Ubah Password Baru */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between mb-1.5">
                <span>Ubah Password Baru (Opsional)</span>
                <span className="text-[11px] text-slate-500 font-normal">Kosongkan jika tidak diubah</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  maxLength={50}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik password baru (min 8 karakter)"
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

            {password.trim().length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 animate-in fade-in">
                <label className="block text-xs font-semibold text-amber-300 mb-1.5 flex items-center justify-between">
                  <span>Konfirmasi Password Saat Ini <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-amber-400/80 font-normal">Verifikasi keamanan</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-amber-500/70 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required={password.trim().length > 0}
                    maxLength={50}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password Anda saat ini"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-amber-500/40 focus:border-amber-400 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title={showCurrentPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
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
                <UserCheck className="w-4 h-4" />
              )}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
