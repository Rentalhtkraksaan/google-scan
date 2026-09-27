"use client";

import { useState, useEffect } from "react";
import { X, Layers, MessageCircle, Crown, Briefcase, Sparkles, Tag } from "lucide-react";
import { showErrorAlert } from "@/lib/swal";

interface RequestCardModalProps {
  mode?: "OUTLET" | "ADMIN";
  user: {
    fullName: string;
    whatsappNumber?: string | null;
  };
  outlet?: {
    name: string;
  };
  currentCardCount?: number;
  vipOutletsCount?: number;
  claimedVipRewards?: number;
  resellerCardBasePrice?: number;
  resellerVipDiscountPerCard?: number;
  targetContact: {
    fullName: string;
    whatsappNumber: string | null;
    email?: string;
    avatarUrl?: string | null;
    role?: string;
    isSuperAdminMaster?: boolean;
  } | null;
  onClose: () => void;
}

export function RequestCardModal({
  mode = "OUTLET",
  user,
  outlet,
  currentCardCount,
  vipOutletsCount = 0,
  claimedVipRewards = 0,
  resellerCardBasePrice = 25000,
  resellerVipDiscountPerCard = 5000,
  targetContact,
  onClose,
}: RequestCardModalProps) {
  const isAdminMode = mode === "ADMIN";
  const [count, setCount] = useState<number>(isAdminMode ? 10 : 5);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const presets = isAdminMode ? [5, 10, 20, 25, 50, 100] : [1, 2, 3, 5, 10, 20];

  // Hitung Reward Diskon Outlet VIP
  const availableVipDiscounts = Math.max(0, vipOutletsCount - claimedVipRewards);
  const discountCards = isAdminMode ? Math.min(count, availableVipDiscounts) : 0;
  const normalCards = Math.max(0, count - discountCards);
  const basePrice = resellerCardBasePrice || 25000;
  const discountPerCard = resellerVipDiscountPerCard || 5000;
  const discountedPrice = Math.max(0, basePrice - discountPerCard);

  const normalTotal = normalCards * basePrice;
  const discountTotal = discountCards * discountedPrice;
  const grandTotal = normalTotal + discountTotal;
  const totalSaved = discountCards * discountPerCard;

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetContact?.whatsappNumber) {
      showErrorAlert(
        "Nomor WhatsApp Belum Tersedia",
        `${isAdminMode ? "Super Admin" : "Mitra Lapangan"} belum mencantumkan nomor WhatsApp yang valid.`
      );
      return;
    }

    const cleanWa = targetContact.whatsappNumber.replace(/[^0-9]/g, "");
    const formattedWa = cleanWa.startsWith("08") ? "62" + cleanWa.slice(1) : cleanWa;

    let message = "";
    if (isAdminMode) {
      message = `Halo ${targetContact.fullName}, saya *${user.fullName}* Mitra Lapangan.\n\n`;
      message += `Saya ingin mengajukan permohonan penambahan jatah *${count} Kartu QR Google Review* untuk didistribusikan ke outlet binaan kami di lapangan.\n\n`;
      message += `💰 *Rincian Estimasi Pembayaran*:\n`;
      if (discountCards > 0) {
        message += `• Harga Normal: ${normalCards} kartu × Rp ${basePrice.toLocaleString("id-ID")} = Rp ${normalTotal.toLocaleString("id-ID")}\n`;
        message += `• Reward Diskon (${discountCards} Outlet VIP Binaan): ${discountCards} kartu × Rp ${discountedPrice.toLocaleString("id-ID")} = Rp ${discountTotal.toLocaleString("id-ID")} (Hemat Rp ${totalSaved.toLocaleString("id-ID")} 🎉)\n`;
      } else {
        message += `• Tarif Kartu: ${count} kartu × Rp ${basePrice.toLocaleString("id-ID")} = Rp ${grandTotal.toLocaleString("id-ID")}\n`;
      }
      message += `👉 *Total Estimasi*: *Rp ${grandTotal.toLocaleString("id-ID")}*\n`;

      if (notes.trim()) {
        message += `\n*Catatan:* ${notes.trim()}\n`;
      }
      message += `\nMohon bantuannya untuk dialokasikan kuota kartu di dashboard ya. Terima kasih!`;
    } else {
      message = `Halo ${targetContact.fullName}, saya *${user.fullName}* dari outlet *${outlet?.name || "kami"}*.\n\n`;
      const currentInfo =
        currentCardCount && currentCardCount > 0
          ? `, saat ini outlet kami memiliki *${currentCardCount} kartu aktif*`
          : "";
      message += `Saya ingin meminta/memesan tambahan *${count} Kartu QR Google Review* untuk meja/kasir outlet kami${currentInfo}.\n`;
      if (notes.trim()) {
        message += `\n*Catatan:* ${notes.trim()}\n`;
      }
      message += `\nMohon informasi ketersediaan kartu & proses aktivasinya ya. Terima kasih!`;
    }

    const waUrl = `https://wa.me/${formattedWa}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                isAdminMode
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {isAdminMode ? "Minta Tambahan Jatah Kartu" : "Minta Tambah Kartu QR"}
              </h3>
              <p className="text-xs text-slate-400">
                {isAdminMode
                  ? "Ajukan alokasi kuota kartu ke Super Admin"
                  : "Pesan unit kartu tambahan ke Mitra Lapangan"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSendWhatsApp} className="space-y-4 my-5">
          {/* Target Recipient Info */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
              {isAdminMode ? "Super Admin Penanggung Jawab" : "Mitra Lapangan Penanggung Jawab"}
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {targetContact?.avatarUrl ? (
                  <img
                    src={targetContact.avatarUrl}
                    alt={targetContact.fullName}
                    className="w-9 h-9 rounded-full object-cover border border-amber-500/40 shadow-sm shrink-0"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                      isAdminMode
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {isAdminMode ? (
                      <Crown className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Briefcase className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{targetContact?.fullName || (isAdminMode ? "Super Admin Pusat" : "Mitra Lapangan")}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {targetContact?.whatsappNumber || "Terhubung via WhatsApp"}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isAdminMode
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                }`}
              >
                {isAdminMode
                  ? targetContact?.isSuperAdminMaster
                    ? "Super Admin 1 (Master)"
                    : "Super Admin 2"
                  : "Mitra Lapangan"}
              </span>
            </div>
          </div>

          {/* Status Reward Outlet VIP (Khusus Admin Mode) */}
          {isAdminMode && (
            <div className="p-3 bg-gradient-to-r from-amber-500/10 via-slate-950 to-indigo-950/20 border border-amber-500/30 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reward Outlet VIP Binaan</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {availableVipDiscounts} Kuota Diskon Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Anda memiliki <strong className="text-white">{vipOutletsCount} outlet VIP</strong> ({claimedVipRewards} sudah diklaim). Setiap outlet VIP memberi potongan <strong className="text-emerald-400">Rp {discountPerCard.toLocaleString("id-ID")}</strong> untuk 1 kartu jatah!
              </p>
            </div>
          )}

          {/* Jumlah Kartu yang Diminta */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Jumlah Kartu yang Diajukan <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="1000"
                required
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                Unit Kartu
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-slate-400 mr-1">Pilihan Cepat:</span>
              {presets.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCount(num)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    count === num
                      ? isAdminMode
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                  }`}
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

          {/* Rincian Harga & Estimasi Pembayaran (Khusus Admin Mode) */}
          {isAdminMode && (
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                <span>Rincian Estimasi Biaya Kartu</span>
              </span>

              <div className="space-y-1 text-xs text-slate-300">
                {discountCards > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Harga Normal ({normalCards} kartu × Rp {basePrice.toLocaleString("id-ID")}):</span>
                      <span className="font-mono text-slate-200">Rp {normalTotal.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Diskon VIP ({discountCards} kartu × Rp {discountedPrice.toLocaleString("id-ID")}):
                      </span>
                      <span className="font-mono font-bold">Rp {discountTotal.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="text-[10px] text-emerald-300/80 italic">
                      *Hemat Rp {totalSaved.toLocaleString("id-ID")} berkat {discountCards} outlet binaan VIP Anda!
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>Tarif Dasar ({count} kartu × Rp {basePrice.toLocaleString("id-ID")}):</span>
                    <span className="font-mono text-slate-200">Rp {grandTotal.toLocaleString("id-ID")}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-bold">
                  <span className="text-white">Total Estimasi Bayar:</span>
                  <span className="text-amber-400 font-mono text-base">
                    Rp {grandTotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Catatan Tambahan (Opsional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Catatan Permohonan (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isAdminMode
                  ? "Contoh: Untuk target 10 outlet baru di wilayah Surabaya Timur"
                  : "Contoh: Untuk meja kasir lantai 2 & area outdoor"
              }
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Kirim Permintaan ke WhatsApp</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
