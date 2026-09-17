"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import {
  X,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ImageIcon,
  Edit,
  Save,
  Images,
} from "lucide-react";
import {
  getProductPhotosAction,
  uploadProductPhotoAction,
  updateProductPhotoCaptionAction,
  deleteProductPhotoAction,
} from "@/lib/actions/product-photo.actions";

type ProductPhoto = {
  id: string;
  imageData: string;
  caption: string | null;
  order: number;
};

type ProductPhotoManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProductPhotoManagerModal({ isOpen, onClose }: ProductPhotoManagerModalProps) {
  const [photos, setPhotos] = useState<ProductPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editingCaption, setEditingCaption] = useState<{ id: string; value: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<{ file: File; preview: string; caption: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) loadPhotos();
  }, [isOpen]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function loadPhotos() {
    setLoading(true);
    try {
      const data = await getProductPhotosAction();
      setPhotos(data as ProductPhoto[]);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPreviewFile({ file, preview, caption: "" });
    e.target.value = "";
  }

  function handleUpload() {
    if (!previewFile) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", previewFile.file);
      fd.set("caption", previewFile.caption);
      const result = await uploadProductPhotoAction(fd);
      setToast({ type: result.success ? "success" : "error", msg: result.message });
      if (result.success) {
        URL.revokeObjectURL(previewFile.preview);
        setPreviewFile(null);
        await loadPhotos();
      }
    });
  }

  function handleSaveCaption() {
    if (!editingCaption) return;
    startTransition(async () => {
      const result = await updateProductPhotoCaptionAction(editingCaption.id, editingCaption.value);
      setToast({ type: result.success ? "success" : "error", msg: result.message });
      if (result.success) {
        setEditingCaption(null);
        await loadPhotos();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Hapus foto ini? Data akan dihapus permanen dari database.")) return;
    startTransition(async () => {
      const result = await deleteProductPhotoAction(id);
      setToast({ type: result.success ? "success" : "error", msg: result.message });
      if (result.success) await loadPhotos();
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0d1220] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
              <Images className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Kelola Foto Produk</h2>
              <p className="text-xs text-slate-400">
                {photos.length} foto tersimpan · Hapus foto = data hilang bersih dari DB
              </p>
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

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Upload Area */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">📤 Upload Foto Baru</h3>

            {previewFile ? (
              <div className="space-y-3">
                {/* Preview */}
                <div className="relative w-full max-h-48 rounded-xl overflow-hidden bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewFile.preview}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* Caption input */}
                <input
                  type="text"
                  value={previewFile.caption}
                  onChange={(e) => setPreviewFile({ ...previewFile, caption: e.target.value })}
                  placeholder="Caption foto (opsional)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleUpload}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Simpan ke Database
                  </button>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(previewFile.preview);
                      setPreviewFile(null);
                    }}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-sky-500/30 rounded-xl cursor-pointer hover:border-sky-500/60 hover:bg-sky-500/5 transition-all"
              >
                <ImageIcon className="w-8 h-8 text-sky-400/50 mb-2" />
                <p className="text-sm text-slate-400">Klik untuk pilih foto</p>
                <p className="text-xs text-slate-600 mt-0.5">JPG, PNG, WEBP — bebas ukuran</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Daftar Foto */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              🖼️ Foto Tersimpan ({photos.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
                Belum ada foto produk. Upload foto di atas.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
                  >
                    {/* Foto */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imageData}
                      alt={photo.caption || "Foto produk"}
                      className="w-full h-40 object-cover"
                    />

                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditingCaption({ id: photo.id, value: photo.caption || "" })}
                        className="p-2 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white transition-colors"
                        title="Edit caption"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(photo.id)}
                        disabled={isPending}
                        className="p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Caption */}
                    <div className="p-2.5">
                      {editingCaption?.id === photo.id ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editingCaption.value}
                            onChange={(e) => setEditingCaption({ ...editingCaption, value: e.target.value })}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500/60 min-w-0"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveCaption();
                              if (e.key === "Escape") setEditingCaption(null);
                            }}
                          />
                          <button
                            onClick={handleSaveCaption}
                            disabled={isPending}
                            className="p-1 rounded-lg bg-sky-600 text-white"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 truncate">
                          {photo.caption || <span className="italic text-slate-600">Tanpa caption</span>}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
