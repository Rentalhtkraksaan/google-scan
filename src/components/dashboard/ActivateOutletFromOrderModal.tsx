"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Store,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Sparkles,
  Copy,
  Check,
  MessageCircle,
  Loader2,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { ResellerOrderModel } from "@/types/models";
import {
  getAvailableBlankCardsAction,
  activateRetailOrderAsOutletAction,
} from "@/lib/actions/reseller-shop.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";

interface ActivateOutletFromOrderModalProps {
  isOpen: boolean;
  order: ResellerOrderModel | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BlankCardItem {
  code: string;
  status: string;
  assignedAdminId?: string | null;
}

interface ActivationSuccessData {
  outletName: string;
  fullName: string;
  email: string;
  password?: string;
  whatsappNumber: string;
  cardCodes: string[];
  orderNumber: string;
  googleReviewUrl: string;
}

// Helper parsing notes like "[Outlet: Toko Berkah] [Maps/Review: https://maps.app.goo.gl/...]"
function parseOrderNotes(notes?: string | null) {
  if (!notes) return { outletName: "", googleMapsUrl: "", cleanNotes: "" };

  let outletName = "";
  let googleMapsUrl = "";

  const outletMatch = notes.match(/\[Outlet:\s*([^\]]+)\]/i);
  if (outletMatch) outletName = outletMatch[1].trim();

  const mapsMatch = notes.match(/\[Maps\/Review:\s*([^\]]+)\]/i);
  if (mapsMatch) googleMapsUrl = mapsMatch[1].trim();

  const cleanNotes = notes
    .replace(/\[Outlet:\s*[^\]]+\]/gi, "")
    .replace(/\[Maps\/Review:\s*[^\]]+\]/gi, "")
    .trim();

  return { outletName, googleMapsUrl, cleanNotes };
}

export function ActivateOutletFromOrderModal({
  isOpen,
  order,
  onClose,
  onSuccess,
}: ActivateOutletFromOrderModalProps) {
  const [blankCards, setBlankCards] = useState<BlankCardItem[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardSearch, setCardSearch] = useState("");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [manualCardCode, setManualCardCode] = useState("");

  // Form inputs
  const [outletName, setOutletName] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("Outlet123!");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success view state
  const [successData, setSuccessData] = useState<ActivationSuccessData | null>(null);
  const [copied, setCopied] = useState(false);

  // Already activated outlet detection
  const isAlreadyActivated = Boolean(order?.admin?.outlet);
  const existingOutlet = order?.admin?.outlet;

  // Load blank cards & prefill fields when order changes
  useEffect(() => {
    if (!isOpen || !order) return;

    setSuccessData(null);
    setCopied(false);
    setIsLoadingCards(true);

    const { outletName: parsedOutlet, googleMapsUrl: parsedMaps } = parseOrderNotes(order.notes);

    setOutletName(existingOutlet?.name || parsedOutlet || order.customerName || "");
    setGoogleReviewUrl(existingOutlet?.googleReviewUrl || parsedMaps || "");
    setFullName(order.admin?.fullName || order.customerName || "");
    setEmail(order.admin?.email || order.customerEmail || "");
    setPhone(order.admin?.whatsappNumber || order.customerPhone || "");
    setPassword("Outlet123!");

    if (existingOutlet?.qrCards && existingOutlet.qrCards.length > 0) {
      setSelectedCards(existingOutlet.qrCards.map((c) => c.code));
    } else {
      setSelectedCards([]);
    }

    getAvailableBlankCardsAction()
      .then((res) => {
        if (res.success && res.data) {
          setBlankCards(res.data as BlankCardItem[]);
          // Auto select cards matching quantity if not already selected
          if (!existingOutlet && selectedCards.length === 0) {
            const initialNeeded = order.totalQuantity || 1;
            const availableCodes = (res.data as BlankCardItem[]).map((c) => c.code);
            if (availableCodes.length >= initialNeeded) {
              setSelectedCards(availableCodes.slice(0, initialNeeded));
            }
          }
        }
      })
      .finally(() => setIsLoadingCards(false));
  }, [isOpen, order]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const targetQuantity = order?.totalQuantity || 1;

  const filteredBlankCards = useMemo(() => {
    if (!cardSearch.trim()) return blankCards;
    const q = cardSearch.toLowerCase().trim();
    return blankCards.filter((c) => c.code.toLowerCase().includes(q));
  }, [blankCards, cardSearch]);

  if (!isOpen || !order) return null;

  const handleToggleCard = (code: string) => {
    const clean = code.trim().toLowerCase();
    setSelectedCards((prev) => {
      if (prev.includes(clean)) {
        return prev.filter((c) => c !== clean);
      } else {
        return [...prev, clean];
      }
    });
  };

  const handleAutoSelectCards = () => {
    const needed = targetQuantity;
    const availableCodes = blankCards.map((c) => c.code.toLowerCase());
    const newSelection = availableCodes.slice(0, needed);
    setSelectedCards(newSelection);
    if (newSelection.length < needed) {
      showErrorAlert(
        "Stok Kartu Kurang",
        `Hanya tersedia ${newSelection.length} kartu kosong, sedangkan pesanan membutuhkan ${needed} kartu.`
      );
    }
  };

  const handleAddManualCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCardCode.trim()) return;
    const clean = manualCardCode.trim().toLowerCase();
    if (!selectedCards.includes(clean)) {
      setSelectedCards((prev) => [...prev, clean]);
    }
    setManualCardCode("");
  };

  const handleRemoveSelectedCard = (code: string) => {
    setSelectedCards((prev) => prev.filter((c) => c !== code));
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!outletName.trim()) {
      showErrorAlert("Validasi Gagal", "Nama Outlet / Usaha wajib diisi.");
      return;
    }
    if (!googleReviewUrl.trim()) {
      showErrorAlert("Validasi Gagal", "Link Google Maps / Review wajib diisi.");
      return;
    }
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      showErrorAlert("Validasi Gagal", "Nama Pemilik, Email, dan No. WhatsApp wajib diisi.");
      return;
    }
    if (selectedCards.length === 0) {
      showErrorAlert("Pilih Kartu Kosong", "Silakan pilih minimal 1 kartu kosong untuk dihubungkan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await activateRetailOrderAsOutletAction({
        orderId: order.id,
        cardCodes: selectedCards,
        outletName: outletName.trim(),
        googleReviewUrl: googleReviewUrl.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim() || "Outlet123!",
      });

      if (res.success && res.data) {
        setSuccessData(res.data as ActivationSuccessData);
        showSuccessAlert("Berhasil Diaktifkan!", res.message, 1500);
        onSuccess?.();
      } else {
        showErrorAlert("Gagal Mengaktifkan", res.message || "Terjadi kesalahan.");
      }
    } catch (err) {
      console.error("handleActivateSubmit error:", err);
      showErrorAlert("Kesalahan Server", "Gagal mengaktifkan akun outlet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper WhatsApp URL
  const getWaDispatchUrl = (data: ActivationSuccessData) => {
    let cleanWa = data.whatsappNumber?.replace(/[^0-9]/g, "") || "";
    if (cleanWa.startsWith("08")) cleanWa = "62" + cleanWa.slice(1);
    if (cleanWa.startsWith("8")) cleanWa = "62" + cleanWa;

    const message = `Halo *${data.fullName}*, selamat datang di kemitraan QR-INAJA 👋
Silakan login menggunakan:

Link : qr-inaja.vercel.app/login
Email: ${data.email}
Pw : ${data.password || "Outlet123!"}

Segera lakukan penggantian data untuk keamanan bersama, terimakasih.
Salam hangat`;

    return `https://wa.me/${cleanWa}?text=${encodeURIComponent(message)}`;
  };

  const handleCopyCredentials = (data: ActivationSuccessData) => {
    const portalUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : "https://qr-inaja.vercel.app/login";

    const text = `Detail Akun Portal Outlet:
Outlet: ${data.outletName}
Link Login: ${portalUrl}
Email: ${data.email}
Password: ${data.password || "Outlet123!"}
Kartu: ${data.cardCodes.join(", ")}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-60 p-3 sm:p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {isAlreadyActivated ? "Detail Akun Outlet" : "Aktifkan Akun Outlet & Pasang Kartu"}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-sky-400 font-mono text-xs font-bold border border-slate-700">
                  #{order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAlreadyActivated
                  ? "Pesanan ini sudah terhubung dengan akun outlet di bawah."
                  : `Hubungkan pesanan pembeli ini ke portal outlet & pasangkan ${targetQuantity} kartu kosong.`}
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

        {/* BODY */}
        {successData ? (
          /* SUCCESS SCREEN */
          <div className="py-6 space-y-5 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-lg font-extrabold text-white">Akun Outlet Berhasil Diaktifkan! ✨</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Akun portal outlet <strong className="text-emerald-400">{successData.outletName}</strong> telah
                dibuat dan siap digunakan beserta {successData.cardCodes.length} kartu fisik.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold text-slate-300">Rincian Akun Login Portal</span>
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(successData)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Tersalin!" : "Salin Rincian"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Nama Outlet</span>
                  <span className="font-bold text-white">{successData.outletName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Nama Pemilik</span>
                  <span className="font-semibold text-slate-200">{successData.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Email Login</span>
                  <span className="font-mono font-semibold text-sky-400 select-all">{successData.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Password Awal</span>
                  <span className="font-mono font-bold text-amber-400 select-all">{successData.password}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold mb-1.5">
                  Kartu Yang Terhubung ({successData.cardCodes.length} Pcs)
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {successData.cardCodes.map((code) => (
                    <span
                      key={code}
                      className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={getWaDispatchUrl(successData)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                <span>Kirim Akun ke WhatsApp Pembeli</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        ) : (
          /* FORM VIEW */
          <form onSubmit={handleActivateSubmit} className="space-y-5 my-4">
            {/* Section 1: Data Usaha & Akun Outlet */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                <Store className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                  1. Informasi Usaha & Login Portal
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Usaha / Toko / Outlet *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kopi Janji Kenangan, Barber King, dll"
                      value={outletName}
                      onChange={(e) => setOutletName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Link Google Maps / Google Review Usaha *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="https://maps.app.goo.gl/... atau https://g.page/r/..."
                      value={googleReviewUrl}
                      onChange={(e) => setGoogleReviewUrl(e.target.value)}
                      className="w-full pl-3 pr-20 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    {googleReviewUrl && (
                      <a
                        href={googleReviewUrl.startsWith("http") ? googleReviewUrl : `https://${googleReviewUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Tes Link</span>
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Pemilik / PIC *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nomor WhatsApp *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Login Portal *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password Akun Portal</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Pemasangan Kartu Kosong */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                    2. Pilih & Pasangkan Kartu Kosong ({selectedCards.length} / {targetQuantity} pcs)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoSelectCards}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Pilih otomatis kartu kosong sesuai jumlah pesanan"
                >
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>Pilih Otomatis {targetQuantity} Kartu</span>
                </button>
              </div>

              {/* Selected Cards Badge Strip */}
              {selectedCards.length > 0 ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Kartu yang akan dihubungkan ke outlet ini:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedCards.map((code) => (
                      <span
                        key={code}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-extrabold flex items-center gap-1.5"
                      >
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedCard(code)}
                          className="hover:text-rose-400 p-0.5 rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Belum ada kartu kosong yang dipilih. Silakan pilih kartu di bawah ini.</span>
                </div>
              )}

              {/* Search & Manual Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kode kartu (c-001)..."
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Input manual (misal: c-099)..."
                    value={manualCardCode}
                    onChange={(e) => setManualCardCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddManualCard(e)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualCard}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>
              </div>

              {/* Grid Available Blank Cards */}
              <div className="max-h-40 overflow-y-auto p-2 rounded-2xl bg-slate-950/70 border border-slate-800 custom-scrollbar">
                {isLoadingCards ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Memuat daftar kartu kosong...</span>
                  </div>
                ) : filteredBlankCards.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    {cardSearch ? "Tidak ada kartu yang cocok dengan pencarian." : "Tidak ada kartu kosong tersedia."}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filteredBlankCards.map((c) => {
                      const isSelected = selectedCards.includes(c.code.toLowerCase());
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleToggleCard(c.code)}
                          className={`p-2 rounded-xl text-xs font-mono font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-emerald-600/20 border-emerald-500/60 text-emerald-300 shadow-sm"
                              : "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300"
                          }`}
                        >
                          <span className="truncate">{c.code}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedCards.length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isAlreadyActivated ? "Simpan & Update Outlet" : "Aktifkan Akun & Hubungkan Kartu"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
