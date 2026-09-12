"use client";

import { useState, useMemo, useEffect } from "react";
import { X, CreditCard, Plus, Loader2, Search, AlertCircle } from "lucide-react";
import { assignCardToOutletAction } from "@/lib/actions/qr.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface AssignCardToOutletModalProps {
  outlet: {
    id: string;
    name: string;
    currentCards?: { code: string }[];
  };
  blankCards: {
    code: string;
    status?: string;
  }[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function AssignCardToOutletModal({
  outlet,
  blankCards,
  onClose,
  onSuccess,
}: AssignCardToOutletModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>(blankCards[0]?.code || "");
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const filteredCards = useMemo(() => {
    if (!search.trim()) return blankCards;
    const q = search.toLowerCase().trim();
    return blankCards.filter((c) => c.code.toLowerCase().includes(q));
  }, [blankCards, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCode) {
      showErrorAlert("Pilih Kartu", "Silakan pilih salah satu kartu kosong terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      const result = await assignCardToOutletAction(selectedCode, outlet.id);

      if (result.success) {
        showSuccessAlert("Kartu Ditambahkan!", result.message, 1500);
        onSuccess?.();
        onClose();
      } else {
        showErrorAlert("Gagal Menghubungkan", result.message);
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Kesalahan Server", "Terjadi kesalahan saat menghubungkan kartu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Tambah Kartu ke Outlet</h3>
              <p className="text-xs text-slate-400">Hubungkan kartu kosong ke outlet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-5">
          {/* Target Outlet Info */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
              Outlet Tujuan
            </span>
            <div className="text-sm font-extrabold text-white">{outlet.name}</div>
            {outlet.currentCards && outlet.currentCards.length > 0 && (
              <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5 flex-wrap">
                <span>Kartu yang sudah aktif:</span>
                {outlet.currentCards.map((c) => (
                  <span
                    key={c.code}
                    className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-semibold border border-slate-700"
                  >
                    {c.code}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Pilih Kartu Kosong */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Pilih Nomor Kartu Kosong / Cadangan</span>
              <span className="text-emerald-400 font-bold">{blankCards.length} Kartu Tersedia</span>
            </label>

            {blankCards.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center space-y-1.5">
                <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                <div className="text-xs font-bold text-amber-300">Tidak Ada Kartu Kosong</div>
                <p className="text-[11px] text-slate-400">
                  Seluruh kartu QR telah digunakan. Silakan generate batch kartu baru terlebih dahulu di menu atas.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kode kartu (misal: c-012)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Grid List of Available Cards */}
                <div className="max-h-48 overflow-y-auto grid grid-cols-3 gap-2 p-1 border border-slate-800/80 rounded-2xl bg-slate-950/50 scrollbar-thin">
                  {filteredCards.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setSelectedCode(c.code)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        selectedCode === c.code
                          ? "bg-gradient-to-br from-indigo-600 to-sky-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      <span className="font-mono font-bold text-xs">{c.code}</span>
                      <span
                        className={`text-[9px] font-semibold ${
                          selectedCode === c.code ? "text-sky-200" : "text-emerald-400"
                        }`}
                      >
                        KOSONG
                      </span>
                    </button>
                  ))}
                  {filteredCards.length === 0 && (
                    <div className="col-span-3 py-4 text-center text-xs text-slate-500">
                      Tidak ada kartu yang cocok dengan pencarian.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || blankCards.length === 0 || !selectedCode}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-teal-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/25"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Hubungkan Kartu {selectedCode || ""}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
