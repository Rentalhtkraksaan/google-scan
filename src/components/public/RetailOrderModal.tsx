"use client";

import { useState, useEffect } from "react";
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Building2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Truck,
  Tag,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { getResellerProductsAction, createRetailOrderAction } from "@/lib/actions/reseller-shop.actions";
import { validateAffiliateReferralCodeAction } from "@/lib/actions/affiliate.actions";
import { ResellerProductModel, SiteSettingModel } from "@/types/models";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface RetailOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSetting?: SiteSettingModel;
  onOpenTracking?: (orderNumber?: string) => void;
  defaultReferralCode?: string;
}

export function RetailOrderModal({
  isOpen,
  onClose,
  siteSetting,
  onOpenTracking,
  defaultReferralCode = "",
}: RetailOrderModalProps) {
  const [products, setProducts] = useState<ResellerProductModel[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Customer form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [province, setProvince] = useState("Jawa Timur");
  const [notes, setNotes] = useState("");

  // Referral code state
  const [referralCode, setReferralCode] = useState(defaultReferralCode);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [referralStatus, setReferralStatus] = useState<{
    valid: boolean;
    affiliateName?: string;
    code?: string;
    discount?: number;
    message?: string;
  } | null>(null);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"MIDTRANS_QRIS" | "MANUAL_BANK_BNI">("MIDTRANS_QRIS");
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // Success state
  const [orderSuccessData, setOrderSuccessData] = useState<{
    orderNumber: string;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    affiliateCode?: string | null;
  } | null>(null);

  // Load products & Snap JS
  useEffect(() => {
    if (!isOpen) return;

    // Reset success
    setOrderSuccessData(null);

    const loadData = async () => {
      setIsLoadingProducts(true);
      try {
        const res = await getResellerProductsAction(true);
        if (res.success && res.data && res.data.length > 0) {
          setProducts(res.data as ResellerProductModel[]);
          // Default: 1 pcs pada produk pertama
          const initialQty: Record<string, number> = {};
          res.data.forEach((p, idx) => {
            initialQty[p.id] = idx === 0 ? 1 : 0;
          });
          setQuantities(initialQty);
        }
      } catch (err) {
        console.error("Gagal memuat produk eceran:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadData();

    // Check default referral code from URL/props
    if (defaultReferralCode.trim()) {
      handleValidateReferral(defaultReferralCode.trim());
    }

    // Load Midtrans Snap JS dynamically if not present
    const snapScriptId = "midtrans-snap-sdk";
    if (!document.getElementById(snapScriptId)) {
      const isProduction = siteSetting?.midtransIsProduction ?? false;
      const snapUrl = isProduction
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";
      const clientKey = siteSetting?.midtransClientKey || "";

      const script = document.createElement("script");
      script.id = snapScriptId;
      script.src = snapUrl;
      if (clientKey) script.setAttribute("data-client-key", clientKey);
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isOpen, siteSetting, defaultReferralCode]);

  if (!isOpen) return null;

  // Qty helpers
  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const totalQuantity = Object.values(quantities).reduce((a, b) => a + b, 0);

  // Calculations
  const calculatedSubtotal = products.reduce((sum, p) => {
    const qty = quantities[p.id] || 0;
    const itemPrice = p.retailPrice || p.price;
    return sum + itemPrice * qty;
  }, 0);

  // Shipping Calculation:
  // Base ongkir Jatim = 15.000, Luar Jawa = 35.000 (configurable via SiteSetting)
  const isJatim = province === "Jawa Timur";
  const baseShippingFee = isJatim
    ? (siteSetting?.resellerShippingFee ?? 15000)
    : 35000;

  // Referral discount on shipping up to 10k
  const shippingDiscount = (referralStatus?.valid && isJatim)
    ? (referralStatus.discount ?? (siteSetting?.affiliateShippingDiscount ?? 10000))
    : 0;

  const finalShippingFee = Math.max(0, baseShippingFee - shippingDiscount);
  const finalTotalAmount = calculatedSubtotal + finalShippingFee;

  // Referral validator
  const handleValidateReferral = async (customCode?: string) => {
    const codeToValidate = customCode || referralCode;
    if (!codeToValidate.trim()) {
      setReferralStatus(null);
      return;
    }

    setIsValidatingCode(true);
    try {
      const res = await validateAffiliateReferralCodeAction(codeToValidate.trim());
      if (res.success && res.affiliate) {
        setReferralStatus({
          valid: true,
          affiliateName: res.affiliate.fullName,
          code: res.affiliate.referralCode,
          discount: res.discountAmount || 10000,
          message: res.message,
        });
      } else {
        setReferralStatus({
          valid: false,
          message: res.message || "Kode referral tidak valid atau sudah tidak aktif.",
        });
      }
    } catch {
      setReferralStatus({
        valid: false,
        message: "Terjadi kesalahan saat memeriksa kode referral.",
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleCopyBankNumber = () => {
    const bniNumber = siteSetting?.manualBniAccountNumber || "1826435348";
    navigator.clipboard.writeText(bniNumber);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalQuantity < 1) {
      alert("Pilih minimal 1 pcs produk kartu ulasan.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      alert("Nama, No. WhatsApp, dan Email wajib diisi dengan lengkap.");
      return;
    }

    if (!shippingAddress.trim()) {
      alert("Alamat pengiriman wajib diisi untuk pengiriman paket.");
      return;
    }

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({ productId, quantity: qty }));

    setIsSubmitting(true);

    try {
      const res = await createRetailOrderAction({
        items,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        shippingAddress: shippingAddress.trim(),
        province,
        affiliateCode: referralStatus?.valid ? referralStatus.code : undefined,
        notes: notes.trim(),
        paymentMethod,
        receiptImageUrl: receiptImageUrl.trim() || undefined,
      });

      if (!res.success || !res.order) {
        alert(res.message || "Gagal membuat pesanan.");
        setIsSubmitting(false);
        return;
      }

      const orderData = res.order;
      const snapToken = res.snapToken || orderData.midtransSnapToken;

      // If Midtrans QRIS and snapToken available, open popup
      if (paymentMethod === "MIDTRANS_QRIS" && snapToken && window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: () => {
            setOrderSuccessData({
              orderNumber: orderData.orderNumber,
              totalAmount: orderData.totalAmount,
              paymentMethod: "MIDTRANS_QRIS",
              paymentStatus: "PAID",
              affiliateCode: orderData.affiliateCode,
            });
            setIsSubmitting(false);
          },
          onPending: () => {
            setOrderSuccessData({
              orderNumber: orderData.orderNumber,
              totalAmount: orderData.totalAmount,
              paymentMethod: "MIDTRANS_QRIS",
              paymentStatus: "PENDING",
              affiliateCode: orderData.affiliateCode,
            });
            setIsSubmitting(false);
          },
          onError: () => {
            alert("Pembayaran Midtrans gagal atau dibatalkan. Anda dapat mengulangi pembayaran.");
            setIsSubmitting(false);
          },
          onClose: () => {
            setOrderSuccessData({
              orderNumber: orderData.orderNumber,
              totalAmount: orderData.totalAmount,
              paymentMethod: "MIDTRANS_QRIS",
              paymentStatus: "PENDING",
              affiliateCode: orderData.affiliateCode,
            });
            setIsSubmitting(false);
          },
        });
      } else {
        // Bank transfer manual or fallback
        setOrderSuccessData({
          orderNumber: orderData.orderNumber,
          totalAmount: orderData.totalAmount,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          affiliateCode: orderData.affiliateCode,
        });
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Submit order error:", err);
      alert("Terjadi kesalahan saat memproses pesanan.");
      setIsSubmitting(false);
    }
  };

  const bniNumber = siteSetting?.manualBniAccountNumber || "1826435348";
  const bniHolder = siteSetting?.manualBniAccountHolder || "PT SMART REVIEW DIGITAL";
  const adminWa = siteSetting?.whatsappNumber || "6281234567890";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 p-2 sm:p-4 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Pesan Kartu Smart QR Review
              </h3>
              <p className="text-xs text-slate-400">
                Pesan satuan (mulai 1 pcs) atau jumlah banyak untuk outlet Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── SUCCESS SCREEN ── */}
        {orderSuccessData ? (
          <div className="py-6 space-y-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Pesanan Berhasil Dibuat
              </span>
              <h4 className="text-2xl font-black text-white">
                Kode Pesanan:{" "}
                <span className="font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/30">
                  {orderSuccessData.orderNumber}
                </span>
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Simpan kode 6 karakter di atas untuk melacak status pengiriman dan nomor resi paket Anda kapan saja.
              </p>
            </div>

            {/* Payment Info Card */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl max-w-md mx-auto text-left space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="text-slate-400">Total Pembayaran:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-sm">
                  Rp {orderSuccessData.totalAmount.toLocaleString("id-ID")}
                </span>
              </div>

              {orderSuccessData.paymentMethod === "MANUAL_BANK_BNI" && (
                <div className="space-y-2 text-xs">
                  <span className="text-slate-400 block font-semibold">Tujuan Transfer Bank BNI:</span>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-sm text-amber-400">{bniNumber}</span>
                      <span className="text-[11px] text-slate-400 block">a.n. {bniHolder}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyBankNumber}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{copiedBank ? "Tersalin" : "Salin"}</span>
                    </button>
                  </div>
                </div>
              )}

              {orderSuccessData.affiliateCode && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Referral terpasang: <strong>{orderSuccessData.affiliateCode}</strong> (Diskon Ongkir Rp 10.000 Aktif)</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenTracking) onOpenTracking(orderSuccessData.orderNumber);
                }}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>Lacak Pesanan Ini</span>
              </button>

              <a
                href={
                  `https://wa.me/${adminWa}?text=` +
                  encodeURIComponent(
                    `Halo Admin Smart QR, saya sudah membuat pesanan dengan Nomor #${orderSuccessData.orderNumber}. Total: Rp ${orderSuccessData.totalAmount.toLocaleString("id-ID")}. Mohon konfirmasi proses pengiriman.`
                  )
                }
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Konfirmasi via WhatsApp</span>
              </a>
            </div>
          </div>
        ) : (
          /* ── ORDER FORM ── */
          <form onSubmit={handleSubmitOrder} className="pt-4 space-y-5 flex-1">
            {/* 1. Pilih Produk & Jumlah */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>1. Pilih Varian Produk (Min. 1 pcs)</span>
                <span className="text-[11px] font-mono text-indigo-400">Total: {totalQuantity} pcs</span>
              </label>

              {isLoadingProducts ? (
                <div className="py-6 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
                  <span className="text-xs text-slate-400">Memuat katalog kartu...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map((p) => {
                    const qty = quantities[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          qty > 0
                            ? "bg-indigo-950/30 border-indigo-500/40 shadow-sm"
                            : "bg-slate-950/60 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {p.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                              <Sparkles className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-white truncate">{p.name}</h4>
                            <span className="font-mono font-bold text-xs text-amber-400">
                              Rp {(p.retailPrice || p.price).toLocaleString("id-ID")}{" "}
                              <span className="text-[10px] text-slate-400 font-normal">/{p.unit}</span>
                            </span>
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2 shrink-0 bg-slate-900 border border-slate-800 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(p.id, -1)}
                            disabled={qty === 0}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-xs text-white">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(p.id, 1)}
                            className="p-1 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Referral Code Input */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Kode Referral Affiliate (Diskon Ongkir Max 10rb)</span>
                </label>
                {referralStatus?.valid && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Aktif
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value.toUpperCase());
                    setReferralStatus(null);
                  }}
                  placeholder="Contoh: REF123 / KODE AFFILIATE..."
                  className="flex-1 px-3 py-2 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none uppercase font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleValidateReferral()}
                  disabled={isValidatingCode || !referralCode.trim()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {isValidatingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Terapkan</span>
                </button>
              </div>

              {referralStatus && (
                <div
                  className={`text-[11px] p-2 rounded-xl flex items-center gap-1.5 ${
                    referralStatus.valid
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  {referralStatus.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{referralStatus.message}</span>
                </div>
              )}
            </div>

            {/* 3. Data Penerima & Pengiriman */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                2. Data Penerima & Alamat Pengiriman
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nama Lengkap / Nama Outlet *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Budi Santoso (Warung Berkah)"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">No. WhatsApp Aktif *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">Email Aktif *</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Contoh: budi@gmail.com"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Provinsi Wilayah Pengiriman *</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="Jawa Timur">Jawa Timur (Subsidi Ongkir 10rb)</option>
                    <option value="Jawa Tengah">Jawa Tengah / DIY</option>
                    <option value="Jawa Barat / DKI">Jawa Barat / DKI Jakarta / Banten</option>
                    <option value="Luar Jawa">Luar Pulau Jawa</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Warna, nomor meja, dll"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">Alamat Pengiriman Lengkap *</label>
                  <textarea
                    required
                    rows={2}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten, Kode Pos"
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Metode Pembayaran */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                3. Pilih Metode Pembayaran
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("MIDTRANS_QRIS")}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    paymentMethod === "MIDTRANS_QRIS"
                      ? "bg-indigo-950/40 border-indigo-500 shadow-md"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">Midtrans QRIS Instan</span>
                    <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                      GoPay, OVO, Dana, ShopeePay & Seluruh M-Banking
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("MANUAL_BANK_BNI")}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    paymentMethod === "MANUAL_BANK_BNI"
                      ? "bg-amber-950/40 border-amber-500 shadow-md"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">Transfer Manual BNI</span>
                    <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                      Verifikasi manual rekening BNI resmi
                    </span>
                  </div>
                </button>
              </div>

              {/* BNI Details info if selected */}
              {paymentMethod === "MANUAL_BANK_BNI" && (
                <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Nomor Rekening BNI:</span>
                      <span className="font-mono font-bold text-sm text-amber-400">{bniNumber}</span>
                      <span className="text-[11px] text-slate-400 block">a.n. {bniHolder}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyBankNumber}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{copiedBank ? "Tersalin" : "Salin"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Summary Total */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Subtotal Produk ({totalQuantity} pcs):</span>
                <span className="font-mono text-white font-semibold">
                  Rp {calculatedSubtotal.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ongkos Kirim ({province}):</span>
                <span className="font-mono text-white font-semibold">
                  Rp {baseShippingFee.toLocaleString("id-ID")}
                </span>
              </div>

              {shippingDiscount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Subsidi Ongkir Referral:
                  </span>
                  <span className="font-mono font-bold">
                    -Rp {shippingDiscount.toLocaleString("id-ID")}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                <span className="font-bold text-white">Total Pembayaran:</span>
                <span className="font-mono font-black text-lg text-emerald-400">
                  Rp {finalTotalAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || totalQuantity < 1}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Pesanan...</span>
                </>
              ) : (
                <>
                  <span>Bayar Sekarang (Rp {finalTotalAmount.toLocaleString("id-ID")})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
