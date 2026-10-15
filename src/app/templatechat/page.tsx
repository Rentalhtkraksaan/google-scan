"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  Store,
  Phone,
  Clock,
  Sparkles,
  ArrowLeft,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  History,
  ExternalLink,
  Plus,
  Edit2,
  X,
  RotateCcw,
  Database,
  Search,
  Loader2,
  Info,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";
import {
  checkProspectAvailabilityAction,
  saveProspectTargetAction,
  getProspectsListAction,
  deleteProspectAction,
  getChatTemplatesAction,
  createChatTemplateAction,
  updateChatTemplateAction,
  deleteChatTemplateAction,
  resetDefaultChatTemplatesAction,
  normalizeWhatsappNumber,
} from "@/lib/actions/templatechat.actions";

interface ChatTemplateItem {
  id: string;
  title: string;
  badge: string | null;
  badgeColor: string | null;
  content: string;
  orderNumber: number;
  isDefault: boolean;
}

interface ProspectItem {
  id: string;
  outletName: string;
  whatsappNumber: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function TemplateChatPage() {
  // Input States
  const [outletName, setOutletName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [savedTarget, setSavedTarget] = useState<{ outletName: string; whatsappNumber: string } | null>(null);

  // Realtime Database Check States
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [dbStatusWa, setDbStatusWa] = useState<"IDLE" | "AVAILABLE" | "EXISTS">("IDLE");
  const [dbWaFeedback, setDbWaFeedback] = useState<string>("");
  const [existingOwnerName, setExistingOwnerName] = useState<string>("");
  const [nameMatchFeedback, setNameMatchFeedback] = useState<string>("");

  // TiDB Data Lists
  const [prospectsList, setProspectsList] = useState<ProspectItem[]>([]);
  const [templatesList, setTemplatesList] = useState<ChatTemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  // Modal Template (Tambah / Edit)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateFormTitle, setTemplateFormTitle] = useState("");
  const [templateFormBadge, setTemplateFormBadge] = useState("");
  const [templateFormContent, setTemplateFormContent] = useState("");
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);

  // Time-based greeting state
  const [detectedGreeting, setDetectedGreeting] = useState<"pagi" | "siang" | "sore" | "malam">("pagi");
  const [customGreeting, setCustomGreeting] = useState<"pagi" | "siang" | "sore" | "malam" | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Search filter for prospects history
  const [searchProspectQuery, setSearchProspectQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const debounceCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Deteksi Jam Device Lokal Secara Real-Time
  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const formattedTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      setCurrentTimeStr(formattedTime);

      if (hour >= 4 && hour < 11) {
        setDetectedGreeting("pagi");
      } else if (hour >= 11 && hour < 15) {
        setDetectedGreeting("siang");
      } else if (hour >= 15 && hour < 18) {
        setDetectedGreeting("sore");
      } else {
        setDetectedGreeting("malam");
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Initial Templates & Prospects from TiDB
  const loadDataFromDb = useCallback(async () => {
    try {
      setIsLoadingTemplates(true);
      const [tpls, prospects] = await Promise.all([
        getChatTemplatesAction(),
        getProspectsListAction(),
      ]);
      setTemplatesList(tpls);
      setProspectsList(prospects);
    } catch (err) {
      console.error("Failed to load data from TiDB:", err);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromDb();
  }, [loadDataFromDb]);

  // 3. Realtime TiDB Check saat WhatsApp / Nama diinput (Debounced 350ms)
  const performRealtimeCheck = (waInput: string, nameInput: string) => {
    const cleanWa = normalizeWhatsappNumber(waInput);
    const cleanName = nameInput.trim();

    if (!cleanWa && !cleanName) {
      setDbStatusWa("IDLE");
      setDbWaFeedback("");
      setExistingOwnerName("");
      setNameMatchFeedback("");
      return;
    }

    if (cleanWa.length < 8) {
      setDbStatusWa("IDLE");
      setDbWaFeedback("");
      setExistingOwnerName("");
      setNameMatchFeedback("");
      return;
    }

    setIsCheckingDb(true);

    if (debounceCheckTimerRef.current) clearTimeout(debounceCheckTimerRef.current);

    debounceCheckTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkProspectAvailabilityAction({
          whatsappNumber: cleanWa,
          outletName: cleanName,
        });

        if (res.existsWa && res.existingProspect) {
          setDbStatusWa("EXISTS");
          setExistingOwnerName(res.existingProspect.outletName);
          setDbWaFeedback(
            `Nomor WA sudah ada di penyimpanan atas nama: "${res.existingProspect.outletName}"`
          );
        } else {
          setDbStatusWa("AVAILABLE");
          setExistingOwnerName("");
          setDbWaFeedback("Nomor WhatsApp tersedia (belum tersimpan di database).");
        }

        if (res.nameMatchProspect) {
          setNameMatchFeedback(
            `Nama outlet ini sudah pernah disimpan dengan nomor WA lain (${res.nameMatchProspect.whatsappNumber}).`
          );
        } else {
          setNameMatchFeedback("");
        }
      } catch (e) {
        console.error("Realtime check error:", e);
      } finally {
        setIsCheckingDb(false);
      }
    }, 350);
  };

  const handleWhatsappChange = (val: string) => {
    setWhatsappNumber(val);
    performRealtimeCheck(val, outletName);
  };

  const handleOutletNameChange = (val: string) => {
    setOutletName(val);
    performRealtimeCheck(whatsappNumber, val);
  };

  // Active greeting
  const activeGreeting = customGreeting || detectedGreeting;

  // Clean WhatsApp Number
  const cleanWaNumber = useMemo(() => {
    const targetWa = savedTarget?.whatsappNumber || whatsappNumber;
    return normalizeWhatsappNumber(targetWa);
  }, [savedTarget, whatsappNumber]);

  const activeOutletName = savedTarget?.outletName || outletName || "[Nama Outlet]";

  // 4. Render Dynamic Template Message ({waktu} & {outlet})
  const renderMessageText = useCallback(
    (rawContent: string) => {
      return rawContent
        .replace(/{waktu}/gi, activeGreeting)
        .replace(/{salam}/gi, `selamat ${activeGreeting}`)
        .replace(/{outlet}/gi, activeOutletName)
        .replace(/{wa}/gi, cleanWaNumber);
    },
    [activeGreeting, activeOutletName, cleanWaNumber]
  );

  // 5. Handle Simpan Target Outlet ke TiDB
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = outletName.trim();
    const cleanWa = normalizeWhatsappNumber(whatsappNumber);

    if (!cleanName) {
      showErrorAlert("Nama Outlet Kosong", "Silakan masukkan nama outlet terlebih dahulu.");
      return;
    }

    if (!cleanWa || cleanWa.length < 8) {
      showErrorAlert("Nomor WA Tidak Valid", "Masukkan nomor WhatsApp yang valid (minimal 8 digit).");
      return;
    }

    setIsSavingTarget(true);
    try {
      const res = await saveProspectTargetAction({
        outletName: cleanName,
        whatsappNumber: cleanWa,
      });

      if (!res.success) {
        showErrorAlert("Gagal Menyimpan", res.message);
        return;
      }

      setSavedTarget({
        outletName: cleanName,
        whatsappNumber: cleanWa,
      });

      setDbStatusWa("EXISTS");
      setExistingOwnerName(cleanName);
      setDbWaFeedback(`Data tersimpan atas nama: "${cleanName}"`);

      // Refresh list
      const updatedList = await getProspectsListAction();
      setProspectsList(updatedList);

      showSuccessAlert(
        "Tersimpan di Database TiDB!",
        `Data outlet "${cleanName}" berhasil disimpan ke sistem.`
      );
    } catch (err: unknown) {
      console.error("Save target error:", err);
      showErrorAlert("Terjadi Kesalahan", "Gagal menyimpan data ke database TiDB.");
    } finally {
      setIsSavingTarget(false);
    }
  };

  // Pilih Target dari Database
  const handleSelectProspect = (item: ProspectItem) => {
    setOutletName(item.outletName);
    setWhatsappNumber(item.whatsappNumber);
    setSavedTarget({
      outletName: item.outletName,
      whatsappNumber: item.whatsappNumber,
    });
    setDbStatusWa("EXISTS");
    setExistingOwnerName(item.outletName);
    setDbWaFeedback(`Data aktif dari database: "${item.outletName}"`);
    showSuccessAlert("Target Diaktifkan", `Outlet "${item.outletName}" siap dihubungi.`, 800);
  };

  // Hapus Target dari Database
  const handleDeleteProspect = async (id: string, outletName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = await showConfirmAlert(
      "Hapus Target?",
      `Apakah Anda yakin ingin menghapus "${outletName}" dari database TiDB?`
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await deleteProspectAction(id);
      if (res.success) {
        setProspectsList((prev) => prev.filter((p) => p.id !== id));
        if (savedTarget?.outletName === outletName) {
          setSavedTarget(null);
        }
        showSuccessAlert("Berhasil Dihapus", `Target "${outletName}" telah dihapus.`);
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal menghapus data.");
    }
  };

  // 6. Template CRUD Operations
  const handleOpenAddTemplateModal = () => {
    setEditingTemplateId(null);
    setTemplateFormTitle("");
    setTemplateFormBadge("Kustom");
    setTemplateFormContent("");
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplateModal = (tpl: ChatTemplateItem) => {
    setEditingTemplateId(tpl.id);
    setTemplateFormTitle(tpl.title);
    setTemplateFormBadge(tpl.badge || "Kustom");
    setTemplateFormContent(tpl.content);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFormTitle.trim() || !templateFormContent.trim()) {
      showErrorAlert("Data Tidak Lengkap", "Judul dan isi template wajib diisi.");
      return;
    }

    setIsSubmittingTemplate(true);
    try {
      if (editingTemplateId) {
        // Update
        const res = await updateChatTemplateAction(editingTemplateId, {
          title: templateFormTitle.trim(),
          badge: templateFormBadge.trim(),
          content: templateFormContent.trim(),
        });
        if (!res.success) {
          showErrorAlert("Gagal Update", res.message);
          return;
        }
        showSuccessAlert("Template Diperbarui", "Perubahan template berhasil disimpan di TiDB.");
      } else {
        // Create
        const res = await createChatTemplateAction({
          title: templateFormTitle.trim(),
          badge: templateFormBadge.trim(),
          content: templateFormContent.trim(),
        });
        if (!res.success) {
          showErrorAlert("Gagal Tambah", res.message);
          return;
        }
        showSuccessAlert("Template Ditambahkan", "Template baru tersimpan di database TiDB.");
      }

      setIsTemplateModalOpen(false);
      const updatedTpls = await getChatTemplatesAction();
      setTemplatesList(updatedTpls);
    } catch (err: unknown) {
      console.error("Save template error:", err);
      showErrorAlert("Terjadi Kesalahan", "Gagal menyimpan template chat.");
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (tpl: ChatTemplateItem) => {
    const confirm = await showConfirmAlert(
      "Hapus Template?",
      `Apakah Anda yakin ingin menghapus "${tpl.title}" dari database?`
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await deleteChatTemplateAction(tpl.id);
      if (res.success) {
        setTemplatesList((prev) => prev.filter((t) => t.id !== tpl.id));
        showSuccessAlert("Template Dihapus", "Template berhasil dihapus dari sistem.");
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal menghapus template.");
    }
  };

  const handleResetDefaultTemplates = async () => {
    const confirm = await showConfirmAlert(
      "Reset Template ke Default?",
      "Semua template kustom akan dihapus dan dikembalikan ke 5 template standar awal. Lanjutkan?"
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await resetDefaultChatTemplatesAction();
      if (res.success) {
        const refreshed = await getChatTemplatesAction();
        setTemplatesList(refreshed);
        showSuccessAlert("Berhasil Direset", "Template telah dikembalikan ke standar awal.");
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal mereset template.");
    }
  };

  // Salin Pesan ke Clipboard
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
    showSuccessAlert("Teks Disalin!", "Pesan siap di-paste di WhatsApp.", 800);
  };

  // Buka Langsung ke WhatsApp
  const handleOpenWhatsApp = (text: string) => {
    if (!cleanWaNumber || cleanWaNumber.length < 8) {
      showErrorAlert(
        "Nomor WA Belum Diisi",
        "Harap masukkan nomor WhatsApp tujuan yang valid terlebih dahulu."
      );
      return;
    }

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/${cleanWaNumber}?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  // Filter prospects
  const filteredProspects = useMemo(() => {
    if (!searchProspectQuery.trim()) return prospectsList;
    const q = searchProspectQuery.toLowerCase();
    return prospectsList.filter(
      (p) => p.outletName.toLowerCase().includes(q) || p.whatsappNumber.includes(q)
    );
  }, [prospectsList, searchProspectQuery]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-x-hidden pb-20">
      {/* Background Glowing Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-emerald-600/15 via-sky-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/10 blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Template Chat WhatsApp</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    TiDB Cloud Sync
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Cek nomor WA & nama outlet real-time di database, generator pesan & CRUD template
                </p>
              </div>
            </div>
          </div>

          {/* Jam Device Live Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Waktu Device:</span>
            <strong className="text-white font-mono">{currentTimeStr || "--:--"}</strong>
            <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
              {detectedGreeting}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* KOLOM KIRI: INPUT TARGET DENGAN CEK REAL-TIME & DATABASE (5/12)     */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-5">
            {/* Form Input Target */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Data Outlet Target</h2>
                </div>
                {savedTarget && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Target Terpasang
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveTarget} className="space-y-4">
                {/* 1. Input Nomor WhatsApp dengan Cek Realtime TiDB */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Nomor WhatsApp Outlet <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Cek Database TiDB
                    </span>
                  </div>

                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={whatsappNumber}
                      onChange={(e) => handleWhatsappChange(e.target.value)}
                      placeholder="Contoh: 08123456789 atau 628123456789"
                      className={`w-full pl-9 pr-10 py-2.5 bg-slate-950 border rounded-xl text-sm font-mono transition-all focus:outline-none ${
                        dbStatusWa === "EXISTS"
                          ? "border-amber-500/80 text-amber-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-500/30"
                          : dbStatusWa === "AVAILABLE"
                          ? "border-emerald-500/80 text-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                          : "border-slate-800 text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                      }`}
                    />

                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingDb && (
                        <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                      )}
                      {!isCheckingDb && dbStatusWa === "EXISTS" && (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                      {!isCheckingDb && dbStatusWa === "AVAILABLE" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  </div>

                  {/* Feedback Realtime WhatsApp */}
                  {dbWaFeedback && (
                    <div
                      className={`mt-1.5 p-2 rounded-xl text-[11px] leading-tight flex items-start gap-1.5 transition-all ${
                        dbStatusWa === "EXISTS"
                          ? "bg-amber-950/40 border border-amber-500/30 text-amber-300 font-medium"
                          : "bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 font-medium"
                      }`}
                    >
                      {dbStatusWa === "EXISTS" ? (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                      )}
                      <div className="flex-1">
                        <span>{dbWaFeedback}</span>
                        {dbStatusWa === "EXISTS" && existingOwnerName && (
                          <button
                            type="button"
                            onClick={() => setOutletName(existingOwnerName)}
                            className="block mt-1 text-[10px] text-sky-400 hover:text-sky-300 underline font-semibold cursor-pointer"
                          >
                            Gunakan nama ini: &quot;{existingOwnerName}&quot;
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Input Nama Outlet dengan Cek Realtime */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Outlet / Bisnis <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={outletName}
                      onChange={(e) => handleOutletNameChange(e.target.value)}
                      placeholder="Contoh: Kopi Kenangan / Barbershop Ganteng"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {nameMatchFeedback && (
                    <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3 shrink-0" />
                      <span>{nameMatchFeedback}</span>
                    </p>
                  )}
                </div>

                {/* Tombol Simpan ke TiDB */}
                <button
                  type="submit"
                  disabled={isSavingTarget}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  {isSavingTarget ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke TiDB...</span>
                    </>
                  ) : (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      <span>Simpan Target ke TiDB Database</span>
                    </>
                  )}
                </button>
              </form>

              {/* Status Ringkasan Target Aktif */}
              {savedTarget && (
                <div className="mt-4 p-3 bg-slate-950/90 border border-emerald-500/30 rounded-xl">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-1">
                    🎯 Target Yang Sedang Dipakai:
                  </p>
                  <div className="text-xs text-slate-200">
                    <div className="font-semibold text-white">{savedTarget.outletName}</div>
                    <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                      WA: +{cleanWaNumber}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pilihan Sapaan Waktu */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Sapaan Waktu Device
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentTimeStr || "--:--"}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {(["pagi", "siang", "sore", "malam"] as const).map((period) => {
                  const isCurrent = activeGreeting === period;
                  const isAuto = detectedGreeting === period;
                  return (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setCustomGreeting(period === detectedGreeting ? null : period)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer text-center relative ${
                        isCurrent
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 border border-emerald-400/40"
                          : "bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      <span>{period}</span>
                      {isAuto && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Otomatis disisipkan ke kode <code>&#123;waktu&#125;</code> pada template.
              </p>
            </div>

            {/* Daftar Kontak Tersimpan di TiDB Database */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Daftar Outlet di Database TiDB
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                  {prospectsList.length} Outlet
                </span>
              </div>

              {/* Pencarian Prospek */}
              {prospectsList.length > 3 && (
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchProspectQuery}
                    onChange={(e) => setSearchProspectQuery(e.target.value)}
                    placeholder="Cari nama outlet atau nomor WA..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {filteredProspects.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  {prospectsList.length === 0
                    ? "Belum ada outlet tersimpan di database TiDB. Masukkan nama & WA di atas lalu klik Simpan."
                    : "Tidak ada outlet yang sesuai dengan pencarian."}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {filteredProspects.map((item) => {
                    const isSelected = savedTarget?.whatsappNumber === item.whatsappNumber;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectProspect(item)}
                        className={`group flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-emerald-950/40 border-emerald-500/50"
                            : "bg-slate-950 hover:bg-slate-850 border-slate-800/80 hover:border-emerald-500/40"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isSelected ? "text-emerald-300 font-bold" : "text-slate-200 group-hover:text-emerald-400"
                            }`}
                          >
                            {item.outletName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            +{item.whatsappNumber}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProspect(item.id, item.outletName, e)}
                            className="p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Hapus dari database"
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
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* KOLOM KANAN: TEMPLATE CHAT CARDS & MANAJEMEN CRUD (7/12)           */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-4">
            {/* Header Manajemen Template */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Daftar Template Chat</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Template tersimpan di database TiDB &bull; Dapat diedit, dihapus, atau ditambah bebas
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaultTemplates}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  title="Kembalikan template ke default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset Default</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddTemplateModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Template</span>
                </button>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoadingTemplates && (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
                <p className="text-xs">Memuat template dari TiDB Cloud...</p>
              </div>
            )}

            {/* List Templates */}
            {!isLoadingTemplates && (
              <div className="space-y-4">
                {templatesList.map((tpl, index) => {
                  const renderedText = renderMessageText(tpl.content);
                  const isCopied = copiedKey === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      className="rounded-2xl border border-slate-800/90 bg-slate-900/80 hover:border-slate-700 shadow-xl p-4 sm:p-5 transition-all relative group"
                    >
                      {/* Top Header Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center border border-slate-700">
                            {index + 1}
                          </span>
                          <h3 className="text-xs font-bold text-white tracking-tight">{tpl.title}</h3>
                        </div>

                        <div className="flex items-center gap-2">
                          {tpl.badge && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                tpl.badgeColor || "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              }`}
                            >
                              {tpl.badge}
                            </span>
                          )}

                          {/* Tombol Edit & Hapus Template */}
                          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTemplateModal(tpl)}
                              className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Edit template ini"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Hapus template ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Chat Bubble Simulation */}
                      <div className="relative mb-3.5">
                        <div className="p-3.5 sm:p-4 rounded-2xl rounded-tl-sm bg-[#0b141a] border border-[#1f2c34] text-slate-100 text-sm font-sans leading-relaxed whitespace-pre-wrap select-all shadow-inner">
                          {renderedText}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500">
                          {tpl.content.includes("{waktu}") && (
                            <span className="text-emerald-400/90 font-mono mr-2">
                              • Auto Waktu
                            </span>
                          )}
                          {tpl.content.includes("{outlet}") && (
                            <span className="text-sky-400/90 font-mono">
                              • Auto Nama Outlet
                            </span>
                          )}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Tombol Salin */}
                          <button
                            type="button"
                            onClick={() => handleCopy(renderedText, tpl.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-colors cursor-pointer active:scale-95"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin Teks</span>
                              </>
                            )}
                          </button>

                          {/* Tombol Kirim WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(renderedText)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim ke WA</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL TAMBAH / EDIT TEMPLATE CHAT                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 p-4 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingTemplateId ? "Edit Template Chat" : "Tambah Template Chat Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateForm} className="space-y-4 my-4">
              {/* Judul Template */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Judul Template <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={templateFormTitle}
                  onChange={(e) => setTemplateFormTitle(e.target.value)}
                  placeholder="Contoh: Template 4 (Follow Up Penawaran)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Label Badge (Opsional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Label / Badge <span className="text-slate-500 text-[10px]">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={templateFormBadge}
                  onChange={(e) => setTemplateFormBadge(e.target.value)}
                  placeholder="Contoh: Follow Up / Promo / Edukasi"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Isi Pesan Template */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Isi Pesan Template <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Klik tag untuk menyisipkan variabel</span>
                </div>

                {/* Variable Pills Helper */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setTemplateFormContent((prev) => prev + " {waktu}")}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                  >
                    + &#123;waktu&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateFormContent((prev) => prev + ' "{outlet}"')}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 cursor-pointer"
                  >
                    + &#123;outlet&#125;
                  </button>
                </div>

                <textarea
                  required
                  rows={4}
                  value={templateFormContent}
                  onChange={(e) => setTemplateFormContent(e.target.value)}
                  placeholder="Ketik isi template chat di sini. Gunakan {waktu} untuk sapaan otomatis dan {outlet} untuk nama toko..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed custom-scrollbar"
                />
              </div>

              {/* Actions Modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingTemplate}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTemplate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Template</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
