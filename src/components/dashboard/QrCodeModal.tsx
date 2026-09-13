"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  QrCode as QrIcon,
  CreditCard,
  Printer,
  Sparkles,
  Loader2,
} from "lucide-react";
import { generateQrDataUrl, getCardScanUrl } from "@/lib/qr-export";
import {
  PrintSizeKey,
  PrintTemplateConfig,
  PRINT_SIZE_PRESETS,
  renderCardCanvasBySize,
  generateReviewCardDataUrl,
} from "@/lib/card-canvas";
import { getPrintTemplatesAction } from "@/lib/actions/site-setting.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface QrCodeModalProps {
  card: {
    code: string;
    status: string;
    outlet?: { name: string; googleReviewUrl: string } | null;
  } | null;
  version?: string;
  showPrintActions?: boolean;
  initialPrintTemplates?: string | Record<string, unknown> | null;
  onClose: () => void;
}

export function parsePrintTemplates(
  raw?: unknown
): Record<PrintSizeKey, PrintTemplateConfig> | null {
  if (!raw) return null;
  let parsed: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  } else if (typeof raw === "object" && raw !== null) {
    parsed = raw as Record<string, unknown>;
  }

  if (!parsed || Object.keys(parsed).length === 0) return null;

  const merged: Record<PrintSizeKey, PrintTemplateConfig> = { ...PRINT_SIZE_PRESETS };
  (Object.keys(PRINT_SIZE_PRESETS) as PrintSizeKey[]).forEach((key) => {
    if (parsed[key]) {
      const savedItem = parsed[key] as Partial<PrintTemplateConfig>;
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

  return merged;
}

export function QrCodeModal({
  card,
  version = "V 1.1.2",
  showPrintActions = true,
  initialPrintTemplates,
  onClose,
}: QrCodeModalProps) {
  const [viewTab, setViewTab] = useState<"CARD" | "QR">("CARD");
  const selectedSize: PrintSizeKey = "square";

  // Instant synchronous initialization from Prop or Local Cache (0ms delay)
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
      } catch {
        // ignore
      }
    }

    return PRINT_SIZE_PRESETS;
  });

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [previewCardDataUrl, setPreviewCardDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const scanUrl = card ? getCardScanUrl(card.code) : "";

  // Synchronize when initialPrintTemplates prop updates
  useEffect(() => {
    if (initialPrintTemplates) {
      const parsed = parsePrintTemplates(initialPrintTemplates);
      if (parsed) {
        setTemplateConfigs(parsed);
        if (typeof window !== "undefined") {
          (window as unknown as { __GLOBAL_PRINT_TEMPLATES__?: Record<PrintSizeKey, PrintTemplateConfig> })
            .__GLOBAL_PRINT_TEMPLATES__ = parsed;
          try {
            localStorage.setItem("saas_qr_print_templates", JSON.stringify(parsed));
          } catch {}
        }
      }
    }
  }, [initialPrintTemplates]);

  // Silent background re-validation from DB
  useEffect(() => {
    getPrintTemplatesAction()
      .then((res) => {
        if (res.success && res.data && Object.keys(res.data).length > 0) {
          const parsed = parsePrintTemplates(res.data);
          if (parsed) {
            setTemplateConfigs((prev) => {
              // Only update if backgroundUrl or values actually changed
              const prevStr = JSON.stringify(prev);
              const newStr = JSON.stringify(parsed);
              if (prevStr === newStr) return prev;
              return parsed;
            });

            if (typeof window !== "undefined") {
              (window as unknown as { __GLOBAL_PRINT_TEMPLATES__?: Record<PrintSizeKey, PrintTemplateConfig> })
                .__GLOBAL_PRINT_TEMPLATES__ = parsed;
              try {
                localStorage.setItem("saas_qr_print_templates", JSON.stringify(parsed));
              } catch {}
            }
          }
        }
      })
      .catch((err) => console.error("Background template sync error:", err));
  }, []);

  // Generate QR Data URL
  useEffect(() => {
    if (!card) return;
    setLoading(true);
    generateQrDataUrl(scanUrl)
      .then((url) => {
        setQrDataUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [card, scanUrl]);

  // Generate Card Preview when Size or Template changes
  useEffect(() => {
    if (!card || !scanUrl) return;

    let active = true;
    setIsRenderingPreview(true);

    const config = templateConfigs[selectedSize] || PRINT_SIZE_PRESETS[selectedSize];

    renderCardCanvasBySize(scanUrl, selectedSize, config, {
      code: card.code,
      version: version,
      outletName: card.outlet?.name,
      showCode: true,
    })
      .then((canvas) => {
        if (active) {
          setPreviewCardDataUrl(canvas.toDataURL("image/png", 0.9));
          setIsRenderingPreview(false);
        }
      })
      .catch((err) => {
        console.error("Failed to render card preview:", err);
        if (active) setIsRenderingPreview(false);
      });

    return () => {
      active = false;
    };
  }, [card, scanUrl, templateConfigs, version]);

  if (!card) return null;

  const currentSizePreset = templateConfigs[selectedSize] || PRINT_SIZE_PRESETS[selectedSize];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      showSuccessAlert("Link Disalin!", "Link QR kartu berhasil disalin ke clipboard.", 1200);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Download high-resolution print-ready Card PNG for selected size
  const handleDownloadCardPng = async () => {
    try {
      setIsDownloadingCard(true);
      const cardPngUrl = await generateReviewCardDataUrl(
        scanUrl,
        {
          code: card.code,
          version: version,
          outletName: card.outlet?.name,
          showCode: true,
        },
        selectedSize,
        currentSizePreset
      );

      const a = document.createElement("a");
      a.href = cardPngUrl;
      a.download = `Kartu-GoogleReview-${card.code}-${selectedSize}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showSuccessAlert(
        "Kartu Siap Cetak Diunduh!",
        `File Kartu-GoogleReview-${card.code}-${selectedSize}.png (${currentSizePreset.name} ${currentSizePreset.badge} resolusi tinggi 300 DPI) siap dikirim ke percetakan.`,
        2400
      );
    } catch (err) {
      console.error(err);
      showErrorAlert("Gagal Download", "Gagal memproses gambar kartu siap cetak.");
    } finally {
      setIsDownloadingCard(false);
    }
  };

  // Download plain QR code
  const handleDownloadQrOnly = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR-${card.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showSuccessAlert("QR Code Diunduh!", `File QR-${card.code}.png berhasil diunduh.`, 1500);
  };

  // Print Card directly with physical size page CSS
  const handlePrint = async () => {
    try {
      setIsDownloadingCard(true);
      const cardPngUrl = await generateReviewCardDataUrl(
        scanUrl,
        {
          code: card.code,
          version: version,
          outletName: card.outlet?.name,
          showCode: true,
        },
        selectedSize,
        currentSizePreset
      );

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showErrorAlert("Pop-up Terblokir", "Izinkan pop-up browser untuk mencetak kartu.");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak Kartu Google Review - ${card.code} (${currentSizePreset.name})</title>
            <style>
              @page {
                size: ${currentSizePreset.widthMm}mm ${currentSizePreset.heightMm}mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              img {
                width: ${currentSizePreset.widthMm}mm;
                height: ${currentSizePreset.heightMm}mm;
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            <img src="${cardPngUrl}" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error(err);
      showErrorAlert("Gagal Mencetak", "Terjadi kesalahan saat menyiapkan dokumen cetak.");
    } finally {
      setIsDownloadingCard(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 text-indigo-400 border border-indigo-500/30">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Kartu QR: {card.code}</h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                  {currentSizePreset.name} ({currentSizePreset.badge})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {card.outlet ? `Outlet: ${card.outlet.name}` : "Status: Kartu Kosong (Belum Di-claim)"}
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

        {/* Tab View Switcher (Desain Kartu vs QR Saja) */}
        {showPrintActions && (
          <div className="flex items-center justify-center gap-2 mt-4 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewTab("CARD")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewTab === "CARD"
                  ? "bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Desain Kartu Siap Cetak</span>
            </button>
            <button
              type="button"
              onClick={() => setViewTab("QR")}
              className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewTab === "QR"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <QrIcon className="w-3.5 h-3.5" />
              <span>QR Saja</span>
            </button>
          </div>
        )}

        {/* Standard Format Info (Card Tab) */}
        {viewTab === "CARD" && showPrintActions && (
          <div className="mt-3.5 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">⏹️</span>
              <span className="text-xs font-semibold text-slate-200">
                Format Standar: <strong className="text-white">Stiker Meja Persegi (10 x 10 cm)</strong>
              </span>
            </div>
            <span className="text-[11px] font-mono text-indigo-300">
              1500 x 1500 px @ 300 DPI
            </span>
          </div>
        )}

        {/* Preview Container */}
        <div className="my-4 flex flex-col items-center justify-center min-h-[300px] p-2 bg-slate-950/50 rounded-2xl border border-slate-800/80">
          {loading || (viewTab === "CARD" && isRenderingPreview) ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400">Merender desain kartu {currentSizePreset.name}...</p>
            </div>
          ) : viewTab === "CARD" ? (
            <div className="w-full flex flex-col items-center py-1 animate-in zoom-in-95 duration-200">
              {previewCardDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewCardDataUrl}
                  alt={`Preview ${card.code}`}
                  className="max-h-[360px] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-700 select-none"
                />
              ) : (
                <div className="text-xs text-slate-500">Gagal merender preview</div>
              )}
              <p className="text-[11px] text-slate-400 mt-2.5 text-center leading-relaxed">
                Preview cetak <strong className="text-slate-300">{currentSizePreset.name}</strong> ({currentSizePreset.badge}) @ 300 DPI.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-white rounded-3xl shadow-xl flex items-center justify-center border-4 border-slate-700/50">
                <div className="relative w-52 h-52">
                  <Image
                    src={qrDataUrl}
                    alt={`QR Code ${card.code}`}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              </div>
              <span className="mt-3 text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                {card.code}
              </span>
            </div>
          )}
        </div>

        {/* Scan URL Bar */}
        <div className="mb-4 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-slate-300 truncate pl-2">{scanUrl}</span>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Tersalin" : "Salin"}</span>
          </button>
        </div>

        {/* Actions based on showPrintActions */}
        {showPrintActions ? (
          <div className="space-y-2.5">
            <button
              onClick={handleDownloadCardPng}
              disabled={loading || isDownloadingCard || isRenderingPreview}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
            >
              {isDownloadingCard ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span>Download {currentSizePreset.name} ({currentSizePreset.badge} PNG)</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handlePrint}
                disabled={loading || isDownloadingCard || isRenderingPreview}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Cetak (Print)</span>
              </button>

              <button
                onClick={handleDownloadQrOnly}
                disabled={loading || !qrDataUrl}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>QR Saja</span>
              </button>

              <a
                href={scanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test Link</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={scanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-sky-600/20 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Tes Link Scan</span>
            </a>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
              <span>{copied ? "Link Tersalin" : "Salin Link"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
