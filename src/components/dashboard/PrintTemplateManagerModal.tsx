"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  X,
  Upload,
  RotateCcw,
  Save,
  Loader2,
  Sliders,
  CheckCircle2,
  Trash2,
  Eye,
  Info,
  Layers,
} from "lucide-react";
import {
  PrintSizeKey,
  PrintTemplateConfig,
  PRINT_SIZE_PRESETS,
  renderCardCanvasBySize,
} from "@/lib/card-canvas";
import {
  getPrintTemplatesAction,
  updatePrintTemplatesAction,
} from "@/lib/actions/site-setting.actions";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";

interface PrintTemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const SIZE_TABS: { key: PrintSizeKey; label: string; badge: string; icon: string }[] = [
  { key: "square", label: "Stiker Meja Persegi", badge: "10 x 10 cm", icon: "⏹️" },
];

export function PrintTemplateManagerModal({
  isOpen,
  onClose,
  onSaved,
}: PrintTemplateManagerModalProps) {
  const [activeSize, setActiveSize] = useState<PrintSizeKey>("square");
  const [templates, setTemplates] = useState<Record<PrintSizeKey, PrintTemplateConfig>>(PRINT_SIZE_PRESETS);
  const [isLoading, setIsLoading] = useState(true);
  const [customFiles, setCustomFiles] = useState<Record<PrintSizeKey, File | null>>({
    square: null,
  });
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved templates from DB & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    let isMounted = true;
    setIsLoading(true);

    getPrintTemplatesAction()
      .then((res) => {
        if (!isMounted) return;
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
          setTemplates(merged);
        }
      })
      .catch((err) => console.error("Error loading print templates:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Current active template configuration
  const currentConfig = templates[activeSize] || PRINT_SIZE_PRESETS[activeSize];

  // Update a field in the current template
  const updateCurrentTemplate = (patch: Partial<PrintTemplateConfig>) => {
    setTemplates((prev) => ({
      ...prev,
      [activeSize]: {
        ...prev[activeSize],
        ...patch,
      },
    }));
  };

  const updateQrPosition = (patch: Partial<PrintTemplateConfig["qr"]>) => {
    setTemplates((prev) => ({
      ...prev,
      [activeSize]: {
        ...prev[activeSize],
        qr: {
          ...prev[activeSize].qr,
          ...patch,
        },
      },
    }));
  };

  const updateVersionTag = (patch: Partial<PrintTemplateConfig["versionTag"]>) => {
    setTemplates((prev) => ({
      ...prev,
      [activeSize]: {
        ...prev[activeSize],
        versionTag: {
          ...prev[activeSize].versionTag,
          ...patch,
        },
      },
    }));
  };

  const updateCodeTag = (patch: Partial<PrintTemplateConfig["codeTag"]>) => {
    setTemplates((prev) => ({
      ...prev,
      [activeSize]: {
        ...prev[activeSize],
        codeTag: {
          ...prev[activeSize].codeTag,
          ...patch,
        },
      },
    }));
  };

  // Live Canvas Rendering for Preview
  useEffect(() => {
    let active = true;

    async function updatePreview() {
      try {
        const demoUrl = "http://localhost:3000/c/c-001";
        const canvas = await renderCardCanvasBySize(
          demoUrl,
          activeSize,
          currentConfig,
          {
            code: "c-001",
            version: "V 1.1.2",
            outletName: "Resto & Cafe Google Review",
            showCode: currentConfig.codeTag?.show !== false,
          }
        );

        if (active) {
          setPreviewUrl(canvas.toDataURL("image/png", 0.9));
        }
      } catch (err) {
        console.error("Live preview render error:", err);
      }
    }

    updatePreview();

    return () => {
      active = false;
    };
  }, [activeSize, currentConfig]);

  // Handle Custom Template Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showErrorAlert("Format Salah", "Harap unggah file gambar (PNG, JPG, atau WEBP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showErrorAlert("File Terlalu Besar", "Ukuran maksimal template adalah 2MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomFiles((prev) => ({ ...prev, [activeSize]: file }));
    updateCurrentTemplate({ backgroundUrl: objectUrl });

    showSuccessAlert(
      "Template Terunggah!",
      `Template background baru berhasil dimuat. Silakan atur posisi QR code sesuai kebutuhan.`,
      1500
    );

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove custom background and revert to default design
  const handleRemoveCustomBackground = () => {
    const defaultBg = PRINT_SIZE_PRESETS[activeSize].backgroundUrl;
    setCustomFiles((prev) => ({ ...prev, [activeSize]: null }));
    updateCurrentTemplate({ backgroundUrl: defaultBg });
    showSuccessAlert("Background Direset", "Menggunakan background desain bawaan sistem.", 1200);
  };

  // Reset entire size preset to factory defaults
  const handleResetSizeToDefault = async () => {
    const confirmed = await showConfirmAlert(
      `Reset Template ${currentConfig.name}?`,
      `Seluruh posisi QR code, koordinat, dan template background ukuran ini akan dikembalikan ke setting bawaan pabrik.`,
      "Ya, Reset",
      "warning"
    );

    if (confirmed) {
      setCustomFiles((prev) => ({ ...prev, [activeSize]: null }));
      setTemplates((prev) => ({
        ...prev,
        [activeSize]: { ...PRINT_SIZE_PRESETS[activeSize] },
      }));
      showSuccessAlert("Berhasil Direset", `Template ${currentConfig.name} telah kembali ke pengaturan awal.`, 1500);
    }
  };

  // Save all templates to database
  const handleSaveAll = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        const templatesToSave = JSON.parse(JSON.stringify(templates));

        // Inject placeholders for newly uploaded files to save JSON size
        Object.keys(templatesToSave).forEach((key) => {
          const k = key as PrintSizeKey;
          if (customFiles[k]) {
            formData.append(`file_${k}`, customFiles[k] as Blob);
            templatesToSave[k].backgroundUrl = `UPLOADED:${k}`;
          }
        });

        formData.append("templatesJson", JSON.stringify(templatesToSave));

        const res = await updatePrintTemplatesAction(formData);

        if (res.success) {
          showSuccessAlert("Berhasil Disimpan!", res.message, 2000);
          if (onSaved) onSaved();
          onClose();
        } else {
          showErrorAlert("Gagal Menyimpan", res.message);
        }
      } catch (err) {
        console.error(err);
        showErrorAlert("Gagal Menyimpan", "Terjadi kesalahan saat menyimpan pengaturan template ke server.");
      }
    });
  };

  if (!isOpen) return null;

  const isCustomBg =
    currentConfig.backgroundUrl &&
    currentConfig.backgroundUrl !== PRINT_SIZE_PRESETS[activeSize].backgroundUrl;

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:px-6 border-b border-slate-800 shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-purple-500/20 text-sky-400 border border-indigo-500/30">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white">Manajemen Template Cetak Stiker Persegi</h2>
                <span className="text-[11px] font-semibold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Upload template custom dan atur posisi QR Code secara visual untuk format standar Stiker Persegi (10 x 10 cm).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Standard Format Banner */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-slate-800/80 bg-slate-950/40 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⏹️</span>
            <span className="text-xs font-bold text-white">Format Standar: Stiker Meja Persegi</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              10 x 10 cm (1:1)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Resolusi Cetak: 1500 x 1500 px @ 300 DPI
          </span>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {isLoading ? (
            <div className="col-span-12 flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400">Memuat konfigurasi template...</p>
            </div>
          ) : (
            <>
              {/* Left Column: Form & Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Active Size Summary Banner */}
                <div className="p-3.5 bg-indigo-950/30 rounded-2xl border border-indigo-500/20 flex items-start gap-3">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-indigo-200">
                      Ukuran: {currentConfig.name} ({currentConfig.badge})
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      {currentConfig.description} (Resolusi Siap Cetak:{" "}
                      <strong className="text-slate-300 font-mono">
                        {currentConfig.canvasWidth} x {currentConfig.canvasHeight} px @ 300 DPI
                      </strong>
                      )
                    </p>
                  </div>
                </div>

                {/* Section 1: Template Background Upload */}
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      <span>Template Background</span>
                    </label>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isCustomBg
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}
                    >
                      {isCustomBg ? "🎨 Background Custom" : "✨ Bawaan Sistem"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Upload desain gambar template ({currentConfig.badge}) yang sudah dibuat di Canva/Photoshop tanpa QR
                    Code. Sistem akan menempelkan QR Code di posisi yang ditentukan.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                      id={`template-upload-${activeSize}`}
                    />
                    <label
                      htmlFor={`template-upload-${activeSize}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Gambar Template</span>
                    </label>

                    {isCustomBg && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomBackground}
                        className="py-2 px-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border border-rose-800/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Hapus background custom & kembali ke desain bawaan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 2: QR Position Sliders */}
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Atur Posisi & Ukuran QR Code</span>
                    </label>
                  </div>

                  {/* Slider: Posisi Horizontal X */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Posisi Horizontal (X)</span>
                      <span className="font-mono text-indigo-400 font-bold">{currentConfig.qr.x}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={0.5}
                      value={currentConfig.qr.x}
                      onChange={(e) => updateQrPosition({ x: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Kiri (10%)</span>
                      <span>Tengah (50%)</span>
                      <span>Kanan (90%)</span>
                    </div>
                  </div>

                  {/* Slider: Posisi Vertikal Y */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Posisi Vertikal (Y)</span>
                      <span className="font-mono text-indigo-400 font-bold">{currentConfig.qr.y}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={0.5}
                      value={currentConfig.qr.y}
                      onChange={(e) => updateQrPosition({ y: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Atas (10%)</span>
                      <span>Tengah (50%)</span>
                      <span>Bawah (90%)</span>
                    </div>
                  </div>

                  {/* Slider: Ukuran QR Code */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Ukuran Kotak QR (% Lebar)</span>
                      <span className="font-mono text-indigo-400 font-bold">{currentConfig.qr.size || 50}%</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={85}
                      step={0.5}
                      value={currentConfig.qr.size || 50}
                      onChange={(e) => updateQrPosition({ size: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Kecil (15%)</span>
                      <span>Standar (50%)</span>
                      <span>Besar (85%)</span>
                    </div>
                  </div>

                  {/* Slider: Kelengkungan Sudut QR */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Kelengkungan Sudut QR</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {currentConfig.qr.borderRadius || 0}%
                        {(!currentConfig.qr.borderRadius || currentConfig.qr.borderRadius === 0)
                          ? " (Persegi)"
                          : currentConfig.qr.borderRadius <= 10
                          ? " (Sedikit)"
                          : currentConfig.qr.borderRadius <= 20
                          ? " (Sedang)"
                          : " (Bulat)"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={currentConfig.qr.borderRadius || 0}
                      onChange={(e) => updateQrPosition({ borderRadius: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Persegi Lancip (0%)</span>
                      <span>Sedang (15%)</span>
                      <span>Sangat Melengkung (30%)</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Optional Elements */}
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                    Elemen Tambahan
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Toggle Version Tag */}
                    <button
                      type="button"
                      onClick={() => updateVersionTag({ show: !currentConfig.versionTag?.show })}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        currentConfig.versionTag?.show !== false
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>Tag Versi</span>
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            currentConfig.versionTag?.show !== false ? "text-indigo-400" : "text-slate-600"
                          }`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Misal: V 1.1.2</p>
                    </button>

                    {/* Toggle Code Tag */}
                    <button
                      type="button"
                      onClick={() => updateCodeTag({ show: !currentConfig.codeTag?.show })}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        currentConfig.codeTag?.show !== false
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>Tag Kode Kartu</span>
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            currentConfig.codeTag?.show !== false ? "text-indigo-400" : "text-slate-600"
                          }`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Misal: c-001</p>
                    </button>
                  </div>
                </div>

                {/* Reset button for this size */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResetSizeToDefault}
                    className="w-full py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kembalikan {currentConfig.name} ke Bawaan</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Interactive Live Preview (7 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-3xl border border-slate-800 relative">
                <div className="w-full flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">Live Real-time Preview</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {currentConfig.badge} ({currentConfig.canvasWidth}x{currentConfig.canvasHeight} px)
                  </span>
                </div>

                {/* Preview Image Container with Aspect Ratio Constraint */}
                <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[380px] max-h-[560px] p-2 overflow-hidden relative">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={`Preview ${currentConfig.name}`}
                      className="max-h-[520px] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-700"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-xs">Menyiapkan live preview...</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  💡 Geser slider di sebelah kiri untuk menyesuaikan posisi QR Code secara real-time.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isPending || isLoading}
            className="flex items-center gap-2 py-3 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Save className="w-4 h-4 text-emerald-200" />
            )}
            <span>Simpan Seluruh Pengaturan Template</span>
          </button>
        </div>
      </div>
    </div>
  );
}
