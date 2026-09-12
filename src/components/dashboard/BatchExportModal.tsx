"use client";

import { useState, useEffect } from "react";
import { X, Download, FileSpreadsheet, Archive, Loader2, Info, CreditCard, QrCode, Layers } from "lucide-react";
import { generateCardsCsv, generateQrZipBlob, CardExportItem } from "@/lib/qr-export";
import { PrintSizeKey, PrintTemplateConfig, PRINT_SIZE_PRESETS } from "@/lib/card-canvas";
import { getPrintTemplatesAction } from "@/lib/actions/site-setting.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface BatchExportModalProps {
  cards: CardExportItem[];
  onClose: () => void;
}

const SIZE_OPTIONS: { key: PrintSizeKey; label: string; badge: string; icon: string }[] = [
  { key: "square", label: "Stiker Meja Persegi", badge: "10 x 10 cm", icon: "⏹️" },
];

export function BatchExportModal({ cards, onClose }: BatchExportModalProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [exportFormat, setExportFormat] = useState<"CARDS" | "QR_ONLY" | "BOTH">("CARDS");
  const [selectedSize, setSelectedSize] = useState<PrintSizeKey>("square");
  const [templateConfigs, setTemplateConfigs] = useState<Record<PrintSizeKey, PrintTemplateConfig>>(PRINT_SIZE_PRESETS);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

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

  const filteredCards = cards.filter((c) => {
    if (filterStatus === "BLANK") return !c.outlet;
    if (filterStatus === "CLAIMED") return !!c.outlet;
    if (filterStatus === "ACTIVE") return c.status === "ACTIVE";
    if (filterStatus === "INACTIVE") return c.status === "INACTIVE";
    return true;
  });

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

        {/* Format Selection */}
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
                Paket ZIP akan berisi file gambar desain <strong className="text-white">Kartu Google Review ({currentSizePreset.name} {currentSizePreset.badge} - 300+ DPI / {currentSizePreset.canvasWidth}x{currentSizePreset.canvasHeight} px)</strong> siap cetak, plus file spreadsheet <strong>daftar-kartu.csv</strong>.
              </span>
            ) : (
              <span>
                Paket ZIP akan berisi file QR Code hitam putih polosan dan manifest spreadsheet <strong>daftar-kartu.csv</strong>.
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
            <span>Download ZIP Cetak</span>
          </button>
        </div>
      </div>
    </div>
  );
}
