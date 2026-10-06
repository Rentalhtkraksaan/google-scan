"use client";

import { useState, useEffect } from "react";
import {
  X,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  Trash2,
  Edit,
  Truck,
  Package,
  Sparkles,
  Phone,
  Mail,
  User,
  MapPin,
  Save,
  Loader2,
  Receipt,
  MessageCircle,
  Filter,
  Store,
} from "lucide-react";
import {
  showSuccessAlert,
  showErrorAlert,
  showConfirmAlert,
  showTwoStepDeleteConfirmAlert,
} from "@/lib/swal";
import {
  getResellerOrdersAction,
  updateResellerOrderCustomerDataAction,
  approveResellerOrderAction,
  rejectResellerOrderAction,
  updateResellerOrderStatusAction,
  deleteResellerOrderRecordAction,
  convertResellerOrderToAdminAction,
} from "@/lib/actions/reseller-shop.actions";
import {
  updateOrderTrackingNumberAction,
  getLiveOrderTrackingAction,
  LiveTrackingResult,
} from "@/lib/actions/courier-tracking.actions";
import { ResellerOrderModel } from "@/types/models";
import { ActivateOutletFromOrderModal } from "./ActivateOutletFromOrderModal";
import { ShippingLabelModal } from "./ShippingLabelModal";

interface ResellerOrdersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMaster: boolean;
  superAdminName?: string;
  onRefreshData?: () => void;
}

export function ResellerOrdersManagerModal({
  isOpen,
  onClose,
  isMaster,
  superAdminName,
  onRefreshData,
}: ResellerOrdersManagerModalProps) {
  const [orders, setOrders] = useState<ResellerOrderModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PAID" | "REJECTED">("ALL");

  // Modal Preview Struk
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modal Aktivasi Akun Outlet & Pasang Kartu
  const [activatingOutletOrder, setActivatingOutletOrder] = useState<ResellerOrderModel | null>(null);

  // Modal Label Pengiriman Paket (Ekspedisi)
  const [shippingLabelOrder, setShippingLabelOrder] = useState<ResellerOrderModel | null>(null);

  // Modal Input / Detail Resi Ekspedisi Realtime (J&T, JNE, SiCepat)
  const [trackingModalOrder, setTrackingModalOrder] = useState<ResellerOrderModel | null>(null);
  const [inputTrackingNumber, setInputTrackingNumber] = useState("");
  const [inputCourierName, setInputCourierName] = useState("J&T Express");
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [liveTrackingData, setLiveTrackingData] = useState<LiveTrackingResult | null>(null);
  const [isLoadingLiveTracking, setIsLoadingLiveTracking] = useState(false);

  // Modal Edit Customer Data
  const [editingOrder, setEditingOrder] = useState<ResellerOrderModel | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editCustomerEmail, setEditCustomerEmail] = useState("");
  const [editShippingAddress, setEditShippingAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // State ID pesanan yang sedang diupdate statusnya (untuk micro-loading inline)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadOrders = (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    getResellerOrdersAction()
      .then((res) => {
        if (res.success && res.data) {
          setOrders(res.data as ResellerOrderModel[]);
        }
      })
      .finally(() => {
        if (showSpinner) setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "ALL" && order.paymentStatus !== statusFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.customerPhone.includes(q) ||
      order.customerEmail.toLowerCase().includes(q) ||
      (order.admin?.fullName && order.admin.fullName.toLowerCase().includes(q))
    );
  });

  const handleOpenEditCustomer = (order: ResellerOrderModel) => {
    setEditingOrder(order);
    setEditCustomerName(order.customerName);
    setEditCustomerPhone(order.customerPhone);
    setEditCustomerEmail(order.customerEmail);
    setEditShippingAddress(order.shippingAddress || "");
    setEditNotes(order.notes || "");
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || isSavingCustomer) return;

    if (!editCustomerName.trim() || !editCustomerPhone.trim() || !editCustomerEmail.trim()) {
      showErrorAlert("Validasi Gagal", "Nama, Nomor WhatsApp, dan Email wajib diisi.");
      return;
    }

    setIsSavingCustomer(true);
    // Optimistic local state update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === editingOrder.id
          ? {
              ...o,
              customerName: editCustomerName.trim(),
              customerPhone: editCustomerPhone.trim(),
              customerEmail: editCustomerEmail.trim(),
              shippingAddress: editShippingAddress.trim() || null,
              notes: editNotes.trim() || null,
            }
          : o
      )
    );

    try {
      const res = await updateResellerOrderCustomerDataAction(editingOrder.id, {
        customerName: editCustomerName.trim(),
        customerPhone: editCustomerPhone.trim(),
        customerEmail: editCustomerEmail.trim(),
        shippingAddress: editShippingAddress.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      if (res.success) {
        showSuccessAlert("Data Diperbarui", res.message || "Data pembeli berhasil diperbarui.", 1200);
        setEditingOrder(null);
        loadOrders(false);
      } else {
        showErrorAlert("Gagal", res.message || "Gagal memperbarui data pemesan.");
        loadOrders(false);
      }
    } catch (err) {
      console.error("Save customer data error:", err);
      showErrorAlert("Kesalahan", "Terjadi kesalahan saat menyimpan data pemesan.");
      loadOrders(false);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleOpenTrackingModal = (order: ResellerOrderModel) => {
    setTrackingModalOrder(order);
    setInputTrackingNumber(order.trackingNumber || "");
    setInputCourierName(order.courierName || "J&T Express");
    setLiveTrackingData(null);

    if (order.trackingNumber) {
      setIsLoadingLiveTracking(true);
      getLiveOrderTrackingAction(order.id)
        .then((res) => {
          if (res.success) setLiveTrackingData(res);
        })
        .finally(() => setIsLoadingLiveTracking(false));
    }
  };

  const handleSaveTrackingNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModalOrder || isSavingTracking) return;

    if (!inputTrackingNumber.trim()) {
      showErrorAlert("Validasi Gagal", "Nomor resi pengiriman wajib diisi.");
      return;
    }

    setIsSavingTracking(true);
    const cleanAwb = inputTrackingNumber.trim().toUpperCase();

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === trackingModalOrder.id
          ? {
              ...o,
              trackingNumber: cleanAwb,
              courierName: inputCourierName,
              orderStatus: o.orderStatus === "PENDING" || o.orderStatus === "PROCESSING" ? "SHIPPED" : o.orderStatus,
            }
          : o
      )
    );

    try {
      const res = await updateOrderTrackingNumberAction(
        trackingModalOrder.id,
        cleanAwb,
        inputCourierName
      );

      if (res.success) {
        showSuccessAlert(
          "Resi Berhasil Disimpan 🚚",
          res.message || "Nomor resi berhasil dihubungkan.",
          1500
        );
        setTrackingModalOrder(null);
        loadOrders(false);
        onRefreshData?.();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal menyimpan nomor resi.");
        loadOrders(false);
      }
    } catch (err) {
      console.error("Save tracking error:", err);
      showErrorAlert("Kesalahan", "Terjadi kesalahan teknis saat menyimpan resi.");
      loadOrders(false);
    } finally {
      setIsSavingTracking(false);
    }
  };

  const handleApprove = async (order: ResellerOrderModel) => {
    const result = await showConfirmAlert(
      `Setujui Pembayaran Order #${order.orderNumber}?`,
      `Pesanan atas nama <b>${order.customerName}</b> sebesar <b>Rp ${order.totalAmount.toLocaleString("id-ID")}</b> akan disetujui dan berstatus Diproses/Lunas.`,
      "Ya, Setujui Pembayaran",
      "#10b981"
    );
    if (!result.isConfirmed) return;

    // Optimistic Update: Langsung ubah di layar seketika tanpa layar loading hilang
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, paymentStatus: "PAID", orderStatus: o.orderStatus === "PENDING" ? "PROCESSING" : o.orderStatus }
          : o
      )
    );
    setUpdatingOrderId(order.id);

    try {
      const res = await approveResellerOrderAction(order.id);
      if (res.success) {
        showSuccessAlert("Pembayaran Disetujui", res.message || "Pesanan berhasil disetujui.", 1200);
        loadOrders(false);
        onRefreshData?.();
      } else {
        // Rollback jika gagal
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? { ...o, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus }
              : o
          )
        );
        showErrorAlert("Gagal", res.message || "Gagal menyetujui pesanan.");
      }
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus }
            : o
        )
      );
      showErrorAlert("Kesalahan", "Gagal menyetujui pesanan.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleReject = async (order: ResellerOrderModel) => {
    const result = await showConfirmAlert(
      `Tolak Pembayaran Order #${order.orderNumber}?`,
      `Pesanan atas nama <b>${order.customerName}</b> akan ditandai Ditolak dan Dibatalkan.`,
      "Ya, Tolak Pesanan",
      "#ef4444"
    );
    if (!result.isConfirmed) return;

    // Optimistic Update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, paymentStatus: "REJECTED", orderStatus: "CANCELLED" }
          : o
      )
    );
    setUpdatingOrderId(order.id);

    try {
      const res = await rejectResellerOrderAction(order.id, "Struk tidak valid / dana belum masuk");
      if (res.success) {
        showSuccessAlert("Pesanan Ditolak", res.message || "Pesanan berhasil ditolak.", 1200);
        loadOrders(false);
        onRefreshData?.();
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? { ...o, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus }
              : o
          )
        );
        showErrorAlert("Gagal", res.message || "Gagal menolak pesanan.");
      }
    } catch {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus }
            : o
        )
      );
      showErrorAlert("Kesalahan", "Gagal menolak pesanan.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleUpdateOrderStatus = async (
    order: ResellerOrderModel,
    newStatus: "PENDING" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED"
  ) => {
    // Optimistic update: ganti status langsung di layar tanpa me-reset UI atau scroll
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, orderStatus: newStatus } : o))
    );
    setUpdatingOrderId(order.id);

    try {
      const res = await updateResellerOrderStatusAction(order.id, newStatus);
      if (res.success) {
        showSuccessAlert("Status Diperbarui", res.message || "Status berhasil diubah.", 1000);
        loadOrders(false); // Background silent sync
      } else {
        // Rollback
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, orderStatus: order.orderStatus } : o))
        );
        showErrorAlert("Gagal", res.message || "Gagal memperbarui status pesanan.");
      }
    } catch {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, orderStatus: order.orderStatus } : o))
      );
      showErrorAlert("Kesalahan", "Gagal memperbarui status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDelete = async (order: ResellerOrderModel) => {
    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Record Order #${order.orderNumber}`,
      `Record pesanan #${order.orderNumber} atas nama <b>${order.customerName}</b> akan dihapus permanen dari sistem.`,
      order.orderNumber,
      "HAPUS"
    );
    if (!confirmed) return;

    // Optimistic deletion
    setOrders((prev) => prev.filter((o) => o.id !== order.id));

    try {
      const res = await deleteResellerOrderRecordAction(order.id);
      if (res.success) {
        showSuccessAlert("Record Dihapus", res.message || "Pesanan berhasil dihapus.", 1200);
        loadOrders(false);
        onRefreshData?.();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal menghapus pesanan.");
        loadOrders(false);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menghapus pesanan.");
      loadOrders(false);
    }
  };

  const handleConvertToAdmin = async (order: ResellerOrderModel) => {
    const result = await showConfirmAlert(
      `Buat Akun Admin Lapangan untuk ${order.customerName}?`,
      `Sistem akan membuatkan akun Mitra Lapangan (Role: ADMIN) dengan email <b>${order.customerEmail}</b> dan password awal <b>Reseller123!</b>.<br/><br/>Akun akan terkunci hingga reseller membayar lisensi modul di dashboardnya.`,
      "Ya, Buatkan Akun",
      "#10b981"
    );
    if (!result.isConfirmed) return;

    try {
      const res = await convertResellerOrderToAdminAction(order.id);
      if (res.success && res.data) {
        let cleanWa = res.data.whatsappNumber?.replace(/[^0-9]/g, "") || "";
        if (cleanWa.startsWith("08")) cleanWa = "62" + cleanWa.slice(1);
        const waMsg = encodeURIComponent(
`Halo *${res.data.fullName}*, selamat datang di kemitraan QR-INAJA 👋
Silakan login menggunakan:

Link : qr-inaja.vercel.app/login
Email: ${res.data.email}
Pw : ${res.data.password}

Segera lakukan penggantian data untuk keamanan bersama, terimakasih.
Salam hangat`
        );
        const waLink = `https://wa.me/${cleanWa}?text=${waMsg}`;

        showSuccessAlert(
          "Akun Berhasil Dibuat! 🎉",
          `Akun Admin untuk ${res.data.fullName} berhasil dibuat.<br/><br/><a href="${waLink}" target="_blank" style="color:#10b981;font-weight:bold;text-decoration:underline;">Klik di sini untuk kirim info login via WhatsApp</a>`
        );
        loadOrders();
        onRefreshData?.();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal membuat akun admin.");
      }
    } catch (err) {
      showErrorAlert("Kesalahan", "Terjadi kesalahan saat membuat akun admin.");
    }
  };

  const getWaLink = (phone: string, name: string, orderNumber: string) => {
    let clean = phone?.replace(/[^0-9]/g, "") || "";
    if (clean.startsWith("08")) clean = "62" + clean.slice(1);
    const msg = encodeURIComponent(
      `Halo Kak ${name}, kami dari Tim Layanan Smart QR terkait pesanan Anda #${orderNumber}. Ada yang bisa kami bantu?`
    );
    return `https://wa.me/${clean}?text=${msg}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 truncate">
                <span>Kelola Pesanan Keranjang Reseller</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold shrink-0">
                  {filteredOrders.length} Pesanan
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Verifikasi pembayaran BNI / QRIS, edit data pembeli, dan kelola proses pengiriman kartu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 sm:px-6 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "ALL"
                  ? "bg-slate-800 text-white border border-slate-700 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Semua ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "PENDING"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Menunggu ({orders.filter((o) => o.paymentStatus === "PENDING").length})
            </button>
            <button
              onClick={() => setStatusFilter("PAID")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "PAID"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Lunas ({orders.filter((o) => o.paymentStatus === "PAID").length})
            </button>
            <button
              onClick={() => setStatusFilter("REJECTED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "REJECTED"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Ditolak ({orders.filter((o) => o.paymentStatus === "REJECTED").length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari order #, nama, WA..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Orders List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="text-xs">Memuat daftar pesanan reseller...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">Tidak Ada Pesanan Ditemukan</p>
              <p className="text-xs text-slate-500">Belum ada transaksi pesanan yang sesuai dengan filter.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredOrders.map((order) => {
                const isPaid = order.paymentStatus === "PAID";
                const isPending = order.paymentStatus === "PENDING";
                const isRejected = order.paymentStatus === "REJECTED";

                return (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3.5 hover:border-slate-700 transition-all shadow-md"
                  >
                    {/* Order Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-white">#{order.orderNumber}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPaid
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : isPending
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {isPaid ? "LUNAS / TERVERIFIKASI" : isPending ? "MENUNGGU VERIFIKASI" : "DITOLAK"}
                        </span>
                        {order.shippingFee > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            <span>Ekspedisi Sistem (Rp {order.shippingFee.toLocaleString("id-ID")})</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span>Pengiriman Dibayar Sendiri</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-sm text-emerald-400 block">
                            Rp {order.totalAmount.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {order.paymentMethod === "MIDTRANS_QRIS" ? "⚡ Midtrans QRIS" : "🏦 Transfer BNI"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Grid Info: Data Pembeli & Item Pesanan */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start text-xs">
                      {/* Customer Details */}
                      <div className="md:col-span-5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3 text-emerald-400" />
                            Data Pemesan / Penerima
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditCustomer(order)}
                            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                            title="Edit Data Nama, No. HP, Email, Alamat Pembeli"
                          >
                            <Edit className="w-2.5 h-2.5" />
                            <span>Edit Data</span>
                          </button>
                        </div>

                        <div className="space-y-1 text-slate-300 pt-0.5">
                          <div className="font-bold text-white text-xs">{order.customerName}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{order.customerPhone}</span>
                            <a
                              href={getWaLink(order.customerPhone, order.customerName, order.orderNumber)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 inline-flex items-center ml-1"
                              title="Chat WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span className="truncate">{order.customerEmail}</span>
                          </div>
                          
                          {/* Pengiriman / Wilayah */}
                          <div className="flex items-start gap-1.5 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                            <Truck className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                            <span>
                              {order.shippingFee > 0 ? (
                                <>
                                  <strong className="text-sky-300">Ekspedisi Ikut Sistem:</strong> {order.province || "Jawa Timur & Bali"} (Rp {order.shippingFee.toLocaleString("id-ID")})
                                </>
                              ) : (
                                <strong className="text-amber-300">Pengiriman Dibayar Sendiri / Ambil Sendiri</strong>
                              )}
                            </span>
                          </div>

                          {order.shippingAddress && (
                            <div className="flex items-start gap-1.5 text-[11px] text-slate-300 pt-1">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{order.shippingAddress}</span>
                            </div>
                          )}
                          {order.notes && (
                            <div className="text-[10px] text-slate-400 italic pt-0.5">
                              Catatan: &ldquo;{order.notes}&rdquo;
                            </div>
                          )}

                          {/* Outlet Status Badge if Already Activated */}
                          {order.admin?.outlet && (
                            <div className="p-2.5 mt-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                              <div className="flex items-center justify-between text-xs text-emerald-300">
                                <span className="font-bold flex items-center gap-1.5 text-white">
                                  <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>{order.admin.outlet.name}</span>
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                  Portal Outlet Aktif
                                </span>
                              </div>
                              {order.admin.outlet.qrCards && order.admin.outlet.qrCards.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px]">
                                  <span className="text-[10px] text-slate-400 font-semibold">Kartu Terpasang:</span>
                                  {order.admin.outlet.qrCards.map((c) => (
                                    <span
                                      key={c.code}
                                      className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-sky-300 border border-slate-700"
                                    >
                                      {c.code}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items List & Struk Bukti */}
                      <div className="md:col-span-7 space-y-2">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Rincian Item ({order.totalQuantity} pcs total)
                          </span>
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-200"
                            >
                              <span className="font-medium truncate pr-2">
                                {item.productName} x <strong className="text-white font-mono">{item.quantity} pcs</strong>
                              </span>
                              <span className="font-mono font-bold text-slate-300 shrink-0">
                                Rp {item.subtotal.toLocaleString("id-ID")}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-[11px] py-1 px-2.5 text-slate-400">
                            <span>Biaya Ongkir:</span>
                            <span className="font-mono font-semibold">
                              {order.shippingFee > 0 ? (
                                <span className="text-slate-200">
                                  Rp {order.shippingFee.toLocaleString("id-ID")}{" "}
                                  <span className="text-[10px] text-sky-400 font-normal">({order.province || "Ekspedisi Sistem"})</span>
                                </span>
                              ) : (
                                <span className="text-amber-400 font-medium">
                                  Rp 0 (Dibayar Sendiri oleh Pembeli)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {order.discountAmount > 0 && (
                          <div className="text-[11px] text-emerald-400 flex items-center justify-between px-1">
                            <span>Diskon Reward Outlet VIP:</span>
                            <span className="font-mono font-bold">- Rp {order.discountAmount.toLocaleString("id-ID")}</span>
                          </div>
                        )}

                        {/* Struk Bukti Bayar Button */}
                        {order.receiptImageUrl && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setPreviewImage(order.receiptImageUrl || null)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                              <span>Lihat Foto Struk Bukti Transfer BNI</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Order Status Badge / Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-semibold">Status Pengiriman:</span>
                        <div className="relative flex items-center">
                          <select
                            value={order.orderStatus}
                            disabled={updatingOrderId === order.id}
                            onChange={(e) =>
                              handleUpdateOrderStatus(
                                order,
                                e.target.value as "PENDING" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED"
                              )
                            }
                            className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-60"
                          >
                            <option value="PENDING">⏳ Menunggu (Pending)</option>
                            <option value="PROCESSING">📦 Diproses (Processing)</option>
                            <option value="SHIPPED">🚚 Dikirim (Shipped)</option>
                            <option value="COMPLETED">✅ Selesai (Completed)</option>
                            <option value="CANCELLED">❌ Dibatalkan (Cancelled)</option>
                          </select>
                          {updatingOrderId === order.id && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 ml-1.5" />
                          )}
                        </div>
                      </div>

                      {/* Approval & Delete Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Tombol Input / Edit Nomor Resi J&T Express (Auto Tracking) */}
                        <button
                          type="button"
                          onClick={() => handleOpenTrackingModal(order)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                            order.trackingNumber
                              ? "bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-300 border border-emerald-500/30"
                              : "bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30"
                          }`}
                          title="Input No. Resi J&T Express / Ekspedisi (Auto-Update Realtime)"
                        >
                          <Truck className="w-3.5 h-3.5 text-purple-400" />
                          <span>{order.trackingNumber ? `Resi: ${order.trackingNumber}` : "+ No. Resi J&T"}</span>
                        </button>

                        {/* Tombol Cetak / Download Label Pengiriman Ekspedisi */}
                        <button
                          type="button"
                          onClick={() => setShippingLabelOrder(order)}
                          className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                          title="Download gambar atau cetak label resi pengiriman untuk ekspedisi"
                        >
                          <Truck className="w-3.5 h-3.5 text-sky-400" />
                          <span>Label Pengiriman</span>
                        </button>

                        {/* Tombol Buat / Detail Akun Outlet (Retail) vs Akun Admin Lapangan (Grosir) */}
                        {order.orderType === "RETAIL" || (order.notes && order.notes.includes("[Outlet:")) ? (
                          <button
                            type="button"
                            onClick={() => setActivatingOutletOrder(order)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              order.admin?.outlet
                                ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
                                : "bg-gradient-to-r from-emerald-600/25 to-teal-600/25 hover:from-emerald-600/40 hover:to-teal-600/40 text-emerald-300 border border-emerald-500/40 font-extrabold shadow-sm"
                            }`}
                            title={
                              order.admin?.outlet
                                ? "Lihat rincian akun Portal Outlet & kartu terpasang"
                                : "Aktifkan akun Portal Outlet & pasangkan kartu kosong"
                            }
                          >
                            {order.admin?.outlet ? (
                              <>
                                <Store className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Detail Akun Outlet</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Aktifkan Akun Outlet</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConvertToAdmin(order)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            title="Buatkan akun login Admin Lapangan untuk pemesan ini"
                          >
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{order.adminId ? "Detail Akun Admin" : "Buatkan Akun Admin"}</span>
                          </button>
                        )}

                        {isPending && (
                          <>
                            <button
                              type="button"
                              disabled={updatingOrderId === order.id}
                              onClick={() => handleReject(order)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              Tolak
                            </button>
                            <button
                              type="button"
                              disabled={updatingOrderId === order.id}
                              onClick={() => handleApprove(order)}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {updatingOrderId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Setujui Pembayaran</span>
                            </button>
                          </>
                        )}

                        {isMaster && (
                          <button
                            type="button"
                            onClick={() => handleDelete(order)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer ml-1"
                            title="Hapus Record Pesanan Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Edit Customer Details */}
      {editingOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-400" />
                <span>Edit Data Pembeli (#{editingOrder.orderNumber})</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Pemesan / Penerima *</label>
                <input
                  type="text"
                  required
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">No. WhatsApp / HP *</label>
                <input
                  type="text"
                  required
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={editCustomerEmail}
                  onChange={(e) => setEditCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Alamat Pengiriman</label>
                <textarea
                  rows={2}
                  value={editShippingAddress}
                  onChange={(e) => setEditShippingAddress(e.target.value)}
                  placeholder="Alamat lengkap penerima..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Pesanan</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingCustomer}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                {isSavingCustomer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Input & Live Tracking Resi Ekspedisi */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    Nomor Resi & Ekspedisi (#{trackingModalOrder.orderNumber})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Otomasi tracking J&T Express & update otomatis saat barang diterima
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackingModalOrder(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTrackingNumber} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pilih Ekspedisi / Kurir</label>
                <select
                  value={inputCourierName}
                  onChange={(e) => setInputCourierName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="J&T Express">🚚 J&T Express (Rekomendasi Utama)</option>
                  <option value="JNE Express">📦 JNE Express (Reg / YES / OKE)</option>
                  <option value="SiCepat Ekspres">⚡ SiCepat Ekspres (GOKIL / REG)</option>
                  <option value="Anteraja">🛵 Anteraja</option>
                  <option value="POS Indonesia">📮 POS Indonesia</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nomor Resi Pengiriman (AWB) *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: JX1234567890 / JP..."
                    value={inputTrackingNumber}
                    onChange={(e) => setInputTrackingNumber(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setInputTrackingNumber(text.trim().toUpperCase());
                      } catch {}
                    }}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-[11px] shrink-0 cursor-pointer"
                    title="Paste dari Clipboard"
                  >
                    Paste
                  </button>
                </div>
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[11px] text-purple-300 space-y-1">
                <span className="font-bold block text-purple-200">✨ Keunggulan Otomasi Resi:</span>
                <p className="text-slate-300">
                  1. Status pesanan langsung otomatis berubah jadi <strong>&ldquo;Sedang Dikirim (SHIPPED)&rdquo;</strong>.<br />
                  2. Sistem otomatis membaca perjalanan paket J&T dan otomatis mengubah status jadi <strong>&ldquo;Selesai (COMPLETED)&rdquo;</strong> saat paket tiba.
                </p>
              </div>

              {/* WhatsApp Dispatch Button */}
              {trackingModalOrder.customerPhone && inputTrackingNumber.trim() && (
                <div className="pt-1">
                  <a
                    href={`https://wa.me/${trackingModalOrder.customerPhone.replace(/[^0-9]/g, "").startsWith("08") ? "62" + trackingModalOrder.customerPhone.replace(/[^0-9]/g, "").slice(1) : trackingModalOrder.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Halo Kak ${trackingModalOrder.customerName}, paket pesanan Smart QR Anda #${trackingModalOrder.orderNumber} telah dikirim melalui *${inputCourierName}*.\n\n📦 *No. Resi:* ${inputTrackingNumber.trim()}\n🌐 *Lacak Pesanan:* https://qr-inaja.vercel.app/reseller\n\nTerimakasih telah bermitra dengan kami! 🙏`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold flex items-center justify-center gap-1.5 transition-all text-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kirim Notifikasi Resi ke WhatsApp Pembeli</span>
                  </a>
                </div>
              )}

              {/* Live Tracking Result Preview */}
              {isLoadingLiveTracking && (
                <div className="py-4 text-center space-y-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto" />
                  <span className="text-[11px] text-slate-400">Menghubungkan ke server {inputCourierName}...</span>
                </div>
              )}

              {liveTrackingData && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-purple-400" />
                      Status Server Kurir:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      liveTrackingData.isDelivered
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    }`}>
                      {liveTrackingData.statusDescription}
                    </span>
                  </div>

                  {liveTrackingData.history && liveTrackingData.history.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pt-1">
                      {liveTrackingData.history.map((h, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-mono">{h.date}</span>
                            {h.location && <span className="font-semibold text-slate-300">{h.location}</span>}
                          </div>
                          <p className="text-slate-200">{h.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1">
                    <a
                      href={liveTrackingData.officialTrackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Cek Langsung di Website Resmi {liveTrackingData.courierName}</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTrackingModalOrder(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSavingTracking || !inputTrackingNumber.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingTracking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan & Aktifkan Tracking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Struk Bukti */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Foto Struk Bukti Transfer BNI
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Bukti Transfer" className="w-full max-h-[75vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* Modal Aktivasi Akun Outlet & Pasang Kartu Kosong */}
      <ActivateOutletFromOrderModal
        isOpen={Boolean(activatingOutletOrder)}
        order={activatingOutletOrder}
        onClose={() => setActivatingOutletOrder(null)}
        onSuccess={() => {
          loadOrders();
          onRefreshData?.();
        }}
      />

      {/* Modal Label Pengiriman Paket Siap Tempel Ekspedisi */}
      <ShippingLabelModal
        isOpen={Boolean(shippingLabelOrder)}
        order={shippingLabelOrder}
        onClose={() => setShippingLabelOrder(null)}
      />
    </div>
  );
}
