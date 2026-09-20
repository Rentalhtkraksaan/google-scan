"use client";

import { useState } from "react";
import {
  X,
  Code,
  Copy,
  Check,
  Star,
  ExternalLink,
  Sparkles,
  Globe,
  Layers,
} from "lucide-react";
import { showSuccessAlert } from "@/lib/swal";

interface WebsiteReviewWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  outletName: string;
  cardCode: string;
  reviewUrl: string;
}

export function WebsiteReviewWidgetModal({
  isOpen,
  onClose,
  outletName,
  cardCode,
  reviewUrl,
}: WebsiteReviewWidgetModalProps) {
  const [copied, setCopied] = useState(false);
  const [widgetStyle, setWidgetStyle] = useState<"pill" | "dark" | "gold">("pill");

  if (!isOpen) return null;

  const targetUrl = reviewUrl || `https://qr-inaja.vercel.app/c/${cardCode}`;

  // Generate lightweight HTML code
  const getEmbedCode = () => {
    if (widgetStyle === "pill") {
      return `<!-- Google Review Floating Widget by Smart QR -->
<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="position:fixed;bottom:24px;right:24px;z-index:99999;display:inline-flex;align-items:center;gap:10px;padding:10px 18px;background:#0f172a;color:#ffffff;border:1.5px solid rgba(251,191,36,0.5);border-radius:9999px;box-shadow:0 12px 32px rgba(0,0,0,0.4);font-family:sans-serif;font-size:13px;font-weight:700;text-decoration:none;transition:transform .2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
  <span style="color:#fbbf24;font-size:15px;">⭐⭐⭐⭐⭐</span>
  <span>Beri Ulasan Kami di Google</span>
</a>`;
    }

    if (widgetStyle === "dark") {
      return `<!-- Google Review Dark Card Widget -->
<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="position:fixed;bottom:24px;right:24px;z-index:99999;display:block;padding:14px 18px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;border:1px solid #334155;border-radius:18px;box-shadow:0 14px 36px rgba(0,0,0,0.5);font-family:sans-serif;text-decoration:none;transition:transform .2s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='none'">
  <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:3px;">GOOGLE REVIEW RESMI</div>
  <div style="font-size:14px;font-weight:800;color:#38bdf8;">${outletName}</div>
  <div style="font-size:12px;color:#fbbf24;font-weight:700;margin-top:4px;">⭐ 5.0 Bintang • Beri Ulasan &rarr;</div>
</a>`;
    }

    return `<!-- Google Review Gold Ribbon Widget -->
<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="position:fixed;bottom:24px;right:24px;z-index:99999;display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;border-radius:14px;box-shadow:0 10px 30px rgba(245,158,11,0.35);font-family:sans-serif;font-size:13px;font-weight:900;text-decoration:none;transition:transform .2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='none'">
  <span>🏆</span>
  <span>Review Google Bintang 5</span>
</a>`;
  };

  const handleCopyCode = async () => {
    const code = getEmbedCode();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    showSuccessAlert(
      "Kode Berhasil Disalin!",
      "Tempelkan (paste) kode HTML ini sebelum tag </body> di website toko Anda.",
      2000
    );
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 p-4 bg-slate-950/80 backdrop-blur-md flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Widget Website Google Review</h3>
              <p className="text-xs text-slate-400">Pasang badge ulasan melayang di website toko Anda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style Selector */}
        <div className="my-4">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Pilih Desain Badge:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setWidgetStyle("pill")}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                widgetStyle === "pill"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              Floating Pill
            </button>
            <button
              type="button"
              onClick={() => setWidgetStyle("dark")}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                widgetStyle === "dark"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              Luxury Card
            </button>
            <button
              type="button"
              onClick={() => setWidgetStyle("gold")}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                widgetStyle === "gold"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              Gold Ribbon
            </button>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 mb-4 relative overflow-hidden text-center min-h-[120px] flex items-center justify-center">
          <div className="absolute top-2 left-3 text-[10px] text-slate-500 font-mono font-semibold uppercase">
            Live Preview di Website:
          </div>

          {widgetStyle === "pill" && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-amber-400/50 rounded-full shadow-xl shadow-black/60 font-bold text-xs text-white">
              <span className="text-amber-400 text-sm">⭐⭐⭐⭐⭐</span>
              <span>Beri Ulasan Kami di Google</span>
            </div>
          )}

          {widgetStyle === "dark" && (
            <div className="text-left p-3.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl shadow-black/60">
              <div className="text-[10px] text-slate-400 font-bold">GOOGLE REVIEW RESMI</div>
              <div className="text-xs font-black text-sky-400">{outletName}</div>
              <div className="text-[11px] text-amber-300 font-bold mt-1">⭐ 5.0 Bintang • Beri Ulasan &rarr;</div>
            </div>
          )}

          {widgetStyle === "gold" && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xl shadow-amber-500/20">
              <span>🏆</span>
              <span>Review Google Bintang 5</span>
            </div>
          )}
        </div>

        {/* Code Snippet Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-sky-400" />
              Kode HTML Sematan (1-Line):
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">Siap Tempel</span>
          </div>

          <div className="relative">
            <pre className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-24 scrollbar-thin">
              {getEmbedCode()}
            </pre>
          </div>
        </div>

        {/* Copy Button */}
        <div className="pt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 rounded-xl transition-all shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Tersalin ke Clipboard!" : "Salin Kode HTML"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
