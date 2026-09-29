"use client";

import { useState, useEffect, useRef } from "react";
import { X, Store, User, Phone, Mail, Loader2, KeyRound, Eye, EyeOff, Camera, Upload, Trash2, Sparkles, Image as ImageIcon } from "lucide-react";
import { updateOutletAction } from "@/lib/actions/auth.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { GooglePlaceSearchInput } from "./GooglePlaceSearchInput";
import { compressImageInBrowser } from "@/lib/image-compression";

interface EditOutletModalProps {
  outlet: {
    id: string;
    name: string;
    googleReviewUrl: string;
    logoUrl?: string | null;
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
  const [logoUrl, setLogoUrl] = useState<string | null>(outlet.logoUrl || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      // 1. Kompres gambar di browser (WebP 400x400)
      const compressed = await compressImageInBrowser(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        outputType: "base64",
      });
      const compressedBase64 = compressed.base64;

      // 2. Upload ke Cloudinary via API Route
      const res = await fetch("/api/upload/cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: compressedBase64,
          folder: "outlet_logos",
        }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        setLogoUrl(data.url);
      } else {
        // Fallback: simpan compressed base64 jika API Cloudinary offline
        setLogoUrl(compressedBase64);
      }
    } catch (err) {
      console.error("Error upload logo:", err);
      showErrorAlert("Gagal Upload", "Terjadi kesalahan saat memproses logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("googleReviewUrl", googleReviewUrl);
      formData.set("logoUrl", logoUrl || "");
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

          {/* Logo Outlet (Cloudinary Auto Compress & TiDB) */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Logo Usaha / Outlet (VIP)</span>
              </label>
              <span className="text-[10px] text-amber-400/90 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                Tampil di Rating ⭐⭐⭐⭐⭐
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shrink-0 relative overflow-hidden shadow-inner">
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoUrl}
                    alt="Logo Outlet"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <Store className="w-6 h-6 stroke-1" />
                    <span className="text-[9px] mt-0.5">No Logo</span>
                  </div>
                )}
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingLogo ? "Mengunggah..." : logoUrl ? "Ganti Logo" : "Upload Logo"}</span>
                  </button>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs transition-all border border-slate-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Format PNG/JPG/WebP. Otomatis dikompres & disimpan ke Cloudinary CDN.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
              </div>
            </div>
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
