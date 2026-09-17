"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Tag,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  Save,
  AlertTriangle,
} from "lucide-react";
import {
  getAllPromosAction,
  createPromoAction,
  updatePromoAction,
  deletePromoAction,
} from "@/lib/actions/promo.actions";

type Promo = {
  id: string;
  label: string;
  description: string | null;
  originalPrice: string;
  discountPrice: string;
  priceUnit: string;
  expiredAt: Date | null;
  isActive: boolean;
  order: number;
};

type PromoManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const EMPTY_FORM = {
  label: "",
  description: "",
  originalPrice: "",
  discountPrice: "",
  priceUnit: "rb",
  expiredAt: "",
  isActive: true,
};

export function PromoManagerModal({ isOpen, onClose }: PromoManagerModalProps) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (isOpen) loadPromos();
  }, [isOpen]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function loadPromos() {
    setLoading(true);
    try {
      const data = await getAllPromosAction();
      setPromos(data as Promo[]);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(promo: Promo) {
    setEditingId(promo.id);
    setForm({
      label: promo.label,
      description: promo.description || "",
      originalPrice: promo.originalPrice,
      discountPrice: promo.discountPrice,
      priceUnit: promo.priceUnit,
      expiredAt: promo.expiredAt
        ? new Date(promo.expiredAt).toISOString().slice(0, 16)
        : "",
      isActive: promo.isActive,
    });
    setShowForm(true);
  }

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("label", form.label);
      fd.set("description", form.description);
      fd.set("originalPrice", form.originalPrice);
      fd.set("discountPrice", form.discountPrice);
      fd.set("priceUnit", form.priceUnit);
      fd.set("expiredAt", form.expiredAt);
      fd.set("isActive", String(form.isActive));

      const result = editingId
        ? await updatePromoAction(editingId, fd)
        : await createPromoAction(fd);

      if (result.success) {
        setToast({ type: "success", msg: result.message });
        setShowForm(false);
        await loadPromos();
      } else {
        setToast({ type: "error", msg: result.message });
      }
    });
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`Hapus promo "${label}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    startTransition(async () => {
      const result = await deletePromoAction(id);
      setToast({ type: result.success ? "success" : "error", msg: result.message });
      if (result.success) await loadPromos();
    });
  }

  function isExpired(expiredAt: Date | null) {
    if (!expiredAt) return false;
    return new Date(expiredAt) < new Date();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0d1220] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Tag className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Kelola Promo & Diskon</h2>
              <p className="text-xs text-slate-400">Tambah, edit, atau hapus promo landing page</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mx-6 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/15 text-red-400 border border-red-500/30"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            {toast.msg}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Form Tambah/Edit */}
          {showForm && (
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                {editingId ? "✏️ Edit Promo" : "➕ Tambah Promo Baru"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Judul Promo *</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Contoh: Promo Spesial September"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Deskripsi (opsional)</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Contoh: Berlaku untuk pembelian kartu baru"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Harga Asli (dicoret) *</label>
                  <input
                    type="text"
                    value={form.originalPrice}
                    onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                    placeholder="Contoh: 50"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Harga Diskon *</label>
                  <input
                    type="text"
                    value={form.discountPrice}
                    onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
                    placeholder="Contoh: 35"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Satuan Harga</label>
                  <input
                    type="text"
                    value={form.priceUnit}
                    onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
                    placeholder="rb / ribu / K / (kosong)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Contoh hasil: <span className="text-amber-400">35{form.priceUnit}</span>
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Berlaku Sampai</label>
                  <input
                    type="datetime-local"
                    value={form.expiredAt}
                    onChange={(e) => setForm({ ...form, expiredAt: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/60"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Kosongkan = promo selamanya</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setForm({ ...form, isActive: !form.isActive })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        form.isActive ? "bg-amber-500" : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                          form.isActive ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </div>
                    <span className="text-xs text-slate-300">Tampilkan di landing page</span>
                  </label>
                </div>
              </div>

              {/* Preview */}
              {(form.originalPrice || form.discountPrice) && (
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 mb-1">Preview tampilan:</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-500 line-through text-sm">
                      {form.originalPrice}{form.priceUnit}
                    </span>
                    <span className="text-amber-400 font-bold text-xl">
                      {form.discountPrice}{form.priceUnit}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={isPending || !form.label || !form.originalPrice || !form.discountPrice}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {editingId ? "Simpan Perubahan" : "Tambah Promo"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Tombol Tambah */}
          {!showForm && (
            <button
              onClick={openAdd}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-amber-500/40 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Tambah Promo Baru
            </button>
          )}

          {/* Daftar Promo */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          ) : promos.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              Belum ada promo. Klik tombol di atas untuk menambahkan.
            </div>
          ) : (
            <div className="space-y-3">
              {promos.map((promo) => {
                const expired = isExpired(promo.expiredAt);
                return (
                  <div
                    key={promo.id}
                    className={`bg-slate-900/60 border rounded-2xl p-4 flex items-start justify-between gap-3 ${
                      !promo.isActive || expired
                        ? "border-slate-800 opacity-60"
                        : "border-amber-500/20"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white truncate">{promo.label}</span>
                        {!promo.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                            Nonaktif
                          </span>
                        )}
                        {expired && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Expired
                          </span>
                        )}
                      </div>
                      {promo.description && (
                        <p className="text-xs text-slate-400 truncate">{promo.description}</p>
                      )}
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="text-slate-500 line-through text-xs">
                          {promo.originalPrice}{promo.priceUnit}
                        </span>
                        <span className="text-amber-400 font-bold">
                          {promo.discountPrice}{promo.priceUnit}
                        </span>
                      </div>
                      {promo.expiredAt && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                          <Calendar className="w-3 h-3" />
                          s/d {new Date(promo.expiredAt).toLocaleDateString("id-ID", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(promo)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id, promo.label)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
