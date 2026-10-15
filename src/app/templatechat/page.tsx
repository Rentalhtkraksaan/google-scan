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
  ExternalLink,
  Plus,
  Edit2,
  X,
  RotateCcw,
  Database,
  Search,
  Loader2,
  MessageCircle,
  Users,
  Settings,
  ChevronRight,
  FileText,
  Smartphone,
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
  // Form Input Pendaftaran Outlet Baru
  const [inputOutletName, setInputOutletName] = useState("");
  const [inputWhatsapp, setInputWhatsapp] = useState("");
  const [inputNotes, setInputNotes] = useState("");
  const [isSubmittingNewOutlet, setIsSubmittingNewOutlet] = useState(false);

  // Real-time Database Check States
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [dbCheckStatus, setDbCheckStatus] = useState<"IDLE" | "AVAILABLE" | "EXISTS">("IDLE");
  const [existingProspectData, setExistingProspectData] = useState<{
    id: string;
    outletName: string;
    whatsappNumber: string;
  } | null>(null);

  // Data List dari TiDB Cloud
  const [prospectsList, setProspectsList] = useState<ProspectItem[]>([]);
  const [templatesList, setTemplatesList] = useState<ChatTemplateItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Modal Kirim Chat ke Outlet Spesifik
  const [activeChatOutlet, setActiveChatOutlet] = useState<ProspectItem | null>(null);

  // Modal Kelola Template (Tambah / Edit)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tplTitle, setTplTitle] = useState("");
  const [tplBadge, setTplBadge] = useState("");
  const [tplContent, setTplContent] = useState("");
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");

  // Waktu Device Lokal & Sapaan Real-time
  const [detectedGreeting, setDetectedGreeting] = useState<"pagi" | "siang" | "sore" | "malam">("pagi");
  const [manualGreeting, setManualGreeting] = useState<"pagi" | "siang" | "sore" | "malam" | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Deteksi Waktu Device Lokal
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      setCurrentTimeStr(
        `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      );

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

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeGreeting = manualGreeting || detectedGreeting;

  // 2. Fetch Initial Data dari TiDB
  const loadTiDBData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const [prospects, templates] = await Promise.all([
        getProspectsListAction(),
        getChatTemplatesAction(),
      ]);
      setProspectsList(prospects);
      setTemplatesList(templates);
    } catch (err) {
      console.error("Gagal mengambil data dari TiDB:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadTiDBData();
  }, [loadTiDBData]);

  // 3. Pengecekan Real-Time Database TiDB saat Menginput Nomor WA (Debounced 350ms)
  const handleWhatsappInputChange = (val: string) => {
    setInputWhatsapp(val);
    const cleanWa = normalizeWhatsappNumber(val);

    if (cleanWa.length < 8) {
      setDbCheckStatus("IDLE");
      setExistingProspectData(null);
      setIsCheckingDb(false);
      return;
    }

    setIsCheckingDb(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkProspectAvailabilityAction({
          whatsappNumber: cleanWa,
          outletName: inputOutletName,
        });

        if (res.existsWa && res.existingProspect) {
          setDbCheckStatus("EXISTS");
          setExistingProspectData(res.existingProspect);
        } else {
          setDbCheckStatus("AVAILABLE");
          setExistingProspectData(null);
        }
      } catch (e) {
        console.error("Check error:", e);
      } finally {
        setIsCheckingDb(false);
      }
    }, 350);
  };

  // 4. Daftarkan / Simpan Kontak Outlet Baru ke TiDB
  const handleRegisterNewOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = inputOutletName.trim();
    const cleanWa = normalizeWhatsappNumber(inputWhatsapp);

    if (!cleanName) {
      showErrorAlert("Nama Outlet Kosong", "Silakan masukkan nama outlet terlebih dahulu.");
      return;
    }

    if (!cleanWa || cleanWa.length < 8) {
      showErrorAlert("Nomor WA Tidak Valid", "Masukkan nomor WhatsApp yang valid (minimal 8 digit).");
      return;
    }

    if (dbCheckStatus === "EXISTS") {
      showErrorAlert(
        "Nomor Sudah Terdaftar!",
        `Nomor ini sudah ada di database atas nama "${existingProspectData?.outletName}". Tidak bisa didaftarkan ganda.`
      );
      return;
    }

    setIsSubmittingNewOutlet(true);
    try {
      const res = await saveProspectTargetAction({
        outletName: cleanName,
        whatsappNumber: cleanWa,
        notes: inputNotes.trim(),
      });

      if (!res.success) {
        showErrorAlert("Gagal Menyimpan", res.message);
        return;
      }

      showSuccessAlert(
        "Outlet Berhasil Didaftarkan!",
        `Kontak "${cleanName}" telah tersimpan di database TiDB.`
      );

      // Reset form input
      setInputOutletName("");
      setInputWhatsapp("");
      setInputNotes("");
      setDbCheckStatus("IDLE");
      setExistingProspectData(null);

      // Refresh list
      const refreshed = await getProspectsListAction();
      setProspectsList(refreshed);
    } catch (err: unknown) {
      console.error("Register error:", err);
      showErrorAlert("Terjadi Kesalahan", "Gagal menyimpan data ke database TiDB.");
    } finally {
      setIsSubmittingNewOutlet(false);
    }
  };

  // 5. Hapus Kontak Outlet dari Database
  const handleDeleteOutlet = async (item: ProspectItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = await showConfirmAlert(
      "Hapus Kontak?",
      `Hapus outlet "${item.outletName}" (${item.whatsappNumber}) dari database TiDB?`
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await deleteProspectAction(item.id);
      if (res.success) {
        setProspectsList((prev) => prev.filter((p) => p.id !== item.id));
        if (activeChatOutlet?.id === item.id) {
          setActiveChatOutlet(null);
        }
        showSuccessAlert("Berhasil Dihapus", `Kontak "${item.outletName}" telah dihapus.`);
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal menghapus data.");
    }
  };

  // 6. Format Teks Pesan Template Otomatis
  const formatTemplateMessage = useCallback(
    (rawContent: string, targetOutlet: ProspectItem | null) => {
      const name = targetOutlet?.outletName || "[Nama Outlet]";
      const wa = targetOutlet?.whatsappNumber || "";
      return rawContent
        .replace(/{waktu}/gi, activeGreeting)
        .replace(/{salam}/gi, `selamat ${activeGreeting}`)
        .replace(/{outlet}/gi, name)
        .replace(/{wa}/gi, wa);
    },
    [activeGreeting]
  );

  // 7. Aksi Buka WhatsApp & Salin
  const handleOpenWhatsApp = (text: string, targetOutlet: ProspectItem | null) => {
    if (!targetOutlet) {
      showErrorAlert("Pilih Kontak", "Silakan pilih kontak outlet tujuan.");
      return;
    }
    const cleanWa = normalizeWhatsappNumber(targetOutlet.whatsappNumber);
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/${cleanWa}?text=${encoded}`;
    window.open(waUrl, "_blank");
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
    showSuccessAlert("Tersalin!", "Pesan siap di-paste di WhatsApp.", 800);
  };

  // 8. Template CRUD Operations
  const handleOpenAddTemplate = () => {
    setEditingTemplateId(null);
    setTplTitle("");
    setTplBadge("Kustom");
    setTplContent("");
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl: ChatTemplateItem) => {
    setEditingTemplateId(tpl.id);
    setTplTitle(tpl.title);
    setTplBadge(tpl.badge || "Kustom");
    setTplContent(tpl.content);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplTitle.trim() || !tplContent.trim()) {
      showErrorAlert("Wajib Diisi", "Judul dan isi template tidak boleh kosong.");
      return;
    }

    setIsSubmittingTemplate(true);
    try {
      if (editingTemplateId) {
        const res = await updateChatTemplateAction(editingTemplateId, {
          title: tplTitle.trim(),
          badge: tplBadge.trim(),
          content: tplContent.trim(),
        });
        if (!res.success) {
          showErrorAlert("Gagal Update", res.message);
          return;
        }
        showSuccessAlert("Template Diperbarui", "Perubahan template berhasil disimpan.");
      } else {
        const res = await createChatTemplateAction({
          title: tplTitle.trim(),
          badge: tplBadge.trim(),
          content: tplContent.trim(),
        });
        if (!res.success) {
          showErrorAlert("Gagal Tambah", res.message);
          return;
        }
        showSuccessAlert("Template Ditambahkan", "Template baru siap digunakan.");
      }

      setIsTemplateModalOpen(false);
      const refreshed = await getChatTemplatesAction();
      setTemplatesList(refreshed);
    } catch {
      showErrorAlert("Error", "Gagal menyimpan template.");
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (tpl: ChatTemplateItem) => {
    const confirm = await showConfirmAlert(
      "Hapus Template?",
      `Apakah Anda yakin ingin menghapus "${tpl.title}"?`
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await deleteChatTemplateAction(tpl.id);
      if (res.success) {
        setTemplatesList((prev) => prev.filter((t) => t.id !== tpl.id));
        showSuccessAlert("Dihapus", "Template berhasil dihapus.");
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal menghapus template.");
    }
  };

  const handleResetTemplates = async () => {
    const confirm = await showConfirmAlert(
      "Reset Template Default?",
      "Kembalikan template ke 5 format standar awal?"
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await resetDefaultChatTemplatesAction();
      if (res.success) {
        const refreshed = await getChatTemplatesAction();
        setTemplatesList(refreshed);
        showSuccessAlert("Berhasil Direset", "Template kembali ke format default.");
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Error", "Gagal mereset template.");
    }
  };

  // Filter daftar outlet berdasarkan search query
  const filteredProspects = useMemo(() => {
    if (!searchQuery.trim()) return prospectsList;
    const q = searchQuery.toLowerCase();
    return prospectsList.filter(
      (p) =>
        p.outletName.toLowerCase().includes(q) ||
        p.whatsappNumber.includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );
  }, [prospectsList, searchQuery]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-x-hidden pb-24">
      {/* Background Glowing Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[950px] h-[400px] bg-gradient-to-b from-emerald-600/15 via-sky-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/10 blur-3xl pointer-events-none -z-10" />

      {/* Top Header Navigation */}
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
                  <span>Buku Kontak & Template Chat WA</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Multi-Outlet
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Daftarkan banyak nomor & nama outlet, cek real-time di database, dan kirim pesan 1x klik
                </p>
              </div>
            </div>
          </div>

          {/* Jam Device Live Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Waktu:</span>
            <strong className="text-white font-mono">{currentTimeStr || "--:--"}</strong>
            <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold">
              {detectedGreeting}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BAGIAN 1: FORM DAFTARKAN OUTLET BARU (DENGAN VALIDASI REAL-TIME)    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Daftarkan Outlet / Kontak Baru ke Database
                </h2>
                <p className="text-xs text-slate-400">
                  Input nomor WA & nama toko. Sistem akan mengecek ketersediaan nomor di database secara real-time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kelola Template Chat</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleRegisterNewOutlet} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Input Nomor WhatsApp dengan Pengecekan Real-Time TiDB */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nomor WhatsApp Outlet <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Cek TiDB Otomatis
                  </span>
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={inputWhatsapp}
                    onChange={(e) => handleWhatsappInputChange(e.target.value)}
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    className={`w-full pl-9 pr-10 py-2.5 bg-slate-950 border rounded-xl text-sm font-mono transition-all focus:outline-none ${
                      dbCheckStatus === "EXISTS"
                        ? "border-amber-500/80 text-amber-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-500/30"
                        : dbCheckStatus === "AVAILABLE"
                        ? "border-emerald-500/80 text-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                        : "border-slate-800 text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                    }`}
                  />

                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingDb && (
                      <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                    )}
                    {!isCheckingDb && dbCheckStatus === "EXISTS" && (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                    {!isCheckingDb && dbCheckStatus === "AVAILABLE" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                </div>

                {/* Banner Status Real-Time Pengecekan */}
                {dbCheckStatus === "EXISTS" && existingProspectData && (
                  <div className="mt-2 p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span>
                          Nomor ini <strong>sudah terdaftar</strong> di database atas nama:{" "}
                          <strong className="text-white">
                            &quot;{existingProspectData.outletName}&quot;
                          </strong>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const match = prospectsList.find((p) => p.id === existingProspectData.id);
                        if (match) setActiveChatOutlet(match);
                      }}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Buka Chat
                    </button>
                  </div>
                )}

                {dbCheckStatus === "AVAILABLE" && (
                  <p className="mt-1.5 text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Nomor WhatsApp tersedia (belum tersimpan di database). Gas daftarkan!</span>
                  </p>
                )}
              </div>

              {/* 2. Input Nama Outlet */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Outlet / Bisnis <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={inputOutletName}
                    onChange={(e) => setInputOutletName(e.target.value)}
                    placeholder="Contoh: Kopi Kenangan / Resto Sedap Malam"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Nama toko akan otomatis disisipkan ke dalam kalimat template chat.
                </p>
              </div>
            </div>

            {/* Catatan Opsional */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Catatan Kontak / Pemilik <span className="text-slate-500 text-[10px]">(Opsional)</span>
              </label>
              <input
                type="text"
                value={inputNotes}
                onChange={(e) => setInputNotes(e.target.value)}
                placeholder="Contoh: Owner Pak Budi / Cabang Kraksaan / Ditemui kemarin"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Tombol Simpan Outlet */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmittingNewOutlet || dbCheckStatus === "EXISTS"}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingNewOutlet ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mendaftarkan ke Database...</span>
                  </>
                ) : (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    <span>Daftarkan & Simpan Outlet ke Database TiDB</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BAGIAN 2: DAFTAR BANYAK OUTLET YANG TERSIMPAN DI DATABASE TI-DB     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Daftar Outlet Tersimpan</span>
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                    {prospectsList.length} Outlet
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Pilih salah satu outlet lalu klik tombol hijau &quot;Buka & Kirim Chat&quot; untuk langsung mengirim pesan.
                </p>
              </div>
            </div>

            {/* Search Bar Real-time */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama outlet atau nomor WA..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoadingData && (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs">Memuat daftar outlet dari TiDB Cloud...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingData && filteredProspects.length === 0 && (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl text-slate-500">
              <Store className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">
                {prospectsList.length === 0
                  ? "Belum ada outlet yang terdaftar di database."
                  : "Tidak ada outlet yang sesuai dengan kata kunci pencarian Anda."}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan form di atas untuk mendaftarkan nomor WA dan nama outlet pertama Anda.
              </p>
            </div>
          )}

          {/* Grid Daftar Banyak Kontak Outlet */}
          {!isLoadingData && filteredProspects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProspects.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800/90 bg-slate-900/80 hover:border-slate-700 shadow-xl p-4 sm:p-5 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Bar Outlet Card */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                            {item.outletName}
                          </h3>
                          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                            +{item.whatsappNumber}
                          </span>
                        </div>
                      </div>

                      {/* Tombol Hapus */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteOutlet(item, e)}
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Hapus kontak dari database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Notes jika ada */}
                    {item.notes && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-950 p-2 rounded-lg border border-slate-800/60 mb-3">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Tombol Aksi Utama: BUKA & KIRIM CHAT */}
                  <div className="pt-3 border-t border-slate-800/80 mt-2">
                    <button
                      type="button"
                      onClick={() => setActiveChatOutlet(item)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Buka & Kirim Chat</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL / PANEL: BUKA & KIRIM CHAT KE OUTLET TERPILIH                 */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeChatOutlet && (
        <div className="fixed inset-0 z-50 p-3 sm:p-5 bg-black/85 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Header Modal Chat */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    Kirim Chat ke: {activeChatOutlet.outletName}
                  </h3>
                  <p className="text-xs font-mono text-emerald-400">
                    WhatsApp: +{activeChatOutlet.whatsappNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveChatOutlet(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sapaan Waktu Picker di dalam Modal */}
            <div className="my-4 p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300">
                  Sapaan Jam: <strong className="text-white uppercase font-bold">{activeGreeting}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1">
                {(["pagi", "siang", "sore", "malam"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setManualGreeting(period)}
                    className={`px-2.5 py-1 rounded-lg text-xs capitalize font-semibold transition-all cursor-pointer ${
                      activeGreeting === period
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* List Template Chat Siap Kirim */}
            <div className="space-y-4 my-4">
              {templatesList.map((tpl, idx) => {
                const messageText = formatTemplateMessage(tpl.content, activeChatOutlet);
                const isCopied = copiedKey === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all shadow-md"
                  >
                    {/* Header Template */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-white">{tpl.title}</h4>
                      </div>
                      {tpl.badge && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            tpl.badgeColor || "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          }`}
                        >
                          {tpl.badge}
                        </span>
                      )}
                    </div>

                    {/* Chat Bubble Simulation */}
                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#1f2c34] text-slate-100 text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap select-all mb-3 shadow-inner">
                      {messageText}
                    </div>

                    {/* Tombol Aksi */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(messageText, tpl.id)}
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
                            <span>Salin</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(messageText, activeChatOutlet)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim ke WhatsApp</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveChatOutlet(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Tutup Panel Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL KELOLA TEMPLATE CHAT (TAMBAH / EDIT / RESET)                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 p-4 bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
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

            <form onSubmit={handleSaveTemplate} className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Judul Template <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={tplTitle}
                  onChange={(e) => setTplTitle(e.target.value)}
                  placeholder="Contoh: Template 4 (Promo Special Diskon)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Label Badge <span className="text-slate-500 text-[10px]">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={tplBadge}
                  onChange={(e) => setTplBadge(e.target.value)}
                  placeholder="Contoh: Follow Up / Penawaran"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Isi Pesan Template <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Klik tag untuk menyisipkan:</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setTplContent((prev) => prev + " {waktu}")}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                  >
                    + &#123;waktu&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => setTplContent((prev) => prev + ' "{outlet}"')}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 cursor-pointer"
                  >
                    + &#123;outlet&#125;
                  </button>
                </div>

                <textarea
                  required
                  rows={4}
                  value={tplContent}
                  onChange={(e) => setTplContent(e.target.value)}
                  placeholder="Ketik isi template chat di sini..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed custom-scrollbar"
                />
              </div>

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
