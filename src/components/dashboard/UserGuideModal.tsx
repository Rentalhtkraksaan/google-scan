"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  BookOpen,
  Search,
  ShieldCheck,
  Briefcase,
  Store,
  HelpCircle,
  QrCode,
  CreditCard,
  Receipt,
  Star,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  ShoppingCart,
  ArrowRight,
  Info,
  AlertTriangle,
  Lightbulb,
  FileText,
  UserCheck,
  Clock,
  Printer,
  Globe,
  ShieldAlert,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Loader2,
  Save,
  Eye,
} from "lucide-react";
import { GuideArticleModel } from "@/types/models";
import {
  getGuideArticlesAction,
  createGuideArticleAction,
  updateGuideArticleAction,
  deleteGuideArticleAction,
  resetDefaultGuidesAction,
} from "@/lib/actions/guide.actions";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "@/lib/swal";

export type GuideRole = "SUPER_ADMIN" | "ADMIN" | "OUTLET" | "FAQ";

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: GuideRole;
  currentUserRole?: string;
  isSuperAdminMaster?: boolean;
}

const TAG_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/25" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/25" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/25" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/25" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/25" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/25" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/25" },
};

export function UserGuideModal({
  isOpen,
  onClose,
  initialRole = "SUPER_ADMIN",
  currentUserRole = "SUPER_ADMIN",
  isSuperAdminMaster = false,
}: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideRole>(initialRole);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [articles, setArticles] = useState<GuideArticleModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Editor Modal State (Super Admin 1 & 2)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<GuideArticleModel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [formCategory, setFormCategory] = useState<string>("SUPER_ADMIN");
  const [formTitle, setFormTitle] = useState("");
  const [formTag, setFormTag] = useState("Panduan");
  const [formTagColor, setFormTagColor] = useState("indigo");
  const [formSummary, setFormSummary] = useState("");
  const [formContentHtml, setFormContentHtml] = useState("");
  const [formOrderNumber, setFormOrderNumber] = useState<number>(0);
  const [showEditorPreview, setShowEditorPreview] = useState(false);

  const isSuperAdminUser = currentUserRole === "SUPER_ADMIN";

  // Load articles from database
  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const res = await getGuideArticlesAction();
      if (res.success && res.data) {
        setArticles(res.data as GuideArticleModel[]);
        // Auto-expand first 2 items
        const initialExpand: Record<string, boolean> = {};
        (res.data as GuideArticleModel[]).slice(0, 3).forEach((a) => {
          initialExpand[a.id] = true;
        });
        setExpandedSections(initialExpand);
      }
    } catch (err) {
      console.error("Gagal load artikel:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialRole);
      setSearchQuery("");
      loadArticles();
    }
  }, [isOpen, initialRole]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filteredSections.forEach((s) => (all[s.id] = true));
    setExpandedSections(all);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  // Open Create Form (Super Admin 1 & 2)
  const handleOpenCreate = (targetCategory?: string) => {
    setEditingArticle(null);
    setFormCategory(targetCategory || activeTab);
    setFormTitle("");
    setFormTag("Panduan");
    setFormTagColor("indigo");
    setFormSummary("");
    setFormContentHtml("<p>Tuliskan isi panduan di sini...</p>");
    setFormOrderNumber((filteredSections.length || 0) + 1);
    setIsEditorOpen(true);
  };

  // Open Edit Form (Super Admin 1 & 2)
  const handleOpenEdit = (article: GuideArticleModel) => {
    setEditingArticle(article);
    setFormCategory(article.category);
    setFormTitle(article.title);
    setFormTag(article.tag || "Panduan");
    setFormTagColor(article.tagColor || "indigo");
    setFormSummary(article.summary || "");
    setFormContentHtml(article.contentHtml || "");
    setFormOrderNumber(article.orderNumber || 0);
    setIsEditorOpen(true);
  };

  // Save Article (Create or Update)
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContentHtml.trim()) {
      showErrorAlert("Form Belum Lengkap", "Judul dan isi konten panduan wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingArticle) {
        // Edit Article
        const res = await updateGuideArticleAction(editingArticle.id, {
          category: formCategory,
          title: formTitle,
          tag: formTag,
          tagColor: formTagColor,
          summary: formSummary,
          contentHtml: formContentHtml,
          orderNumber: formOrderNumber,
        });

        if (res.success) {
          showSuccessAlert("Berhasil Diperbarui", res.message, 1500);
          setIsEditorOpen(false);
          loadArticles();
        } else {
          showErrorAlert("Gagal Menyimpan", res.message);
        }
      } else {
        // Create Article
        const res = await createGuideArticleAction({
          category: formCategory,
          title: formTitle,
          tag: formTag,
          tagColor: formTagColor,
          summary: formSummary,
          contentHtml: formContentHtml,
          orderNumber: formOrderNumber,
        });

        if (res.success) {
          showSuccessAlert("Berhasil Ditambahkan", res.message, 1500);
          setIsEditorOpen(false);
          loadArticles();
        } else {
          showErrorAlert("Gagal Menambahkan", res.message);
        }
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Kesalahan Sistem", "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Article (Super Admin 1 Only)
  const handleDeleteArticle = async (article: GuideArticleModel) => {
    if (!isSuperAdminMaster) {
      showErrorAlert(
        "Akses Dibatasi",
        "Hanya Super Admin 1 (Master / Founder) yang memiliki wewenang untuk menghapus bab panduan."
      );
      return;
    }

    const confirmed = await showConfirmAlert(
      "Hapus Bab Panduan Ini?",
      `Anda akan menghapus "${article.title}" secara permanen dari sistem.`,
      "Ya, Hapus Sekarang"
    );

    if (!confirmed) return;

    try {
      const res = await deleteGuideArticleAction(article.id);
      if (res.success) {
        showSuccessAlert("Berhasil Dihapus", res.message, 1500);
        loadArticles();
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Kesalahan Sistem", "Gagal menghapus bab panduan.");
    }
  };

  // Reset All to Default Seeds (Super Admin 1 Only)
  const handleResetDefaults = async () => {
    if (!isSuperAdminMaster) return;

    const confirmed = await showConfirmAlert(
      "Reset ke Buku Panduan Standar?",
      "Seluruh artikel panduan kustom akan digantikan kembali ke modul standar bawaan sistem.",
      "Ya, Reset Standar"
    );

    if (!confirmed) return;

    try {
      const res = await resetDefaultGuidesAction();
      if (res.success) {
        showSuccessAlert("Berhasil Direset", res.message, 1800);
        loadArticles();
      } else {
        showErrorAlert("Gagal Reset", res.message);
      }
    } catch (err) {
      console.error(err);
      showErrorAlert("Kesalahan Sistem", "Gagal mereset buku panduan.");
    }
  };

  // Filtered by Tab and Search Query
  const activeSections = useMemo(() => {
    return articles.filter((a) => a.category === activeTab);
  }, [articles, activeTab]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return activeSections;
    const q = searchQuery.toLowerCase();
    return activeSections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.tag.toLowerCase().includes(q)
    );
  }, [activeSections, searchQuery]);

  // Tab filter strictly based on role
  const availableTabs = useMemo(() => {
    if (initialRole === "OUTLET") {
      return [
        {
          key: "OUTLET" as GuideRole,
          label: "Panduan Outlet Mitra",
          shortLabel: "Panduan Outlet",
          icon: Store,
          colorClass: "text-sky-400",
          activeClass: "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 border border-sky-400/40",
        },
        {
          key: "FAQ" as GuideRole,
          label: "FAQ & Bantuan Toko",
          shortLabel: "FAQ Toko",
          icon: HelpCircle,
          colorClass: "text-amber-400",
          activeClass: "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/40",
        },
      ];
    }

    if (initialRole === "ADMIN") {
      return [
        {
          key: "ADMIN" as GuideRole,
          label: "Panduan Admin Lapangan",
          shortLabel: "Admin Lapangan",
          icon: Briefcase,
          colorClass: "text-emerald-400",
          activeClass: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/40",
        },
        {
          key: "OUTLET" as GuideRole,
          label: "Panduan Outlet (Edukasi Mitra)",
          shortLabel: "Edukasi Mitra",
          icon: Store,
          colorClass: "text-sky-400",
          activeClass: "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 border border-sky-400/40",
        },
        {
          key: "FAQ" as GuideRole,
          label: "FAQ & Solusi Lapangan",
          shortLabel: "FAQ Lapangan",
          icon: HelpCircle,
          colorClass: "text-amber-400",
          activeClass: "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/40",
        },
      ];
    }

    // SUPER_ADMIN has access to all roles
    return [
      {
        key: "SUPER_ADMIN" as GuideRole,
        label: "Modul Super Admin",
        shortLabel: "Super Admin",
        icon: ShieldCheck,
        colorClass: "text-amber-400",
        activeClass: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/40",
      },
      {
        key: "ADMIN" as GuideRole,
        label: "Modul Admin Lapangan",
        shortLabel: "Admin Lapangan",
        icon: Briefcase,
        colorClass: "text-emerald-400",
        activeClass: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/40",
      },
      {
        key: "OUTLET" as GuideRole,
        label: "Modul Outlet Mitra",
        shortLabel: "Outlet Mitra",
        icon: Store,
        colorClass: "text-sky-400",
        activeClass: "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 border border-sky-400/40",
      },
      {
        key: "FAQ" as GuideRole,
        label: "FAQ & Solusi Sistem",
        shortLabel: "FAQ Sistem",
        icon: HelpCircle,
        colorClass: "text-amber-400",
        activeClass: "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/40",
      },
    ];
  }, [initialRole]);

  // Dynamic header info
  const headerInfo = useMemo(() => {
    if (initialRole === "OUTLET") {
      return {
        title: "Buku Panduan Outlet Mitra",
        badge: "PANDUAN OUTLET",
        badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
        gradient: "from-sky-500 to-blue-600",
        icon: Store,
        description: "Panduan lengkap penggunaan standee / kartu Smart QR ulasan Google Maps, tips bintang 5, dan pengelolaan ulasan toko Anda.",
      };
    }
    if (initialRole === "ADMIN") {
      return {
        title: "Buku Panduan Admin Lapangan",
        badge: "PANDUAN MITRA",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        gradient: "from-emerald-500 to-teal-600",
        icon: Briefcase,
        description: "Panduan operasional lapangan, registrasi outlet binaan, aktivasi kartu, kirim akses WhatsApp 1-klik, dan SOP mitra.",
      };
    }
    return {
      title: "Buku Modul & Panduan Sistem",
      badge: isSuperAdminMaster ? "SUPER ADMIN 1 (MASTER)" : "SUPER ADMIN 2 (OPERASIONAL)",
      badgeColor: isSuperAdminMaster ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      gradient: "from-indigo-500 to-purple-600",
      icon: ShieldCheck,
      description: "Kelola, edit, tambah, dan pantau seluruh alur operasional ekosistem Smart QR Review.",
    };
  }, [initialRole, isSuperAdminMaster]);

  if (!isOpen) return null;

  const HeaderIcon = headerInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br ${headerInfo.gradient} flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0`}>
              <HeaderIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-xl font-black text-white tracking-tight truncate">
                  {headerInfo.title}
                </h2>
                <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border font-mono shrink-0 ${headerInfo.badgeColor}`}>
                  {headerInfo.badge}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1 mt-0.5">
                {headerInfo.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Super Admin Action Toolbar */}
            {isSuperAdminUser && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCreate()}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Panduan</span>
                </button>

                {isSuperAdminMaster && (
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Reset Panduan ke Default"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Tutup Panduan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Bar */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {availableTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? tab.activeClass
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${isActive ? "text-white" : tab.colorClass}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Super Admin Add Button */}
          {isSuperAdminUser && (
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="sm:hidden px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          )}
        </div>

        {/* Search & Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari materi panduan, tips, atau solusi..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end text-xs text-slate-400">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-[11px]"
            >
              Buka Semua
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-[11px]"
            >
              Tutup Semua
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <Loader2 className="w-8 h-8 mx-auto text-indigo-400 animate-spin" />
              <p className="text-xs font-medium">Memuat modul panduan...</p>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3 my-4">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">
                {searchQuery ? "Tidak ada materi panduan yang cocok dengan pencarian Anda." : "Belum ada bab panduan untuk kategori ini."}
              </div>
              {isSuperAdminUser && (
                <button
                  type="button"
                  onClick={() => handleOpenCreate()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Bab Panduan Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            filteredSections.map((sec) => {
              const isExpanded = Boolean(expandedSections[sec.id]);
              const tagStyle = TAG_COLOR_MAP[sec.tagColor] || TAG_COLOR_MAP.indigo;

              return (
                <div
                  key={sec.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? "bg-slate-900/95 border-slate-700/80 shadow-lg shadow-black/20"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  {/* Section Title Header */}
                  <div className="p-4 sm:p-5 flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className="flex-1 flex items-start gap-3 text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-300 group-hover:text-white shrink-0 mt-0.5">
                        <BookOpen className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${tagStyle.bg} ${tagStyle.text} ${tagStyle.border}`}>
                            {sec.tag}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                          {sec.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {sec.summary}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {/* Super Admin 1 & 2: Edit Button */}
                      {isSuperAdminUser && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sec)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                          title="Edit Bab Panduan Ini"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Super Admin 1 Only: Delete Button */}
                      {isSuperAdminUser && isSuperAdminMaster && (
                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(sec)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Hapus Bab Panduan Ini (Super Admin 1)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleSection(sec.id)}
                        className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Section Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-1 border-t border-slate-800/80 animate-in fade-in duration-150">
                      <div
                        className="prose prose-invert prose-xs max-w-none text-slate-300 text-xs leading-relaxed space-y-2.5 pt-2"
                        dangerouslySetInnerHTML={{ __html: sec.contentHtml }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>Smart QR Review Official Knowledge Base</span>
          <span>© Hak Cipta Dilindungi (HAKI)</span>
        </div>
      </div>

      {/* MODAL EDITOR: TAMBAH & EDIT PANDUAN (SUPER ADMIN) */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingArticle ? "Edit Bab Panduan" : "Tambah Bab Panduan Baru"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingArticle ? "Perbarui materi buku panduan untuk seluruh portal pengguna" : "Tambahkan bab materi baru ke modul buku panduan"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-3.5">
              {/* Kategori & Urutan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kategori Modul <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SUPER_ADMIN">👑 Modul Super Admin</option>
                    <option value="ADMIN">💼 Modul Admin Lapangan (Mitra)</option>
                    <option value="OUTLET">🏪 Modul Outlet Mitra</option>
                    <option value="FAQ">❓ FAQ & Solusi Toko</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Urutan Nomor
                  </label>
                  <input
                    type="number"
                    value={formOrderNumber}
                    onChange={(e) => setFormOrderNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Judul Bab Panduan */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Judul Bab Panduan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: 1. Cara Kerja Kartu NFC di Meja"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Tag Label & Tag Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Label Tag
                  </label>
                  <input
                    type="text"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    placeholder="Contoh: Teknologi Tap"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Warna Badge Tag
                  </label>
                  <select
                    value={formTagColor}
                    onChange={(e) => setFormTagColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="emerald">🟢 Emerald (Hijau)</option>
                    <option value="indigo">🟣 Indigo (Ungu Tua)</option>
                    <option value="teal">🌊 Teal (Biru Laut)</option>
                    <option value="purple">🔮 Purple (Ungu)</option>
                    <option value="sky">🌌 Sky (Biru Langit)</option>
                    <option value="amber">🟡 Amber (Emas/Kuning)</option>
                    <option value="rose">🔴 Rose (Merah)</option>
                  </select>
                </div>
              </div>

              {/* Ringkasan Singkat */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ringkasan Singkat (Subtitle)
                </label>
                <input
                  type="text"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Ringkasan 1 kalimat yang muncul di bawah judul"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Isi Konten Lengkap (HTML Formatted) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Isi Materi Lengkap (Format HTML) <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditorPreview(!showEditorPreview)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showEditorPreview
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showEditorPreview ? "Tutup Preview" : "Lihat Preview"}</span>
                  </button>
                </div>

                {/* Quick Snippet Chips */}
                {!showEditorPreview && (
                  <div className="flex items-center gap-1.5 flex-wrap pb-1">
                    <span className="text-[10px] text-slate-500 font-semibold mr-0.5">Quick Insert:</span>
                    <button
                      type="button"
                      onClick={() => setFormContentHtml((prev) => prev + "\n<p>Teks paragraf baru di sini...</p>")}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer border border-slate-700"
                    >
                      + &lt;p&gt; Paragraf
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormContentHtml(
                          (prev) =>
                            prev +
                            '\n<ul class="list-disc list-inside space-y-1.5 text-slate-300 text-[11.5px]">\n  <li><strong>Poin 1:</strong> Deskripsi...</li>\n  <li><strong>Poin 2:</strong> Deskripsi...</li>\n</ul>'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer border border-slate-700"
                    >
                      + &lt;ul&gt; Bullet List
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormContentHtml(
                          (prev) =>
                            prev +
                            '\n<div class="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-[11.5px] text-slate-300 space-y-1">\n  <strong class="text-indigo-300 block">💡 Informasi:</strong>\n  <p>Teks informasi...</p>\n</div>'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 text-[10px] font-mono cursor-pointer border border-indigo-700/50"
                    >
                      + Box Info Ungu
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormContentHtml(
                          (prev) =>
                            prev +
                            '\n<div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11.5px] text-slate-300 space-y-1">\n  <strong class="text-emerald-300 block">✅ Berhasil / Rekomendasi:</strong>\n  <p>Teks rekomendasi...</p>\n</div>'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-[10px] font-mono cursor-pointer border border-emerald-700/50"
                    >
                      + Box Sukses Hijau
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormContentHtml(
                          (prev) =>
                            prev +
                            '\n<div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11.5px] text-slate-300 space-y-1">\n  <strong class="text-amber-300 block">⚠️ Perhatian Khusus:</strong>\n  <p>Peringatan keamanan...</p>\n</div>'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-[10px] font-mono cursor-pointer border border-amber-700/50"
                    >
                      + Box Peringatan Kuning
                    </button>
                  </div>
                )}

                {showEditorPreview ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-700 min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 border-b border-slate-800 pb-1">
                      Live Preview Tampilan:
                    </div>
                    <div
                      className="prose prose-invert prose-xs max-w-none text-slate-300 text-xs leading-relaxed space-y-2.5"
                      dangerouslySetInnerHTML={{ __html: formContentHtml || "<p className='text-slate-500 italic'>Konten masih kosong...</p>" }}
                    />
                  </div>
                ) : (
                  <textarea
                    rows={9}
                    required
                    value={formContentHtml}
                    onChange={(e) => setFormContentHtml(e.target.value)}
                    placeholder="<p>Penjelasan detail materi panduan...</p>"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingArticle ? "Simpan Perubahan" : "Tambahkan Panduan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
