"use client";

import { useState, useEffect } from "react";
import { X, PlusSquare, Loader2, Layers } from "lucide-react";
import { generateBatchCardsAction } from "@/lib/actions/qr.actions";
import { showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { AdminSelectSearchable } from "@/components/forms/AdminSelectSearchable";

interface BatchGenerateModalProps {
  admins: { id: string; fullName: string }[];
  superAdmins?: { id: string; fullName: string; isSuperAdminMaster?: boolean }[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function BatchGenerateModal({
  admins,
  superAdmins = [],
  onClose,
  onSuccess,
}: BatchGenerateModalProps) {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number>(25);
  const [prefix, setPrefix] = useState<string>("c-");
  const [assignedAdminId, setAssignedAdminId] = useState<string>("unassigned");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("count", String(count));
      formData.set("prefix", prefix);
      formData.set("assignedAdminId", assignedAdminId);

      const result = await generateBatchCardsAction(formData);

      if (result.success) {
        onSuccess?.();
        onClose();
        showSuccessAlert("Batch Kartu Dibuat!", result.message, 1800);
      } else {
        showErrorAlert("Gagal Membuat Batch", result.message);
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Kesalahan Server", "Terjadi kesalahan sistem saat membuat batch kartu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-3 sm:p-4 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <PlusSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Generate Kartu QR Tambahan</h3>
              <p className="text-xs text-slate-400">Buat batch kartu kosong baru</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Alokasikan ke Admin
            </label>
            <AdminSelectSearchable
              value={assignedAdminId}
              onChange={(newVal) => setAssignedAdminId(newVal)}
              superAdmins={superAdmins}
              admins={admins}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jumlah Kartu <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Prefix Kode
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="c-"
                className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex gap-2">
            {[10, 25, 50, 100, 250].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCount(num)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all ${
                  count === num
                    ? "bg-sky-600 text-white border-sky-500"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                +{num}
              </button>
            ))}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-all shadow-lg shadow-sky-600/30 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Generate Sekarang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
