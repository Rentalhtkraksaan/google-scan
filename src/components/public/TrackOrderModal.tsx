"use client";

import { useState } from "react";
import {
  X,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Receipt,
  Loader2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { trackResellerOrderAction } from "@/lib/actions/reseller-shop.actions";
import { ResellerOrderModel } from "@/types/models";

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function TrackOrderModal({ isOpen, onClose, initialQuery = "" }: TrackOrderModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [orders, setOrders] = useState<ResellerOrderModel[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const res = await trackResellerOrderAction(searchQuery.trim());
      if (res.success && res.data) {
        setOrders(res.data as ResellerOrderModel[]);
      } else {
        setOrders([]);
        setErrorMessage(res.message || "Pesanan tidak ditemukan.");
      }
    } catch (err) {
      setOrders([]);
      setErrorMessage("Terjadi kesalahan teknis saat melacak pesanan.");
    } finally {
      setIsLoading(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "PROCESSING":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span>Sedang Dikemas / Diproses</span>
          </span>
        );
      case "SHIPPED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-sky-400" />
            <span>Sedang Dalam Pengiriman</span>
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pesanan Selesai / Diterima</span>
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Dibatalkan</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Menunggu Pembayaran</span>
          </span>
        );
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">Lacak Pesanan Reseller</h3>
              <p className="text-xs text-slate-400">Pantau status pengiriman & verifikasi paket kartu QR Anda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearch} className="pt-5 pb-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik Nomor Pesanan (contoh: A9C1-XK8P-7890) atau No. WhatsApp..."
              className="w-full pl-11 pr-28 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="absolute right-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Lacak</span>
            </button>
          </div>
        </form>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pt-2">
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Mencari data pesanan di sistem...</p>
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold text-rose-300">{errorMessage}</p>
            </div>
          )}

          {!isLoading && !hasSearched && (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto text-slate-400">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Masukkan Nomor Pesanan yang Anda dapatkan saat checkout, atau masukkan Nomor WhatsApp terdaftar Anda.
              </p>
            </div>
          )}

          {!isLoading && hasSearched && orders.length > 0 && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-semibold px-1">
                Ditemukan <strong className="text-indigo-400">{orders.length}</strong> pesanan terkait:
              </div>

              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4 transition-all shadow-md"
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-white">#{order.orderNumber}</span>
                        {getOrderStatusBadge(order.orderStatus)}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Waktu Pemesanan: {new Date(order.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400 block">Total Pembayaran</span>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Shipping Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Penerima</span>
                      <span className="font-semibold text-slate-200">{order.customerName}</span>
                      <span className="block text-slate-400 font-mono text-[11px]">{order.customerPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Alamat Pengiriman</span>
                      <span className="text-slate-300 text-[11px] line-clamp-2">
                        {order.shippingAddress || "Alamat standar"}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Rincian Produk ({order.totalQuantity} pcs)
                    </span>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-900/40 rounded-lg border border-slate-800/50"
                        >
                          <span className="text-slate-300 font-medium">
                            {item.quantity}x {item.productName}
                          </span>
                          <span className="font-mono text-slate-400">
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-[11px] py-1 px-2.5 text-slate-400">
                        <span>Biaya Ongkir:</span>
                        <span className="font-mono font-semibold">
                          {(order.shippingFee && order.shippingFee > 0)
                            ? `Rp ${order.shippingFee.toLocaleString("id-ID")} (${order.province || "Ekspedisi"})`
                            : "Rp 0 (Pengiriman Dibayar Sendiri)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Courier & Tracking Number Card (Clean, Simple & Direct) */}
                  {order.trackingNumber ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 space-y-3 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <Truck className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                              Ekspedisi Pengiriman
                            </span>
                            <span className="font-extrabold text-white text-xs sm:text-sm">
                              {order.courierName || "J&T Express"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                            order.orderStatus === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          }`}>
                            {order.orderStatus === "COMPLETED" ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Paket Telah Sampai</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-3 h-3 text-sky-400" />
                                <span>Sedang Dikirim</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Resi Box & Actions */}
                      <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Nomor Resi Pengiriman:
                            </span>
                            <span className="font-mono text-sm sm:text-base font-extrabold text-sky-300 tracking-wider">
                              {order.trackingNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                if (order.trackingNumber) {
                                  navigator.clipboard.writeText(order.trackingNumber);
                                  setCopiedAwb(order.trackingNumber);
                                  setTimeout(() => setCopiedAwb(null), 2000);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                              title="Salin Nomor Resi"
                            >
                              {copiedAwb === order.trackingNumber ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-300 font-bold">Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Salin Resi</span>
                                </>
                              )}
                            </button>

                            <a
                              href={
                                (order.courierName || "").toLowerCase().includes("jne")
                                  ? `https://www.jne.co.id/tracking-package?awb=${encodeURIComponent(order.trackingNumber)}`
                                  : (order.courierName || "").toLowerCase().includes("sicepat")
                                  ? `https://www.sicepat.com/checkAwb?awb=${encodeURIComponent(order.trackingNumber)}`
                                  : `https://www.jet.co.id/track?awb=${encodeURIComponent(order.trackingNumber)}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-colors border border-sky-500/30"
                              title="Lacak di Web Resmi Ekspedisi"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                              <span>Cek di Web Resmi {order.courierName || "J&T"}</span>
                            </a>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 leading-relaxed">
                          💡 Paket pesanan Anda telah diserahkan ke kurir <strong>{order.courierName || "J&T Express"}</strong>. Silakan klik tombol <em>&ldquo;Cek di Web Resmi&rdquo;</em> untuk melihat linimasa perjalanan paket Anda secara live.
                        </p>
                      </div>
                    </div>
                  ) : order.orderStatus === "PROCESSING" ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Paket Anda sedang dipersiapkan dan dikemas oleh tim gudang. Nomor resi akan segera diupdate.</span>
                    </div>
                  ) : null}

                  {/* Payment Status Info */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Status Pembayaran:</span>
                    {order.paymentStatus === "PAID" ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> LUNAS
                      </span>
                    ) : order.paymentStatus === "REJECTED" ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> DITOLAK
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> MENUNGGU VERIFIKASI
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
