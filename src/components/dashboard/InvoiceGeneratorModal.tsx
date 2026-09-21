"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  FileText,
  Download,
  Plus,
  Trash2,
  Share2,
  Printer,
  Sparkles,
  Store,
  CheckCircle2,
  Clock,
  RefreshCw,
  Copy,
  Receipt,
  Check,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

export interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  discount: number;
  paymentStatus: "LUNAS" | "DP";
  downPaymentAmount: number;
  paymentMethod: string;
  notes: string;
}

interface InvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSetting?: {
    whatsappNumber?: string;
    dashboardLogoUrl?: string | null;
  };
  outlets?: { id: string; name: string }[];
}

const PRESET_PRODUCTS = [
  { name: "Standee Akrilik A5 + QR Smart NFC", price: 75000 },
  { name: "Standee Akrilik A6 + QR Smart NFC", price: 50000 },
  { name: "Kartu PVC Smart QR Review", price: 35000 },
  { name: "Standee Kayu Akrilik Mini Meja", price: 45000 },
  { name: "Paket Standee Akrilik Meja (5 Pcs)", price: 250000 },
  { name: "Paket Standee Akrilik Meja (10 Pcs)", price: 450000 },
];

const PATENT_ADDRESS = "Jl. Kampung Madura RT 02 RW 03, Kraksaan Wetan, Probolinggo";

export function InvoiceGeneratorModal({
  isOpen,
  onClose,
  siteSetting,
  outlets = [],
}: InvoiceGeneratorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"FORM" | "PREVIEW">("FORM");
  const [copiedWA, setCopiedWA] = useState(false);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"LUNAS" | "DP">("LUNAS");
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Transfer Bank (BCA / Mandiri / BRI / QRIS)");
  const [notes, setNotes] = useState(
    "Barang siap cetak dan dikirim. Terima kasih atas kepercayaan Anda memesan kartu & standee Smart QR Review."
  );
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "item-1",
      name: "Standee Akrilik A5 + QR Smart NFC",
      qty: 2,
      price: 75000,
    },
  ]);

  // Inisialisasi No Invoice & Tanggal default
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const randomCode = Math.floor(1000 + Math.random() * 9000);

      setOrderDate(`${yyyy}-${mm}-${dd}`);
      setInvoiceNumber(`INV-${yyyy}${mm}${dd}-${randomCode}`);
    }
  }, [isOpen]);

  // Kalkulasi Total
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const paidAmount = paymentStatus === "LUNAS" ? grandTotal : Math.min(downPaymentAmount, grandTotal);
  const remainingAmount = Math.max(0, grandTotal - paidAmount);

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return "Rp " + (Number(val) || 0).toLocaleString("id-ID");
  };

  // Format Tanggal Indo
  const formatDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Tambah baris barang
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: "",
        qty: 1,
        price: 0,
      },
    ]);
  };

  // Hapus baris barang
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      showErrorAlert("Minimal 1 Barang", "Invoice harus memiliki minimal satu rincian pesanan.");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update baris barang
  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Preset Produk Cepat
  const handleApplyPreset = (preset: { name: string; price: number }) => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: preset.name,
        qty: 1,
        price: preset.price,
      },
    ]);
  };

  // Pilih dari Outlet Terdaftar
  const handleSelectOutlet = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const found = outlets.find((o) => o.id === selectedId);
    if (found) {
      setCustomerName(found.name);
    }
  };

  // Render Canvas to High-Res Image (JPG)
  const drawInvoiceCanvas = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");

      // Resolusi tinggi 2x Retina (Width 1200px)
      const width = 1200;
      const baseHeight = 1580;
      const extraHeight = Math.max(0, (items.length - 2) * 55);
      const height = baseHeight + extraHeight;

      canvas.width = width;
      canvas.height = height;

      // 1. Background Bersih Putih
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // 2. Top Header Elegant Accent Bar (Gradient Emerald/Navy)
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(0.5, "#1e293b");
      grad.addColorStop(1, "#059669");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, 18);

      // 3. Logo & Brand Title (Top Left)
      const padX = 70;
      let curY = 70;

      // Logo Icon Box
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(padX, curY, 68, 68, 16);
      ctx.fill();

      // Golden Star icon on logo
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 34px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⭐", padX + 34, curY + 46);

      // Brand Title & Tagline
      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 26px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("SMART QR REVIEW", padX + 86, curY + 30);

      ctx.fillStyle = "#059669";
      ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("OFFICIAL BUSINESS SOLUTION", padX + 86, curY + 48);

      // Alamat Paten (Wajib Sesuai Permintaan)
      ctx.fillStyle = "#334155";
      ctx.font = "bold 13.5px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(PATENT_ADDRESS, padX, curY + 102);

      const contactWa = siteSetting?.whatsappNumber || "0812-3456-7890";
      ctx.fillStyle = "#64748b";
      ctx.font = "13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(`WhatsApp Admin: +${contactWa.replace(/[^0-9]/g, "")}`, padX, curY + 124);

      // 4. INVOICE Title & Meta (Top Right)
      ctx.textAlign = "right";
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 40px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("INVOICE", width - padX, curY + 36);

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("NO. TRANSAKSI:", width - padX, curY + 64);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px 'Courier New', monospace";
      ctx.fillText(invoiceNumber || "INV-2026-001", width - padX, curY + 84);

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("TANGGAL PEMESANAN:", width - padX, curY + 108);

      ctx.fillStyle = "#0f172a";
      ctx.font = "600 15px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(formatDateIndo(orderDate), width - padX, curY + 126);

      // 5. Divider Line
      curY += 155;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padX, curY);
      ctx.lineTo(width - padX, curY);
      ctx.stroke();

      // 6. Customer & Payment Info Cards (Two Columns)
      curY += 25;
      const colWidth = (width - padX * 2 - 30) / 2;

      // Box Kiri: DITUJUKAN KEPADA (Pelanggan)
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(padX, curY, colWidth, 120, 14);
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("DITUJUKAN KEPADA (PEMESAN):", padX + 20, curY + 28);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 19px 'Segoe UI', Arial, sans-serif";
      const printName = customerName.trim() || "Nama Pemesan Umum";
      ctx.fillText(printName.slice(0, 35), padX + 20, curY + 56);

      ctx.fillStyle = "#475569";
      ctx.font = "14px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(`No. WA / HP : ${customerPhone.trim() || "-"}`, padX + 20, curY + 82);

      // Box Kanan: STATUS PEMBAYARAN
      const colRightX = padX + colWidth + 30;
      ctx.fillStyle = paymentStatus === "LUNAS" ? "#ecfdf5" : "#fffbeb";
      ctx.beginPath();
      ctx.roundRect(colRightX, curY, colWidth, 120, 14);
      ctx.fill();
      ctx.strokeStyle = paymentStatus === "LUNAS" ? "#a7f3d0" : "#fde68a";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = paymentStatus === "LUNAS" ? "#065f46" : "#92400e";
      ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("STATUS PEMBAYARAN:", colRightX + 20, curY + 28);

      // Status Badge
      ctx.font = "900 24px 'Segoe UI', Arial, sans-serif";
      if (paymentStatus === "LUNAS") {
        ctx.fillStyle = "#059669";
        ctx.fillText("✅ LUNAS (PAID)", colRightX + 20, curY + 60);
        ctx.fillStyle = "#047857";
        ctx.font = "13px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`Metode: ${paymentMethod}`, colRightX + 20, curY + 86);
      } else {
        ctx.fillStyle = "#d97706";
        ctx.fillText("⏳ UANG MUKA (DP)", colRightX + 20, curY + 60);
        ctx.fillStyle = "#b45309";
        ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(
          `DP: ${formatRupiah(paidAmount)} (Sisa: ${formatRupiah(remainingAmount)})`,
          colRightX + 20,
          curY + 86
        );
      }

      // 7. Tabel Daftar Barang / Pesanan
      curY += 150;
      const tableX = padX;
      const tableWidth = width - padX * 2;
      const tableHeaderH = 42;

      // Table Header Background
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(tableX, curY, tableWidth, tableHeaderH, 10);
      ctx.fill();

      // Header Columns
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 12.5px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NO", tableX + 35, curY + 26);

      ctx.textAlign = "left";
      ctx.fillText("JENIS PESANAN / RINCIAN BARANG", tableX + 85, curY + 26);

      ctx.textAlign = "center";
      ctx.fillText("QTY", tableX + tableWidth - 320, curY + 26);

      ctx.textAlign = "right";
      ctx.fillText("HARGA SATUAN", tableX + tableWidth - 160, curY + 26);
      ctx.fillText("TOTAL", tableX + tableWidth - 25, curY + 26);

      // Table Rows
      curY += tableHeaderH + 6;
      const rowHeight = 48;

      items.forEach((item, idx) => {
        const isEven = idx % 2 === 0;
        ctx.fillStyle = isEven ? "#f8fafc" : "#ffffff";
        ctx.beginPath();
        ctx.roundRect(tableX, curY, tableWidth, rowHeight, 6);
        ctx.fill();

        ctx.strokeStyle = "#f1f5f9";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Row Text
        ctx.fillStyle = "#64748b";
        ctx.font = "600 13px 'Segoe UI', Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(idx + 1), tableX + 35, curY + 30);

        ctx.textAlign = "left";
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText((item.name || "Pesanan Khusus").slice(0, 50), tableX + 85, curY + 30);

        ctx.textAlign = "center";
        ctx.fillStyle = "#334155";
        ctx.font = "600 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(String(item.qty), tableX + tableWidth - 320, curY + 30);

        ctx.textAlign = "right";
        ctx.fillStyle = "#475569";
        ctx.font = "14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(formatRupiah(item.price), tableX + tableWidth - 160, curY + 30);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(formatRupiah(item.qty * item.price), tableX + tableWidth - 25, curY + 30);

        curY += rowHeight + 4;
      });

      // 8. Bagian Perhitungan & Ringkasan Total
      curY += 20;
      const summaryCardW = 440;
      const summaryCardX = width - padX - summaryCardW;

      // Card Total Ringkasan
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(summaryCardX, curY, summaryCardW, 230, 16);
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      let sumY = curY + 32;

      // Subtotal
      ctx.textAlign = "left";
      ctx.fillStyle = "#64748b";
      ctx.font = "600 14px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Subtotal Pesanan :", summaryCardX + 25, sumY);
      ctx.textAlign = "right";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(formatRupiah(subtotal), summaryCardX + summaryCardW - 25, sumY);

      // Diskon (jika ada)
      if (discount > 0) {
        sumY += 28;
        ctx.textAlign = "left";
        ctx.fillStyle = "#10b981";
        ctx.font = "600 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText("Potongan Diskon :", summaryCardX + 25, sumY);
        ctx.textAlign = "right";
        ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(`- ${formatRupiah(discount)}`, summaryCardX + summaryCardW - 25, sumY);
      }

      // Total Tagihan Akhir
      sumY += 34;
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(summaryCardX + 25, sumY - 14);
      ctx.lineTo(summaryCardX + summaryCardW - 25, sumY - 14);
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 17px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("TOTAL TAGIHAN :", summaryCardX + 25, sumY + 4);
      ctx.textAlign = "right";
      ctx.fillStyle = "#059669";
      ctx.font = "900 22px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(formatRupiah(grandTotal), summaryCardX + summaryCardW - 25, sumY + 4);

      // Pembayaran (Lunas / DP)
      sumY += 36;
      ctx.textAlign = "left";
      ctx.fillStyle = "#475569";
      ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(
        paymentStatus === "LUNAS" ? "Sudah Dibayar (Lunas) :" : "Uang Muka (DP Dibayar) :",
        summaryCardX + 25,
        sumY
      );
      ctx.textAlign = "right";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(formatRupiah(paidAmount), summaryCardX + summaryCardW - 25, sumY);

      // Sisa Tagihan (Khusus jika DP)
      if (paymentStatus === "DP") {
        sumY += 34;
        ctx.fillStyle = "#fef2f2";
        ctx.beginPath();
        ctx.roundRect(summaryCardX + 15, sumY - 20, summaryCardW - 30, 36, 8);
        ctx.fill();
        ctx.strokeStyle = "#fecaca";
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.fillStyle = "#dc2626";
        ctx.font = "900 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillText("SISA KEKURANGAN :", summaryCardX + 25, sumY + 4);
        ctx.textAlign = "right";
        ctx.font = "900 17px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(formatRupiah(remainingAmount), summaryCardX + summaryCardW - 25, sumY + 4);
      }

      // 9. Catatan & Rekening Transfer (Sebelah Kiri)
      const notesX = padX;
      const notesW = width - padX * 2 - summaryCardW - 35;
      let notesY = curY;

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(notesX, notesY, notesW, 230, 16);
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("CATATAN & INSTRUKSI PEMBAYARAN:", notesX + 20, notesY + 28);

      ctx.fillStyle = "#475569";
      ctx.font = "12.5px 'Segoe UI', Arial, sans-serif";
      // Wrap text notes
      const words = notes.split(" ");
      let line = "";
      let lineY = notesY + 54;
      for (const w of words) {
        const testLine = line + w + " ";
        if (ctx.measureText(testLine).width > notesW - 40) {
          ctx.fillText(line, notesX + 20, lineY);
          line = w + " ";
          lineY += 20;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, notesX + 20, lineY);

      // Rekening Info
      lineY = Math.max(lineY + 30, notesY + 120);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("REKENING RESMI:", notesX + 20, lineY);

      ctx.fillStyle = "#0369a1";
      ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("BCA : 0885172288 a/n Smart Review", notesX + 20, lineY + 22);

      ctx.fillStyle = "#64748b";
      ctx.font = "11.5px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Konfirmasi transfer via WhatsApp pengelola.", notesX + 20, lineY + 42);

      // 10. Tanda Tangan & Cap Resmi
      curY += 260;
      ctx.textAlign = "right";
      ctx.fillStyle = "#334155";
      ctx.font = "13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(`Kraksaan, ${formatDateIndo(orderDate)}`, width - padX - 40, curY + 20);

      ctx.fillStyle = "#64748b";
      ctx.font = "12px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Hormat Kami,", width - padX - 70, curY + 40);

      // Cap Stempel Bulat
      const stampX = width - padX - 110;
      const stampY = curY + 80;

      ctx.save();
      ctx.translate(stampX, stampY);
      ctx.rotate(-0.15); // Slightly rotated stamp
      ctx.strokeStyle = paymentStatus === "LUNAS" ? "#059669" : "#d97706";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = paymentStatus === "LUNAS" ? "#059669" : "#d97706";
      ctx.font = "900 13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(paymentStatus === "LUNAS" ? "VERIFIED" : "OFFICIAL", 0, -12);
      ctx.font = "900 16px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(paymentStatus === "LUNAS" ? "LUNAS" : "DP VALID", 0, 8);
      ctx.font = "bold 10px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("SMART REVIEW", 0, 24);
      ctx.restore();

      ctx.textAlign = "right";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
      ctx.fillText("Management Smart QR", width - padX - 40, curY + 140);

      // 11. Footer Line & Thanks
      curY += 170;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX, curY);
      ctx.lineTo(width - padX, curY);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(
        "Terima kasih atas kerja sama Anda bersama Smart QR Review Platform Nusantara",
        width / 2,
        curY + 25
      );

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(
        `Alamat: ${PATENT_ADDRESS} • CS WA: +${contactWa.replace(/[^0-9]/g, "")}`,
        width / 2,
        curY + 44
      );

      // Export as JPG Data URL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      resolve(dataUrl);
    });
  }, [
    items,
    invoiceNumber,
    orderDate,
    customerName,
    customerPhone,
    discount,
    paymentStatus,
    paidAmount,
    grandTotal,
    remainingAmount,
    paymentMethod,
    notes,
    siteSetting,
    subtotal,
  ]);

  // Update preview saat form berubah atau tab berubah
  useEffect(() => {
    if (isOpen) {
      drawInvoiceCanvas().then((url) => setPreviewDataUrl(url));
    }
  }, [isOpen, drawInvoiceCanvas]);

  // Download Invoice as JPG
  const handleDownloadJpg = async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await drawInvoiceCanvas();
      if (!dataUrl) {
        showErrorAlert("Gagal", "Gagal memproses gambar invoice.");
        return;
      }

      const cleanCustomer = (customerName.trim() || "Pelanggan").replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Invoice-${invoiceNumber}-${cleanCustomer}.jpg`;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccessAlert(
        "Invoice Berhasil Diunduh! 📄",
        `File ${filename} format JPG berkualitas tinggi telah tersimpan di perangkat Anda.`,
        2600
      );
    } catch (err) {
      console.error(err);
      showErrorAlert("Gagal Download", "Terjadi kesalahan saat mengunduh invoice.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Salin & Kirim WhatsApp Summary
  const handleShareToWhatsApp = () => {
    let cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }

    const itemListText = items
      .map((item, idx) => `${idx + 1}. ${item.name} (${item.qty}x) = ${formatRupiah(item.qty * item.price)}`)
      .join("\n");

    const statusText =
      paymentStatus === "LUNAS"
        ? "✅ *LUNAS (PAID)*"
        : `⏳ *DP (UANG MUKA)*: ${formatRupiah(paidAmount)}\n*Sisa Tagihan*: ${formatRupiah(remainingAmount)}`;

    const waText =
`*INVOICE PEMESANAN SMART QR REVIEW*
----------------------------------------
No. Invoice: ${invoiceNumber}
Tanggal: ${formatDateIndo(orderDate)}
Kepada Yth: *${customerName || "Pelanggan"}*
No. WhatsApp: ${customerPhone || "-"}

*RINCIAN PESANAN:*
${itemListText}
----------------------------------------
*Total Tagihan*: ${formatRupiah(grandTotal)}
*Status Pembayaran*: ${statusText}

*Alamat Workshop & Pengiriman:*
${PATENT_ADDRESS}

${notes}

_Invoice resmi format JPG resolusi tinggi telah kami lampirkan. Terima kasih atas pesanan Anda!_`;

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

    window.open(waUrl, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Cetak Invoice Penjualan
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Khusus Super Admin (SA 1 & SA 2)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Alamat Paten: <strong className="text-slate-200">{PATENT_ADDRESS}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab("FORM")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "FORM"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Form Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("PREVIEW")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "PREVIEW"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Preview JPG
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === "FORM" ? (
            <div className="space-y-6">
              {/* Row 1: Nomor, Tanggal & Autocomplete Outlet */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nomor Invoice
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-20260921-001"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tanggal Pemesanan
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Pilih Dari Outlet Mitra (Opsional)
                  </label>
                  <select
                    onChange={handleSelectOutlet}
                    defaultValue=""
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Ambil Nama Outlet Terdaftar --
                    </option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Customer Name & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Pemesan / Nama Usaha <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Budi Santoso / Cafe Senja"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nomor WhatsApp Pemesan
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Preset Produk Cepat */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  ⚡ Tambah Cepat Dari Preset Produk:
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_PRODUCTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>{p.name}</span>
                      <span className="font-bold text-amber-400">({formatRupiah(p.price)})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Rincian Barang / Items Table */}
              <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/40">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Rincian Barang & Jenis Pesanan
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 sm:gap-3 items-center p-2.5 rounded-xl bg-slate-900 border border-slate-800"
                    >
                      <div className="col-span-1 text-center font-bold text-xs text-slate-500">
                        #{idx + 1}
                      </div>
                      <div className="col-span-11 sm:col-span-5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, "name", e.target.value)}
                          placeholder="Nama Barang / Standee Akrilik"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "qty", Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white text-center focus:outline-none focus:border-indigo-500"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-3">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={item.price}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "price", Math.max(0, parseInt(e.target.value) || 0))
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white text-right focus:outline-none focus:border-indigo-500 font-mono"
                          placeholder="Harga Satuan"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 5: Status Pembayaran (LUNAS / DP) & Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Kolom Kiri: Status Pembayaran */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Status & Cara Pembayaran
                  </h4>

                  {/* Toggle Lunas / DP */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus("LUNAS")}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        paymentStatus === "LUNAS"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>LUNAS (PAID)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentStatus("DP");
                        if (downPaymentAmount === 0) {
                          setDownPaymentAmount(Math.round(grandTotal / 2));
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        paymentStatus === "DP"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>DP (UANG MUKA)</span>
                    </button>
                  </div>

                  {/* Input Jumlah DP jika status = DP */}
                  {paymentStatus === "DP" && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in">
                      <label className="block text-xs font-bold text-amber-300">
                        Jumlah DP yang Dibayarkan (Rp) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={downPaymentAmount}
                        onChange={(e) =>
                          setDownPaymentAmount(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-xl text-sm font-bold text-amber-300 focus:outline-none font-mono"
                        placeholder="Contoh: 100000"
                      />
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400">Sisa Tagihan Pelunasan:</span>
                        <strong className="text-rose-400 font-mono font-bold text-sm">
                          {formatRupiah(remainingAmount)}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Diskon */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Potongan Diskon (Rp, Opsional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* Metode Pembayaran */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Metode Pembayaran
                    </label>
                    <input
                      type="text"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="Transfer BCA / Mandiri / Tunai"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Kolom Kanan: Rangkuman Total */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                      Rangkuman Tagihan
                    </h4>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal Barang:</span>
                        <span className="font-mono font-bold text-slate-200">{formatRupiah(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Diskon:</span>
                          <span className="font-mono font-bold">- {formatRupiah(discount)}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black text-white">
                        <span>TOTAL AKHIR:</span>
                        <span className="text-base text-emerald-400 font-mono">{formatRupiah(grandTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300 pt-1">
                        <span>Dibayar ({paymentStatus}):</span>
                        <span className="font-mono font-bold">{formatRupiah(paidAmount)}</span>
                      </div>
                      {paymentStatus === "DP" && (
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex justify-between text-rose-300 font-bold text-xs">
                          <span>Sisa Kekurangan:</span>
                          <span className="font-mono">{formatRupiah(remainingAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Catatan / Keterangan */}
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Catatan Tambahan untuk Pemesan:
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB PREVIEW JPG */
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-full flex items-center justify-between px-2">
                <span className="text-xs text-slate-400">
                  Pratinjau Hasil Cetak Invoice JPG Resolusi Tinggi (Siap Diunduh ke HP/Laptop)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    drawInvoiceCanvas().then((url) => setPreviewDataUrl(url));
                  }}
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Pratinjau</span>
                </button>
              </div>

              {previewDataUrl ? (
                <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-white">
                  <img
                    src={previewDataUrl}
                    alt="Pratinjau Invoice JPG"
                    className="w-full h-auto block"
                  />
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500">
                  Sedang memuat pratinjau invoice...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 hidden sm:block">
            Invoice tersimpan dalam format gambar <strong className="text-white">JPG</strong> resolusi tinggi.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Tombol Kirim Rincian ke WhatsApp */}
            <button
              type="button"
              onClick={handleShareToWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
              title="Kirim rincian invoice ke WhatsApp pemesan"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>Kirim ke WA</span>
            </button>

            {/* Tombol Download JPG Utama */}
            <button
              type="button"
              onClick={handleDownloadJpg}
              disabled={isGenerating || !customerName.trim()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? "Memproses JPG..." : "Download Invoice (JPG) 📥"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
