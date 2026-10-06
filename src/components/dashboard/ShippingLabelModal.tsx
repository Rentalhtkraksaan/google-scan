"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Truck,
  Package,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  FileText,
  MessageCircle,
  Sparkles,
  Edit2,
  Building2,
} from "lucide-react";
import QRCode from "qrcode";
import { ResellerOrderModel, SiteSettingModel } from "@/types/models";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface ShippingLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ResellerOrderModel | null;
  siteSetting?: SiteSettingModel;
}

const EXPEDITION_LIST = [
  "J&T Express",
  "JNE Express",
  "SiCepat Ekspres",
  "Anteraja",
  "Shopee Xpress (SPX)",
  "POS Indonesia",
  "Lion Parcel",
  "Ninja Xpress",
  "Wahana Express",
  "GrabExpress / GoSend",
  "Indah Cargo / J&T Cargo",
  "Kurir Internal / Ambil Sendiri",
];

export function ShippingLabelModal({
  isOpen,
  onClose,
  order,
  siteSetting,
}: ShippingLabelModalProps) {
  const [expedition, setExpedition] = useState("J&T Express");
  const [serviceType, setServiceType] = useState("Reguler");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [packageWeight, setPackageWeight] = useState("0.5 kg");
  const [waybillNumber, setWaybillNumber] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const [copiedText, setCopiedText] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const labelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize form state when order changes or modal opens
  useEffect(() => {
    if (!isOpen || !order) return;

    const defaultSenderName = siteSetting?.seoTitle || "Smart QR Review Official";
    const defaultSenderPhone = siteSetting?.whatsappNumber || "6281234567890";
    const defaultSenderAddr = "Kraksaan, Kab. Probolinggo, Jawa Timur 67282";

    setSenderName(defaultSenderName);
    setSenderPhone(defaultSenderPhone);
    setSenderAddress(defaultSenderAddr);
    setWaybillNumber("");
    setCustomNotes(order.notes || "FRAGILE! JANGAN DIBANTING - DOKUMEN & KARTU AKRILIK");

    // Estimate weight based on quantity (~40g per acrylic card + packaging)
    const totalQty = order.totalQuantity || order.items?.reduce((s, i) => s + i.quantity, 0) || 1;
    const estimatedGrams = Math.max(250, totalQty * 45 + 150);
    const weightKg = (estimatedGrams / 1000).toFixed(1);
    setPackageWeight(`${weightKg} kg`);

    // Generate tracking QR Code
    const trackingUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/reseller?track=${order.orderNumber}`
        : `https://qr-inaja.vercel.app/reseller?track=${order.orderNumber}`;

    QRCode.toDataURL(trackingUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR gen error:", err));
  }, [isOpen, order, siteSetting]);

  if (!isOpen || !order) return null;

  // Items Summary
  const itemsText =
    order.items && order.items.length > 0
      ? order.items.map((i) => `${i.productName} (${i.quantity}x)`).join(", ")
      : `Paket Kartu Smart QR (${order.totalQuantity || 1} pcs)`;

  // Clean Address fallback
  const recipientAddress = order.shippingAddress || "Alamat belum dilengkapi oleh pembeli";

  // 1. Function: Native Print Label
  const handlePrint = () => {
    window.print();
  };

  // 2. Function: Copy Plain Text for Courier Apps
  const handleCopyCourierText = () => {
    const text = `==============================
📦 LABEL PENGIRIMAN PAKET
==============================
No. Pesanan : #${order.orderNumber}
Ekspedisi   : ${expedition} (${serviceType})
Berat       : ${packageWeight}
Status Bayar: LUNAS / NON-COD

👤 KEPADA (PENERIMA):
Nama   : ${order.customerName}
No. HP : ${order.customerPhone}
Alamat : ${recipientAddress}
Catatan: ${customNotes}

🏢 DARI (PENGIRIM):
Nama   : ${senderName}
No. HP : ${senderPhone}
Kota   : ${senderAddress}

📦 ISI PAKET:
${itemsText}
==============================`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // 3. Function: Send to WhatsApp Courier
  const handleSendToWhatsApp = () => {
    const text = `*📦 LABEL PENGIRIMAN PAKET*
*No. Pesanan:* #${order.orderNumber}
*Ekspedisi:* ${expedition} (${serviceType})
*Berat:* ${packageWeight}
*Status:* LUNAS / NON-COD

*👤 KEPADA (PENERIMA):*
*Nama:* ${order.customerName}
*No. HP:* ${order.customerPhone}
*Alamat:* ${recipientAddress}
*Catatan:* ${customNotes}

*🏢 DARI (PENGIRIM):*
*Nama:* ${senderName}
*No. HP:* ${senderPhone}
*Alamat:* ${senderAddress}

*📦 ISI PAKET:*
${itemsText}`;

    let cleanPhone = order.customerPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("08")) cleanPhone = "62" + cleanPhone.slice(1);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  // 4. Function: Download High-Res Shipping Label Image (PNG)
  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas tidak tersedia");

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Context canvas tidak tersedia");

      // Set high-res dimensions (Standard 100mm x 150mm ratio = 1000px x 1500px)
      const width = 1000;
      const height = 1500;
      canvas.width = width;
      canvas.height = height;

      // Background White
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Outer Border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // ── 1. HEADER SECTION (Brand & Expedition) ──
      ctx.fillStyle = "#111827";
      ctx.fillRect(20, 20, width - 40, 140);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px sans-serif";
      ctx.fillText(senderName.toUpperCase(), 50, 80);

      ctx.font = "bold 24px sans-serif";
      ctx.fillStyle = "#10b981";
      ctx.fillText("OFFICIAL SHIPPING LABEL", 50, 125);

      // Expedition Badge on top-right
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(width - 360, 40, 320, 100);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(width - 360, 40, 320, 100);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(expedition, width - 200, 88);
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(serviceType.toUpperCase(), width - 200, 122);
      ctx.textAlign = "left"; // reset

      // ── 2. ORDER NUMBER & BARCODE SECTION ──
      let y = 180;
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(20, y, width - 40, 120);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, y, width - 40, 120);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("NO. PESANAN / RESI:", 50, y + 40);
      ctx.font = "900 42px monospace";
      ctx.fillText(`#${order.orderNumber}`, 50, y + 90);

      // Simulated barcode on right
      const barcodeX = width - 380;
      const barcodeY = y + 25;
      const barcodeW = 340;
      const barcodeH = 70;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(barcodeX, barcodeY, barcodeW, barcodeH);
      ctx.fillStyle = "#000000";
      // Draw pseudo-barcode stripes
      const codeStr = order.orderNumber.replace(/[^A-Za-z0-9]/g, "");
      for (let i = 0; i < 40; i++) {
        const stripeW = (i % 3 === 0 || i % 7 === 0) ? 6 : (i % 2 === 0 ? 3 : 2);
        const stripeX = barcodeX + 15 + i * 7.5;
        if (stripeX + stripeW < barcodeX + barcodeW - 15) {
          ctx.fillRect(stripeX, barcodeY + 8, stripeW, barcodeH - 16);
        }
      }

      // ── 3. RECIPIENT SECTION (PENERIMA - BIG & BOLD) ──
      y = 320;
      ctx.fillStyle = "#000000";
      ctx.fillRect(20, y, width - 40, 50);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("👤 PENERIMA (KEPADA)", 45, y + 35);

      y += 50;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(20, y, width - 40, 360);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, y, width - 40, 360);

      ctx.fillStyle = "#000000";
      ctx.font = "900 42px sans-serif";
      ctx.fillText(order.customerName, 50, y + 55);

      ctx.font = "bold 32px monospace";
      ctx.fillText(`📞 ${order.customerPhone}`, 50, y + 105);

      ctx.font = "24px sans-serif";
      // Multi-line address wrapping
      const addressWords = recipientAddress.split(" ");
      let line = "";
      let lineY = y + 155;
      for (let n = 0; n < addressWords.length; n++) {
        const testLine = line + addressWords[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > width - 120 && n > 0) {
          ctx.fillText(line, 50, lineY);
          line = addressWords[n] + " ";
          lineY += 36;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 50, lineY);

      if (customNotes) {
        ctx.font = "italic bold 22px sans-serif";
        ctx.fillStyle = "#b91c1c";
        ctx.fillText(`📌 Catatan: ${customNotes}`, 50, y + 325);
      }

      // ── 4. SENDER SECTION (PENGIRIM) ──
      y += 380;
      ctx.fillStyle = "#374151";
      ctx.fillRect(20, y, width - 40, 45);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("🏢 PENGIRIM (DARI)", 45, y + 32);

      y += 45;
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(20, y, width - 40, 160);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, y, width - 40, 160);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 30px sans-serif";
      ctx.fillText(senderName, 50, y + 45);

      ctx.font = "bold 24px monospace";
      ctx.fillText(`📞 ${senderPhone}`, 50, y + 85);

      ctx.font = "22px sans-serif";
      ctx.fillText(`📍 ${senderAddress}`, 50, y + 125);

      // ── 5. PACKAGE & STATUS INFO ──
      y += 180;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(20, y, width - 40, 220);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, y, width - 40, 220);

      // Left column: Items description
      ctx.fillStyle = "#000000";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("📦 ISI PAKET:", 50, y + 40);

      ctx.font = "22px sans-serif";
      // Wrap items text
      const itemWords = itemsText.split(" ");
      let itemLine = "";
      let itemLineY = y + 75;
      for (let n = 0; n < itemWords.length; n++) {
        const testLine = itemLine + itemWords[n] + " ";
        if (ctx.measureText(testLine).width > width - 480 && n > 0) {
          ctx.fillText(itemLine, 50, itemLineY);
          itemLine = itemWords[n] + " ";
          itemLineY += 32;
        } else {
          itemLine = testLine;
        }
      }
      ctx.fillText(itemLine, 50, itemLineY);

      ctx.font = "bold 22px sans-serif";
      ctx.fillText(`⚖️ Berat: ${packageWeight} | Qty: ${order.totalQuantity || 1} pcs`, 50, y + 175);

      // Right column: QR Code and NON-COD Badge
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise((res) => {
          qrImg.onload = res;
          qrImg.onerror = res;
        });
        ctx.drawImage(qrImg, width - 200, y + 20, 160, 160);
      }

      // NON-COD Badge box
      ctx.fillStyle = "#047857";
      ctx.fillRect(width - 420, y + 40, 200, 60);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NON-COD", width - 320, y + 78);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("LUNAS", width - 320, y + 130);
      ctx.textAlign = "left";

      // ── 6. FOOTER FRAGILE WARNING ──
      y += 240;
      ctx.fillStyle = "#fef2f2";
      ctx.fillRect(20, y, width - 40, 100);
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, y, width - 40, 100);

      ctx.fillStyle = "#dc2626";
      ctx.font = "900 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚠️ PERHATIAN: FRAGILE / JANGAN DIBANTING ⚠️", width / 2, y + 45);
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Barang Berharga & Akrilik Presisi - Hindari Tekanan Berat", width / 2, y + 75);
      ctx.textAlign = "left";

      // Trigger browser download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Label-Pengiriman-${order.orderNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showSuccessAlert(
        "Label Berhasil Didownload! 📥",
        `Gambar label pengiriman untuk pesanan #${order.orderNumber} telah tersimpan. Siap dicetak atau dikirim ke kurir!`
      );
    } catch (err) {
      console.error("Download label error:", err);
      showErrorAlert("Gagal Download", "Terjadi kesalahan saat membuat gambar label pengiriman.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-60 p-3 sm:p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[94vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* Hidden Canvas for High-Res PNG Generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Label Pengiriman Paket (Resi Tempel)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-semibold font-mono">
                  #{order.orderNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cetak atau download label siap tempel untuk ekspedisi (J&T, JNE, SiCepat, dll)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid (Left: Config, Right: Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
          {/* ── LEFT COLUMN: SETTINGS & QUICK ACTIONS ── */}
          <div className="lg:col-span-5 space-y-3.5 order-2 lg:order-1">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                <span>Pengaturan Ekspedisi & Paket</span>
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Pilih Ekspedisi</label>
                  <select
                    value={expedition}
                    onChange={(e) => setExpedition(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {EXPEDITION_LIST.map((exp) => (
                      <option key={exp} value={exp}>
                        {exp}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Layanan</label>
                  <input
                    type="text"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    placeholder="Reguler / Hemat / Cargo"
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Estimasi Berat</label>
                  <input
                    type="text"
                    value={packageWeight}
                    onChange={(e) => setPackageWeight(e.target.value)}
                    placeholder="Contoh: 0.5 kg"
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">No. Resi Kurir (Opsional)</label>
                  <input
                    type="text"
                    value={waybillNumber}
                    onChange={(e) => setWaybillNumber(e.target.value)}
                    placeholder="Misal: JX1234567890"
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Nama Pengirim (Toko)</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">No. HP Pengirim</label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Catatan Khusus Paket</label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Misal: FRAGILE / JANGAN DIBANTING"
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Quick Actions Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? "Membuat Gambar..." : "Download Gambar Label (PNG HD)"}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cetak Label</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCourierText}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{copiedText ? "Tersalin!" : "Salin Teks Kurir"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendToWhatsApp}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kirim Format Alamat via WhatsApp</span>
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN: THERMAL SHIPPING LABEL VISUAL PREVIEW ── */}
          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Preview Label Thermal (10 x 15 cm / A6)</span>
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                ✓ Siap Tempel di Paket
              </span>
            </div>

            {/* THE VISUAL SHIPPING LABEL CONTAINER (PRINTABLE) */}
            <div
              ref={labelRef}
              id="shipping-label-printable"
              className="w-full max-w-[420px] bg-white text-black p-4 sm:p-5 rounded-2xl shadow-2xl border-2 border-black font-sans leading-tight select-text"
            >
              {/* Top Header: Brand & Expedition */}
              <div className="flex items-center justify-between border-b-2 border-black pb-2.5 mb-2.5">
                <div className="min-w-0 pr-2">
                  <span className="font-black text-sm sm:text-base tracking-tight block uppercase">
                    {senderName}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Official Shipping Label
                  </span>
                </div>
                <div className="border-2 border-black px-3 py-1 rounded bg-black text-white text-center shrink-0">
                  <span className="font-black text-xs block uppercase tracking-wide">
                    {expedition}
                  </span>
                  <span className="text-[9px] font-semibold text-yellow-300 block">
                    {serviceType.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Order Barcode Box */}
              <div className="bg-slate-100 border-2 border-black p-2 rounded mb-2.5 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9px] font-bold text-slate-600 block uppercase">
                    Nomor Pesanan:
                  </span>
                  <span className="font-mono font-black text-base sm:text-lg text-black tracking-tight">
                    #{order.orderNumber}
                  </span>
                  {waybillNumber && (
                    <span className="text-[10px] font-mono font-bold text-slate-700 block">
                      Resi: {waybillNumber}
                    </span>
                  )}
                </div>

                {/* Simulated Barcode Stripes */}
                <div className="flex items-end gap-[2px] h-10 px-2 py-1 bg-white border border-slate-400 shrink-0">
                  {Array.from({ length: 28 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-black h-full"
                      style={{
                        width: idx % 4 === 0 ? "3px" : idx % 2 === 0 ? "1.5px" : "2px",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* PENERIMA (RECIPIENT) - BIG & PROMINENT */}
              <div className="border-2 border-black rounded p-2.5 mb-2.5 bg-white">
                <div className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider inline-block mb-1.5">
                  👤 KEPADA (PENERIMA)
                </div>
                <div className="font-black text-base text-black leading-tight">
                  {order.customerName}
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-black my-1">
                  📞 {order.customerPhone}
                </div>
                <div className="text-xs text-black font-medium leading-snug mt-1 pt-1 border-t border-dashed border-slate-300">
                  📍 {recipientAddress}
                </div>
                {customNotes && (
                  <div className="mt-1.5 p-1 bg-red-50 border border-red-200 rounded text-[10px] font-bold text-red-700">
                    📌 Catatan: {customNotes}
                  </div>
                )}
              </div>

              {/* PENGIRIM (SENDER) */}
              <div className="border border-slate-400 rounded p-2 mb-2.5 bg-slate-50 text-xs">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                  🏢 DARI (PENGIRIM):
                </span>
                <div className="font-bold text-black text-xs">{senderName}</div>
                <div className="font-mono text-[11px] text-slate-800">📞 {senderPhone}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{senderAddress}</div>
              </div>

              {/* PACKAGE INFO & QR CODE */}
              <div className="border-2 border-black rounded p-2 flex items-center justify-between gap-2 mb-2 bg-white">
                <div className="space-y-1 min-w-0">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    📦 ISI PAKET:
                  </span>
                  <div className="text-[11px] font-semibold text-black line-clamp-2">
                    {itemsText}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold pt-0.5">
                    <span>⚖️ Berat: {packageWeight}</span>
                    <span>•</span>
                    <span>Total: {order.totalQuantity || 1} pcs</span>
                  </div>
                </div>

                <div className="flex flex-col items-center shrink-0">
                  <div className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase mb-1 ${
                    (order.shippingFee && order.shippingFee > 0)
                      ? "bg-emerald-700 text-white"
                      : "bg-amber-600 text-white"
                  }`}>
                    {(order.shippingFee && order.shippingFee > 0) ? "ONGKIR: LUNAS" : "ONGKIR: DIBAYAR SENDIRI"}
                  </div>
                  {qrDataUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qrDataUrl}
                      alt="QR Lacak"
                      className="w-14 h-14 object-contain border border-black rounded"
                    />
                  )}
                  <span className="text-[8px] text-slate-500 font-mono mt-0.5">Scan Tracking</span>
                </div>
              </div>

              {/* Bottom Warning Banner */}
              <div className="border border-red-600 bg-red-50 text-red-700 text-center py-1 px-2 rounded text-[10px] font-black uppercase tracking-wider">
                ⚠️ FRAGILE / JANGAN DIBANTING - KARTU AKRILIK ⚠️
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Print Styles for Shipping Label */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #shipping-label-printable,
          #shipping-label-printable * {
            visibility: visible !important;
          }
          #shipping-label-printable {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100mm !important;
            max-width: 100mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
