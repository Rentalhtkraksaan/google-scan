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
} from "@/lib/actions/reseller-shop.actions";
import { ResellerOrderModel } from "@/types/models";

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

  // Modal Edit Customer Data
  const [editingOrder, setEditingOrder] = useState<ResellerOrderModel | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editCustomerEmail, setEditCustomerEmail] = useState("");
  const [editShippingAddress, setEditShippingAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const loadOrders = () => {
    setIsLoading(true);
    getResellerOrdersAction()
      .then((res) => {
        if (res.success && res.data) {
          setOrders(res.data as ResellerOrderModel[]);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
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
    try {
      const res = await updateResellerOrderCustomerDataAction(editingOrder.id, {
        customerName: editCustomerName.trim(),
        customerPhone: editCustomerPhone.trim(),
        customerEmail: editCustomerEmail.trim(),
        shippingAddress: editShippingAddress.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      if (res.success) {
        showSuccessAlert("Data Diperbarui", res.message || "Data pembeli berhasil diperbarui.", 1500);
        setEditingOrder(null);
        loadOrders();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal memperbarui data pemesan.");
      }
    } catch (err) {
      console.error("Save customer data error:", err);
      showErrorAlert("Kesalahan", "Terjadi kesalahan saat menyimpan data pemesan.");
    } finally {
      setIsSavingCustomer(false);
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

    try {
      const res = await approveResellerOrderAction(order.id);
      if (res.success) {
        showSuccessAlert("Pembayaran Disetujui", res.message || "Pesanan berhasil disetujui.", 1500);
        loadOrders();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal menyetujui pesanan.");
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menyetujui pesanan.");
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

    try {
      const res = await rejectResellerOrderAction(order.id, "Struk tidak valid / dana belum masuk");
      if (res.success) {
        showSuccessAlert("Pesanan Ditolak", res.message || "Pesanan berhasil ditolak.", 1500);
        loadOrders();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal menolak pesanan.");
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menolak pesanan.");
    }
  };

  const handleUpdateOrderStatus = async (
    order: ResellerOrderModel,
    newStatus: "PENDING" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED"
  ) => {
    try {
      const res = await updateResellerOrderStatusAction(order.id, newStatus);
      if (res.success) {
        showSuccessAlert("Status Diperbarui", res.message || "Status berhasil diubah.", 1200);
        loadOrders();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal memperbarui status pesanan.");
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal memperbarui status.");
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

    try {
      const res = await deleteResellerOrderRecordAction(order.id);
      if (res.success) {
        showSuccessAlert("Record Dihapus", res.message || "Pesanan berhasil dihapus.", 1500);
        loadOrders();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal menghapus pesanan.");
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menghapus pesanan.");
    }
  };

  const getWaLink = (phone: string, name: string, orderNumber: string) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("08")) clean = "62" + clean.slice(1);
    const msg = encodeURIComponent(
      `Halo Kak ${name} dari Smart QR Review. Mengenai pesanan kartu #${orderNumber}...`
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
                          {order.shippingAddress && (
                            <div className="flex items-start gap-1.5 text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{order.shippingAddress}</span>
                            </div>
                          )}
                          {order.notes && (
                            <div className="text-[10px] text-slate-400 italic pt-0.5">
                              Catatan: &ldquo;{order.notes}&rdquo;
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
                        <select
                          value={order.orderStatus}
                          onChange={(e) =>
                            handleUpdateOrderStatus(
                              order,
                              e.target.value as "PENDING" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED"
                            )
                          }
                          className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="PENDING">⏳ Menunggu (Pending)</option>
                          <option value="PROCESSING">📦 Diproses (Processing)</option>
                          <option value="SHIPPED">🚚 Dikirim (Shipped)</option>
                          <option value="COMPLETED">✅ Selesai (Completed)</option>
                          <option value="CANCELLED">❌ Dibatalkan (Cancelled)</option>
                        </select>
                      </div>

                      {/* Approval & Delete Actions */}
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReject(order)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                            >
                              Tolak
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(order)}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
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
    </div>
  );
}
