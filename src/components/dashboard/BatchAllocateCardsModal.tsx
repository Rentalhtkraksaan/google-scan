"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Package,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  Sparkles,
  UserCheck,
  Hash,
  Sliders,
  Filter,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";
import {
  getAvailableCardsForAllocationAction,
  batchAllocateCardsToAdminAction,
} from "@/lib/actions/qr.actions";

interface AdminOption {
  id: string;
  fullName: string;
  email: string;
  whatsappNumber?: string | null;
  assignedCardsCount?: number;
}

interface CardItem {
  code: string;
  outletId: string | null;
  outletName: string | null;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  status: string;
  scanCount: number;
  createdAt: string;
}

interface BatchAllocateCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  admins: AdminOption[];
  preselectedAdminId?: string | null;
  onSuccess?: () => void;
}

type AllocationMode = "RANGE" | "QUICK_COUNT" | "MANUAL_LIST";

export function BatchAllocateCardsModal({
  isOpen,
  onClose,
  admins,
  preselectedAdminId,
  onSuccess,
}: BatchAllocateCardsModalProps) {
  const [selectedAdminId, setSelectedAdminId] = useState<string>(preselectedAdminId || "");
  const [mode, setMode] = useState<AllocationMode>("RANGE");

  const [cards, setCards] = useState<CardItem[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mode 1: Range State
  const [rangePrefix, setRangePrefix] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // Mode 2: Quick Count State
  const [quickCount, setQuickCount] = useState<number>(8);

  // Selected Card Codes (Set of selected codes)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  // Search & Filter in Manual Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFilterType, setFilterType] = useState<"UNASSIGNED_EMPTY" | "ALL_EMPTY" | "ALL">(
    "UNASSIGNED_EMPTY"
  );

  // Load cards when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setSelectedAdminId(preselectedAdminId || (admins[0]?.id ?? ""));
    setIsLoadingCards(true);
    setSelectedCodes(new Set());
    setRangeStart("");
    setRangeEnd("");

    getAvailableCardsForAllocationAction()
      .then((res) => {
        if (res.success && res.cards) {
          setCards(res.cards);

          // Auto-detect common prefix if cards exist
          const sampleCard = res.cards.find((c) => c.code.includes("-") || c.code.includes("_"));
          if (sampleCard) {
            const match = sampleCard.code.match(/^([a-zA-Z0-9]+[-_])/);
            if (match) setRangePrefix(match[1]);
          }
        } else {
          showErrorAlert("Gagal Memuat Kartu", res.message || "Terjadi kesalahan saat memuat kartu.");
        }
      })
      .catch((err) => {
        console.error("Error loading cards:", err);
        showErrorAlert("Error", "Gagal memuat kartu.");
      })
      .finally(() => {
        setIsLoadingCards(false);
      });
  }, [isOpen, preselectedAdminId, admins]);

  // Selected Admin Info
  const selectedAdmin = useMemo(
    () => admins.find((a) => a.id === selectedAdminId),
    [admins, selectedAdminId]
  );

  // Cards filtered by type for manual view
  const eligibleCards = useMemo(() => {
    return cards.filter((c) => {
      // Tidak boleh kartu yang sudah terhubung ke outlet aktif
      if (filterFilterType === "UNASSIGNED_EMPTY") {
        return !c.outletId && !c.assignedAdminId;
      }
      if (filterFilterType === "ALL_EMPTY") {
        return !c.outletId;
      }
      return true;
    });
  }, [cards, filterFilterType]);

  // Unassigned empty cards pool (for quick count)
  const unassignedEmptyCards = useMemo(() => {
    return cards.filter((c) => !c.outletId && !c.assignedAdminId);
  }, [cards]);

  // Apply Range Handler
  const handleApplyRange = () => {
    if (!rangeStart.trim() || !rangeEnd.trim()) {
      showErrorAlert("Rentang Belum Lengkap", "Masukkan nomor/kode awal dan nomor/kode akhir.");
      return;
    }

    // Extract numbers from start and end
    const startNumMatch = rangeStart.match(/\d+$/);
    const endNumMatch = rangeEnd.match(/\d+$/);

    if (!startNumMatch || !endNumMatch) {
      showErrorAlert(
        "Format Tidak Valid",
        "Nomor awal dan nomor akhir harus mengandung angka (contoh: 1 s/d 50 atau c-001 s/d c-050)."
      );
      return;
    }

    const startNum = parseInt(startNumMatch[0], 10);
    const endNum = parseInt(endNumMatch[0], 10);

    if (startNum > endNum) {
      showErrorAlert("Rentang Terbalik", "Nomor awal tidak boleh lebih besar dari nomor akhir.");
      return;
    }

    // Determine padding length (e.g., "001" has length 3)
    const padLen = Math.max(startNumMatch[0].length, endNumMatch[0].length);
    const prefix = rangePrefix.trim();

    // Match cards in the dataset that fall into this numeric range
    const matched = new Set<string>();

    cards.forEach((card) => {
      const code = card.code;
      // If prefix is specified, check if code starts with it
      if (prefix && !code.toLowerCase().startsWith(prefix.toLowerCase())) {
        return;
      }

      const cardNumMatch = code.match(/\d+$/);
      if (cardNumMatch) {
        const cardNum = parseInt(cardNumMatch[0], 10);
        if (cardNum >= startNum && cardNum <= endNum) {
          matched.add(card.code);
        }
      }
    });

    // If no exact match from existing cards, also build expected codes and match
    if (matched.size === 0) {
      for (let i = startNum; i <= endNum; i++) {
        const formattedNum = String(i).padStart(padLen, "0");
        const candidate1 = `${prefix}${formattedNum}`;
        const candidate2 = `${prefix}${i}`;
        const found = cards.find(
          (c) => c.code.toLowerCase() === candidate1.toLowerCase() || c.code.toLowerCase() === candidate2.toLowerCase()
        );
        if (found) matched.add(found.code);
      }
    }

    if (matched.size === 0) {
      showErrorAlert(
        "Tidak Ada Kartu Ditemukan",
        `Tidak ditemukan kartu pada rentang ${prefix}${startNum} s/d ${prefix}${endNum} di database.`
      );
      return;
    }

    setSelectedCodes(matched);
    showSuccessAlert(
      "Rentang Diterapkan! 🎯",
      `Ditemukan ${matched.size} kartu dalam rentang nomor tersebut dan siap dialokasikan.`
    );
  };

  // Apply Quick Count Handler
  const handleApplyQuickCount = (count: number) => {
    setQuickCount(count);
    const targetCards = unassignedEmptyCards.slice(0, count);
    if (targetCards.length === 0) {
      showErrorAlert(
        "Stok Kartu Kosong Habis",
        "Tidak ada kartu kosong tanpa pemilik yang tersedia. Silakan generate kartu baru terlebih dahulu."
      );
      return;
    }
    const newSet = new Set(targetCards.map((c) => c.code));
    setSelectedCodes(newSet);
  };

  // Toggle single card
  const handleToggleCard = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Toggle select all visible
  const handleToggleSelectAllVisible = () => {
    const visibleCards = eligibleCards.filter((c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
    const allSelected = visibleCards.every((c) => selectedCodes.has(c.code));

    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleCards.forEach((c) => next.delete(c.code));
      } else {
        visibleCards.forEach((c) => next.add(c.code));
      }
      return next;
    });
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!selectedAdminId) {
      showErrorAlert("Pilih Admin", "Pilih Admin Lapangan penerima kartu terlebih dahulu.");
      return;
    }

    if (selectedCodes.size === 0) {
      showErrorAlert("Pilih Kartu", "Pilih minimal 1 kartu untuk dialokasikan.");
      return;
    }

    const codeArray = Array.from(selectedCodes);
    const targetAdminName = selectedAdmin?.fullName || "Admin Lapangan";

    const confirmRes = await showConfirmAlert(
      "Konfirmasi Alokasi Kartu Massal",
      `Alokasikan ${codeArray.length} kartu QR (${codeArray[0]} s/d ${codeArray[codeArray.length - 1]}) kepada Admin "${targetAdminName}"?`,
      `Ya, Alokasikan ${codeArray.length} Kartu`,
      "#10b981"
    );

    if (!confirmRes.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const res = await batchAllocateCardsToAdminAction({
        adminId: selectedAdminId,
        cardCodes: codeArray,
      });

      if (res.success) {
        showSuccessAlert("Alokasi Berhasil! 🎉", res.message || "Kartu berhasil dialokasikan.");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showErrorAlert("Gagal Mengalokasikan", res.message || "Terjadi kesalahan.");
      }
    } catch (err) {
      console.error("Batch allocation error:", err);
      showErrorAlert("Error", "Gagal memproses alokasi kartu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md flex items-center justify-center overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/60 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 shadow-lg">
              <Layers className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white truncate">
                  Alokasi Kartu Massal ke Admin Lapangan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 hidden sm:inline-block">
                  BATCH ALLOCATION
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Bagi jatah kartu fisik kosong berdasarkan rentang nomor (#001 s/d #050) atau kuota cepat
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
          {/* Step 1: Pilih Admin Lapangan Penerima */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>1. Pilih Admin Lapangan (Reseller) Tujuan *</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white font-medium outline-none transition-colors"
              >
                <option value="" disabled>
                  -- Pilih Admin Lapangan --
                </option>
                {admins.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.fullName} ({adm.email}) {adm.assignedCardsCount ? `— ${adm.assignedCardsCount} kartu` : ""}
                  </option>
                ))}
              </select>

              {selectedAdmin ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-amber-300 block">{selectedAdmin.fullName}</span>
                    <span className="text-[11px] text-slate-400">{selectedAdmin.email}</span>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold">
                    {selectedAdmin.assignedCardsCount || 0} kartu saat ini
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500 flex items-center">
                  Pilih admin di sebelah kiri untuk melihat detail
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Tab Mode Pemilihan Kartu */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>2. Metode Alokasi Kartu</span>
              </label>

              <span className="text-xs text-slate-400">
                Stok Kartu Kosong Bebas: <strong className="text-emerald-400">{unassignedEmptyCards.length} pcs</strong>
              </span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode("RANGE")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "RANGE"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Rentang Nomor (Range)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("QUICK_COUNT")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "QUICK_COUNT"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kuota Cepat (Pcs)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("MANUAL_LIST")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "MANUAL_LIST"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Pilih Manual / List</span>
              </button>
            </div>

            {/* MODE 1: RANGE FORM */}
            {mode === "RANGE" && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-4 animate-in fade-in">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Alokasi Berdasarkan Rentang Nomor Urut Kartu</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Masukkan nomor awal dan nomor akhir kartu yang ingin dialokasikan sekaligus (contoh: <strong>001</strong> s/d <strong>050</strong>).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Prefix Kartu (Opsional)</label>
                    <input
                      type="text"
                      value={rangePrefix}
                      onChange={(e) => setRangePrefix(e.target.value)}
                      placeholder="Contoh: c- atau QR-"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white font-mono placeholder-slate-600 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Nomor / Kode Awal *</label>
                    <input
                      type="text"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      placeholder="Contoh: 001 atau 1"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white font-mono placeholder-slate-600 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Nomor / Kode Akhir *</label>
                    <input
                      type="text"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      placeholder="Contoh: 050 atau 50"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white font-mono placeholder-slate-600 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleApplyRange}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Terapkan Rentang Kartu</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODE 2: QUICK COUNT FORM */}
            {mode === "QUICK_COUNT" && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-4 animate-in fade-in">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Alokasi Cepat Kartu Kosong Pertama yang Tersedia</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Sistem akan otomatis mengambil N kartu kosong yang belum dialokasikan ke admin manapun secara berurutan.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[8, 10, 20, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyQuickCount(preset)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedCodes.size === preset
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      +{preset} Kartu {preset === 8 ? "(Min Reseller)" : ""}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400">Atau jumlah custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={unassignedEmptyCards.length || 500}
                    value={quickCount}
                    onChange={(e) => setQuickCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono text-center outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyQuickCount(quickCount)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Pilih {quickCount} Kartu
                  </button>
                </div>
              </div>
            )}

            {/* MODE 3: MANUAL CHECKLIST FORM */}
            {mode === "MANUAL_LIST" && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari kode kartu..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={filterFilterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 outline-none"
                    >
                      <option value="UNASSIGNED_EMPTY">Belum Ada Admin & Kosong</option>
                      <option value="ALL_EMPTY">Semua Kartu Kosong (No Outlet)</option>
                      <option value="ALL">Semua Kartu</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleToggleSelectAllVisible}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shrink-0 transition-colors cursor-pointer"
                    >
                      Pilih Semua Tampil
                    </button>
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="max-h-56 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 p-1">
                  {eligibleCards
                    .filter((c) => c.code.toLowerCase().includes(searchQuery.toLowerCase().trim()))
                    .slice(0, 150)
                    .map((card) => {
                      const isSelected = selectedCodes.has(card.code);
                      return (
                        <button
                          key={card.code}
                          type="button"
                          onClick={() => handleToggleCard(card.code)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-500/20"
                              : "bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold truncate">{card.code}</span>
                            {isSelected ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500 truncate mt-1">
                            {card.assignedAdminName ? `Admin: ${card.assignedAdminName}` : "Kolam Bebas"}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Live Summary & Selected Cards List Preview */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Ringkasan Kartu yang Akan Dialokasikan
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Total Terpilih:</span>
                <span className="font-mono font-black text-sm text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                  {selectedCodes.size} Kartu
                </span>
                {selectedCodes.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCodes(new Set())}
                    className="text-[11px] text-rose-400 hover:underline cursor-pointer flex items-center gap-0.5 ml-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {selectedCodes.size === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Belum ada kartu yang dipilih. Terapkan rentang nomor atau klik kuota cepat di atas.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                  {Array.from(selectedCodes).map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-[11px] font-semibold"
                    >
                      <span>#{code}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleCard(code)}
                        className="hover:text-rose-400 transition-colors cursor-pointer"
                        title="Hapus kartu ini dari pilihan"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span>
                    Tujuan: <strong className="text-amber-300">{selectedAdmin?.fullName || "Pilih Admin"}</strong>
                  </span>
                  <span>
                    Rentang:{" "}
                    <strong className="text-white font-mono">
                      #{Array.from(selectedCodes)[0]} s/d #{Array.from(selectedCodes)[selectedCodes.size - 1]}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedCodes.size === 0 || !selectedAdminId}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengalokasikan Kartu...</span>
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" />
                <span>Alokasikan {selectedCodes.size} Kartu ke Admin Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
