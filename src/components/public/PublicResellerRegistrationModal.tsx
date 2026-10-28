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
  ArrowLeft,
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
  Tag,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showLocationSuccessModal } from "@/lib/swal";
import {
  getResellerProductsAction,
  createResellerOrderAction,
} from "@/lib/actions/reseller-shop.actions";
import { validateAffiliateReferralCodeAction } from "@/lib/actions/affiliate.actions";
import { ResellerProductModel, SiteSettingModel } from "@/types/models";

// Pattern deteksi injeksi skrip, tag PHP, dan fungsi berbahaya
const DANGEROUS_PHP_PATTERNS = /(<\?php|<\?=|<\?|\?>|<script|eval\s*\(|base64_decode|system\s*\(|shell_exec|exec\s*\(|passthru|phpinfo|\$_GET|\$_POST|\$_REQUEST|\$_SERVER|\.php\b|\.phtml\b)/i;

interface PublicResellerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSetting?: SiteSettingModel;
  onOpenTracking?: (orderNumber?: string) => void;
  defaultReferralCode?: string;
}

export function PublicResellerRegistrationModal({
  isOpen,
  onClose,
  siteSetting,
  onOpenTracking,
  defaultReferralCode = "",
}: PublicResellerRegistrationModalProps) {
  const [products, setProducts] = useState<ResellerProductModel[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Step Wizard State: 1 = Form 1 (Pilih Kartu), 2 = Form 2 (Data Diri & Alamat), 3 = Form 3 (Pembayaran)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Cart Quantities state: map of productId -> quantity
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});

  // Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [province, setProvince] = useState("Jawa Timur & Bali (Ongkir Ditanggung Pembeli)");
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState(defaultReferralCode);
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [referralStatus, setReferralStatus] = useState<{
    valid: boolean;
    affiliateName?: string;
    code?: string;
    message?: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"MIDTRANS_QRIS" | "MANUAL_BANK_BNI">(
    siteSetting?.midtransEnabled === false ? "MANUAL_BANK_BNI" : "MIDTRANS_QRIS"
  );
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

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
        const houseNum = addr.house_number ? `No. ${addr.house_number}` : "";
        const road = addr.road || addr.street || addr.pedestrian || addr.suburb || addr.neighbourhood || "";
        const roadFull = [road, houseNum].filter(Boolean).join(" ");
        const village = addr.village || addr.subdistrict || addr.city_district || "";
        const city = addr.city || addr.town || addr.county || "";
        const state = addr.state || "";
        const post = addr.postcode ? ` ${addr.postcode}` : "";
        const parts = [roadFull, village, city, state].filter(Boolean);
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

  // Ambil Lokasi Saat Ini (GPS Akurat Presisi Tinggi dengan Fallback Otomatis ke Jaringan IP)
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);

    const applyAddress = (rawAddress: string) => {
      const trimmed = rawAddress.slice(0, 150).trim();
      setShippingAddress(trimmed);
      showLocationSuccessModal(trimmed);
    };

    const tryIpFallback = async () => {
      try {
        const ipResult = await fetchLocationFromIP();
        if (ipResult && ipResult.address) {
          applyAddress(ipResult.address);
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
            applyAddress(address);
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

  // Referral Validator
  const handleValidateReferralCode = async (customCode?: string) => {
    const codeToValidate = (customCode || referralCode).trim().toUpperCase();
    if (!codeToValidate) return;

    setReferralCode(codeToValidate);
    setIsValidatingReferral(true);
    try {
      const res = await validateAffiliateReferralCodeAction(codeToValidate);
      if (res.success && res.affiliate) {
        setReferralStatus({
          valid: true,
          affiliateName: res.affiliate.fullName,
          code: res.affiliate.referralCode,
          message: `Kode referral "${res.affiliate.referralCode}" (${res.affiliate.fullName}) aktif! Komisi kemitraan otomatis terpasang.`,
        });
        try {
          localStorage.setItem("smartqr_referral_code", res.affiliate.referralCode);
          document.cookie = `smartqr_ref=${encodeURIComponent(res.affiliate.referralCode)}; path=/; max-age=2592000; SameSite=Lax`;
        } catch (e) {}
      } else {
        setReferralStatus({
          valid: false,
          message: res.message || "Kode referral affiliate tidak ditemukan atau tidak aktif.",
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

  // Auto-detect referral code on mount / open / prop change
  useEffect(() => {
    if (!isOpen) return;

    let targetRefCode = (defaultReferralCode || "").trim().toUpperCase();
    if (!targetRefCode && typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlRef = urlParams.get("ref");
        if (urlRef) {
          targetRefCode = urlRef.trim().toUpperCase();
        } else {
          const stored = localStorage.getItem("smartqr_referral_code");
          if (stored) targetRefCode = stored.trim().toUpperCase();
        }
      } catch (e) {}
    }

    if (targetRefCode) {
      setReferralCode(targetRefCode);
      handleValidateReferralCode(targetRefCode);
      try {
        localStorage.setItem("smartqr_referral_code", targetRefCode);
        document.cookie = `smartqr_ref=${encodeURIComponent(targetRefCode)}; path=/; max-age=2592000; SameSite=Lax`;
      } catch (e) {}
    }
  }, [isOpen, defaultReferralCode]);

  useEffect(() => {
    if (defaultReferralCode && defaultReferralCode.trim()) {
      const clean = defaultReferralCode.trim().toUpperCase();
      setReferralCode(clean);
      handleValidateReferralCode(clean);
    }
  }, [defaultReferralCode]);

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
    setCurrentStep(1);

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

  // Biaya Ongkir: Sepenuhnya ditanggung oleh pembeli (Rp 0 di web, bayar sendiri ke kurir saat barang tiba / COD)
  const shippingFee = 0;
  const baseShippingFee = 0;
  const shippingDiscount = 0;
  const minOrder = siteSetting?.resellerMinOrder ?? products[0]?.minOrder ?? 2;
  const packingFee = 5000;
  // Biaya Layanan / Admin 11% dihitung dari (Subtotal Produk + Biaya Packing) sesuai Opsi B
  const adminFee = Math.round((subtotal + packingFee) * 0.11);
  const totalAmount = subtotal + shippingFee + packingFee + adminFee;
  const isMinOrderMet = totalQuantity >= minOrder;

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

    // Strict validation: Reject non-images and potential PHP / script files
    const fileName = file.name.toLowerCase();
    if (
      fileName.endsWith(".php") ||
      fileName.endsWith(".phtml") ||
      fileName.endsWith(".exe") ||
      fileName.endsWith(".sh") ||
      fileName.includes(".php.")
    ) {
      showErrorAlert("File Ditolak", "File executable/PHP dilarang. Harap upload file gambar struk yang sah (JPG, PNG, WEBP).");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showErrorAlert("Format Tidak Didukung", "Hanya format gambar JPG, PNG, atau WEBP yang diperbolehkan.");
      return;
    }

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

  // Step 1 Validation
  const validateStep1 = () => {
    if (
      DANGEROUS_PHP_PATTERNS.test(customerName) ||
      DANGEROUS_PHP_PATTERNS.test(customerPhone) ||
      DANGEROUS_PHP_PATTERNS.test(customerEmail) ||
      DANGEROUS_PHP_PATTERNS.test(shippingAddress) ||
      DANGEROUS_PHP_PATTERNS.test(notes) ||
      DANGEROUS_PHP_PATTERNS.test(referralCode)
    ) {
      showErrorAlert("Input Ditolak ⚠️", "Data yang dimasukkan mengandung format skrip atau kode PHP berbahaya yang dilarang.");
      return false;
    }
    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      showErrorAlert("Data Diri Belum Lengkap", "Nama Lengkap, Nomor WhatsApp, dan Email wajib diisi.");
      return false;
    }
    if (!shippingAddress.trim()) {
      showErrorAlert("Alamat Belum Diisi", "Alamat pengiriman wajib diisi (ketik manual atau klik Ambil Lokasi GPS).");
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (!isMinOrderMet) {
      showErrorAlert(
        `Minimal Pengambilan ${minOrder} Pcs`,
        `Total kartu yang dipilih saat ini ${totalQuantity} pcs. Silakan tambah menjadi minimal ${minOrder} pcs untuk harga reseller.`
      );
      return false;
    }
    return true;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    if (
      DANGEROUS_PHP_PATTERNS.test(customerName) ||
      DANGEROUS_PHP_PATTERNS.test(customerPhone) ||
      DANGEROUS_PHP_PATTERNS.test(customerEmail) ||
      DANGEROUS_PHP_PATTERNS.test(shippingAddress) ||
      DANGEROUS_PHP_PATTERNS.test(notes) ||
      DANGEROUS_PHP_PATTERNS.test(referralCode)
    ) {
      showErrorAlert("Pendaftaran Ditolak ⚠️", "Terdeteksi injeksi format kode script atau PHP berbahaya pada data pesanan.");
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
        customerName: customerName.trim().slice(0, 50),
        customerPhone: customerPhone.trim().replace(/[^0-9+]/g, "").slice(0, 16),
        customerEmail: customerEmail.trim().toLowerCase().slice(0, 50),
        shippingAddress: shippingAddress.trim().slice(0, 150),
        province: province || "Pengiriman Ditanggung Pembeli (COD Ongkir ke Kurir)",
        notes: notes.trim() ? notes.trim().slice(0, 50) : undefined,
        affiliateCode: referralStatus?.valid ? referralStatus.code : (referralCode.trim().slice(0, 12) || undefined),
        paymentMethod,
        receiptImageUrl: receiptImage || undefined,
        isPublicRegistration: true,
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
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
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
                Pemesanan paket perdana fisik & pembuatan akun admin lapangan
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
                Terima kasih telah bergabung! Nomor pesanan resmi Anda adalah:
              </p>
              <div className="inline-block px-4 py-2 bg-slate-950 border border-emerald-500/40 rounded-2xl font-mono text-base font-black text-emerald-400 mt-2 shadow-inner">
                #{createdOrderNumber}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <Truck className="w-4 h-4 text-indigo-400" />
                <span>Langkah Selanjutnya:</span>
              </div>
              <ul className="text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Super Admin memverifikasi pesanan Anda dan mengemas paket kartu.</li>
                <li>Super Admin membuatkan akun <strong>Admin Lapangan</strong> untuk Anda dan mengirimkan info login resmi via WhatsApp.</li>
                <li>Gunakan nomor pesanan di atas untuk melacak proses pengiriman barang.</li>
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
          /* View: Registration & Shopping Form Wizard */
          <form onSubmit={handleCheckout} className="flex-1 overflow-y-auto space-y-4 pt-3.5 custom-scrollbar">
            {/* ── STEP PROGRESS BAR (WIZARD: 1. Pilih Produk -> 2. Data Penerima -> 3. Usaha & Bayar) ── */}
            <div className="py-1 shrink-0">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Step 1 Tab */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-left border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                    currentStep === 1
                      ? "bg-indigo-950/50 border-indigo-500 text-white shadow-lg shadow-indigo-950/30"
                      : currentStep > 1
                      ? "bg-slate-900/80 border-emerald-500/40 text-emerald-400 hover:bg-slate-800"
                      : "bg-slate-900/40 border-slate-800 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      currentStep === 1
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                        : currentStep > 1
                        ? "bg-emerald-500 text-slate-950 font-black"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] sm:text-xs font-bold truncate">
                      1. Pilih Produk
                    </span>
                    <span className="hidden sm:block text-[9px] text-slate-400 truncate">
                      {totalQuantity > 0 ? `${totalQuantity} pcs` : "Paket Grosir"}
                    </span>
                  </div>
                </button>

                {/* Step 2 Tab */}
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setCurrentStep(2);
                  }}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-left border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                    currentStep === 2
                      ? "bg-indigo-950/50 border-indigo-500 text-white shadow-lg shadow-indigo-950/30"
                      : currentStep > 2
                      ? "bg-slate-900/80 border-emerald-500/40 text-emerald-400 hover:bg-slate-800"
                      : "bg-slate-900/40 border-slate-800 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      currentStep === 2
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                        : currentStep > 2
                        ? "bg-emerald-500 text-slate-950 font-black"
                        : "bg-slate-800 text-sky-400 font-bold"
                    }`}
                  >
                    {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] sm:text-xs font-bold truncate">
                      2. Data Penerima
                    </span>
                    <span className="hidden sm:block text-[9px] text-slate-400 truncate">
                      Nama & Alamat
                    </span>
                  </div>
                </button>

                {/* Step 3 Tab */}
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2() && validateStep1()) setCurrentStep(3);
                  }}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-left border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                    currentStep === 3
                      ? "bg-indigo-950/50 border-indigo-500 text-white shadow-lg shadow-indigo-950/30"
                      : "bg-slate-900/40 border-slate-800 text-slate-400"
                  }`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      currentStep === 3
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 font-black"
                        : "bg-slate-800 text-sky-400 font-bold"
                    }`}
                  >
                    3
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] sm:text-xs font-bold truncate">
                      3. Usaha & Bayar
                    </span>
                    <span className="hidden sm:block text-[9px] text-slate-400 truncate">
                      QRIS & BNI
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* STEP 1: FORM PILIH PRODUK (MIN 8 PCS)                          */}
            {/* ───────────────────────────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                        Langkah 1
                      </span>
                      Pilih Produk & Jumlah Kartu Grosir
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {minOrder > 0
                        ? `Minimal total pesanan adalah ${minOrder} pcs untuk mendapatkan harga grosir kemitraan`
                        : "Bebas pilih jumlah kartu tanpa batasan minimum order"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Total Item:</span>
                    <span className={`font-mono font-bold text-xs ${isMinOrderMet ? "text-emerald-400" : "text-amber-400"}`}>
                      {totalQuantity} pcs {isMinOrderMet ? "✅" : `(Kurang ${Math.max(0, minOrder - totalQuantity)})`}
                    </span>
                  </div>
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

                {/* Warning if min order not met */}
                {!isMinOrderMet && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      Minimal total pesanan adalah <strong className="text-white">{minOrder} pcs</strong> (saat ini {totalQuantity} pcs). Tambahkan <strong className="text-amber-200 font-bold">{minOrder - totalQuantity} pcs</strong> lagi untuk melanjutkan.
                    </span>
                  </div>
                )}

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
                      onClick={() => handleValidateReferralCode()}
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
                    <span className="font-mono text-xs text-amber-400 font-medium">
                      Rp 0 (Ditanggung Pembeli / COD)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-teal-400" />
                      Biaya Packing & Proteksi:
                    </span>
                    <span className="font-mono font-semibold text-white">Rp {packingFee.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-indigo-300">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      Biaya Layanan / Admin (11%):
                    </span>
                    <span className="font-mono font-bold text-indigo-300">
                      +Rp {adminFee.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase">Total Tagihan Pembayaran:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      Rp {totalAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Step 1 Footer Navigation */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={!isMinOrderMet}
                    onClick={() => {
                      if (validateStep2()) setCurrentStep(2);
                    }}
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Lanjut ke 2. Data Penerima & Alamat</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* STEP 2: FORM DATA DIRI & ALAMAT PENGIRIMAN                     */}
            {/* ───────────────────────────────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold">
                        Langkah 2
                      </span>
                      Data Penerima & Alamat Pengiriman
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Lengkapi data diri pemesan untuk akun portal dan alamat pengiriman kartu
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-800">
                    Langkah 2 dari 3
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-300">Nama Lengkap Pemesan *</label>
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
                        placeholder="Contoh: Budi Santoso (Maks 50 huruf)"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-300">Nomor WhatsApp Aktif *</label>
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
                        placeholder="Contoh: 081234567890 (Maks 16 digit)"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-300">Alamat Email (Untuk Akun Login Portal) *</label>
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
                        placeholder="Contoh: budi@gmail.com (Maks 50 huruf)"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Keterangan Ongkir Ditanggung Pembeli (COD) */}
                  <div className="sm:col-span-2 p-3.5 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">Biaya Ongkos Kirim (COD)</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Sepenuhnya Ditanggung Pembeli
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Ongkos kirim sepenuhnya ditanggung oleh pembeli dan dibayarkan secara langsung ke pihak kurir ekspedisi saat paket tiba di alamat tujuan.
                      </p>
                    </div>
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
                        placeholder="Ketik alamat atau klik tombol Ambil Lokasi (Maksimal 150 karakter)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none custom-scrollbar transition-colors"
                      />
                      <span className={`absolute right-2.5 bottom-2 text-[10px] font-mono ${
                        shippingAddress.length >= 140 ? "text-amber-400 font-bold" : "text-slate-500"
                      }`}>
                        {shippingAddress.length}/150
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-400/90 flex items-start gap-1.5 mt-1 leading-relaxed">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                      <span>
                        <strong>Catatan:</strong> Deteksi lokasi otomatis kadang kurang presisi. Silakan cek & lengkapi manual (tambahkan No. Rumah, RT/RW, atau Patokan terdekat).
                      </span>
                    </p>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-400">Catatan Tambahan untuk Admin (Opsional)</label>
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
                        placeholder="Contoh: Titipkan ke satpam (Maks 50 karakter)"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2 Footer Navigation */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke 1. Pilih Produk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) setCurrentStep(3);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Lanjut ke 3. Usaha & Bayar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* STEP 3: FORM RINGKASAN & METODE PEMBAYARAN                     */}
            {/* ───────────────────────────────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-xs font-mono font-bold">
                        Langkah 3
                      </span>
                      Ringkasan & Metode Pembayaran
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pilih metode pembayaran (Midtrans QRIS / Transfer Bank BNI) dan selesaikan pesanan
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-800">
                    Langkah 3 dari 3
                  </span>
                </div>

                {/* Price Summary Breakdown in Step 3 */}
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
                    <span className="font-mono text-xs text-amber-400 font-medium">
                      Rp 0 (Sepenuhnya Ditanggung Pembeli / COD)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-teal-400" />
                      Biaya Packing & Proteksi:
                    </span>
                    <span className="font-mono font-semibold text-white">Rp {packingFee.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-indigo-300">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      Biaya Layanan / Admin (11%):
                    </span>
                    <span className="font-mono font-bold text-indigo-300">
                      +Rp {adminFee.toLocaleString("id-ID")}
                    </span>
                  </div>
                  {referralStatus?.valid && (
                    <div className="flex items-center justify-between text-xs text-purple-400">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Kode Referral Terpasang:
                      </span>
                      <span className="font-mono font-bold">{referralStatus.code}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase">Total Tagihan Pembayaran:</span>
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
                        {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
                        accept="image/jpeg,image/png,image/webp"
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

                {/* Page 3 Footer Navigation & Submit */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke 2. Data Penerima</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isMinOrderMet}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Memproses Transaksi...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Kirim & Bayar Sekarang (Rp {totalAmount.toLocaleString("id-ID")})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
