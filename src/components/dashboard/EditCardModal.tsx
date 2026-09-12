"use client";

import { useState, useMemo, useEffect } from "react";
import { X, QrCode, Globe, Loader2, Store, Search, Check } from "lucide-react";
import { updateCardConfigAction } from "@/lib/actions/qr.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { AdminSelectSearchable } from "@/components/forms/AdminSelectSearchable";

interface EditCardModalProps {
  card: {
    code: string;
    fallbackUrl: string;
    assignedAdminId: string | null;
    outletId?: string | null;
    outlet?: { id: string; name: string } | null;
    isPrimaryCard?: boolean;
  };
  admins: { id: string; fullName: string }[];
  superAdmins?: { id: string; fullName: string; isSuperAdminMaster?: boolean }[];
  outlets?: { id: string; name: string }[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditCardModal({
  card,
  admins,
  superAdmins = [],
  outlets = [],
  onClose,
  onSuccess,
}: EditCardModalProps) {
  const [loading, setLoading] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState(card.fallbackUrl);
  const [assignedAdminId, setAssignedAdminId] = useState(card.assignedAdminId || "unassigned");
  const [selectedOutletId, setSelectedOutletId] = useState(card.outletId || card.outlet?.id || "none");

  useEffect(() => {
    setFallbackUrl(card.fallbackUrl);
    setAssignedAdminId(card.assignedAdminId || "unassigned");
    setSelectedOutletId(card.outletId || card.outlet?.id || "none");
  }, [card]);

  // Search filter for outlets
  const [outletSearch, setOutletSearch] = useState("");
  const [isOutletDropdownOpen, setIsOutletDropdownOpen] = useState(false);

  const filteredOutlets = useMemo(() => {
    if (!outletSearch.trim()) return outlets;
    const q = outletSearch.toLowerCase().trim();
    return outlets.filter((o) => o.name.toLowerCase().includes(q));
  }, [outlets, outletSearch]);

  const selectedOutletName = useMemo(() => {
    if (selectedOutletId === "none" || !selectedOutletId) return "Tidak Terhubung (Kartu Kosong / Cadangan)";
    const found = outlets.find((o) => o.id === selectedOutletId);
    return found ? found.name : card.outlet?.name || "Outlet Terhubung";
  }, [selectedOutletId, outlets, card.outlet]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("fallbackUrl", fallbackUrl);
      formData.set("assignedAdminId", assignedAdminId);
      formData.set("outletId", selectedOutletId);

      const result = await updateCardConfigAction(card.code, formData);

      if (result.success) {
        onSuccess?.();
        onClose();
        showSuccessAlert("Konfigurasi Diperbarui", result.message, 1500);
      } else {
        showErrorAlert("Gagal Memperbarui", result.message);
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Kesalahan Server", "Gagal memperbarui konfigurasi kartu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Konfigurasi Kartu {card.code}</h3>
              <p className="text-xs text-slate-400">Pengaturan Outlet, URL & Alokasi Admin</p>
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
          {/* Hubungkan ke Outlet (Multi-Kartu) - Hanya untuk Kartu Kosong / Anakan */}
          {card.isPrimaryCard && card.outlet ? (
            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  👑 Kartu Utama / Induk Outlet
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Toko Induk
                </span>
              </div>
              <div className="text-sm font-extrabold text-white pt-0.5">{card.outlet.name}</div>
              <p className="text-[11px] text-slate-400 pt-0.5">
                Kartu ini adalah identitas toko induk. Untuk mengedit nama toko, link maps & WA owner, gunakan tombol <strong className="text-sky-300">Edit Toko</strong> di tabel.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-sky-400" />
                  Hubungkan ke Outlet (Multi-Kartu)
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Opsional</span>
              </label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsOutletDropdownOpen(!isOutletDropdownOpen)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-left text-slate-100 hover:border-sky-500/50 transition-all cursor-pointer"
                >
                  <span className={`truncate ${selectedOutletId === "none" ? "text-slate-400 italic" : "text-sky-300 font-semibold"}`}>
                    {selectedOutletName}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">▼</span>
                </button>

                {isOutletDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-30 max-h-56 overflow-hidden flex flex-col">
                    {/* Search bar inside dropdown */}
                    <div className="relative mb-2 shrink-0">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Cari nama outlet..."
                        value={outletSearch}
                        onChange={(e) => setOutletSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* List items */}
                    <div className="overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOutletId("none");
                          setIsOutletDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                          selectedOutletId === "none"
                            ? "bg-sky-600/20 text-sky-300 font-semibold border border-sky-500/30"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className="italic">Tidak Terhubung (Kartu Kosong / Cadangan)</span>
                        {selectedOutletId === "none" && <Check className="w-3.5 h-3.5 text-sky-400" />}
                      </button>

                      {filteredOutlets.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setSelectedOutletId(o.id);
                            setIsOutletDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                            selectedOutletId === o.id
                              ? "bg-sky-600/20 text-sky-300 font-semibold border border-sky-500/30"
                              : "text-slate-200 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{o.name}</span>
                          {selectedOutletId === o.id && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </button>
                      ))}

                      {filteredOutlets.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-500">
                          Tidak ada outlet yang cocok.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Pilih outlet untuk menambahkan kartu fisik ini ke outlet tersebut (1 outlet bisa memiliki banyak kartu).
              </span>
            </div>
          )}

          {/* Alokasikan ke Admin */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Alokasikan ke Admin Lapangan / Super Admin
            </label>
            <AdminSelectSearchable
              value={assignedAdminId}
              onChange={(newVal) => setAssignedAdminId(newVal)}
              superAdmins={superAdmins}
              admins={admins}
            />
          </div>

          {/* Fallback URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Fallback URL (Jika Kartu Nonaktif)
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                required
                value={fallbackUrl}
                onChange={(e) => setFallbackUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Pengunjung diarahkan ke URL ini jika kartu dalam status INACTIVE.
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/25"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan Konfigurasi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

