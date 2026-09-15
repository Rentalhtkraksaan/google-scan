"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, FileSpreadsheet, Archive, Loader2, Info, CreditCard, QrCode, Layers, CheckSquare, Square, ChevronDown, ChevronUp, Search } from "lucide-react";
import { generateCardsCsv, generateQrZipBlob, CardExportItem } from "@/lib/qr-export";
import { PrintSizeKey, PrintTemplateConfig, PRINT_SIZE_PRESETS } from "@/lib/card-canvas";
import { getPrintTemplatesAction } from "@/lib/actions/site-setting.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { parsePrintTemplates } from "@/components/dashboard/QrCodeModal";

interface BatchExportModalProps {
  cards: CardExportItem[];
  version?: string;
  initialPrintTemplates?: string | Record<string, unknown> | null;
  onClose: () => void;
}

export function BatchExportModal({ cards, version = "V 1.1.2", initialPrintTemplates, onClose }: BatchExportModalProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [exportFormat, setExportFormat] = useState<"CARDS" | "QR_ONLY" | "BOTH">("CARDS");
  const [selectedSize, setSelectedSize] = useState<PrintSizeKey>("square");
  const [templateConfigs, setTemplateConfigs] = useState<Record<PrintSizeKey, PrintTemplateConfig>>(() => {
    const fromProp = parsePrintTemplates(initialPrintTemplates);
    if (fromProp) return fromProp;

    if (typeof window !== "undefined") {
      try {
        const cached = (window as unknown as { __GLOBAL_PRINT_TEMPLATES__?: Record<PrintSizeKey, PrintTemplateConfig> })
          .__GLOBAL_PRINT_TEMPLATES__;
        if (cached) return cached;

        const stored = localStorage.getItem("saas_qr_print_templates");
        if (stored) {
          const fromStorage = parsePrintTemplates(stored);
          if (fromStorage) return fromStorage;
        }
      } catch {}
    }

    return PRINT_SIZE_PRESETS;
  });
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Card selection state (for BLANK filter)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [cardSearch, setCardSearch] = useState("");

  // Load saved templates
  useEffect(() => {
    getPrintTemplatesAction()
      .then((res) => {
        if (res.success && res.data && Object.keys(res.data).length > 0) {
          const merged: Record<PrintSizeKey, PrintTemplateConfig> = { ...PRINT_SIZE_PRESETS };
          (Object.keys(PRINT_SIZE_PRESETS) as PrintSizeKey[]).forEach((key) => {
            if (res.data && res.data[key]) {
              const savedItem = res.data[key] as Partial<PrintTemplateConfig>;
              merged[key] = {
                ...PRINT_SIZE_PRESETS[key],
                ...savedItem,
                isActive: savedItem.isActive !== undefined ? savedItem.isActive : true,
                qr: { ...PRINT_SIZE_PRESETS[key].qr, ...savedItem.qr },
                versionTag: { ...PRINT_SIZE_PRESETS[key].versionTag, ...savedItem.versionTag },
                codeTag: { ...PRINT_SIZE_PRESETS[key].codeTag, ...savedItem.codeTag },
                outletNameTag:
                  PRINT_SIZE_PRESETS[key].outletNameTag || savedItem.outletNameTag
                    ? {
                        x: 50,
                        y: 89,
                        fontSize: 28,
                        show: true,
                        ...PRINT_SIZE_PRESETS[key].outletNameTag,
                        ...savedItem.outletNameTag,
                      }
                    : undefined,
              };
            }
          });
          setTemplateConfigs(merged);

          // Fallback to first active size if current size is disabled
          const activeKeys = (Object.keys(merged) as PrintSizeKey[]).filter(
            (k) => merged[k].isActive !== false
          );
          if (activeKeys.length > 0 && merged[selectedSize]?.isActive === false) {
            setSelectedSize(activeKeys[0]);
          }
        }
      })
      .catch((err) => console.error("Error loading templates in BatchExportModal:", err));
  }, [selectedSize]);

  // All blank cards (for picker)
  const blankCards = cards.filter((c) => !c.outlet);

  // Base filtered cards by status
  const baseFilteredCards = cards.filter((c) => {
    if (filterStatus === "BLANK") return !c.outlet;
    if (filterStatus === "CLAIMED") return !!c.outlet;
    if (filterStatus === "ACTIVE") return c.status === "ACTIVE";
    if (filterStatus === "INACTIVE") return c.status === "INACTIVE";
    return true;
  });

  // Reset selections when filter changes
  useEffect(() => {
    setSelectedCodes(new Set());
    setShowCardPicker(false);
    setCardSearch("");
  }, [filterStatus]);

  // Actual cards to export: if BLANK and user picked specific ones, use those
  const filteredCards = filterStatus === "BLANK" && selectedCodes.size > 0
    ? baseFilteredCards.filter((c) => selectedCodes.has(c.code))
    : baseFilteredCards;

  // Cards matching search in picker
  const searchedBlankCards = blankCards.filter((c) =>
    c.code.toLowerCase().includes(cardSearch.toLowerCase())
  );

  const isAllSelected = blankCards.length > 0 && selectedCodes.size === blankCards.length;
  const isNoneSelected = selectedCodes.size === 0;

  const toggleCard = useCallback((code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedCodes(new Set(blankCards.map((c) => c.code)));
  const clearAll = () => setSelectedCodes(new Set());

  const exportCount = filterStatus === "BLANK" && selectedCodes.size > 0
    ? selectedCodes.size
    : baseFilteredCards.length;

  const currentSizePreset = templateConfigs[selectedSize] || PRINT_SIZE_PRESETS[selectedSize];

  const handleExportCsv = () => {
    try {
      setIsExportingCsv(true);
      const csvString = generateCardsCsv(filteredCards);
      const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `daftar-kartu-qr-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 5000);
      showSuccessAlert("CSV Berhasil Diunduh!", `Daftar ${filteredCards.length} link kartu siap cetak.`, 1500);
    } catch (err) {
      console.error(err);
      showErrorAlert("Gagal Ekspor CSV", "Terjadi kesalahan saat membuat file CSV.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportZip = async () => {
    if (filteredCards.length === 0) {
      showErrorAlert("Tidak Ada Kartu", "Tidak ada kartu yang sesuai filter untuk diekspor.");
      return;
    }

    try {
      setIsExportingZip(true);
      const zipBlob = await generateQrZipBlob(filteredCards, {
        format: exportFormat,
        sizeKey: selectedSize,
        templateConfigs: templateConfigs,
        version: version,
      });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `batch-kartu-review-${selectedSize}-${new Date().toISOString().slice(0, 10)}.zip`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 5000);
      showSuccessAlert(
        "ZIP Siap Cetak Berhasil Diunduh!",
        `Arsip ${filteredCards.length} file kartu Google Review resolusi tinggi (${currentSizePreset.name} ${currentSizePreset.badge}) siap dikirim ke percetakan.`,
        2600
      );
    } catch (err) {
      console.error(err);
      showErrorAlert("Gagal Ekspor ZIP", "Terjadi kesalahan saat memproses kartu dan gambar QR.");
    } finally {
      setIsExportingZip(false);
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
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30">
              <Download className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Ekspor Batch Kartu Percetakan</h3>
              <p className="text-xs text-slate-400">Siap kirim ke percetakan dalam berbagai format ukuran</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Option */}
        <div className="my-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Pilih Filter Data:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "ALL", label: `Semua (${cards.length})` },
              { id: "BLANK", label: `Kartu Kosong (${cards.filter((c) => !c.outlet).length})` },
              { id: "CLAIMED", label: `Terpakai (${cards.filter((c) => !!c.outlet).length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id)}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                  filterStatus === f.id
                    ? "bg-indigo-600/25 border-indigo-500 text-indigo-300 font-semibold"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card Picker (only when BLANK filter active) ── */}
        {filterStatus === "BLANK" && blankCards.length > 0 && (
          <div className="mb-4">
            {/* Toggle header */}
            <button
              type="button"
              onClick={() => setShowCardPicker((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-dashed border-indigo-500/50 bg-indigo-950/30 hover:bg-indigo-950/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-300">
                  {isNoneSelected
                    ? "Pilih kartu tertentu yang mau di-download (opsional)"
                    : `${selectedCodes.size} kartu dipilih dari ${blankCards.length}`}
                </span>
                {!isNoneSelected && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600/40 text-indigo-200 font-mono">
                    {selectedCodes.size}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isNoneSelected && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); clearAll(); }}
                    className="text-[10px] text-slate-400 hover:text-red-400 underline transition-colors cursor-pointer"
                  >
                    reset
                  </span>
                )}
                {showCardPicker
                  ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-indigo-300 transition-colors" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-300 transition-colors" />
                }
              </div>
            </button>

            {/* Expandable picker */}
            {showCardPicker && (
              <div className="mt-2 border border-slate-700 rounded-xl overflow-hidden bg-slate-950/60">
                {/* Search + select-all bar */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
                  <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="Cari kode kartu…"
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={isAllSelected ? clearAll : selectAll}
                    className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-200 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {isAllSelected ? "Batal Semua" : "Pilih Semua"}
                  </button>
                </div>

                {/* Card list */}
                <div className="max-h-44 overflow-y-auto custom-scrollbar divide-y divide-slate-800/60">
                  {searchedBlankCards.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-4">Tidak ada kartu ditemukan</p>
                  ) : (
                    searchedBlankCards.map((card) => {
                      const checked = selectedCodes.has(card.code);
                      return (
                        <button
                          key={card.code}
                          type="button"
                          onClick={() => toggleCard(card.code)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
                            checked
                              ? "bg-indigo-900/25 hover:bg-indigo-900/40"
                              : "hover:bg-slate-800/50"
                          }`}
                        >
                          {checked
                            ? <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                            : <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          }
                          <span className={`font-mono text-xs ${checked ? "text-indigo-200" : "text-slate-400"}`}>
                            {card.code}
                          </span>
                          <span className="ml-auto text-[10px] text-slate-600">
                            {card.status}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer summary */}
                <div className="px-3 py-2 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    {isNoneSelected
                      ? "Semua kartu kosong akan di-download"
                      : `Hanya ${selectedCodes.size} kartu yang akan di-download`}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {searchedBlankCards.length} ditampilkan
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Pilihan Konten ZIP:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setExportFormat("CARDS")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                exportFormat === "CARDS"
                  ? "bg-gradient-to-br from-indigo-950/80 to-sky-950/80 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                  : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                <span>Kartu Cetak</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">Desain Full 300 DPI</p>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat("QR_ONLY")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                exportFormat === "QR_ONLY"
                  ? "bg-gradient-to-br from-indigo-950/80 to-sky-950/80 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                  : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                <QrCode className="w-3.5 h-3.5 text-sky-400" />
                <span>QR Saja</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">Polosan (600px)</p>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat("BOTH")}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                exportFormat === "BOTH"
                  ? "bg-gradient-to-br from-indigo-950/80 to-sky-950/80 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                  : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Keduanya</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">Kartu + QR Saja</p>
            </button>
          </div>
        </div>

        {/* Size Format Banner (When exporting cards) */}
        {exportFormat !== "QR_ONLY" && (
          <div className="mb-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">⏹️</span>
              <span className="text-xs font-semibold text-slate-200">
                Format Cetak ZIP: <strong className="text-white">Stiker Meja Persegi (10 x 10 cm)</strong>
              </span>
            </div>
            <span className="text-[11px] font-mono text-indigo-300">
              1500 x 1500 px @ 300 DPI
            </span>
          </div>
        )}

        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            {exportFormat === "CARDS" || exportFormat === "BOTH" ? (
              <span>
                Paket ZIP akan berisi <strong className="text-white">{exportCount} kartu</strong> desain{" "}
                <strong className="text-white">Kartu Google Review ({currentSizePreset.name} {currentSizePreset.badge} - 300+ DPI / {currentSizePreset.canvasWidth}x{currentSizePreset.canvasHeight} px)</strong>{" "}
                siap cetak, plus file spreadsheet <strong>daftar-kartu.csv</strong>.
              </span>
            ) : (
              <span>
                Paket ZIP akan berisi <strong className="text-white">{exportCount} file QR Code</strong> hitam putih polosan dan manifest spreadsheet <strong>daftar-kartu.csv</strong>.
              </span>
            )}
          </div>
        </div>

        {/* Download Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv || filteredCards.length === 0}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm rounded-xl border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExportingCsv ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            )}
            <span>Download CSV Daftar</span>
          </button>

          <button
            onClick={handleExportZip}
            disabled={isExportingZip || filteredCards.length === 0}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExportingZip ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Archive className="w-4 h-4 text-white" />
            )}
            <span>Download ZIP{filterStatus === "BLANK" && !isNoneSelected ? ` (${exportCount})` : ""}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
