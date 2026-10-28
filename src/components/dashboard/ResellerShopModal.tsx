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
  ArrowLeft,
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
  ShieldCheck,
  Check,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import {
  getResellerProductsAction,
  createResellerOrderAction,
  getResellerOrdersAction,
} from "@/lib/actions/reseller-shop.actions";
import { validateAffiliateReferralCodeAction } from "@/lib/actions/affiliate.actions";
import { ResellerProductModel, ResellerOrderModel, SiteSettingModel } from "@/types/models";
import { ShippingLabelModal } from "./ShippingLabelModal";

// Pattern deteksi injeksi skrip, tag PHP, dan fungsi berbahaya
const DANGEROUS_PHP_PATTERNS = /(<\?php|<\?=|<\?|\?>|<script|eval\s*\(|base64_decode|system\s*\(|shell_exec|exec\s*\(|passthru|phpinfo|\$_GET|\$_POST|\$_REQUEST|\$_SERVER|\.php\b|\.phtml\b)/i;

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
  const [submittingStatus, setSubmittingStatus] = useState("Memproses Pesanan...");

  // Step Wizard State: 1 = Form 1 (Data Diri & Alamat), 2 = Form 2 (Rincian Paket Kartu), 3 = Form 3 (Pembayaran)
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);

  // Form Pembeli / Pengiriman
  const [customerName, setCustomerName] = useState(user.fullName || "");
  const [customerPhone, setCustomerPhone] = useState(user.whatsappNumber || "");
  const [customerEmail, setCustomerEmail] = useState(user.email || "");
  const [province, setProvince] = useState<string>("Jawa Timur & Bali (Ongkir Ditanggung Pembeli)");
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [referralStatus, setReferralStatus] = useState<{
    valid: boolean;
    affiliateName?: string;
    code?: string;
    message?: string;
  } | null>(null);

  // Ambil Alamat dari Koordinat via OpenStreetMap Nominatim
  const fetchAddressFromCoords = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
        { headers: { "Accept-Language": "id" } }
      );
      if (!response.ok) return "";
      const data = await response.json();
      if (data.address) {
        const addr = data.address;
        const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || "";
        const village = addr.village || addr.subdistrict || addr.city_district || "";
        const city = addr.city || addr.town || addr.county || "";
        const state = addr.state || "";
        const post = addr.postcode ? ` ${addr.postcode}` : "";
        const parts = [road, village, city, state].filter(Boolean);
        return parts.join(", ") + post;
      }
      return data.display_name || "";
    } catch {
      return "";
    }
  };

  // Fallback Geolocation dari Jaringan IP jika GPS browser ditolak atau tidak didukung
  const fetchLocationFromIP = async (): Promise<{ address: string } | null> => {
    try {
      const res = await fetch("https://ipwho.is/");
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          if (data.latitude && data.longitude) {
            const nominatimAddr = await fetchAddressFromCoords(data.latitude, data.longitude);
            if (nominatimAddr) {
              return { address: nominatimAddr };
            }
          }
          const parts = [data.city, data.region, data.country].filter(Boolean);
          const post = data.postal ? ` ${data.postal}` : "";
          return { address: parts.join(", ") + post };
        }
      }
    } catch (e) {
      console.warn("ipwho fallback error:", e);
    }

    try {
      const res2 = await fetch("https://ipapi.co/json/");
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.city) {
          const parts = [data2.city, data2.region, data2.country_name].filter(Boolean);
          const post = data2.postal ? ` ${data2.postal}` : "";
          return { address: parts.join(", ") + post };
        }
      }
    } catch (e2) {
      console.warn("ipapi fallback error:", e2);
    }
    return null;
  };

  // Ambil Lokasi Saat Ini (GPS Akurat dengan Fallback Otomatis ke Jaringan IP)
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);

    const applyAddress = (rawAddress: string, source: "GPS" | "IP") => {
      const trimmed = rawAddress.slice(0, 150).trim();
      setShippingAddress(trimmed);
      if (source === "GPS") {
        showSuccessAlert(
          "Lokasi GPS Berhasil Terdeteksi 📍",
          `Alamat otomatis diisi: "${trimmed}". Anda dapat melengkapi nomor jalan/rumah.`
        );
      } else {
        showSuccessAlert(
          "Lokasi Berhasil Terdeteksi 🌐",
          `Alamat otomatis diisi: "${trimmed}". (Terdeteksi dari jaringan/sinyal. Silakan lengkapi nomor jalan jika perlu)`
        );
      }
    };

    const tryIpFallback = async () => {
      try {
        const ipResult = await fetchLocationFromIP();
        if (ipResult && ipResult.address) {
          applyAddress(ipResult.address, "IP");
          return;
        }
      } catch (err) {
        console.error("IP fallback error:", err);
      }
      showErrorAlert(
        "Akses Lokasi Diblokir Browser 🔒",
        "Browser atau perangkat memblokir izin lokasi. Silakan klik ikon gembok 🔒 di address bar browser untuk 'Izinkan Lokasi', atau ketik alamat secara manual."
      );
    };

    if (typeof window === "undefined" || !navigator.geolocation) {
      await tryIpFallback();
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const address = await fetchAddressFromCoords(latitude, longitude);
          if (address) {
            applyAddress(address, "GPS");
          } else {
            await tryIpFallback();
          }
        } catch {
          await tryIpFallback();
        } finally {
          setIsLocating(false);
        }
      },
      async (error) => {
        console.warn("Geolocation GPS error:", error.code, error.message);
        // Jika izin lokasi ditolak browser/perangkat atau timeout, langsung gunakan fallback IP agar pengguna tidak gagal!
        await tryIpFallback();
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  };

  // Safe input handlers anti-PHP & batas panjang karakter
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (DANGEROUS_PHP_PATTERNS.test(val)) {
      showErrorAlert("Input Ditolak ⚠️", "Nama tidak boleh mengandung format skrip atau kode PHP berbahaya.");
      return;
    }
    setCustomerName(val.replace(/<[^>]*>?/gm, "").slice(0, 50));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerPhone(e.target.value.replace(/[^0-9+]/g, "").slice(0, 16));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (DANGEROUS_PHP_PATTERNS.test(val)) {
      showErrorAlert("Input Ditolak ⚠️", "Email tidak boleh mengandung format skrip atau kode PHP berbahaya.");
      return;
    }
    setCustomerEmail(val.replace(/<[^>]*>?/gm, "").slice(0, 50));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (DANGEROUS_PHP_PATTERNS.test(val)) {
      showErrorAlert("Input Ditolak ⚠️", "Alamat tidak boleh mengandung format skrip atau kode PHP berbahaya.");
      return;
    }
    setShippingAddress(val.replace(/<[^>]*>?/gm, "").slice(0, 150));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (DANGEROUS_PHP_PATTERNS.test(val)) {
      showErrorAlert("Input Ditolak ⚠️", "Catatan tidak boleh mengandung format skrip atau kode PHP berbahaya.");
      return;
    }
    setNotes(val.replace(/<[^>]*>?/gm, "").slice(0, 50));
  };

  const handleReferralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase().slice(0, 12);
    setReferralCode(val);
    if (referralStatus) setReferralStatus(null);
  };

  const handleValidateReferralCode = async () => {
    if (!referralCode.trim()) return;
    setIsValidatingReferral(true);
    try {
      const res = await validateAffiliateReferralCodeAction(referralCode.trim());
      if (res.success && res.affiliate) {
        setReferralStatus({
          valid: true,
          affiliateName: res.affiliate.fullName,
          code: res.affiliate.referralCode,
          message: `Kode referral "${res.affiliate.referralCode}" aktif! Mitra affiliate ${res.affiliate.fullName} menerima komisi kemitraan (50% rate).`,
        });
      } else {
        setReferralStatus({
          valid: false,
          message: res.message || "Kode referral affiliate tidak ditemukan.",
        });
      }
    } catch {
      setReferralStatus({
        valid: false,
        message: "Gagal memverifikasi kode referral.",
      });
    } finally {
      setIsValidatingReferral(false);
    }
  };

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<"MIDTRANS_QRIS" | "MANUAL_BANK_BNI">(
    siteSetting?.midtransEnabled === false ? "MANUAL_BANK_BNI" : "MIDTRANS_QRIS"
  );
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [shippingLabelOrder, setShippingLabelOrder] = useState<ResellerOrderModel | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      script.onerror = () => reject(new Error("Gagal memuat script Midtrans Snap"));
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

  // Load products on open
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingProducts(true);
    if (siteSetting?.midtransEnabled === false) {
      setPaymentMethod("MANUAL_BANK_BNI");
    }
    getResellerProductsAction(true)
      .then((res) => {
        if (res.success && res.data) {
          setProducts(res.data as ResellerProductModel[]);
        }
      })
      .finally(() => setIsLoadingProducts(false));
  }, [isOpen, siteSetting?.midtransEnabled]);

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

  // Bank Info from SiteSetting
  const bankName = siteSetting?.resellerBankName || "BNI";
  const accountNumber = siteSetting?.resellerAccountNumber || "1234567890";
  const accountName = siteSetting?.resellerAccountName || "Smart QR Review";

  // Calculations
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Kuota diskon VIP yang tersedia: Total outlet VIP terdaftar dikurangi yang sudah pernah diklaim
  const availableVipDiscountsCount = Math.max(0, vipOutletsCount - claimedVipRewards);
  const vipDiscountPerCard = siteSetting?.resellerVipDiscountPerCard || 5000;
  // Diskon diterapkan ke kartu yang dibeli hingga batas kuota diskon VIP yang tersedia
  const discountedCardsCount = Math.min(totalQuantity, availableVipDiscountsCount);
  const discountAmount = discountedCardsCount * vipDiscountPerCard;

  const minOrder = siteSetting?.resellerMinOrder ?? 2;
  const packingFee = 5000;

  // Shipping Calculation:
  // Pengiriman untuk pesanan reseller sepenuhnya ditanggung oleh pembeli (Rp 0 di web / COD)
  const shippingFee = 0;
  const baseShippingFee = 0;
  // Biaya Layanan / Admin 11% dihitung dari (Subtotal Produk + Biaya Packing) sesuai Opsi B
  const adminFee = Math.round((subtotal + packingFee) * 0.11);
  const finalTotalAmount = Math.max(0, subtotal - discountAmount + shippingFee + packingFee + adminFee);

  // Minimal order reseller adalah minOrder pcs total
  const isMinOrderMet = totalQuantity >= minOrder;
  const missingQty = Math.max(0, minOrder - totalQuantity);

  // Helper Cart
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
    setActiveTab("CART");
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showErrorAlert("File Terlalu Besar", "Ukuran gambar bukti transfer maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptImage(event.target?.result as string);
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

  // Step 1 Validator
  const validateStep1 = () => {
    const finalName = user.fullName?.trim() || customerName.trim();
    const finalPhone = user.whatsappNumber?.trim() || customerPhone.trim();
    const finalEmail = user.email?.trim() || customerEmail.trim();

    if (
      DANGEROUS_PHP_PATTERNS.test(finalName) ||
      DANGEROUS_PHP_PATTERNS.test(finalPhone) ||
      DANGEROUS_PHP_PATTERNS.test(finalEmail) ||
      DANGEROUS_PHP_PATTERNS.test(shippingAddress) ||
      DANGEROUS_PHP_PATTERNS.test(notes) ||
      DANGEROUS_PHP_PATTERNS.test(referralCode)
    ) {
      showErrorAlert("Input Ditolak ⚠️", "Data yang dimasukkan mengandung format skrip atau kode PHP berbahaya yang dilarang.");
      return false;
    }

    if (!finalName || !finalPhone || !finalEmail) {
      showErrorAlert("Data Diri Belum Lengkap", "Nama Lengkap, Nomor WhatsApp, dan Email wajib diisi.");
      return false;
    }
    if (!shippingAddress.trim()) {
      showErrorAlert("Alamat Pengiriman Belum Diisi", "Alamat pengiriman wajib diisi (ketik manual atau klik Ambil Lokasi GPS).");
      return false;
    }
    return true;
  };

  // Step 2 Validator
  const validateStep2 = () => {
    if (cart.length === 0) {
      showErrorAlert("Keranjang Kosong", "Silakan pilih minimal 1 produk kartu dari katalog terlebih dahulu.");
      return false;
    }
    if (!isMinOrderMet) {
      showErrorAlert(
        "Minimal Order Belum Terpenuhi",
        `Minimal total pengambilan kartu adalah ${minOrder} pcs untuk mendapatkan harga reseller. Silakan tambahkan ${missingQty} pcs lagi pada Form 2.`
      );
      return false;
    }
    return true;
  };

  // Checkout submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrder) return;

    const finalName = user.fullName?.trim() || customerName.trim() || "Mitra Reseller";
    const finalPhone = user.whatsappNumber?.trim() || customerPhone.trim() || "08123456789";
    const finalEmail = user.email?.trim() || customerEmail.trim() || "reseller@smartqr.id";

    if (
      DANGEROUS_PHP_PATTERNS.test(finalName) ||
      DANGEROUS_PHP_PATTERNS.test(finalPhone) ||
      DANGEROUS_PHP_PATTERNS.test(finalEmail) ||
      DANGEROUS_PHP_PATTERNS.test(shippingAddress) ||
      DANGEROUS_PHP_PATTERNS.test(notes) ||
      DANGEROUS_PHP_PATTERNS.test(referralCode)
    ) {
      showErrorAlert("Pesanan Ditolak ⚠️", "Terdeteksi injeksi format kode script atau PHP berbahaya pada data pesanan.");
      return;
    }

    if (!finalName || !finalPhone || !finalEmail) {
      showErrorAlert("Data Diri Belum Lengkap", "Nama, Nomor WhatsApp, dan Email wajib terisi.");
      return;
    }

    if (!shippingAddress.trim()) {
      showErrorAlert("Alamat Pengiriman Belum Diisi", "Alamat lengkap pengiriman wajib diisi untuk pengiriman paket kartu fisik.");
      return;
    }

    if (!isMinOrderMet) {
      showErrorAlert(
        "Minimal Order Belum Terpenuhi",
        `Minimal total pengambilan kartu adalah ${minOrder} pcs untuk mendapatkan harga reseller. Silakan tambahkan ${missingQty} pcs lagi.`
      );
      return;
    }

    if (paymentMethod === "MANUAL_BANK_BNI" && !receiptImage) {
      showErrorAlert(
        "Bukti Transfer Diperlukan",
        "Harap unggah / upload foto bukti struk transfer bank BNI Anda sebelum melanjutkan."
      );
      return;
    }

    setIsSubmittingOrder(true);
    setSubmittingStatus(
      paymentMethod === "MIDTRANS_QRIS"
        ? "Sedang Menyiapkan QRIS Midtrans (Layar Terkunci)..."
        : "Sedang Mengirimkan Pesanan..."
    );

    try {
      const res = await createResellerOrderAction({
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        customerName: finalName.slice(0, 50),
        customerPhone: finalPhone.slice(0, 16),
        customerEmail: finalEmail.slice(0, 50),
        province: province || "Pengiriman Ditanggung Pembeli (COD)",
        shippingAddress: shippingAddress.trim().slice(0, 150) || undefined,
        notes: notes.trim().slice(0, 50) || undefined,
        affiliateCode: referralStatus?.valid ? referralStatus.code : (referralCode.trim().slice(0, 12) || undefined),
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
        const isProd = siteSetting?.midtransIsProduction ?? true;

        try {
          const snap = await ensureSnapScript(isProd, clientKey);
          setIsSubmittingOrder(false);

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
                `Pesanan #${res.order?.orderNumber} telah dibuat. Silakan selesaikan scan QRIS Anda.`
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
          setIsSubmittingOrder(false);
          showErrorAlert("Kesalahan Snap", "Gagal memuat popup pembayaran Midtrans.");
        }
      } else {
        // Manual BNI Transfer
        setIsSubmittingOrder(false);
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
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* FREEZE LOADING OVERLAY */}
        {isSubmittingOrder && (
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
                Beli kartu fisik NFC & akrilik meja langsung dari Super Admin
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmittingOrder}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-800 flex gap-2 bg-slate-950/30 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("CATALOG")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "CATALOG"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Katalog Produk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CART")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === "CART"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Keranjang & Order</span>
            {cart.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                {totalQuantity}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("HISTORY")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "HISTORY"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Pesanan Saya</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* TAB 1: PRODUCT CATALOG */}
          {activeTab === "CATALOG" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-teal-950/40 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Ketentuan Harga Grosir Reseller</h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Minimal pengambilan <strong>{minOrder} pcs</strong> kartu fisik untuk checkout. Nikmati potongan reward otomatis jika Anda memiliki outlet binaan aktif berbayar!
                  </p>
                </div>

                {availableVipDiscountsCount > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shrink-0">
                    👑 Kuota Diskon VIP: {availableVipDiscountsCount} kartu
                  </div>
                )}
              </div>

              {isLoadingProducts ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 mx-auto text-emerald-400 animate-spin" />
                  <p className="text-xs">Memuat katalog produk...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Belum Ada Produk Tersedia</p>
                  <p className="text-xs text-slate-500">Super Admin belum menambahkan produk kartu reseller.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {products.map((product) => {
                    const cartItem = cart.find((item) => item.product.id === product.id);
                    const qtyInCart = cartItem?.quantity || 0;

                    return (
                      <div
                        key={product.id}
                        className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all hover:shadow-xl hover:shadow-emerald-500/5 group"
                      >
                        <div className="space-y-3">
                          <div className="w-full h-36 rounded-xl bg-slate-900 border border-slate-800/80 overflow-hidden relative flex items-center justify-center">
                            {product.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-600 gap-1">
                                <QrCode className="w-8 h-8" />
                                <span className="text-[10px]">Smart QR Tag</span>
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                              {product.name}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              {product.description || "Kartu fisik premium dengan chip NFC anti-air dan QR barcode akrilik."}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-bold">Harga Reseller</span>
                            <span className="text-base font-extrabold text-emerald-400 font-mono">
                              Rp {product.price.toLocaleString("id-ID")}
                            </span>
                            <span className="text-[10px] text-slate-500"> / {product.unit}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{qtyInCart > 0 ? `Tambah (${qtyInCart})` : "Beli"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SHOPPING CART & CHECKOUT (3-STEP FORM WIZARD) */}
          {activeTab === "CART" && (
            <form onSubmit={handleCheckout} className="space-y-4">
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
                  {/* ── STEP PROGRESS BAR (WIZARD: FORM 1 -> FORM 2 -> FORM 3) ── */}
                  <div className="p-2 sm:p-3 bg-slate-950/80 border border-slate-800/90 rounded-2xl">
                    <div className="grid grid-cols-3 gap-2">
                      {/* Step 1 Tab */}
                      <button
                        type="button"
                        onClick={() => setCheckoutStep(1)}
                        className={`p-2 sm:p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                          checkoutStep === 1
                            ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                            : checkoutStep > 1
                            ? "bg-slate-900/80 border-emerald-500/40 text-emerald-400 hover:bg-slate-800"
                            : "bg-slate-900/40 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            checkoutStep === 1
                              ? "bg-indigo-600 text-white shadow"
                              : checkoutStep > 1
                              ? "bg-emerald-500 text-slate-950 font-black"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {checkoutStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] sm:text-xs font-bold truncate">
                            FORM 1
                          </span>
                          <span className="text-[9px] text-slate-400 truncate block">
                            Data Diri & Alamat
                          </span>
                        </div>
                      </button>

                      {/* Step 2 Tab */}
                      <button
                        type="button"
                        onClick={() => {
                          if (validateStep1()) setCheckoutStep(2);
                        }}
                        className={`p-2 sm:p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                          checkoutStep === 2
                            ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                            : checkoutStep > 2
                            ? "bg-slate-900/80 border-emerald-500/40 text-emerald-400 hover:bg-slate-800"
                            : "bg-slate-900/40 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            checkoutStep === 2
                              ? "bg-emerald-600 text-white shadow"
                              : checkoutStep > 2
                              ? "bg-emerald-500 text-slate-950 font-black"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {checkoutStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] sm:text-xs font-bold truncate">
                            FORM 2
                          </span>
                          <span className="text-[9px] text-slate-400 truncate block">
                            Rincian Kartu ({totalQuantity} pcs)
                          </span>
                        </div>
                      </button>

                      {/* Step 3 Tab */}
                      <button
                        type="button"
                        onClick={() => {
                          if (validateStep1() && validateStep2()) setCheckoutStep(3);
                        }}
                        className={`p-2 sm:p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                          checkoutStep === 3
                            ? "bg-amber-600/20 border-amber-500 text-white shadow-md shadow-amber-500/10"
                            : "bg-slate-900/40 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            checkoutStep === 3
                              ? "bg-amber-500 text-slate-950 font-black shadow"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          3
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] sm:text-xs font-bold truncate">
                            FORM 3
                          </span>
                          <span className="text-[9px] text-slate-400 truncate block">
                            Pembayaran
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* FORM 1: DATA PEMESAN & ALAMAT PENGIRIMAN                      */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  {checkoutStep === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-1">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold">
                              FORM 1
                            </span>
                            Data Diri Reseller & Alamat Pengiriman
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Isi data diri pemesan dan alamat lengkap penerima paket kartu fisik
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-800">
                          Langkah 1 dari 3
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 sm:p-5 bg-slate-950/80 border border-slate-800 rounded-2xl">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Nama Lengkap Pemesan *
                            </label>
                            <span className={`text-[10px] font-mono ${customerName.length >= 45 ? "text-amber-400 font-bold" : "text-slate-500"}`}>
                              {customerName.length}/50
                            </span>
                          </div>
                          <div className="relative flex items-center">
                            <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                            <input
                              type="text"
                              required
                              maxLength={50}
                              value={customerName}
                              onChange={handleNameChange}
                              placeholder="Nama Lengkap Reseller (Maks 50 huruf)"
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Nomor WhatsApp Aktif *
                            </label>
                            <span className={`text-[10px] font-mono ${customerPhone.length >= 14 ? "text-amber-400 font-bold" : "text-slate-500"}`}>
                              {customerPhone.length}/16
                            </span>
                          </div>
                          <div className="relative flex items-center">
                            <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                            <input
                              type="tel"
                              required
                              maxLength={16}
                              value={customerPhone}
                              onChange={handlePhoneChange}
                              placeholder="081234567890 (Maks 16 digit)"
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Email Akun Reseller *
                            </label>
                            <span className={`text-[10px] font-mono ${customerEmail.length >= 45 ? "text-amber-400 font-bold" : "text-slate-500"}`}>
                              {customerEmail.length}/50
                            </span>
                          </div>
                          <div className="relative flex items-center">
                            <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                            <input
                              type="email"
                              required
                              maxLength={50}
                              value={customerEmail}
                              onChange={handleEmailChange}
                              placeholder="email@reseller.com (Maks 50 huruf)"
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                            />
                          </div>
                        </div>

                        {/* Opsi Metode & Wilayah Pengiriman */}
                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-indigo-400" />
                              Wilayah Tujuan (Pengiriman Ditanggung Pembeli) *
                            </span>
                            <span className="text-[10px] text-amber-400 font-normal">
                              Ongkir dibayar sendiri ke kurir (COD)
                            </span>
                          </label>
                          <select
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white outline-none cursor-pointer transition-colors"
                          >
                            <option value="Jawa Timur & Bali (Ongkir Ditanggung Pembeli)">🚚 Jawa Timur & Bali (Ongkir Ditanggung Pembeli ke Kurir / COD)</option>
                            <option value="Jawa Tengah & DIY (Ongkir Ditanggung Pembeli)">🚚 Jawa Tengah & D.I. Yogyakarta (Ongkir Ditanggung Pembeli ke Kurir / COD)</option>
                            <option value="Jawa Barat, DKI & Banten (Ongkir Ditanggung Pembeli)">🚚 Jawa Barat, DKI Jakarta & Banten (Ongkir Ditanggung Pembeli ke Kurir / COD)</option>
                            <option value="Luar Pulau Jawa (Ongkir Ditanggung Pembeli)">🚚 Luar Pulau Jawa (Ongkir Ditanggung Pembeli ke Kurir / COD)</option>
                            <option value="Pengiriman Dibayar Sendiri (Ambil Sendiri / Bayar Ongkir di Tempat)">📦 Ambil Sendiri / Bayar Ongkir Langsung ke Kurir (COD)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Alamat Lengkap Pengiriman * <span className="text-[10px] text-slate-400">(Maks 150 huruf)</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleGetCurrentLocation}
                              disabled={isLocating}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                              {isLocating ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                  <span>Mendeteksi Lokasi...</span>
                                </>
                              ) : (
                                <>
                                  <MapPin className="w-3 h-3 text-indigo-400" />
                                  <span>📍 Ambil Lokasi Saat Ini (GPS/IP)</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="relative">
                            <textarea
                              required
                              rows={2}
                              maxLength={150}
                              value={shippingAddress}
                              onChange={handleAddressChange}
                              placeholder="Ketik alamat atau klik Ambil Lokasi (Maksimal 150 karakter)"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none custom-scrollbar transition-colors"
                            />
                            <span className={`absolute right-2.5 bottom-2 text-[10px] font-mono ${
                              shippingAddress.length >= 140 ? "text-amber-400 font-bold" : "text-slate-500"
                            }`}>
                              {shippingAddress.length}/150
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-400">
                              Catatan Tambahan untuk Super Admin (Opsional)
                            </label>
                            <span className={`text-[10px] font-mono ${notes.length >= 45 ? "text-amber-400 font-bold" : "text-slate-500"}`}>
                              {notes.length}/50
                            </span>
                          </div>
                          <div className="relative flex items-center">
                            <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                            <input
                              type="text"
                              maxLength={50}
                              value={notes}
                              onChange={handleNotesChange}
                              placeholder="Misal: Prioritaskan sebelum akhir pekan (Maks 50 karakter)"
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Navigation Form 1 */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setActiveTab("CATALOG")}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Lihat Katalog Produk
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (validateStep1()) setCheckoutStep(2);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
                        >
                          <span>Lanjut ke Form 2: Rincian Kartu</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* FORM 2: RINCIAN PAKET KARTU & JUMLAH (MIN 8 PCS)              */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  {checkoutStep === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-1">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                              FORM 2
                            </span>
                            Rincian Paket Kartu & Jumlah Pembelian
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {minOrder > 0
                              ? `Minimal total pengambilan adalah ${minOrder} pcs kartu untuk mendapatkan harga grosir reseller`
                              : "Bebas ambil jumlah kartu tanpa batasan minimum order"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Total Item:</span>
                          <span className={`font-mono font-bold text-xs ${isMinOrderMet ? "text-emerald-400" : "text-amber-400"}`}>
                            {totalQuantity} pcs {isMinOrderMet ? "✅" : `(Kurang ${missingQty})`}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {cart.map((item) => (
                          <div
                            key={item.product.id}
                            className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
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
                            Minimal total pesanan adalah <strong className="text-white">{minOrder} pcs</strong> (saat ini {totalQuantity} pcs). Tambahkan <strong className="text-amber-200 font-bold">{missingQty} pcs</strong> lagi untuk melanjutkan ke pembayaran.
                          </span>
                        </div>
                      )}

                      {/* Navigation Form 2 */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setCheckoutStep(1)}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Kembali ke Form 1</span>
                        </button>
                        <button
                          type="button"
                          disabled={!isMinOrderMet}
                          onClick={() => {
                            if (validateStep2()) setCheckoutStep(3);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          <span>Lanjut ke Form 3: Pembayaran</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* FORM 3: RINGKASAN TOTAL & METODE PEMBAYARAN                   */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  {checkoutStep === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-1">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-xs font-mono font-bold">
                              FORM 3
                            </span>
                            Ringkasan Total & Metode Pembayaran
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Pilih metode bayar dan selesaikan transaksi pesanan Anda
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-800">
                          Langkah 3 dari 3
                        </span>
                      </div>

                      {/* Summary & Diskon VIP */}
                      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Subtotal Produk ({totalQuantity} pcs)</span>
                          <span className="font-mono font-bold text-slate-200">
                            Rp {subtotal.toLocaleString("id-ID")}
                          </span>
                        </div>

                        {discountAmount > 0 && (
                          <div className="flex items-center justify-between text-emerald-400">
                            <span className="flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5" />
                              Potongan Reward Outlet VIP ({discountedCardsCount} kartu x Rp {vipDiscountPerCard.toLocaleString("id-ID")})
                            </span>
                            <span className="font-mono font-bold">
                              - Rp {discountAmount.toLocaleString("id-ID")}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-indigo-400" />
                            Biaya Ongkir:
                          </span>
                          <span className="font-mono text-xs text-amber-400 font-medium">
                            Rp 0 (Sepenuhnya Ditanggung Pembeli / COD)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-teal-400" />
                            Biaya Packing & Proteksi:
                          </span>
                          <span className="font-mono font-bold text-teal-300">
                            Rp {packingFee.toLocaleString("id-ID")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-indigo-300">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                            Biaya Layanan / Admin (11%):
                          </span>
                          <span className="font-mono font-bold text-indigo-300">
                            +Rp {adminFee.toLocaleString("id-ID")}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm">
                          <span className="font-bold text-white uppercase">Total Tagihan Pembayaran:</span>
                          <span className="font-mono font-black text-lg text-emerald-400">
                            Rp {finalTotalAmount.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>

                      {/* Kode Referral Affiliate (Opsional) */}
                      <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-purple-400" />
                            <span>Kode Referral Affiliate (Opsional)</span>
                          </span>
                          <span className="text-[10px] text-purple-400 font-medium">Bagi Hasil Kemitraan</span>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={12}
                            value={referralCode}
                            onChange={handleReferralChange}
                            placeholder="Masukkan kode referral (Maks 12 huruf)..."
                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white font-mono uppercase placeholder-slate-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleValidateReferralCode}
                            disabled={isValidatingReferral || !referralCode.trim()}
                            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            {isValidatingReferral ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Terapkan"}
                          </button>
                        </div>

                        {referralStatus && (
                          <div className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 ${
                            referralStatus.valid
                              ? "bg-purple-500/15 border border-purple-500/30 text-purple-300"
                              : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                          }`}>
                            {referralStatus.valid ? (
                              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                            <span>{referralStatus.message}</span>
                          </div>
                        )}
                      </div>

                      {/* Pilihan Metode Pembayaran */}
                      <div className="space-y-2.5">
                        <div className={`grid ${siteSetting?.midtransEnabled !== false ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-2.5`}>
                          {/* Midtrans QRIS */}
                          {siteSetting?.midtransEnabled !== false && (
                            <div
                              onClick={() => setPaymentMethod("MIDTRANS_QRIS")}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                                paymentMethod === "MIDTRANS_QRIS"
                                  ? "bg-indigo-950/50 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                              }`}
                            >
                              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                                <QrCode className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">QRIS Otomatis (Midtrans)</span>
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                                    INSTAN
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate">GoPay, OVO, Dana, ShopeePay, BCA/Mandiri/BNI</p>
                              </div>
                            </div>
                          )}

                          {/* Manual Transfer BNI */}
                          <div
                            onClick={() => setPaymentMethod("MANUAL_BANK_BNI")}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                              paymentMethod === "MANUAL_BANK_BNI"
                                ? "bg-amber-950/50 border-amber-500 text-white shadow-lg shadow-amber-500/20"
                                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white">Transfer Bank {bankName} (Manual)</span>
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

                      {/* Navigation Form 3 & Submit */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setCheckoutStep(2)}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Kembali ke Form 2</span>
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingOrder || !isMinOrderMet}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                        >
                          {isSubmittingOrder ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>Memproses Transaksi...</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4" />
                              <span>Bayar Sekarang (Rp {finalTotalAmount.toLocaleString("id-ID")})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </form>
          )}

          {/* TAB 3: ORDER HISTORY */}
          {activeTab === "HISTORY" && (
            <div className="space-y-3">
              {isLoadingOrders ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 mx-auto text-emerald-400 animate-spin" />
                  <p className="text-xs">Memuat riwayat pesanan...</p>
                </div>
              ) : myOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <History className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Belum Ada Riwayat Pesanan</p>
                  <p className="text-xs text-slate-500">Semua pesanan kartu yang Anda buat akan muncul di sini.</p>
                </div>
              ) : (
                myOrders.map((order) => {
                  const statusColors: Record<string, string> = {
                    PENDING: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                    PROCESSING: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
                    SHIPPED: "bg-purple-500/20 text-purple-300 border-purple-500/30",
                    COMPLETED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                    CANCELLED: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                  };

                  const paymentColors: Record<string, string> = {
                    PENDING: "bg-amber-500/20 text-amber-300",
                    PAID: "bg-emerald-500/20 text-emerald-300",
                    FAILED: "bg-rose-500/20 text-rose-300",
                  };

                  return (
                    <div
                      key={order.id}
                      className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-emerald-400">
                            #{order.orderNumber}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              statusColors[order.orderStatus] || "bg-slate-800 text-slate-300 border-slate-700"
                            }`}
                          >
                            Status: {order.orderStatus}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              paymentColors[order.paymentStatus] || "bg-slate-800 text-slate-300"
                            }`}
                          >
                            Bayar: {order.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium">
                              {item.quantity}x {item.productName}
                            </span>
                            <span className="font-mono text-slate-400">
                              Rp {(item.productPrice * item.quantity).toLocaleString("id-ID")}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Shipping address info */}
                      {order.shippingAddress && (
                        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-start gap-1.5 text-xs text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="truncate">{order.shippingAddress}</span>
                        </div>
                      )}

                      {/* Footer Total & Actions */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShippingLabelOrder(order)}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Download atau Cetak Label Pengiriman"
                          >
                            <Truck className="w-3 h-3 text-sky-400" />
                            <span>Label Pengiriman</span>
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Total Pembayaran</span>
                          <span className="font-mono font-bold text-sm text-emerald-400">
                            Rp {order.totalAmount.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Label Pengiriman */}
      <ShippingLabelModal
        isOpen={Boolean(shippingLabelOrder)}
        order={shippingLabelOrder}
        onClose={() => setShippingLabelOrder(null)}
        siteSetting={siteSetting}
      />
    </div>
  );
}
