"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  Layers,
  CreditCard,
  Building2,
  QrCode,
  Copy,
  Upload,
  Clock,
  ArrowRight,
  Send,
  AlertCircle,
  Package,
  Loader2,
  Phone,
  Mail,
  User,
  MapPin,
  FileText,
  Truck,
  Check,
  ShieldCheck,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import {
  getResellerProductsAction,
  createResellerOrderAction,
} from "@/lib/actions/reseller-shop.actions";
import { ResellerProductModel, SiteSettingModel } from "@/types/models";

interface PublicResellerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSetting?: SiteSettingModel;
  onOpenTracking?: (orderNumber?: string) => void;
}

export function PublicResellerRegistrationModal({
  isOpen,
  onClose,
  siteSetting,
  onOpenTracking,
}: PublicResellerRegistrationModalProps) {
  const [products, setProducts] = useState<ResellerProductModel[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Cart Quantities state: map of productId -> quantity
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});

  // Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"MIDTRANS_QRIS" | "MANUAL_BANK_BNI">(
    siteSetting?.midtransEnabled === false ? "MANUAL_BANK_BNI" : "MIDTRANS_QRIS"
  );
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState("Memproses Pesanan...");
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper load Midtrans Snap Script
  const ensureSnapScript = (isProd: boolean, clientKey: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("No window"));
      const scriptId = "midtrans-snap-script";
      const targetUrl = isProd
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

      const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (existingScript && (window as any).snap) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return resolve((window as any).snap);
      }

      if (existingScript) existingScript.remove();

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = targetUrl;
      if (clientKey) {
        script.setAttribute("data-client-key", clientKey);
      }
      script.async = true;
      script.onload = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).snap) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          resolve((window as any).snap);
        } else {
          reject(new Error("Midtrans Snap object not available"));
        }
      };
      script.onerror = () => reject(new Error("Gagal memuat modul Midtrans Snap"));
      document.body.appendChild(script);
    });
  };

  // Preload Midtrans script when modal opens
  useEffect(() => {
    if (isOpen && siteSetting?.midtransEnabled !== false && typeof window !== "undefined") {
      const isProd = siteSetting?.midtransIsProduction ?? true;
      const clientKey = siteSetting?.midtransClientKey || "";
      ensureSnapScript(isProd, clientKey).catch(() => {});
    }
  }, [isOpen, siteSetting?.midtransClientKey, siteSetting?.midtransIsProduction, siteSetting?.midtransEnabled]);

  // Load products when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Reset screen state
    setCreatedOrderNumber(null);
    setIsSubmitting(false);

    if (siteSetting?.midtransEnabled === false) {
      setPaymentMethod("MANUAL_BANK_BNI");
    }

    let isMounted = true;
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const res = await getResellerProductsAction(true);
        if (isMounted && res.success && res.data) {
          const loadedProducts = res.data as ResellerProductModel[];
          setProducts(loadedProducts);
          // Only initialize default if user hasn't modified quantities
          if (loadedProducts.length > 0) {
            setCartQuantities((prev) => {
              const hasExisting = Object.values(prev).some((v) => Number(v) > 0);
              if (hasExisting) return prev;
              const initialMap: Record<string, number> = {};
              loadedProducts.forEach((p, index) => {
                initialMap[p.id] = index === 0 ? 8 : 0;
              });
              return initialMap;
            });
          }
        }
      } catch (err) {
        console.error("Gagal memuat produk:", err);
      } finally {
        if (isMounted) setIsLoadingProducts(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [isOpen, siteSetting?.midtransEnabled]);

  if (!isOpen) return null;

  // Cart calculations
  const totalQuantity = Object.values(cartQuantities).reduce((a, b) => a + (Number(b) || 0), 0);
  const subtotal = products.reduce((sum, p) => {
    const qty = Number(cartQuantities[p.id]) || 0;
    return sum + (p.price || 0) * qty;
  }, 0);

  const shippingFee = 0; // Bebas ongkir untuk reseller (ongkir dibebankan / diurus sendiri oleh reseller)
  const totalAmount = subtotal + shippingFee;
  const isMinOrderMet = totalQuantity >= 8;

  const handleQtyChange = (productId: string, delta: number) => {
    setCartQuantities((prev) => {
      const current = Number(prev[productId]) || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showErrorAlert("File Terlalu Besar", "Ukuran foto struk maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCopyBank = () => {
    const acc = siteSetting?.resellerAccountNumber || "1234567890";
    navigator.clipboard.writeText(acc);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      showErrorAlert("Data Diri Belum Lengkap", "Nama Lengkap, Nomor WhatsApp, dan Email wajib diisi.");
      return;
    }

    if (!shippingAddress.trim()) {
      showErrorAlert("Alamat Belum Diisi", "Alamat lengkap pengiriman wajib diisi untuk pengiriman paket kartu.");
      return;
    }

    if (!isMinOrderMet) {
      showErrorAlert("Minimal Pengambilan 8 Pcs", `Total kartu yang dipilih saat ini ${totalQuantity} pcs. Silakan tambah menjadi minimal 8 pcs.`);
      return;
    }

    if (paymentMethod === "MANUAL_BANK_BNI" && !receiptImage) {
      showErrorAlert("Bukti Transfer Belum Diupload", "Silakan unggah foto struk bukti transfer Bank BNI.");
      return;
    }

    const items = Object.entries(cartQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    setIsSubmitting(true);
    setSubmittingStatus(
      paymentMethod === "MIDTRANS_QRIS"
        ? "Sedang Menyiapkan QRIS Midtrans (Layar Terkunci)..."
        : "Sedang Mengirim Pesanan ke Server..."
    );

    try {
      const res = await createResellerOrderAction({
        items,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        shippingAddress: shippingAddress.trim(),
        notes: notes.trim() || undefined,
        paymentMethod,
        receiptImageUrl: receiptImage || undefined,
      });

      if (!res.success || !res.order) {
        showErrorAlert("Gagal Membuat Pesanan", res.message || "Terjadi kesalahan saat memproses pesanan.");
        setIsSubmitting(false);
        return;
      }

      setCreatedOrderNumber(res.order.orderNumber);

      // Jika Midtrans QRIS, panggil popup Snap Midtrans
      if (paymentMethod === "MIDTRANS_QRIS" && res.snapToken) {
        const isProd = siteSetting?.midtransIsProduction ?? true;
        const clientKey = siteSetting?.midtransClientKey || "";

        try {
          const snap = await ensureSnapScript(isProd, clientKey);
          setIsSubmitting(false);

          snap.pay(res.snapToken, {
            onSuccess: () => {
              showSuccessAlert("Pembayaran Berhasil! 🎉", "Pesanan Anda telah otomatis terverifikasi dan masuk ke antrean pengemasan.");
            },
            onPending: () => {
              showSuccessAlert("Menunggu Pembayaran", "Silakan selesaikan scan QRIS Anda di aplikasi mobile banking / e-wallet.");
            },
            onError: () => {
              showErrorAlert("Gagal Bayar", "Transaksi pembayaran QRIS gagal atau dibatalkan.");
            },
            onClose: () => {
              // User menutup popup midtrans
            },
          });
        } catch (snapErr) {
          console.error("Snap load error:", snapErr);
          setIsSubmitting(false);
          showErrorAlert("Kesalahan Midtrans", "Gagal memuat popup pembayaran Midtrans. Pesanan tetap tercatat.");
        }
      } else {
        setIsSubmitting(false);
        showSuccessAlert(
          "Pendaftaran Reseller Berhasil! 🎉",
          `Pesanan #${res.order.orderNumber} telah diterima. Super Admin akan segera memproses akun dan pengiriman kartu Anda.`
        );
      }
    } catch (err) {
      console.error("Checkout error:", err);
      showErrorAlert("Kesalahan Teknis", "Gagal menghubungkan ke server.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (!isSubmitting && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* FREEZE LOADING OVERLAY */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in rounded-3xl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-2xl shadow-emerald-500/20">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
            <h4 className="text-base sm:text-lg font-black text-white mb-1.5 tracking-tight">
              {paymentMethod === "MIDTRANS_QRIS" ? "Membuka QRIS Midtrans..." : "Mengirim Pesanan..."}
            </h4>
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
              {submittingStatus}
            </p>
            <div className="mt-4 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
              🔒 Layar terkunci otomatis untuk keamanan transaksi
            </div>
          </div>
        )}

        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Form Pendaftaran & Pesan Kartu</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Mitra Reseller
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Lengkapi data diri, tentukan jumlah kartu, dan pilih pembayaran
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {createdOrderNumber ? (
          /* View: Success Screen */
          <div className="py-8 text-center space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xl font-extrabold text-white">Pendaftaran & Pesanan Berhasil! 🎉</h4>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Terima kasih telah bergabung! Nomor pesanan Anda adalah:
              </p>
              <div className="inline-block px-4 py-2 bg-slate-950 border border-emerald-500/40 rounded-2xl font-mono text-base font-black text-emerald-400 mt-2">
                #{createdOrderNumber}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <Truck className="w-4 h-4 text-indigo-400" />
                <span>Langkah Selanjutnya:</span>
              </div>
              <ul className="text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Super Admin menerima pesanan Anda dan mengemas paket kartu.</li>
                <li>Super Admin akan membuatkan akun login <strong>Admin Lapangan</strong> untuk Anda.</li>
                <li>Anda dapat melacak status pengiriman kapan saja menggunakan nomor pesanan di atas.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTracking?.(createdOrderNumber);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>Lacak Status Pesanan</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* View: Registration & Shopping Form */
          <form onSubmit={handleCheckout} className="flex-1 overflow-y-auto space-y-5 pt-4 custom-scrollbar">
            {/* STEP 1: CUSTOMER DATA & DELIVERY ADDRESS FIRST */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-400" />
                  1. Isi Data Diri & Alamat Pengiriman
                </span>
                <span className="text-[11px] text-slate-400">Langkah 1 dari 3</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Nama Lengkap Pemesan *</label>
                  <div className="relative flex items-center">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Nomor WhatsApp Aktif *</label>
                  <div className="relative flex items-center">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Alamat Email (Untuk Akun Login Portal) *</label>
                  <div className="relative flex items-center">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Contoh: budi@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Alamat Lengkap Pengiriman Paket Kartu *</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <textarea
                      required
                      rows={2}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Contoh: Jl. Pahlawan No. 45, RT 02/03, Kel. Sukamaju, Kec. Cilincing, Jakarta Utara 14120"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none custom-scrollbar transition-colors"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-400">Catatan Tambahan untuk Admin (Opsional)</label>
                  <div className="relative flex items-center">
                    <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Titipkan ke satpam perumahan / mohon dikemas rapi"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: PRODUCT SELECTION & QUANTITY */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-400" />
                  2. Pilih Paket Kartu & Jumlah Pembelian (Min. 8 Pcs)
                </span>
                <span className="text-[11px] font-bold text-emerald-400">
                  Total: {totalQuantity} pcs {isMinOrderMet ? "✅" : "⚠️ (Kurang " + (8 - totalQuantity) + ")"}
                </span>
              </div>

              {isLoadingProducts ? (
                <div className="py-8 text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Memuat katalog kartu...</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {products.map((product) => {
                    const qty = cartQuantities[product.id] || 0;
                    return (
                      <div
                        key={product.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          qty > 0
                            ? "bg-slate-950 border-emerald-500/40 shadow-sm"
                            : "bg-slate-950/50 border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {product.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-800 shrink-0 shadow"
                            />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                              <Package className="w-6 h-6" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate">{product.name}</h4>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{product.description}</p>
                            <span className="text-xs sm:text-sm font-extrabold text-emerald-400 font-mono mt-1 block">
                              Rp {product.price.toLocaleString("id-ID")}
                              <span className="text-[10px] text-slate-500 font-normal"> / {product.unit}</span>
                            </span>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-end gap-2.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(product.id, -1)}
                            disabled={qty === 0}
                            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-30 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-bold font-mono text-sm text-white">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(product.id, 1)}
                            className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer transition-colors shadow"
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

            {/* STEP 3: PRICE SUMMARY & PAYMENT METHOD */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-400" />
                3. Ringkasan & Metode Pembayaran
              </span>

              {/* Price Summary Breakdown */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Subtotal Produk ({totalQuantity} pcs):</span>
                  <span className="font-mono font-semibold text-white">Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-indigo-400" />
                    Biaya Ongkir:
                  </span>
                  <span className="font-semibold text-emerald-400 text-xs">Rp 0 (Bebas Ongkir / Diurus Sendiri)</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase">Total Tagihan:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    Rp {totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className={`grid ${siteSetting?.midtransEnabled !== false ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-2.5`}>
                {siteSetting?.midtransEnabled !== false && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("MIDTRANS_QRIS")}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      paymentMethod === "MIDTRANS_QRIS"
                        ? "bg-indigo-950/50 border-indigo-500 text-white shadow-lg shadow-indigo-950/40"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">QRIS Instan (Midtrans)</span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                          OTOMATIS
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Scan GoPay, OVO, Dana, ShopeePay, BCA/Mandiri/BNI
                      </span>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPaymentMethod("MANUAL_BANK_BNI")}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    paymentMethod === "MANUAL_BANK_BNI"
                      ? "bg-amber-950/50 border-amber-500 text-white shadow-lg shadow-amber-950/40"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-white">Transfer Bank BNI (Manual)</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Kirim ke rekening BNI & lampirkan foto struk
                    </span>
                  </div>
                </button>
              </div>

              {/* BNI Transfer Account Detail Box */}
              {paymentMethod === "MANUAL_BANK_BNI" && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Nomor Rekening Tujuan</span>
                      <span className="text-sm font-extrabold text-white font-mono">
                        {siteSetting?.resellerAccountNumber || "1234567890"} (Bank {siteSetting?.resellerBankName || "BNI"})
                      </span>
                      <span className="text-[11px] text-slate-300 block">
                        a/n {siteSetting?.resellerAccountName || "Smart QR Review"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyBank}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedBank ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedBank ? "Tersalin!" : "Salin Rekening"}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-amber-500/20">
                    <label className="text-[11px] font-bold text-amber-300 block mb-1">
                      Upload Struk / Bukti Transfer BNI *
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-dashed border-amber-500/40 text-amber-300 text-xs font-medium flex items-center justify-center gap-2 hover:bg-slate-850 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{receiptImage ? "Ganti Foto Struk Bukti Bayar" : "Pilih Foto Struk Bukti Bayar"}</span>
                    </button>
                    {receiptImage && (
                      <span className="text-[11px] text-emerald-400 font-medium block mt-1">
                        ✓ Foto struk siap dikirim
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isMinOrderMet}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Transaksi...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Lanjutkan Pembayaran (Rp {totalAmount.toLocaleString("id-ID")})</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
