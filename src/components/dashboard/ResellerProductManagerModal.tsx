"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Package,
  Sparkles,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  Tag,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showTwoStepDeleteConfirmAlert } from "@/lib/swal";
import {
  getResellerProductsAction,
  createResellerProductAction,
  updateResellerProductAction,
  deleteResellerProductAction,
} from "@/lib/actions/reseller-shop.actions";
import { ResellerProductModel } from "@/types/models";

interface ResellerProductManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMaster: boolean;
}

export function ResellerProductManagerModal({
  isOpen,
  onClose,
  isMaster,
}: ResellerProductManagerModalProps) {
  const [products, setProducts] = useState<ResellerProductModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<ResellerProductModel | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState<number>(25000);
  const [formRetailPrice, setFormRetailPrice] = useState<number>(49000);
  const [formMinOrder, setFormMinOrder] = useState<number>(8);
  const [formUnit, setFormUnit] = useState("pcs");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formIsActive, setFormIsActive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadProducts = () => {
    setIsLoading(true);
    getResellerProductsAction(false)
      .then((res) => {
        if (res.success && res.data) {
          setProducts(res.data as ResellerProductModel[]);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName("");
    setFormDesc("");
    setFormPrice(25000);
    setFormRetailPrice(49000);
    setFormMinOrder(8);
    setFormUnit("pcs");
    setFormImage(null);
    setFormIsActive(true);
    setIsAddingNew(true);
  };

  const handleOpenEdit = (p: ResellerProductModel) => {
    setIsAddingNew(false);
    setEditingProduct(p);
    setFormName(p.name);
    setFormDesc(p.description || "");
    setFormPrice(p.price);
    setFormRetailPrice(p.retailPrice || 49000);
    setFormMinOrder(p.minOrder);
    setFormUnit(p.unit || "pcs");
    setFormImage(p.imageUrl || null);
    setFormIsActive(p.isActive);
  };

  const handleCloseForm = () => {
    setIsAddingNew(false);
    setEditingProduct(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showErrorAlert("File Terlalu Besar", "Ukuran foto maksimal 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formName.trim() || !formPrice) {
      showErrorAlert("Validasi Gagal", "Nama produk dan harga wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      if (isAddingNew) {
        const res = await createResellerProductAction({
          name: formName.trim(),
          description: formDesc.trim(),
          imageUrl: formImage || undefined,
          price: Number(formPrice),
          retailPrice: Number(formRetailPrice) || 49000,
          minOrder: Number(formMinOrder) || 8,
          unit: formUnit.trim() || "pcs",
        });

        if (res.success) {
          showSuccessAlert("Produk Ditambahkan", res.message || "Produk berhasil ditambahkan.", 1500);
          handleCloseForm();
          loadProducts();
        } else {
          showErrorAlert("Gagal", res.message || "Gagal menambahkan produk.");
        }
      } else if (editingProduct) {
        const res = await updateResellerProductAction(editingProduct.id, {
          name: formName.trim(),
          description: formDesc.trim(),
          imageUrl: formImage || undefined,
          price: Number(formPrice),
          retailPrice: Number(formRetailPrice) || 49000,
          minOrder: Number(formMinOrder) || 8,
          unit: formUnit.trim() || "pcs",
          isActive: formIsActive,
        });

        if (res.success) {
          showSuccessAlert("Produk Diperbarui", res.message || "Produk berhasil diperbarui.", 1500);
          handleCloseForm();
          loadProducts();
        } else {
          showErrorAlert("Gagal", res.message || "Gagal memperbarui produk.");
        }
      }
    } catch (err) {
      console.error("Save product error:", err);
      showErrorAlert("Kesalahan", "Terjadi kesalahan saat menyimpan produk.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (p: ResellerProductModel) => {
    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Produk "${p.name}"`,
      `Produk <b>${p.name}</b> akan dihapus permanen dari katalog reseller.`,
      p.name,
      "HAPUS"
    );
    if (!confirmed) return;

    try {
      const res = await deleteResellerProductAction(p.id);
      if (res.success) {
        showSuccessAlert("Produk Dihapus", res.message || "Produk berhasil dihapus.", 1500);
        loadProducts();
      } else {
        showErrorAlert("Gagal", res.message || "Gagal menghapus produk.");
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menghapus produk.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 truncate">
                <span>Kelola Katalog Produk Reseller</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                  Khusus Super Admin 1
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Atur varian produk, upload foto, ubah harga, dan batas minimum order reseller
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isAddingNew && !editingProduct && isMaster && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Produk Baru</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Form Create / Edit */}
          {(isAddingNew || editingProduct) && (
            <form onSubmit={handleSave} className="p-4 sm:p-5 bg-slate-950/80 border border-amber-500/30 rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>{isAddingNew ? "Tambah Produk Reseller Baru" : `Edit Produk "${editingProduct?.name}"`}</span>
                </h4>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Nama Produk */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Nama / Judul Produk *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Kartu Akrilik Standar (c-Series)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Harga Grosir Reseller per pcs */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Harga Grosir Reseller (Min. 8 pcs) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    placeholder="25000"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Khusus paket reseller di /reseller</span>
                </div>

                {/* Harga Eceran Outlet / Beli 1-2 pcs */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Harga Eceran Outlet (Beli 1 atau 2 pcs) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={formRetailPrice}
                    onChange={(e) => setFormRetailPrice(Number(e.target.value))}
                    placeholder="49000"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Untuk pembelian eceran di landing page</span>
                </div>

                {/* Min. Order */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Batas Minimal Order Grosir (Qty) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(Number(e.target.value))}
                    placeholder="8"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Deskripsi */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Keterangan / Deskripsi Produk</label>
                  <textarea
                    rows={2}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Keterangan ukuran, bahan akrilik, chip NFC, dynamic QR..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Upload Foto Produk */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-slate-300 font-semibold">Foto Produk</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {formImage ? (
                    <div className="flex items-center gap-3 p-2 bg-slate-900 rounded-xl border border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formImage} alt="Preview" className="w-14 h-14 object-cover rounded-lg shrink-0 border" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-emerald-400 font-semibold block">Foto Produk Terpasang</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] text-amber-400 hover:underline cursor-pointer mr-3"
                        >
                          Ganti Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormImage(null)}
                          className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Upload Foto Produk (Maks 5MB)</span>
                    </button>
                  )}
                </div>

                {/* Status Aktif */}
                {!isAddingNew && (
                  <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="product_active_status"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-800 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="product_active_status" className="text-xs text-slate-300 cursor-pointer font-medium">
                      Tampilkan di Katalog Reseller (Status Aktif)
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Produk</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* List Products Table & Cards */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span className="text-xs">Memuat daftar produk...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">Belum Ada Produk</p>
              <p className="text-xs text-slate-500">Klik &quot;+ Produk Baru&quot; di atas untuk menambahkan item katalog reseller.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="p-3.5 sm:p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-800">
                      {product.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">{product.name}</h4>
                        {product.isActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {product.description || "Tanpa deskripsi"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
                        <span className="font-mono font-bold text-amber-300">
                          Grosir: Rp {product.price.toLocaleString("id-ID")}/{product.unit} (Min. {product.minOrder})
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="font-mono font-bold text-emerald-300">
                          Eceran: Rp {(product.retailPrice || 49000).toLocaleString("id-ID")}/{product.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isMaster && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(product)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                        title="Edit Produk"
                      >
                        <Edit className="w-4 h-4 text-amber-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
