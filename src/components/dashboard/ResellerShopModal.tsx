"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  Store,
  CreditCard,
  Building2,
  QrCode,
  Copy,
  Upload,
  Clock,
  ArrowRight,
  Send,
  AlertCircle,
  HelpCircle,
  Package,
  History,
  Tag,
  Loader2,
  Phone,
  Mail,
  User,
  MapPin,
  FileText,
  Crown,
  Truck,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";
import {
  getResellerProductsAction,
  createResellerOrderAction,
  getResellerOrdersAction,
} from "@/lib/actions/reseller-shop.actions";
import { ResellerProductModel, ResellerOrderModel, SiteSettingModel } from "@/types/models";

interface ResellerShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    fullName: string;
    email: string;
    whatsappNumber?: string | null;
  };
  siteSetting?: SiteSettingModel;
  vipOutletsCount?: number;
  claimedVipRewards?: number;
}

interface CartItem {
  product: ResellerProductModel;
  quantity: number;
}

export function ResellerShopModal({
  isOpen,
  onClose,
  user,
  siteSetting,
  vipOutletsCount = 0,
  claimedVipRewards = 0,
}: ResellerShopModalProps) {
  const [activeTab, setActiveTab] = useState<"CATALOG" | "CART" | "HISTORY">("CATALOG");
  const [products, setProducts] = useState<ResellerProductModel[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [myOrders, setMyOrders] = useState<ResellerOrderModel[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Form Pembeli / Pengiriman
  const [customerName, setCustomerName] = useState(user.fullName || "");
  const [customerPhone, setCustomerPhone] = useState(user.whatsappNumber || "");
  const [customerEmail, setCustomerEmail] = useState(user.email || "");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"MIDTRANS_QRIS" | "MANUAL_BANK_BNI">("MANUAL_BANK_BNI");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load products on open
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingProducts(true);
    getResellerProductsAction(true)
      .then((res) => {
        if (res.success && res.data) {
          setProducts(res.data as ResellerProductModel[]);
        }
      })
      .finally(() => setIsLoadingProducts(false));
  }, [isOpen]);

  // Load orders history when tab switches
  useEffect(() => {
    if (activeTab === "HISTORY" && isOpen) {
      setIsLoadingOrders(true);
      getResellerOrdersAction()
        .then((res) => {
          if (res.success && res.data) {
            setMyOrders(res.data as ResellerOrderModel[]);
          }
        })
        .finally(() => setIsLoadingOrders(false));
    }
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  // Cart Calculations
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // VIP Rewards calculation (hanya dari outlet yang membayar perpanjangan VIP)
  const vipDiscountPerCard = siteSetting?.resellerVipDiscountPerCard || 5000;
  const eligibleDiscountUnits = Math.max(0, vipOutletsCount - claimedVipRewards);
  const discountedCardsCount = Math.min(totalQuantity, eligibleDiscountUnits);
  const discountAmount = discountedCardsCount * vipDiscountPerCard;
  const shippingFee = 0; // Bebas ongkir untuk reseller (ongkir dibebankan / diurus sendiri oleh reseller)
  const finalTotalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

  const isMinOrderMet = totalQuantity >= 8;
  const missingQty = Math.max(0, 8 - totalQuantity);

  const bankName = siteSetting?.resellerBankName || "BNI";
  const accountNumber = siteSetting?.resellerAccountNumber || "1234567890";
  const accountName = siteSetting?.resellerAccountName || "Smart QR Review";

  // Cart handlers
  const handleAddToCart = (product: ResellerProductModel) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showErrorAlert("File Terlalu Besar", "Ukuran foto bukti transfer maksimal 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = (text: string, type: "bank" | "amount") => {
    navigator.clipboard.writeText(text);
    if (type === "bank") {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  // Helper load Midtrans Snap Script
  const ensureSnapScript = (isProd: boolean, clientKey: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("No window"));
      const scriptId = "midtrans-snap-script";
      const targetUrl = isProd
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

      const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (existingScript && existingScript.src === targetUrl && (window as any).snap) {
        return resolve((window as any).snap);
      }

      if (existingScript) existingScript.remove();

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = targetUrl;
      script.setAttribute("data-client-key", clientKey || "");
      script.async = true;
      script.onload = () => {
        if ((window as any).snap) {
          resolve((window as any).snap);
        } else {
          reject(new Error("Midtrans Snap object not available"));
        }
      };
      script.onerror = () => reject(new Error("Gagal memuat script Midtrans Snap"));
      document.body.appendChild(script);
    });
  };

  // Checkout submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrder) return;

    if (!isMinOrderMet) {
      showErrorAlert(
        "Minimal Order Belum Terpenuhi",
        `Minimal total pengambilan kartu adalah 8 pcs untuk mendapatkan harga reseller. Silakan tambahkan ${missingQty} pcs lagi.`
      );
      return;
    }

    const finalName = user.fullName?.trim() || customerName.trim() || "Mitra Reseller";
    const finalPhone = user.whatsappNumber?.trim() || customerPhone.trim() || "08123456789";
    const finalEmail = user.email?.trim() || customerEmail.trim() || "reseller@smartqr.id";

    if (paymentMethod === "MANUAL_BANK_BNI" && !receiptImage) {
      showErrorAlert(
        "Bukti Transfer Diperlukan",
        "Harap unggah / upload foto bukti struk transfer bank BNI Anda sebelum melanjutkan."
      );
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const res = await createResellerOrderAction({
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerName: finalName,
        customerPhone: finalPhone,
        customerEmail: finalEmail,
        shippingAddress: undefined,
        notes: notes.trim() || undefined,
        paymentMethod,
        receiptImageUrl: receiptImage || undefined,
      });

      if (!res.success || !res.order) {
        showErrorAlert("Gagal Membuat Pesanan", res.message || "Terjadi kesalahan saat memproses pesanan.");
        setIsSubmittingOrder(false);
        return;
      }

      // Handle Midtrans Snap Popup
      if (paymentMethod === "MIDTRANS_QRIS" && res.snapToken) {
        const clientKey = siteSetting?.midtransClientKey || "";
        const isProd = siteSetting?.midtransIsProduction || false;

        try {
          const snap = await ensureSnapScript(isProd, clientKey);
          snap.pay(res.snapToken, {
            onSuccess: () => {
              showSuccessAlert(
                "Pembayaran Berhasil! 🎉",
                `Pesanan #${res.order?.orderNumber} berhasil dibayar lunas via QRIS. Super Admin akan segera memproses pengiriman kuota/kartu fisik Anda.`
              );
              setCart([]);
              setReceiptImage(null);
              setActiveTab("HISTORY");
            },
            onPending: () => {
              showSuccessAlert(
                "Menunggu Pembayaran",
                `Pesanan #${res.order?.orderNumber} telah dibuat. Silakan selesaikan pembayaran QRIS Anda.`
              );
              setCart([]);
              setActiveTab("HISTORY");
            },
            onError: () => {
              showErrorAlert("Pembayaran Gagal", "Gagal memproses pembayaran via QRIS.");
            },
            onClose: () => {
              setActiveTab("HISTORY");
            },
          });
        } catch (snapErr) {
          console.error("Snap load error:", snapErr);
          showErrorAlert("Kesalahan Snap", "Gagal memuat popup pembayaran Midtrans.");
        }
      } else {
        // Manual BNI Transfer
        showSuccessAlert(
          "Pesanan Berhasil Dikirim! 📦",
          `Pesanan #${res.order.orderNumber} dengan total Rp ${finalTotalAmount.toLocaleString("id-ID")} berhasil masuk ke Super Admin. Bukti transfer Anda akan diverifikasi secepatnya.`
        );
        setCart([]);
        setReceiptImage(null);
        setActiveTab("HISTORY");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      showErrorAlert("Terjadi Kesalahan", "Gagal mengirim pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 truncate">
                <span>Katalog & Keranjang Belanja Reseller</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold shrink-0">
                  Reseller Store
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Pesan kartu fisik resmi & standee ulasan langsung dari Super Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Cart Counter Button */}
            <button
              onClick={() => setActiveTab("CART")}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Buka Keranjang Belanja"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              {totalQuantity > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {totalQuantity}
                </span>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab("CATALOG")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === "CATALOG"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Katalog Produk ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("CART")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === "CART"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Keranjang ({totalQuantity} item)</span>
          </button>

          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === "HISTORY"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Pesanan</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: PRODUCT CATALOG */}
          {activeTab === "CATALOG" && (
            <div className="space-y-4">
              {/* Promo Banner / Info Min Order */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-teal-950/40 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Ketentuan Harga Reseller & Mitra</h4>
                    <p className="text-xs text-slate-300">
                      Minimal total order adalah <strong className="text-emerald-400">8 pcs</strong>. Anda bisa mencampur berbagai varian ukuran kartu.
                    </p>
                  </div>
                </div>

                {vipOutletsCount > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Diskon VIP: Hemat Rp {(eligibleDiscountUnits * vipDiscountPerCard).toLocaleString("id-ID")}</span>
                  </div>
                )}
              </div>

              {isLoadingProducts ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  <span className="text-xs">Memuat katalog produk reseller...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Belum ada produk aktif di katalog</p>
                  <p className="text-xs text-slate-500">Super Admin sedang memperbarui daftar inventaris produk.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map((product) => {
                    const inCartItem = cart.find((i) => i.product.id === product.id);
                    const currentQty = inCartItem?.quantity || 0;

                    return (
                      <div
                        key={product.id}
                        className="bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 rounded-2xl overflow-hidden transition-all flex flex-col justify-between shadow-lg group"
                      >
                        <div>
                          {/* Image Thumbnail */}
                          <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                            {product.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900">
                                <QrCode className="w-12 h-12 mb-1" />
                                <span className="text-[11px]">Foto Produk Smart QR</span>
                              </div>
                            )}

                            <div className="absolute top-2.5 left-2.5">
                              <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-xs font-black">
                                Rp {product.price.toLocaleString("id-ID")}
                                <span className="text-[10px] font-normal text-slate-300">/{product.unit}</span>
                              </span>
                            </div>

                            <div className="absolute top-2.5 right-2.5">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/80 backdrop-blur-md text-white text-[10px] font-bold">
                                Min. {product.minOrder} {product.unit}
                              </span>
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="p-4 space-y-2">
                            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                              {product.name}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {product.description || "Kartu fisik premium Smart QR Review siap pakai."}
                            </p>
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="p-4 pt-0">
                          {currentQty > 0 ? (
                            <div className="flex items-center justify-between bg-slate-900 border border-emerald-500/30 rounded-xl p-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(product.id, -1)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Kurangi"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono font-bold text-sm text-white px-3">
                                {currentQty} {product.unit}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(product.id, 1)}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
                                title="Tambah"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs border border-slate-800 hover:border-emerald-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-400" />
                              <span>+ Tambah ke Keranjang</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SHOPPING CART & CHECKOUT */}
          {activeTab === "CART" && (
            <form onSubmit={handleCheckout} className="space-y-6">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Keranjang Belanja Masih Kosong</p>
                  <p className="text-xs text-slate-500 mb-4">Silakan pilih produk dari katalog terlebih dahulu.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("CATALOG")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Buka Katalog Produk
                  </button>
                </div>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Rincian Item Keranjang</span>
                      <span className="text-emerald-400 font-semibold">{totalQuantity} pcs total</span>
                    </h4>

                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-800">
                              {item.product.imageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                  <QrCode className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-white truncate">{item.product.name}</h5>
                              <p className="text-[11px] text-slate-400">
                                Rp {item.product.price.toLocaleString("id-ID")} x {item.quantity} {item.product.unit}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.product.id, -1)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono font-bold text-xs text-white px-2">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.product.id, 1)}
                                className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <span className="font-mono font-bold text-xs text-white min-w-[75px] text-right">
                              Rp {(item.product.price * item.quantity).toLocaleString("id-ID")}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Hapus item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Minimum Order Warning Banner */}
                    {!isMinOrderMet && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>
                          Minimal total pesanan adalah <strong className="text-white">8 pcs</strong> (saat ini {totalQuantity} pcs). Tambahkan <strong className="text-amber-200 font-bold">{missingQty} pcs</strong> lagi untuk checkout.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Akun Pemesan Reseller Terdaftar */}
                  <div className="p-4 sm:p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{user.fullName || "Mitra Reseller"}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                              Akun Terverifikasi
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {user.email} {user.whatsappNumber ? `• ${user.whatsappNumber}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80">
                      <label className="block text-slate-400 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Catatan Tambahan untuk Super Admin (Opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Misal: Mohon prioritaskan pengiriman sebelum hari Sabtu / catatan khusus"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Summary & Diskon VIP */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Subtotal Produk ({totalQuantity} pcs)</span>
                      <span className="font-mono font-bold text-slate-200">Rp {subtotal.toLocaleString("id-ID")}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" />
                          Potongan Reward Outlet VIP ({discountedCardsCount} kartu x Rp {vipDiscountPerCard.toLocaleString("id-ID")})
                        </span>
                        <span className="font-mono font-bold">- Rp {discountAmount.toLocaleString("id-ID")}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-indigo-400" />
                        Biaya Ongkir:
                      </span>
                      <span className="font-semibold text-emerald-400 text-xs">Rp 0 (Dibebankan / Diurus Sendiri)</span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                      <span className="font-bold text-white">Total Tagihan Pembayaran</span>
                      <span className="font-mono font-black text-lg text-emerald-400">
                        Rp {finalTotalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Metode Pembayaran */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Pilih Metode Pembayaran
                    </h4>

                    <div className={`grid ${siteSetting?.midtransEnabled !== false ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-2.5`}>
                      {/* Midtrans QRIS */}
                      {siteSetting?.midtransEnabled !== false && (
                        <div
                          onClick={() => setPaymentMethod("MIDTRANS_QRIS")}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                            paymentMethod === "MIDTRANS_QRIS"
                              ? "bg-indigo-950/40 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                            <QrCode className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">QRIS Otomatis (Midtrans)</span>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                INSTAN
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">GoPay, OVO, Dana, ShopeePay, BCA/Mandiri</p>
                          </div>
                        </div>
                      )}

                      {/* Manual Transfer BNI */}
                      <div
                        onClick={() => setPaymentMethod("MANUAL_BANK_BNI")}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          paymentMethod === "MANUAL_BANK_BNI"
                            ? "bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">Transfer Bank {bankName}</span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              MANUAL
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">Rekening Resmi Super Admin</p>
                        </div>
                      </div>
                    </div>

                    {/* Rincian Rekening BNI jika manual */}
                    {paymentMethod === "MANUAL_BANK_BNI" && (
                      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs animate-in fade-in">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span className="text-slate-400 font-semibold">Tujuan Transfer Bank Resmi:</span>
                          <span className="font-bold text-white">{bankName}</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Nomor Rekening ({bankName}):</span>
                            <span className="font-mono font-extrabold text-sm text-amber-300">{accountNumber}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">a.n {accountName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(accountNumber, "bank")}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          >
                            <Copy className="w-3 h-3 text-amber-400" />
                            <span>{copiedBank ? "Disalin!" : "Salin No. Rek"}</span>
                          </button>
                        </div>

                        {/* Upload Struk Bukti Transfer */}
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1.5">
                            Unggah Foto Bukti Transfer Struk BNI *
                          </label>

                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />

                          {receiptImage ? (
                            <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 p-2 bg-slate-900 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={receiptImage} alt="Bukti" className="w-12 h-12 object-cover rounded-lg shrink-0 border" />
                                <span className="text-xs text-emerald-400 font-semibold truncate">Foto Struk Siap Dikirim</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setReceiptImage(null)}
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-4 px-3 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Upload className="w-5 h-5 text-emerald-400" />
                              <span className="font-semibold text-xs text-slate-200">Klik untuk upload bukti struk transfer</span>
                              <span className="text-[10px] text-slate-500">JPG, PNG, WEBP (Maks 5MB)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingOrder || !isMinOrderMet}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingOrder ? (
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
                  </div>
                </>
              )}
            </form>
          )}

          {/* TAB 3: ORDER HISTORY */}
          {activeTab === "HISTORY" && (
            <div className="space-y-4">
              {isLoadingOrders ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  <span className="text-xs">Memuat riwayat pesanan Anda...</span>
                </div>
              ) : myOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <History className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Belum Ada Riwayat Pesanan</p>
                  <p className="text-xs text-slate-500 mb-4">Anda belum pernah melakukan pemesanan kartu.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("CATALOG")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Buka Katalog Produk
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders.map((order) => {
                    const isPaid = order.paymentStatus === "PAID";
                    const isPending = order.paymentStatus === "PENDING";
                    const isRejected = order.paymentStatus === "REJECTED";

                    return (
                      <div
                        key={order.id}
                        className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-all shadow-md"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-white">#{order.orderNumber}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isPaid
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                    : isPending
                                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                    : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                }`}
                              >
                                {isPaid ? "LUNAS / DITERIMA" : isPending ? "MENUNGGU VERIFIKASI" : "DITOLAK"}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {new Date(order.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-extrabold text-sm text-emerald-400 block">
                              Rp {order.totalAmount.toLocaleString("id-ID")}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              via {order.paymentMethod === "MIDTRANS_QRIS" ? "Midtrans QRIS" : "Transfer Bank BNI"}
                            </span>
                          </div>
                        </div>

                        {/* Item list */}
                        <div className="space-y-1.5">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs text-slate-300">
                              <span>
                                {item.productName} x <strong className="text-white">{item.quantity} pcs</strong>
                              </span>
                              <span className="font-mono text-slate-200">Rp {item.subtotal.toLocaleString("id-ID")}</span>
                            </div>
                          ))}
                        </div>

                        {/* Customer Info */}
                        <div className="p-2.5 bg-slate-900/60 rounded-xl text-[11px] text-slate-400 space-y-0.5 border border-slate-800">
                          <div>Penerima: <strong className="text-slate-200">{order.customerName}</strong> ({order.customerPhone})</div>
                          {order.shippingAddress && <div>Alamat: <span className="text-slate-300">{order.shippingAddress}</span></div>}
                          {order.notes && <div>Catatan: <span className="italic text-slate-300">{order.notes}</span></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
