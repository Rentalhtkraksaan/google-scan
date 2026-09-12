"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Layers,
  Store,
  UserCheck,
  Plus,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  MessageCircle,
  Shield,
  Filter,
  KeyRound,
  Power,
  Globe,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
  ChevronDown,
  History,
  Camera,
  Database,
} from "lucide-react";
import ActivityLogTable from "@/components/dashboard/ActivityLogTable";
import DatabaseBackupPanel from "@/components/dashboard/DatabaseBackupPanel";
import { CreateAdminModal } from "@/components/dashboard/CreateAdminModal";
import { EditAdminModal } from "@/components/dashboard/EditAdminModal";
import { CreateSuperAdminModal } from "@/components/dashboard/CreateSuperAdminModal";
import { EditSuperAdminModal } from "@/components/dashboard/EditSuperAdminModal";
import { EditProfileModal } from "@/components/dashboard/EditProfileModal";
import { LandingPageSettingsModal } from "@/components/dashboard/LandingPageSettingsModal";
import { PrintTemplateManagerModal } from "@/components/dashboard/PrintTemplateManagerModal";
import { BatchGenerateModal } from "@/components/dashboard/BatchGenerateModal";
import { BatchExportModal } from "@/components/dashboard/BatchExportModal";
import { RegisterOutletModal } from "@/components/forms/RegisterOutletModal";
import { EditOutletModal } from "@/components/forms/EditOutletModal";
import { EditCardModal } from "@/components/dashboard/EditCardModal";
import { QrCodeModal } from "@/components/dashboard/QrCodeModal";
import { AssignCardToOutletModal } from "@/components/dashboard/AssignCardToOutletModal";
import { QrCameraScannerModal } from "@/components/dashboard/QrCameraScannerModal";
import { toggleCardStatusAction, deleteCardAction, deleteBatchCardsAction } from "@/lib/actions/qr.actions";
import {
  deleteAdminAction,
  deleteSuperAdminAction,
  deleteOutletUserAction,
  deleteBatchOutletUsersAction,
  deleteBatchAdminsAction,
  deleteBatchSuperAdminsAction,
  toggleUserActiveStatusAction,
  toggleSuperAdminPermissionAction,
} from "@/lib/actions/auth.actions";
import {
  showSuccessAlert,
  showErrorAlert,
  showConfirmAlert,
  showToggleCardConfirmAlert,
  showTwoStepDeleteConfirmAlert,
  showWelcomeAlert,
} from "@/lib/swal";
import {
  AdminWithRelations,
  AuthenticatedUser,
  OutletModel,
  QrCardModel,
  SiteSettingModel,
  SuperAdminItem,
} from "@/types/models";
import { CardExportItem } from "@/lib/qr-export";

interface SuperAdminDashboardClientProps {
  currentUser: AuthenticatedUser;
  superAdmins: SuperAdminItem[];
  admins: AdminWithRelations[];
  allCards: QrCardModel[];
  allOutlets: OutletModel[];
  siteSetting: SiteSettingModel;
}

interface PreviewCardState {
  code: string;
  status: string;
  outlet?: { name: string; googleReviewUrl: string } | null;
}

interface EditingCardState {
  code: string;
  fallbackUrl: string;
  assignedAdminId: string | null;
  outletId?: string | null;
  outlet?: { id: string; name: string } | null;
  isPrimaryCard?: boolean;
}

interface EditingOutletState {
  id: string;
  name: string;
  googleReviewUrl: string;
  owner: {
    fullName: string;
    whatsappNumber: string | null;
    email: string;
  };
}

export function SuperAdminDashboardClient({
  currentUser,
  superAdmins = [],
  admins,
  allCards,
  allOutlets,
  siteSetting,
}: SuperAdminDashboardClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isMaster = !!currentUser?.isSuperAdminMaster;

  // Helper: Cek apakah Admin didaftarkan oleh Super Admin 1 (Master)
  const isAdminProtectedFromSA2 = (admin: AdminWithRelations) => {
    return !admin.createdById || admin.createdBy?.isSuperAdminMaster;
  };

  // Helper: Cek apakah Outlet didaftarkan oleh Super Admin 1 atau oleh Admin binaan Super Admin 1
  const isOutletProtectedFromSA2 = (outlet: OutletModel) => {
    const cards = outlet.qrCards || (outlet.qrCard ? [outlet.qrCard] : []);
    if (cards.some((c) => isDemoCard(c.code))) return true;
    if (!outlet.owner?.createdById || outlet.owner?.createdBy?.isSuperAdminMaster) return true;
    if (
      outlet.owner?.createdBy?.role === "ADMIN" &&
      (!outlet.owner?.createdBy?.createdById || outlet.owner?.createdBy?.createdBy?.isSuperAdminMaster)
    ) {
      return true;
    }
    if (
      cards.some(
        (c) =>
          c.assignedAdmin &&
          (!c.assignedAdmin.createdById || c.assignedAdmin.createdBy?.isSuperAdminMaster)
      )
    ) {
      return true;
    }
    return false;
  };

  // Helper: Cek apakah Kartu QR dikelola oleh Super Admin 1 atau oleh Admin binaan Super Admin 1
  const isCardProtectedFromSA2 = (card: QrCardModel) => {
    if (isDemoCard(card.code)) return true;
    // Kartu di kolam umum pusat (tanpa admin) adalah milik Super Admin 1
    if (!card.assignedAdminId || !card.assignedAdmin) return true;
    // Kartu dipegang oleh admin buatan Super Admin 1
    if (!card.assignedAdmin.createdById || card.assignedAdmin.createdBy?.isSuperAdminMaster) return true;
    // Kartu terhubung ke outlet buatan Super Admin 1 / admin binaan Super Admin 1
    if (card.outlet) {
      const owner = card.outlet.owner;
      if (owner) {
        if (!owner.createdById || owner.createdBy?.isSuperAdminMaster) return true;
        if (
          owner.createdBy?.role === "ADMIN" &&
          (!owner.createdBy?.createdById || owner.createdBy?.createdBy?.isSuperAdminMaster)
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const [activeTab, setActiveTab] = useState<"ADMINS" | "CARDS" | "OUTLETS" | "SUPER_ADMINS" | "ACTIVITY_LOGS" | "DATABASE_BACKUP">("CARDS");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<"ALL" | "OUTLET" | "ADMIN" | "CODE">("ALL");
  const [selectedAdminFilter, setSelectedAdminFilter] = useState<string>("ALL");
  const [cardFilter, setCardFilter] = useState<"ALL" | "BLANK" | "CLAIMED" | "ACTIVE" | "INACTIVE">("ALL");

  // Selection states untuk fitur Hapus All / Select All (Khusus Super Admin 1)
  const [selectedCardCodes, setSelectedCardCodes] = useState<string[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [selectedSuperAdminIds, setSelectedSuperAdminIds] = useState<string[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem("just_logged_in") === "true") {
      sessionStorage.removeItem("just_logged_in");
      const roleLabel = isMaster ? "Super Admin 1 (Master)" : "Super Admin 2";
      showWelcomeAlert(currentUser.fullName || "Super Admin", roleLabel);
    }
  }, [isMaster, currentUser.fullName]);

  const canEditLanding = isMaster || currentUser?.canEditLandingPage === true;
  const canManageTemplates = isMaster || currentUser?.canManagePrintTemplates === true;

  // Modals state
  const [isLandingPageModalOpen, setIsLandingPageModalOpen] = useState(false);
  const [isPrintTemplateModalOpen, setIsPrintTemplateModalOpen] = useState(false);
  const [isCreateSuperAdminOpen, setIsCreateSuperAdminOpen] = useState(false);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [isBatchGenerateOpen, setIsBatchGenerateOpen] = useState(false);
  const [isBatchExportOpen, setIsBatchExportOpen] = useState(false);
  const [isBypassOutletOpen, setIsBypassOutletOpen] = useState(false);
  const [prefilledCardCode, setPrefilledCardCode] = useState("");
  const [previewCard, setPreviewCard] = useState<PreviewCardState | null>(null);
  const [editingCard, setEditingCard] = useState<EditingCardState | null>(null);
  const [editingOutlet, setEditingOutlet] = useState<EditingOutletState | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<{
    id: string;
    fullName: string;
    email: string;
    whatsappNumber: string | null;
  } | null>(null);
  const [editingSuperAdmin, setEditingSuperAdmin] = useState<SuperAdminItem | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [assigningOutlet, setAssigningOutlet] = useState<{
    id: string;
    name: string;
    currentCards?: { code: string }[];
  } | null>(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Helper: Cek apakah suatu kartu/outlet adalah Kartu Demo Landing Page
  const isDemoCard = (cardCode: string) => {
    if (!cardCode) return false;
    const code = cardCode.toLowerCase().trim();
    const demoUrl = (siteSetting?.ctaSecondaryUrl || "/c/c-001").toLowerCase().trim();
    return (
      code === "c-001" ||
      demoUrl.includes(code) ||
      (demoUrl.startsWith("/c/") && demoUrl.replace("/c/", "") === code)
    );
  };

  // Hanya Super Admin 1 (Master) yang melihat Kartu & Outlet Demo Landing Page
  const displayCards = isMaster ? allCards : allCards.filter((c) => !isDemoCard(c.code));
  const displayOutlets = isMaster
    ? allOutlets
    : allOutlets.filter((o) => !o.qrCard?.code || !isDemoCard(o.qrCard.code));

  // Global calculations
  const totalScans = displayCards.reduce((acc, c) => acc + (c.scanCount || 0), 0);
  const totalCards = displayCards.length;
  const totalActiveCards = displayCards.filter((c) => c.status === "ACTIVE").length;
  const totalOutlets = displayOutlets.length;
  const totalAdmins = admins.length;
  const totalSuperAdmins = superAdmins.length;

  // 1. Search matched cards (before cardFilter pill)
  const searchMatchedCards = displayCards.filter((card) => {
    // Filter Admin Lapangan jika dipilih
    if (selectedAdminFilter !== "ALL") {
      if (selectedAdminFilter === "UNASSIGNED") {
        if (card.assignedAdminId) return false;
      } else {
        if (card.assignedAdminId !== selectedAdminFilter) return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    if (searchScope === "CODE") {
      return card.code.toLowerCase().includes(q);
    }
    if (searchScope === "OUTLET") {
      return (
        (card.outlet?.name && card.outlet.name.toLowerCase().includes(q)) ||
        (card.outlet?.owner?.fullName && card.outlet.owner.fullName.toLowerCase().includes(q)) ||
        (card.outlet?.owner?.email && card.outlet.owner.email.toLowerCase().includes(q))
      );
    }
    if (searchScope === "ADMIN") {
      return (
        card.assignedAdmin?.fullName && card.assignedAdmin.fullName.toLowerCase().includes(q)
      );
    }

    // Default ALL
    return (
      card.code.toLowerCase().includes(q) ||
      (card.outlet?.name && card.outlet.name.toLowerCase().includes(q)) ||
      (card.assignedAdmin?.fullName && card.assignedAdmin.fullName.toLowerCase().includes(q)) ||
      (card.outlet?.owner?.fullName && card.outlet.owner.fullName.toLowerCase().includes(q)) ||
      (card.outlet?.owner?.email && card.outlet.owner.email.toLowerCase().includes(q))
    );
  });

  // 2. Filtered cards (after cardFilter pill)
  const filteredCards = searchMatchedCards.filter((card) => {
    if (cardFilter === "BLANK") return !card.outlet;
    if (cardFilter === "CLAIMED") return !!card.outlet;
    if (cardFilter === "ACTIVE") return card.status === "ACTIVE";
    if (cardFilter === "INACTIVE") return card.status === "INACTIVE";
    return true;
  });

  // Filter admins
  const filteredAdmins = admins.filter((admin) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      admin.fullName.toLowerCase().includes(q) ||
      admin.email.toLowerCase().includes(q) ||
      (admin.whatsappNumber && admin.whatsappNumber.includes(q))
    );
  });

  // Filter super admins
  const filteredSuperAdmins = superAdmins.filter((sa) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      sa.fullName.toLowerCase().includes(q) ||
      sa.email.toLowerCase().includes(q) ||
      (sa.whatsappNumber && sa.whatsappNumber.includes(q))
    );
  });

  // Filter outlets
  const filteredOutlets = displayOutlets.filter((outlet) => {
    const cards = outlet.qrCards || (outlet.qrCard ? [outlet.qrCard] : []);

    // Filter Admin Lapangan jika dipilih
    if (selectedAdminFilter !== "ALL") {
      if (selectedAdminFilter === "UNASSIGNED") {
        if (cards.some((c) => c.assignedAdminId)) return false;
      } else {
        if (!cards.some((c) => c.assignedAdminId === selectedAdminFilter)) return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    if (searchScope === "CODE") {
      return cards.some((c) => c.code.toLowerCase().includes(q));
    }
    if (searchScope === "OUTLET") {
      return (
        outlet.name.toLowerCase().includes(q) ||
        (outlet.owner?.fullName && outlet.owner.fullName.toLowerCase().includes(q)) ||
        (outlet.owner?.email && outlet.owner.email.toLowerCase().includes(q))
      );
    }
    if (searchScope === "ADMIN") {
      return cards.some(
        (c) => c.assignedAdmin?.fullName && c.assignedAdmin.fullName.toLowerCase().includes(q)
      );
    }

    // Default ALL
    return (
      outlet.name.toLowerCase().includes(q) ||
      (outlet.owner?.fullName && outlet.owner.fullName.toLowerCase().includes(q)) ||
      (outlet.owner?.email && outlet.owner.email.toLowerCase().includes(q)) ||
      cards.some((c) => c.code.toLowerCase().includes(q)) ||
      cards.some(
        (c) => c.assignedAdmin?.fullName && c.assignedAdmin.fullName.toLowerCase().includes(q)
      )
    );
  });

  // Helper: Hitung total outlet binaan admin berdasarkan kartu indukan yang dipegang
  const getAdminIndukOutletsCount = (adminId: string) => {
    return allOutlets.filter((outlet) => {
      const primaryCard =
        outlet.qrCards && outlet.qrCards.length > 0 ? outlet.qrCards[0] : outlet.qrCard;
      return primaryCard && primaryCard.assignedAdminId === adminId;
    }).length;
  };

  // ─── Selection Helpers & Deletable Items (Khusus Super Admin 1) ───────────
  const deletableCards = filteredCards.filter((c) => !isDemoCard(c.code));
  const isAllCardsSelected =
    deletableCards.length > 0 && deletableCards.every((c) => selectedCardCodes.includes(c.code));

  const handleToggleSelectAllCards = () => {
    if (isAllCardsSelected) {
      setSelectedCardCodes([]);
    } else {
      setSelectedCardCodes(deletableCards.map((c) => c.code));
    }
  };

  const handleToggleCardSelection = (code: string) => {
    setSelectedCardCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const deletableAdmins = filteredAdmins.filter(
    (a) => getAdminIndukOutletsCount(a.id) === 0
  );
  const isAllAdminsSelected =
    deletableAdmins.length > 0 && deletableAdmins.every((a) => selectedAdminIds.includes(a.id));

  const handleToggleSelectAllAdmins = () => {
    if (isAllAdminsSelected) {
      setSelectedAdminIds([]);
    } else {
      setSelectedAdminIds(deletableAdmins.map((a) => a.id));
    }
  };

  const handleToggleAdminSelection = (id: string) => {
    const admin = filteredAdmins.find((a) => a.id === id);
    const indukCount = admin ? getAdminIndukOutletsCount(admin.id) : 0;
    if (admin && indukCount > 0) {
      showErrorAlert(
        "Tidak Dapat Dipilih",
        `
          <div style="text-align: center; margin-top: 4px;">
            <p style="margin-bottom: 12px; font-size: 13.5px; color: #f1f5f9; line-height: 1.5;">
              Admin <strong style="color: #60a5fa; font-weight: 700;">${admin.fullName}</strong> saat ini masih membina <strong style="color: #f87171; font-weight: 700;">${indukCount} outlet aktif</strong>.
            </p>
            <div style="padding: 10px 14px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; font-size: 12px; color: #fca5a5; line-height: 1.5;">
              ⚠️ Hanya Admin Lapangan dengan <strong style="color: #4ade80;">0 outlet binaan</strong> yang dapat dipilih untuk dihapus massal.
            </div>
          </div>
        `
      );
      return;
    }
    setSelectedAdminIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const deletableOutlets = filteredOutlets.filter(
    (o) => !o.qrCard?.code || !isDemoCard(o.qrCard.code)
  );
  const getOutletOwnerId = (o: OutletModel) => o.ownerId || o.owner?.id || o.id;
  const isAllOutletsSelected =
    deletableOutlets.length > 0 &&
    deletableOutlets.every((o) => selectedOutletIds.includes(getOutletOwnerId(o)));

  const handleToggleSelectAllOutlets = () => {
    if (isAllOutletsSelected) {
      setSelectedOutletIds([]);
    } else {
      setSelectedOutletIds(deletableOutlets.map(getOutletOwnerId));
    }
  };

  const handleToggleOutletSelection = (ownerId: string) => {
    setSelectedOutletIds((prev) =>
      prev.includes(ownerId) ? prev.filter((i) => i !== ownerId) : [...prev, ownerId]
    );
  };

  const deletableSuperAdmins = filteredSuperAdmins.filter(
    (sa) => !sa.isSuperAdminMaster && sa.id !== currentUser.id
  );
  const isAllSuperAdminsSelected =
    deletableSuperAdmins.length > 0 &&
    deletableSuperAdmins.every((sa) => selectedSuperAdminIds.includes(sa.id));

  const handleToggleSelectAllSuperAdmins = () => {
    if (isAllSuperAdminsSelected) {
      setSelectedSuperAdminIds([]);
    } else {
      setSelectedSuperAdminIds(deletableSuperAdmins.map((sa) => sa.id));
    }
  };

  const handleToggleSuperAdminSelection = (id: string) => {
    setSelectedSuperAdminIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ─── Batch Delete Server Action Callers (Validasi 2 Langkah) ────────────────
  const handleBatchDeleteCards = async () => {
    if (selectedCardCodes.length === 0) return;
    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Masal ${selectedCardCodes.length} Kartu QR`,
      `Sebanyak <b>${selectedCardCodes.length} kartu QR terpilih</b> akan dihapus secara permanen dari database. Tindakan ini tidak dapat dibatalkan!`,
      `${selectedCardCodes.length} Kartu QR`,
      "HAPUS"
    );
    if (!confirmed) return;

    setIsDeletingBatch(true);
    try {
      const res = await deleteBatchCardsAction(selectedCardCodes);
      if (res.success) {
        showSuccessAlert("Berhasil Dihapus", res.message, 1500);
        setSelectedCardCodes([]);
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Terjadi kesalahan saat menghapus batch kartu.");
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleBatchDeleteOutlets = async () => {
    if (selectedOutletIds.length === 0) return;

    // Cek apakah ada outlet terpilih yang memegang > 1 kartu
    const overQuotaOutlets = allOutlets.filter((o) => {
      const ownerId = o.ownerId || o.owner?.id || o.id;
      const cards = o.qrCards && o.qrCards.length > 0 ? o.qrCards : (o.qrCard ? [o.qrCard] : []);
      return selectedOutletIds.includes(ownerId) && cards.length > 1;
    });

    if (overQuotaOutlets.length > 0) {
      showErrorAlert(
        "Tidak Dapat Dihapus",
        `Sebagian outlet yang dipilih memegang lebih dari 1 kartu QR (${overQuotaOutlets
          .map((o) => o.name)
          .join(", ")}). Outlet dengan lebih dari 1 kartu tidak dapat dihapus, hanya dapat dinonaktifkan.`
      );
      return;
    }

    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Masal ${selectedOutletIds.length} Outlet`,
      `Sebanyak <b>${selectedOutletIds.length} outlet terpilih</b> akan dihapus secara permanen. Kartu QR terkait akan dikembalikan ke status kosong siap pakai.`,
      `${selectedOutletIds.length} Outlet`,
      "HAPUS"
    );
    if (!confirmed) return;

    setIsDeletingBatch(true);
    try {
      const res = await deleteBatchOutletUsersAction(selectedOutletIds);
      if (res.success) {
        showSuccessAlert("Berhasil Dihapus", res.message, 1500);
        setSelectedOutletIds([]);
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Terjadi kesalahan saat menghapus batch outlet.");
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleBatchDeleteAdmins = async () => {
    if (selectedAdminIds.length === 0) return;
    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Masal ${selectedAdminIds.length} Admin Lapangan`,
      `Sebanyak <b>${selectedAdminIds.length} akun Admin Lapangan terpilih</b> akan dihapus permanen. Seluruh kartu jatah binaannya akan dikembalikan ke kolam umum pusat.`,
      `${selectedAdminIds.length} Admin Lapangan`,
      "HAPUS"
    );
    if (!confirmed) return;

    setIsDeletingBatch(true);
    try {
      const res = await deleteBatchAdminsAction(selectedAdminIds);
      if (res.success) {
        showSuccessAlert("Berhasil Dihapus", res.message, 1500);
        setSelectedAdminIds([]);
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Terjadi kesalahan saat menghapus batch admin.");
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleBatchDeleteSuperAdmins = async () => {
    if (selectedSuperAdminIds.length === 0) return;
    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Masal ${selectedSuperAdminIds.length} Super Admin 2`,
      `Sebanyak <b>${selectedSuperAdminIds.length} akun Super Admin 2 terpilih</b> akan dihapus secara permanen.`,
      `${selectedSuperAdminIds.length} Super Admin 2`,
      "HAPUS"
    );
    if (!confirmed) return;

    setIsDeletingBatch(true);
    try {
      const res = await deleteBatchSuperAdminsAction(selectedSuperAdminIds);
      if (res.success) {
        showSuccessAlert("Berhasil Dihapus", res.message, 1500);
        setSelectedSuperAdminIds([]);
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Terjadi kesalahan saat menghapus batch super admin.");
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Toggle card status dengan konfirmasi modal
  const handleToggleStatus = async (code: string, outletName?: string | null, currentStatus = "ACTIVE") => {
    const confirmed = await showToggleCardConfirmAlert(code, outletName, currentStatus);
    if (!confirmed) return;

    try {
      const res = await toggleCardStatusAction(code);
      if (res.success) {
        showSuccessAlert("Status Diperbarui", res.message, 1200);
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal mengubah status kartu.");
    }
  };

  // Delete card (Validasi 2 Langkah & Proteksi Super Admin 1)
  const handleDeleteCard = async (code: string, isProtectedFromSA2?: boolean) => {
    if (!isMaster && isProtectedFromSA2) {
      showErrorAlert(
        "Akses Ditolak",
        "Akun Super Admin 2 tidak memiliki izin untuk menghapus kartu yang dikelola oleh Super Admin 1 atau Admin binaan Super Admin 1."
      );
      return;
    }

    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Kartu ${code}`,
      `Kartu <b>${code}</b> akan dihapus secara permanen dari sistem dan tidak akan bisa discan lagi.`,
      `Kartu ${code}`,
      "HAPUS"
    );
    if (!confirmed) return;

    try {
      const res = await deleteCardAction(code);
      if (res.success) {
        showSuccessAlert("Berhasil Dihapus", res.message, 1500);
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menghapus kartu.");
    }
  };

  // Delete Admin (Field Admin - Validasi 2 Langkah & Proteksi Super Admin 1 & Outlet Binaan 0)
  const handleDeleteAdmin = async (
    adminId: string,
    name: string,
    isCreatedByMaster?: boolean,
    activeOutletsCount: number = 0
  ) => {
    if (activeOutletsCount > 0) {
      showErrorAlert(
        "Tidak Dapat Dihapus",
        `
          <div style="text-align: center; margin-top: 4px;">
            <p style="margin-bottom: 12px; font-size: 13.5px; color: #f1f5f9; line-height: 1.5;">
              Admin Lapangan <strong style="color: #60a5fa; font-weight: 700;">${name}</strong> saat ini masih membina <strong style="color: #f87171; font-weight: 700;">${activeOutletsCount} outlet aktif</strong>.
            </p>
            <div style="padding: 10px 14px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; font-size: 12px; color: #fca5a5; line-height: 1.5;">
              ⚠️ Harap hapus atau alihkan seluruh outlet binaan terlebih dahulu hingga berjumlah <strong style="color: #4ade80;">0</strong> sebelum menghapus akun Admin ini.
            </div>
          </div>
        `
      );
      return;
    }

    if (!isMaster && isCreatedByMaster) {
      showErrorAlert(
        "Akses Ditolak",
        "Akun Super Admin 2 tidak memiliki izin untuk menghapus admin yang didaftarkan oleh Super Admin 1."
      );
      return;
    }

    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Admin ${name}`,
      `Akun Admin Lapangan <b>${name}</b> akan dihapus permanen. Seluruh kartu QR kosong jatah binaannya akan dikembalikan ke kolam umum pusat.`,
      `Admin ${name}`,
      "HAPUS"
    );
    if (!confirmed) return;

    try {
      const res = await deleteAdminAction(adminId);
      if (res.success) {
        showSuccessAlert("Admin Dihapus", res.message, 1500);
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menghapus admin.");
    }
  };

  // Delete Super Admin 2 (Only Super Admin 1 - Validasi 2 Langkah)
  const handleDeleteSuperAdmin = async (targetId: string, name: string) => {
    if (!isMaster) {
      showErrorAlert("Akses Ditolak", "Hanya Super Admin 1 (Master) yang dapat menghapus Super Admin.");
      return;
    }

    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Super Admin 2 ${name}`,
      `Akun Super Admin 2 <b>${name}</b> akan dihapus permanen dan kehilangan seluruh hak akses sistem.`,
      `Super Admin 2 ${name}`,
      "HAPUS"
    );
    if (!confirmed) return;

    try {
      const res = await deleteSuperAdminAction(targetId);
      if (res.success) {
        showSuccessAlert("Super Admin Dihapus", res.message, 1500);
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menghapus Super Admin.");
    }
  };

  // Toggle Super Admin Permission (Landing page edit permission)
  const handleToggleLandingPermission = async (targetId: string, name: string) => {
    if (!isMaster) {
      showErrorAlert("Akses Ditolak", "Hanya Super Admin 1 yang dapat mengubah hak akses ini.");
      return;
    }

    try {
      const res = await toggleSuperAdminPermissionAction(targetId, "canEditLandingPage");
      if (res.success) {
        showSuccessAlert("Hak Akses Diperbarui", `Hak akses edit landing page untuk ${name} berhasil diubah.`, 1500);
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal memperbarui hak akses.");
    }
  };

  // Toggle Super Admin Permission (Print template management permission)
  const handleToggleTemplatePermission = async (targetId: string, name: string) => {
    if (!isMaster) {
      showErrorAlert("Akses Ditolak", "Hanya Super Admin 1 yang dapat mengubah hak akses ini.");
      return;
    }

    try {
      const res = await toggleSuperAdminPermissionAction(targetId, "canManagePrintTemplates");
      if (res.success) {
        showSuccessAlert("Hak Akses Diperbarui", res.message, 1500);
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal memperbarui hak akses.");
    }
  };

  // Toggle Super Admin Permission (Delete cards permission)
  const handleToggleDeletePermission = async (targetId: string, name: string) => {
    if (!isMaster) {
      showErrorAlert("Akses Ditolak", "Hanya Super Admin 1 yang dapat mengubah hak akses ini.");
      return;
    }

    try {
      const res = await toggleSuperAdminPermissionAction(targetId, "canDeleteCards");
      if (res.success) {
        showSuccessAlert("Hak Akses Diperbarui", res.message, 1500);
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal memperbarui hak akses.");
    }
  };

  // Delete Outlet (Validasi 2 Langkah & Proteksi Super Admin 1 / Admin binaan SA1 / Kartu > 2)
  const handleDeleteOutlet = async (userId: string, name: string, isProtectedFromSA2?: boolean) => {
    if (!isMaster && isProtectedFromSA2) {
      showErrorAlert(
        "Akses Ditolak",
        "Akun Super Admin 2 tidak memiliki izin untuk menghapus outlet yang dibuat oleh Super Admin 1 atau oleh Admin binaan Super Admin 1."
      );
      return;
    }

    // Cek apakah outlet memegang > 1 kartu
    const targetOutlet = allOutlets.find((o) => (o.ownerId || o.owner?.id) === userId);
    const targetCards = targetOutlet?.qrCards && targetOutlet.qrCards.length > 0
      ? targetOutlet.qrCards
      : (targetOutlet?.qrCard ? [targetOutlet.qrCard] : []);

    if (targetCards.length > 1) {
      showErrorAlert(
        "Tidak Dapat Dihapus",
        `Outlet <b>${name}</b> memegang ${targetCards.length} kartu QR (> 1 kartu). Outlet ini tidak dapat dihapus, silakan nonaktifkan akun/outlet sebagai gantinya.`
      );
      return;
    }

    const confirmed = await showTwoStepDeleteConfirmAlert(
      `Hapus Outlet ${name}`,
      `Data outlet <b>${name}</b> beserta akun pemiliknya akan dihapus permanen. Kartu QR terkait akan dikembalikan ke status kosong dan siap dipakai kembali.`,
      `Outlet ${name}`,
      "HAPUS"
    );
    if (!confirmed) return;

    try {
      const res = await deleteOutletUserAction(userId);
      if (res.success) {
        showSuccessAlert("Outlet Dihapus", res.message, 1500);
      } else {
        showErrorAlert("Gagal Menghapus", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal menghapus outlet.");
    }
  };

  // Toggle Admin / User Active Status (Matikan / Aktifkan Akun)
  const handleToggleUserActive = async (userId: string, name: string, currentStatus: boolean) => {
    const actionText = currentStatus ? "Matikan / Nonaktifkan" : "Aktifkan Kembali";
    const result = await showConfirmAlert(
      `${actionText} Akun ${name}?`,
      currentStatus
        ? "Akun ini tidak akan bisa login ke sistem selama dinonaktifkan."
        : "Akun ini akan dapat login kembali ke sistem.",
      currentStatus ? "Ya, Matikan Akun" : "Ya, Aktifkan Akun"
    );
    if (!result.isConfirmed) return;

    try {
      const res = await toggleUserActiveStatusAction(userId);
      if (res.success) {
        showSuccessAlert("Status Akun Diperbarui", res.message, 1500);
      } else {
        showErrorAlert("Gagal", res.message);
      }
    } catch {
      showErrorAlert("Kesalahan", "Gagal memperbarui status akun.");
    }
  };

  const getWaLink = (waNumber: string | null, outletName?: string) => {
    if (!waNumber) return "#";
    let clean = waNumber.replace(/[^0-9]/g, "");
    if (clean.startsWith("08")) clean = "62" + clean.slice(1);
    const text = encodeURIComponent(`Halo dari Super Admin Smart QR Review. Mengenai ${outletName || "layanan"}...`);
    return `https://wa.me/${clean}?text=${text}`;
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isMaster ? (
              <span className="text-xs font-semibold text-indigo-400 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Super Admin 1 (Master Central)
              </span>
            ) : (
              <span className="text-xs font-semibold text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Super Admin 2 (Operasional)
              </span>
            )}

            <span className="text-xs font-mono font-bold text-sky-400 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 shadow-xs">
              {siteSetting?.appVersion || "V 1.1.2"}
            </span>

            {canEditLanding && (
              <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Izin Edit Landing Page Aktif
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dashboard Kontrol Global
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola seluruh kartu QR, alokasi admin mitra, cetak massal, konten landing page, dan analitik ulasan
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tombol CMS Landing Page */}
          <button
            onClick={() => {
              if (canEditLanding) {
                setIsLandingPageModalOpen(true);
              } else {
                showErrorAlert(
                  "Akses Terbatas",
                  "Akun Super Admin 2 Anda belum memiliki izin untuk mengedit konten Landing Page & WhatsApp. Silakan minta akses ke Super Admin 1."
                );
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs border transition-all cursor-pointer shadow-sm ${
              canEditLanding
                ? "bg-gradient-to-r from-sky-600/20 to-indigo-600/20 hover:from-sky-600/30 hover:to-indigo-600/30 text-sky-300 border-sky-500/40 hover:border-sky-400"
                : "bg-slate-800/40 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-75"
            }`}
            title={canEditLanding ? "Edit WhatsApp & Teks Landing Page" : "Akses Terkunci (Perlu Izin Super Admin 1)"}
          >
            {canEditLanding ? (
              <Globe className="w-4 h-4 text-sky-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Pengaturan Landing Page</span>
          </button>

          {/* Tombol Manajemen Template Cetak Multi-Ukuran */}
          <button
            onClick={() => {
              if (!canManageTemplates) {
                showErrorAlert(
                  "Akses Terkunci",
                  "Akun Super Admin 2 Anda belum diberikan izin oleh Super Admin 1 (Master) untuk mengelola template cetak multi-ukuran."
                );
                return;
              }
              setIsPrintTemplateModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs border transition-all cursor-pointer shadow-sm ${
              canManageTemplates
                ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 border-purple-500/40 hover:border-purple-400"
                : "bg-slate-800/40 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-75"
            }`}
            title={canManageTemplates ? "Kelola Template Cetak ID Card, A5, A6, Persegi & Posisi QR Code" : "Akses Terkunci (Perlu Izin Super Admin 1)"}
          >
            {canManageTemplates ? (
              <Layers className="w-4 h-4 text-purple-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>🎨 Template Cetak Multi-Ukuran</span>
          </button>

          <button
            onClick={() => setIsBatchExportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs border border-slate-700 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Ekspor Batch (CSV/ZIP)</span>
          </button>

          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold text-xs border border-indigo-500/30 transition-all cursor-pointer shadow-sm"
            title="Pindai Kartu Fisik QR dengan Kamera untuk Cek Status / Pulihkan Kartu"
          >
            <Camera className="w-4 h-4 text-indigo-400" />
            <span>Scan Kamera QR</span>
          </button>

          <button
            onClick={() => setIsBatchGenerateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 font-medium text-xs border border-sky-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Kartu</span>
          </button>

          <button
            onClick={() => setIsCreateAdminOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Admin Lapangan</span>
          </button>

          {/* Tombol Edit Profil Saya */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all shadow-sm cursor-pointer"
            title="Edit Profil & Ubah Password Saya"
          >
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Profil Saya</span>
          </button>

          {/* Tombol Tambah Super Admin 2 (Khusus Super Admin 1) */}
          {isMaster && (
            <button
              onClick={() => setIsCreateSuperAdminOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>+ Tambah Super Admin 2</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 Global Stat Cards (4 for SA2) */}
      <div className={`grid grid-cols-2 ${isMaster ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        {/* Total Scan */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 stats-card stats-card-cyan">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Scan Global</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-sky-400">{totalScans}</span>
            <span className="text-xs text-slate-400 font-medium">scan</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Akumulasi seluruh Indonesia</span>
        </div>

        {/* Total Kartu */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 stats-card stats-card-indigo">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Kartu QR</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">{totalCards}</span>
            <span className="text-xs text-emerald-400 font-semibold">({totalActiveCards} Aktif)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Tersebar di mitra & kolam</span>
        </div>

        {/* Total Outlet */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 stats-card stats-card-emerald">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Outlet Klien</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400">{totalOutlets}</span>
            <span className="text-xs text-slate-400 font-medium">toko</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Terdaftar & aktif menggunakan</span>
        </div>

        {/* Total Super & Lapangan Admin */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 stats-card stats-card-amber">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Admin Tim</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold text-amber-400">{totalAdmins}</span>
            <span className="text-xs text-slate-400 font-medium">lapangan</span>
            <span className="text-xs text-purple-400 font-medium ml-1">({totalSuperAdmins} Super)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Struktur manajemen pengguna</span>
        </div>

        {/* Total Visitor (Khusus Super Admin 1) */}
        {isMaster && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 stats-card stats-card-rose">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Pengunjung</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-bold text-rose-400">{siteSetting?.visitorCount || 0}</span>
              <span className="text-xs text-slate-400 font-medium">user</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Kunjungan di Landing Page</span>
          </div>
        )}
      </div>

      {/* Main Tabs Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("CARDS")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "CARDS"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              }`}
            >
              Semua Kartu QR ({searchQuery.trim() ? searchMatchedCards.length : displayCards.length})
            </button>
            <button
              onClick={() => setActiveTab("ADMINS")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "ADMINS"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/25"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              }`}
            >
              Admin Lapangan ({searchQuery.trim() ? filteredAdmins.length : admins.length})
            </button>
            <button
              onClick={() => setActiveTab("OUTLETS")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "OUTLETS"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              }`}
            >
              Semua Outlet ({searchQuery.trim() ? filteredOutlets.length : displayOutlets.length})
            </button>
            <button
              onClick={() => setActiveTab("SUPER_ADMINS")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "SUPER_ADMINS"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                  : "bg-slate-800/80 text-purple-300 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Kelola Super Admin ({searchQuery.trim() ? filteredSuperAdmins.length : superAdmins.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("ACTIVITY_LOGS")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ACTIVITY_LOGS"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "bg-slate-800/80 text-blue-300 hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Log Aktivitas</span>
            </button>
            {isMaster && (
              <button
                onClick={() => setActiveTab("DATABASE_BACKUP")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "DATABASE_BACKUP"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                    : "bg-slate-800/80 text-emerald-400 hover:text-white"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Database & Auto-Backup</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {/* Dropdown Kategori Pencarian */}
            <div className="relative">
              <select
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value as "ALL" | "OUTLET" | "ADMIN" | "CODE")}
                className="w-full sm:w-auto px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer pr-8 appearance-none"
              >
                <option value="ALL">🔍 Semua Kategori</option>
                <option value="OUTLET">🏪 Cari Outlet / Pemilik</option>
                <option value="ADMIN">👤 Cari Admin Lapangan</option>
                <option value="CODE">💳 Cari Kode Kartu</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Input Search */}
            <div className="relative flex-1 sm:w-64 md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchScope === "OUTLET"
                    ? "Cari nama outlet / pemilik..."
                    : searchScope === "ADMIN"
                    ? "Cari nama / email admin..."
                    : searchScope === "CODE"
                    ? "Cari kode kartu (cth: c-002)..."
                    : "Cari outlet, pemilik, admin, kode..."
                }
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Bersihkan pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>



        {/* Info Banner Hasil Pencarian / Filter jika aktif */}
        {(searchQuery.trim() || selectedAdminFilter !== "ALL" || searchScope !== "ALL") && (
          <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-indigo-950/50 border border-indigo-500/30 rounded-2xl text-xs text-indigo-200 animate-in fade-in">
            <div className="flex items-center gap-2 flex-wrap">
              <Search className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Menampilkan <strong className="text-white font-bold">{
                  activeTab === "CARDS" ? filteredCards.length :
                  activeTab === "ADMINS" ? filteredAdmins.length :
                  activeTab === "OUTLETS" ? filteredOutlets.length :
                  filteredSuperAdmins.length
                }</strong> data
                {searchQuery.trim() && (
                  <> untuk pencarian &ldquo;<span className="text-amber-300 font-semibold">{searchQuery}</span>&rdquo;</>
                )}
                {searchScope !== "ALL" && (
                  <span className="text-indigo-300 ml-1">
                    (Target: {searchScope === "OUTLET" ? "Outlet / Pemilik" : searchScope === "ADMIN" ? "Admin Lapangan" : "Kode Kartu"})
                  </span>
                )}
                {selectedAdminFilter !== "ALL" && (
                  <span className="text-amber-300 ml-1">
                    [Admin: {selectedAdminFilter === "UNASSIGNED" ? "Belum Dialokasikan" : admins.find((a) => a.id === selectedAdminFilter)?.fullName || "Admin"}]
                  </span>
                )}
                {activeTab === "CARDS" && cardFilter !== "ALL" && (
                  <span className="text-slate-400 ml-1">
                    (Status: {cardFilter === "BLANK" ? "Kosong" : cardFilter === "CLAIMED" ? "Terpakai" : cardFilter === "ACTIVE" ? "Aktif" : "Nonaktif"})
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              {isMaster && (
                <>
                  {activeTab === "CARDS" && deletableCards.length > 0 && (
                    <button
                      onClick={handleToggleSelectAllCards}
                      className="flex items-center gap-1 text-[11px] font-semibold text-sky-300 hover:text-white bg-sky-900/40 hover:bg-sky-800/60 px-2.5 py-1.5 rounded-xl border border-sky-500/30 transition-all cursor-pointer"
                    >
                      <span>{isAllCardsSelected ? "Batalkan Pilih Semua" : `Pilih Semua Hasil (${deletableCards.length})`}</span>
                    </button>
                  )}
                  {activeTab === "ADMINS" && deletableAdmins.length > 0 && (
                    <button
                      onClick={handleToggleSelectAllAdmins}
                      className="flex items-center gap-1 text-[11px] font-semibold text-sky-300 hover:text-white bg-sky-900/40 hover:bg-sky-800/60 px-2.5 py-1.5 rounded-xl border border-sky-500/30 transition-all cursor-pointer"
                    >
                      <span>{isAllAdminsSelected ? "Batalkan Pilih Semua" : `Pilih Semua Hasil (${deletableAdmins.length})`}</span>
                    </button>
                  )}
                  {activeTab === "OUTLETS" && deletableOutlets.length > 0 && (
                    <button
                      onClick={handleToggleSelectAllOutlets}
                      className="flex items-center gap-1 text-[11px] font-semibold text-sky-300 hover:text-white bg-sky-900/40 hover:bg-sky-800/60 px-2.5 py-1.5 rounded-xl border border-sky-500/30 transition-all cursor-pointer"
                    >
                      <span>{isAllOutletsSelected ? "Batalkan Pilih Semua" : `Pilih Semua Hasil (${deletableOutlets.length})`}</span>
                    </button>
                  )}
                  {activeTab === "SUPER_ADMINS" && deletableSuperAdmins.length > 0 && (
                    <button
                      onClick={handleToggleSelectAllSuperAdmins}
                      className="flex items-center gap-1 text-[11px] font-semibold text-sky-300 hover:text-white bg-sky-900/40 hover:bg-sky-800/60 px-2.5 py-1.5 rounded-xl border border-sky-500/30 transition-all cursor-pointer"
                    >
                      <span>{isAllSuperAdminsSelected ? "Batalkan Pilih Semua" : `Pilih Semua Hasil (${deletableSuperAdmins.length})`}</span>
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchScope("ALL");
                  setSelectedAdminFilter("ALL");
                  setCardFilter("ALL");
                  setSelectedCardCodes([]);
                  setSelectedAdminIds([]);
                  setSelectedOutletIds([]);
                  setSelectedSuperAdminIds([]);
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 hover:text-white bg-indigo-900/60 hover:bg-indigo-800/80 px-2.5 py-1.5 rounded-xl border border-indigo-500/30 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: ALL QR CARDS */}
        {activeTab === "CARDS" && (
          <div className="mt-5 space-y-4">
            {/* Floating / Sticky Bulk Action Bar (Khusus Super Admin 1) */}
            {isMaster && selectedCardCodes.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-rose-950/90 to-red-950/90 border border-rose-500/50 rounded-2xl text-xs text-rose-200 shadow-xl shadow-rose-950/50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-400 animate-ping" />
                  <span className="font-bold text-white text-sm">
                    {selectedCardCodes.length} dari {deletableCards.length} Kartu QR Dipilih
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setSelectedCardCodes([])}
                    className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                  <button
                    onClick={handleBatchDeleteCards}
                    disabled={isDeletingBatch}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/40 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeletingBatch ? "Menghapus..." : `Hapus Semua Kartu Terpilih (${selectedCardCodes.length})`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter pills & Admin Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                {[
                  { id: "ALL", label: `Semua (${searchMatchedCards.length})` },
                  { id: "BLANK", label: `Kosong (${searchMatchedCards.filter((c) => !c.outlet).length})` },
                  { id: "CLAIMED", label: `Terpakai (${searchMatchedCards.filter((c) => !!c.outlet).length})` },
                  { id: "ACTIVE", label: `Aktif (${searchMatchedCards.filter((c) => c.status === "ACTIVE").length})` },
                  { id: "INACTIVE", label: `Nonaktif (${searchMatchedCards.filter((c) => c.status === "INACTIVE").length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCardFilter(f.id as "ALL" | "BLANK" | "CLAIMED" | "ACTIVE" | "INACTIVE")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      cardFilter === f.id
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Admin Lapangan Filter Dropdown */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Admin:
                </span>
                <div className="relative">
                  <select
                    value={selectedAdminFilter}
                    onChange={(e) => setSelectedAdminFilter(e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer pr-7 appearance-none"
                  >
                    <option value="ALL">Semua Admin ({displayCards.length})</option>
                    {admins.map((adm) => {
                      const count = displayCards.filter((c) => c.assignedAdminId === adm.id).length;
                      return (
                        <option key={adm.id} value={adm.id}>
                          {adm.fullName} ({count})
                        </option>
                      );
                    })}
                    <option value="UNASSIGNED">
                      Belum Dialokasikan ({displayCards.filter((c) => !c.assignedAdminId).length})
                    </option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {filteredCards.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">Tidak Ada Kartu Sesuai Filter</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      {isMaster && (
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllCardsSelected}
                            onChange={handleToggleSelectAllCards}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                            title={isAllCardsSelected ? "Batalkan pilih semua" : "Pilih semua hasil"}
                          />
                        </th>
                      )}
                      <th className="py-3 px-4">Kode Kartu</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Outlet Terhubung</th>
                      <th className="py-3 px-4">Admin Pemegang</th>
                      <th className="py-3 px-4 text-center">Total Scan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCards.map((card) => {
                      const isProtectedFromSA2 = isCardProtectedFromSA2(card);

                      return (
                        <tr
                          key={card.code}
                          className={`transition-colors ${
                            selectedCardCodes.includes(card.code)
                              ? "bg-rose-950/30 hover:bg-rose-950/40"
                              : "hover:bg-slate-800/40"
                          }`}
                        >
                          {isMaster && (
                            <td className="py-3.5 px-3 text-center">
                              {isDemoCard(card.code) ? (
                                <span title="Kartu Demo Landing Page dilindungi" className="text-xs text-slate-500">🔒</span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={selectedCardCodes.includes(card.code)}
                                  onChange={() => handleToggleCardSelection(card.code)}
                                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                />
                              )}
                            </td>
                          )}
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={`/c/${card.code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-white hover:underline transition-colors inline-flex items-center gap-1"
                                title={`Uji Coba Scan QR ${card.code} (Buka & tambah scan +1)`}
                              >
                                <span>{card.code}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                              <button
                                onClick={() =>
                                  setPreviewCard({
                                    code: card.code,
                                    status: card.status,
                                    outlet: card.outlet,
                                  })
                                }
                                className="p-1 text-slate-500 hover:text-white cursor-pointer"
                                title="Preview & Download QR"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {isDemoCard(card.code) && (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                                  title="Kartu ini adalah target Demo Scan di Landing Page"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span>Demo Landing Page</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleStatus(card.code, card.outlet?.name, card.status)}
                              className="flex items-center gap-1.5 focus:outline-none group cursor-pointer"
                              title="Klik untuk toggle status aktif/nonaktif"
                            >
                              {card.status === "ACTIVE" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500/20">
                                  <XCircle className="w-3 h-3" /> Nonaktif
                                </span>
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            {(() => {
                              if (!card.outlet) {
                                return <span className="text-amber-400/90 font-medium">Kosong (Siap Pakai)</span>;
                              }
                              const outletCards = allCards.filter(
                                (c) => c.outletId === card.outlet?.id || c.outlet?.id === card.outlet?.id
                              );
                              const isPrimaryCard = outletCards.length <= 1 || outletCards[0]?.code === card.code;

                              return (
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                                    <span>{card.outlet.name}</span>
                                    {isPrimaryCard ? (
                                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                                        👑 Induk
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                        🔗 Anakan
                                      </span>
                                    )}
                                    {isDemoCard(card.code) && (
                                      <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1">
                                        <span>Tampil di Landing Page</span>
                                      </span>
                                    )}
                                    {isPrimaryCard && (
                                      <button
                                        onClick={() =>
                                          setEditingOutlet({
                                            id: card.outlet!.id,
                                            name: card.outlet!.name,
                                            googleReviewUrl: card.outlet!.googleReviewUrl,
                                            owner: card.outlet!.owner || {
                                              fullName: "",
                                              whatsappNumber: null,
                                              email: "",
                                            },
                                          })
                                        }
                                        className="p-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-colors cursor-pointer"
                                        title="Edit Data Outlet Induk"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>{card.outlet.owner?.fullName || "-"}</span>
                                    {card.outlet.owner?.whatsappNumber && (
                                      <a
                                        href={getWaLink(card.outlet.owner.whatsappNumber, card.outlet.name)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-0.5"
                                        title="Hubungi Pemilik via WhatsApp"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        <span>WA</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          <td className="py-3.5 px-4">
                            {card.assignedAdmin ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-200 font-medium">{card.assignedAdmin.fullName}</span>
                                {card.assignedAdmin.role === "SUPER_ADMIN" ? (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                                    card.assignedAdmin.isSuperAdminMaster
                                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                      : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                                  }`}>
                                    {card.assignedAdmin.isSuperAdminMaster ? "SA 1" : "SA 2"}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Kolam Umum</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              <TrendingUp className="w-3 h-3" />
                              {card.scanCount}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(() => {
                                const outletCards = card.outlet
                                  ? allCards.filter(
                                      (c) => c.outletId === card.outlet?.id || c.outlet?.id === card.outlet?.id
                                    )
                                  : [];
                                const isPrimaryCard = card.outlet
                                  ? outletCards.length <= 1 || outletCards[0]?.code === card.code
                                  : false;

                                return (
                                  <>
                                    {!card.outlet && (
                                      <button
                                        onClick={() => {
                                          setPrefilledCardCode(card.code);
                                          setIsBypassOutletOpen(true);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Aktivasi Outlet Baru ke Kartu Ini"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Aktivasi</span>
                                      </button>
                                    )}

                                    {card.outlet && isPrimaryCard && (
                                      <button
                                        onClick={() =>
                                          setEditingOutlet({
                                            id: card.outlet!.id,
                                            name: card.outlet!.name,
                                            googleReviewUrl: card.outlet!.googleReviewUrl,
                                            owner: card.outlet!.owner || {
                                              fullName: "",
                                              whatsappNumber: null,
                                              email: "",
                                            },
                                          })
                                        }
                                        className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                                        title="Edit Toko Induk"
                                      >
                                        <Store className="w-3.5 h-3.5 text-sky-400" />
                                        <span>Edit Toko</span>
                                      </button>
                                    )}

                                    {card.outlet && !isPrimaryCard && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold"
                                        title={`Kartu anakan terhubung ke ${card.outlet.name}. Edit data toko dilakukan di kartu induk.`}
                                      >
                                        <Layers className="w-3 h-3 text-indigo-400" />
                                        <span>Anakan</span>
                                      </span>
                                    )}

                                    <button
                                      onClick={() =>
                                        setEditingCard({
                                          code: card.code,
                                          fallbackUrl: card.fallbackUrl,
                                          assignedAdminId: card.assignedAdminId,
                                          outletId: card.outletId || card.outlet?.id || null,
                                          outlet: card.outlet ? { id: card.outlet.id, name: card.outlet.name } : null,
                                          isPrimaryCard: isPrimaryCard,
                                        })
                                      }
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                      title="Konfigurasi Fallback URL & Alokasi Admin"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                );
                              })()}

                              {/* Tombol Hapus Kartu */}
                              {isDemoCard(card.code) ? (
                                <span
                                  className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400/90 border border-amber-500/20 text-[10px] font-semibold flex items-center gap-1 cursor-help"
                                  title="Kartu Demo Utama Landing Page tidak dapat dihapus"
                                >
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span>Dilindungi</span>
                                </span>
                              ) : !isMaster && isProtectedFromSA2 ? (
                                <button
                                  disabled
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-600 border border-slate-700/50 cursor-not-allowed opacity-50 flex items-center gap-1"
                                  title="Dikelola oleh Super Admin 1 / Admin binaan Super Admin 1 (Tidak dapat dihapus oleh Super Admin 2)"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeleteCard(card.code, isProtectedFromSA2)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                                  title="Hapus Kartu"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANAGE ADMINS (LAPANGAN) */}
        {activeTab === "ADMINS" && (
          <div className="mt-5 space-y-4">
            {/* Floating / Sticky Bulk Action Bar for Admins (Khusus Super Admin 1) */}
            {isMaster && selectedAdminIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-rose-950/90 to-red-950/90 border border-rose-500/50 rounded-2xl text-xs text-rose-200 shadow-xl shadow-rose-950/50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-400 animate-ping" />
                  <span className="font-bold text-white text-sm">
                    {selectedAdminIds.length} dari {deletableAdmins.length} Admin Lapangan Dipilih
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setSelectedAdminIds([])}
                    className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                  <button
                    onClick={handleBatchDeleteAdmins}
                    disabled={isDeletingBatch}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/40 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeletingBatch ? "Menghapus..." : `Hapus Semua Admin Terpilih (${selectedAdminIds.length})`}</span>
                  </button>
                </div>
              </div>
            )}

            {filteredAdmins.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">Belum Ada Admin Terdaftar</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      {isMaster && (
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllAdminsSelected}
                            onChange={handleToggleSelectAllAdmins}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                            title={isAllAdminsSelected ? "Batalkan pilih semua" : "Pilih semua hasil"}
                          />
                        </th>
                      )}
                      <th className="py-3 px-4">Nama Admin Lapangan</th>
                      <th className="py-3 px-4">Email & WhatsApp</th>
                      <th className="py-3 px-4 text-center">Status Akun</th>
                      <th className="py-3 px-4 text-center">Jatah Kartu</th>
                      <th className="py-3 px-4 text-center">Outlet Binaan</th>
                      <th className="py-3 px-4 text-center">Total Scan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAdmins.map((admin) => {
                      const adminScans = admin.assignedCards.reduce((sum, c) => sum + (c.scanCount || 0), 0);
                      const blankQuota = admin.assignedCards.filter((c) => !c.outletId).length;
                      const activeOutletsCount = getAdminIndukOutletsCount(admin.id);
                      const isActive = admin.isActive !== false;
                      const isCreatedByMaster = isAdminProtectedFromSA2(admin);

                      return (
                        <tr
                          key={admin.id}
                          className={`transition-colors ${
                            selectedAdminIds.includes(admin.id)
                              ? "bg-rose-950/30 hover:bg-rose-950/40"
                              : "hover:bg-slate-800/40"
                          }`}
                        >
                          {isMaster && (
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={activeOutletsCount > 0}
                                checked={selectedAdminIds.includes(admin.id)}
                                onChange={() => handleToggleAdminSelection(admin.id)}
                                className={`w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 ${
                                  activeOutletsCount > 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                }`}
                                title={
                                  activeOutletsCount > 0
                                    ? `Admin ini masih memiliki ${activeOutletsCount} outlet binaan (hanya admin dengan 0 outlet yang dapat dipilih)`
                                    : "Pilih admin ini"
                                }
                              />
                            </td>
                          )}
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2.5">
                              <UserCheck className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-rose-400"}`} />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={!isActive ? "text-slate-400 line-through" : ""}>{admin.fullName}</span>
                                  {!isActive && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                      Dinonaktifkan
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-slate-500">Didaftarkan oleh:</span>
                                  {isCreatedByMaster ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                      🛡️ Super Admin 1 (Master)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                      👤 Super Admin 2 ({admin.createdBy?.fullName || "Staff"})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>
                              <div className="text-slate-200">{admin.email}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {admin.whatsappNumber || "-"}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleUserActive(admin.id, admin.fullName, isActive)}
                              className="inline-flex items-center gap-1.5 focus:outline-none group cursor-pointer"
                              title={isActive ? "Klik untuk mematikan akun" : "Klik untuk mengaktifkan akun"}
                            >
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500/20">
                                  <XCircle className="w-3 h-3" /> Nonaktif
                                </span>
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-white">{admin.assignedCards.length}</span>
                            <span className="text-[11px] text-amber-400 block font-medium">
                              ({blankQuota} kosong)
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-emerald-400">{activeOutletsCount}</span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              <TrendingUp className="w-3 h-3" />
                              {adminScans}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {admin.whatsappNumber && (
                                <a
                                  href={getWaLink(admin.whatsappNumber, "Kemitraan")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                                  title="Chat WhatsApp Admin"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Tombol Edit Data & Password Admin */}
                              <button
                                onClick={() =>
                                  setEditingAdmin({
                                    id: admin.id,
                                    fullName: admin.fullName,
                                    email: admin.email,
                                    whatsappNumber: admin.whatsappNumber,
                                  })
                                }
                                className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
                                title="Edit Data & Ubah Password Admin"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Tombol Matikan / Aktifkan Akun */}
                              <button
                                onClick={() => handleToggleUserActive(admin.id, admin.fullName, isActive)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isActive
                                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                }`}
                                title={isActive ? "Matikan Akun (Nonaktifkan)" : "Aktifkan Akun Kembali"}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              {/* Tombol Hapus Admin */}
                              {!isMaster && isCreatedByMaster ? (
                                <button
                                  disabled
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-600 border border-slate-700/50 cursor-not-allowed opacity-50"
                                  title="Dibuat oleh Super Admin 1 (Tidak dapat dihapus oleh Super Admin 2)"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              ) : activeOutletsCount > 0 ? (
                                <button
                                  onClick={() => handleDeleteAdmin(admin.id, admin.fullName, isCreatedByMaster, activeOutletsCount)}
                                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 border border-slate-700/50 hover:border-rose-500/30 transition-colors cursor-pointer"
                                  title={`Tidak dapat dihapus: masih memiliki ${activeOutletsCount} outlet binaan (harus 0 outlet)`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeleteAdmin(admin.id, admin.fullName, isCreatedByMaster, activeOutletsCount)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                                  title="Hapus Akun Admin"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ALL OUTLETS */}
        {activeTab === "OUTLETS" && (
          <div className="mt-5 space-y-4">
            {/* Floating / Sticky Bulk Action Bar for Outlets (Khusus Super Admin 1) */}
            {isMaster && selectedOutletIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-rose-950/90 to-red-950/90 border border-rose-500/50 rounded-2xl text-xs text-rose-200 shadow-xl shadow-rose-950/50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-400 animate-ping" />
                  <span className="font-bold text-white text-sm">
                    {selectedOutletIds.length} dari {deletableOutlets.length} Outlet Dipilih
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setSelectedOutletIds([])}
                    className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                  <button
                    onClick={handleBatchDeleteOutlets}
                    disabled={isDeletingBatch}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/40 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeletingBatch ? "Menghapus..." : `Hapus Semua Outlet Terpilih (${selectedOutletIds.length})`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter bar for Outlets */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
              <span className="text-xs text-slate-400 font-medium">
                Total {filteredOutlets.length} outlet terhubung
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Filter Admin Lapangan:
                </span>
                <div className="relative">
                  <select
                    value={selectedAdminFilter}
                    onChange={(e) => setSelectedAdminFilter(e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer pr-7 appearance-none"
                  >
                    <option value="ALL">Semua Admin ({displayOutlets.length} Outlet)</option>
                    {admins.map((adm) => {
                      const count = displayOutlets.filter((o) => o.qrCard?.assignedAdminId === adm.id).length;
                      return (
                        <option key={adm.id} value={adm.id}>
                          {adm.fullName} ({count} Outlet)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {filteredOutlets.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">Belum Ada Outlet Terdaftar</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      {isMaster && (
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllOutletsSelected}
                            onChange={handleToggleSelectAllOutlets}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                            title={isAllOutletsSelected ? "Batalkan pilih semua" : "Pilih semua hasil"}
                          />
                        </th>
                      )}
                      <th className="py-3 px-4">Nama Outlet</th>
                      <th className="py-3 px-4">Pemilik & WhatsApp</th>
                      <th className="py-3 px-4">Admin Pemegang</th>
                      <th className="py-3 px-4">Kode Kartu</th>
                      <th className="py-3 px-4 text-center">Total Scan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredOutlets.map((outlet) => {
                      const isOwnerActive = outlet.owner?.isActive !== false;
                      const isProtectedFromSA2 = isOutletProtectedFromSA2(outlet);
                      const ownerId = outlet.ownerId || outlet.owner?.id || outlet.id;
                      const isDemo = outlet.qrCard?.code && isDemoCard(outlet.qrCard.code);
                      const outletCards = outlet.qrCards && outlet.qrCards.length > 0 ? outlet.qrCards : (outlet.qrCard ? [outlet.qrCard] : []);
                      const isOverOneCard = outletCards.length > 1;

                      return (
                        <tr
                          key={outlet.id}
                          className={`transition-colors ${
                            selectedOutletIds.includes(ownerId)
                              ? "bg-rose-950/30 hover:bg-rose-950/40"
                              : "hover:bg-slate-800/40"
                          }`}
                        >
                          {isMaster && (
                            <td className="py-3.5 px-3 text-center">
                              {isDemo ? (
                                <span title="Outlet Demo Landing Page dilindungi" className="text-xs text-slate-500">🔒</span>
                              ) : isOverOneCard ? (
                                <span title={`Outlet memegang ${outletCards.length} kartu (> 1 kartu). Tidak dapat dihapus massal, hanya dapat dinonaktifkan.`} className="text-xs text-slate-500">🔒</span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={selectedOutletIds.includes(ownerId)}
                                  onChange={() => handleToggleOutletSelection(ownerId)}
                                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                />
                              )}
                            </td>
                          )}
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <Store className={`w-4 h-4 shrink-0 ${isOwnerActive ? "text-emerald-400" : "text-rose-400"}`} />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={!isOwnerActive ? "text-slate-400 line-through" : ""}>{outlet.name}</span>
                                  {isDemo && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                                      title="Outlet ini aktif ditampilkan pada demo ulasan Landing Page"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-400" />
                                      <span>Tampil di Landing Page</span>
                                    </span>
                                  )}
                                </div>
                                {!isOwnerActive && (
                                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                    Akun Nonaktif
                                  </span>
                                )}
                                <div className="text-[11px] text-slate-400">{outlet.owner?.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-slate-200">{outlet.owner?.fullName}</div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {outlet.owner?.whatsappNumber || "-"}
                                </div>
                              </div>
                              {outlet.owner?.whatsappNumber && (
                                <a
                                  href={getWaLink(outlet.owner.whatsappNumber, outlet.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                                  title="Chat WhatsApp Pemilik"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">
                            {(() => {
                              const adm = outletCards.find((c) => c.assignedAdmin)?.assignedAdmin || outlet.qrCard?.assignedAdmin;
                              return adm ? (
                                <div className="flex items-center gap-1.5">
                                  <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="font-medium text-amber-200">{adm.fullName}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Belum dialokasikan</span>
                              );
                            })()}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                            {(() => {
                              if (outletCards.length === 0) {
                                return <span className="text-slate-500">-</span>;
                              }
                              if (outletCards.length === 1) {
                                const c = outletCards[0];
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={`/c/${c.code}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-mono font-bold text-indigo-300 hover:text-white hover:underline transition-colors inline-flex items-center gap-1"
                                      title={`Uji Coba Scan QR ${c.code} (Buka & tambah scan +1)`}
                                    >
                                      <span>{c.code}</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                    </a>
                                    {isDemoCard(c.code) && (
                                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                        DEMO
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block w-fit">
                                    {outletCards.length} Kartu Aktif
                                  </span>
                                  <div className="flex flex-wrap gap-1 text-xs">
                                    {outletCards.map((c) => (
                                      <a
                                        key={c.code}
                                        href={`/c/${c.code}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-slate-900 hover:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-slate-700 hover:border-indigo-500 text-indigo-200 hover:text-indigo-100 transition-colors inline-flex items-center gap-0.5"
                                        title={`Uji Coba Scan QR ${c.code} (Buka & tambah scan +1)`}
                                      >
                                        <span>{c.code}</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {(() => {
                              const totalScans = outletCards.reduce((s, c) => s + (c.scanCount || 0), 0);
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                  title={outletCards.length > 1 ? outletCards.map((c) => `${c.code}: ${c.scanCount} scan`).join(", ") : undefined}
                                >
                                  <TrendingUp className="w-3 h-3" />
                                  {totalScans}
                                </span>
                              );
                            })()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(() => {
                                const primaryCard = outletCards[0];
                                const targetUrl = primaryCard ? `/c/${primaryCard.code}` : outlet.googleReviewUrl;

                                return targetUrl ? (
                                  <a
                                    href={targetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors"
                                    title={primaryCard ? `Uji Coba Scan QR (${primaryCard.code}) & Buka Review (Tambah Scan +1)` : "Buka Halaman Google Review"}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                ) : null;
                              })()}

                              <button
                                onClick={() => {
                                  setAssigningOutlet({
                                    id: outlet.id,
                                    name: outlet.name,
                                    currentCards: outletCards.map((c) => ({ code: c.code })),
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                                title="Tambah Kartu Fisik Kosong ke Outlet Ini"
                              >
                                <Plus className="w-3 h-3 text-indigo-400" />
                                <span>+ Kartu</span>
                              </button>

                              {outlet.owner && (
                                <button
                                  onClick={() =>
                                    setEditingOutlet({
                                      id: outlet.id,
                                      name: outlet.name,
                                      googleReviewUrl: outlet.googleReviewUrl,
                                      owner: {
                                        fullName: outlet.owner!.fullName,
                                        whatsappNumber: outlet.owner!.whatsappNumber,
                                        email: outlet.owner!.email,
                                      },
                                    })
                                  }
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                                  title="Edit Data Outlet"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {outlet.owner && (
                                <button
                                  onClick={() =>
                                    handleToggleUserActive(outlet.owner!.id, outlet.owner!.fullName || outlet.name, isOwnerActive)
                                  }
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    isOwnerActive
                                      ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  }`}
                                  title={isOwnerActive ? "Matikan Akun Pemilik Toko (Semua kartu otomatis mati)" : "Aktifkan Akun Pemilik Toko & Kartu"}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {outlet.owner && (
                                isDemo ? (
                                  <span
                                    className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400/90 border border-amber-500/20 text-[10px] font-semibold flex items-center gap-1 cursor-help"
                                    title="Outlet Demo Utama Landing Page dilindungi dari penghapusan"
                                  >
                                    <Lock className="w-3 h-3 text-amber-400" />
                                    <span>Dilindungi</span>
                                  </span>
                                ) : !isMaster && isProtectedFromSA2 ? (
                                  <button
                                    disabled
                                    className="p-1.5 rounded-lg bg-slate-800 text-slate-600 border border-slate-700/50 cursor-not-allowed opacity-50"
                                    title="Dibuat oleh Super Admin 1 / Admin binaan Super Admin 1 (Tidak dapat dihapus oleh Super Admin 2)"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </button>
                                ) : isOverOneCard ? (
                                  <button
                                    disabled
                                    className="p-1.5 rounded-lg bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60"
                                    title={`Outlet ini memegang ${outletCards.length} kartu (> 1 kartu). Tidak dapat dihapus, hanya dapat dinonaktifkan.`}
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteOutlet(outlet.owner!.id, outlet.name, isProtectedFromSA2)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                                    title="Hapus Outlet"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: KELOLA SUPER ADMIN (SUPER ADMIN 1 & SUPER ADMIN 2) */}
        {activeTab === "SUPER_ADMINS" && (
          <div className="mt-5 space-y-4">
            {/* Floating / Sticky Bulk Action Bar for Super Admins (Khusus Super Admin 1) */}
            {isMaster && selectedSuperAdminIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-rose-950/90 to-red-950/90 border border-rose-500/50 rounded-2xl text-xs text-rose-200 shadow-xl shadow-rose-950/50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-400 animate-ping" />
                  <span className="font-bold text-white text-sm">
                    {selectedSuperAdminIds.length} dari {deletableSuperAdmins.length} Super Admin 2 Dipilih
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setSelectedSuperAdminIds([])}
                    className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                  <button
                    onClick={handleBatchDeleteSuperAdmins}
                    disabled={isDeletingBatch}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/40 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeletingBatch ? "Menghapus..." : `Hapus Semua Super Admin 2 Terpilih (${selectedSuperAdminIds.length})`}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Hierarki & Hak Akses Super Admin
                </h3>
                <p className="text-[11px] text-slate-300">
                  Super Admin 1 (Master) dapat membuat Super Admin 2 dan mengatur izin pengubahan konten Landing Page / WhatsApp.
                </p>
              </div>

              {isMaster && (
                <button
                  onClick={() => setIsCreateSuperAdminOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all hover:scale-105"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Super Admin 2</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    {isMaster && (
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSuperAdminsSelected}
                          onChange={handleToggleSelectAllSuperAdmins}
                          className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          title={isAllSuperAdminsSelected ? "Batalkan pilih semua" : "Pilih semua hasil"}
                        />
                      </th>
                    )}
                    <th className="py-3 px-4">Nama & Tingkatan Super Admin</th>
                    <th className="py-3 px-4">Email & WhatsApp</th>
                    <th className="py-3 px-4 text-center">Status Akun</th>
                    <th className="py-3 px-4 text-center">Izin Landing Page</th>
                    <th className="py-3 px-4 text-center">Izin Template Cetak</th>
                    <th className="py-3 px-4 text-center">Izin Hapus Kartu</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSuperAdmins.map((sa) => {
                    const isSaMaster = sa.isSuperAdminMaster;
                    const isActive = sa.isActive !== false;
                    const canDeleteThis = !isSaMaster && sa.id !== currentUser.id;

                    return (
                      <tr
                        key={sa.id}
                        className={`transition-colors ${
                          selectedSuperAdminIds.includes(sa.id)
                            ? "bg-rose-950/30 hover:bg-rose-950/40"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        {isMaster && (
                          <td className="py-3.5 px-3 text-center">
                            {!canDeleteThis ? (
                              <span title="Super Admin 1 (Master) dilindungi" className="text-xs text-slate-500">🔒</span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={selectedSuperAdminIds.includes(sa.id)}
                                onChange={() => handleToggleSuperAdminSelection(sa.id)}
                                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                              />
                            )}
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            {isSaMaster ? (
                              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={!isActive ? "text-slate-400 line-through" : ""}>{sa.fullName}</span>
                                {isSaMaster ? (
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                    Super Admin 1 (Master)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
                                    Super Admin 2
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Dibuat: {new Date(sa.createdAt).toLocaleDateString("id-ID")}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div>
                            <div className="text-slate-200">{sa.email}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{sa.whatsappNumber || "-"}</div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isSaMaster ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Aktif Permanen
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                if (isMaster) {
                                  handleToggleUserActive(sa.id, sa.fullName, isActive);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 focus:outline-none group cursor-pointer"
                              title={isActive ? "Klik untuk mematikan akun" : "Klik untuk mengaktifkan akun"}
                            >
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500/20">
                                  <XCircle className="w-3 h-3" /> Nonaktif
                                </span>
                              )}
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isSaMaster ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <Globe className="w-3 h-3" /> Izin Penuh
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleLandingPermission(sa.id, sa.fullName)}
                              className="inline-flex items-center gap-1.5 focus:outline-none group cursor-pointer"
                              title={
                                sa.canEditLandingPage
                                  ? "Klik untuk mencabut izin edit Landing Page & WhatsApp"
                                  : "Klik untuk memberikan izin edit Landing Page & WhatsApp"
                              }
                            >
                              {sa.canEditLandingPage ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/20">
                                  <Globe className="w-3 h-3" /> Diizinkan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 group-hover:border-slate-600">
                                  <Lock className="w-3 h-3 text-slate-500" /> Terkunci
                                </span>
                              )}
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isSaMaster ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                              <Layers className="w-3 h-3" /> Izin Penuh
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleTemplatePermission(sa.id, sa.fullName)}
                              className="inline-flex items-center gap-1.5 focus:outline-none group cursor-pointer"
                              title={
                                sa.canManagePrintTemplates
                                  ? "Klik untuk mencabut izin kelola Template Cetak"
                                  : "Klik untuk memberikan izin kelola Template Cetak"
                              }
                            >
                              {sa.canManagePrintTemplates ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 group-hover:bg-indigo-500/20">
                                  <Layers className="w-3 h-3" /> Diizinkan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 group-hover:border-slate-600">
                                  <Lock className="w-3 h-3 text-slate-500" /> Terkunci
                                </span>
                              )}
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isSaMaster ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                              <Layers className="w-3 h-3" /> Izin Penuh
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleDeletePermission(sa.id, sa.fullName)}
                              className="inline-flex items-center gap-1.5 focus:outline-none group cursor-pointer"
                              title={
                                sa.canDeleteCards
                                  ? "Klik untuk mencabut izin Hapus Kartu QR"
                                  : "Klik untuk memberikan izin Hapus Kartu QR"
                              }
                            >
                              {sa.canDeleteCards ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 group-hover:bg-indigo-500/20">
                                  <Layers className="w-3 h-3" /> Diizinkan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 group-hover:border-slate-600">
                                  <Lock className="w-3 h-3 text-slate-500" /> Terkunci
                                </span>
                              )}
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {sa.whatsappNumber && (
                              <a
                                href={getWaLink(sa.whatsappNumber, "Super Admin")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                                title="Chat WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {isSaMaster ? (
                              <span
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1"
                                title="Akun Super Admin 1 Master Utama permanen dan terlindungi"
                              >
                                <Shield className="w-3 h-3 text-amber-400" />
                                <span>Master Utama</span>
                              </span>
                            ) : (
                              <>
                                {isMaster && (
                                  <button
                                    onClick={() => setEditingSuperAdmin(sa)}
                                    className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                                    title="Edit Data & Password Super Admin 2"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteSuperAdmin(sa.id, sa.fullName)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                                  title="Hapus Akun Super Admin 2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "ACTIVITY_LOGS" && (
          <div className="pt-2">
            <ActivityLogTable
              title="Log Aktivitas Seluruh Sistem"
              subtitle={
                isMaster
                  ? "Super Admin 1 (Master): Memiliki akses penuh audit trail seluruh Super Admin, Admin Lapangan, dan Outlet."
                  : "Super Admin 2: Memantau aktivitas operasional diri sendiri serta Admin Lapangan & Outlet binaan Anda."
              }
            />
          </div>
        )}

        {isMaster && activeTab === "DATABASE_BACKUP" && (
          <div className="pt-2">
            <DatabaseBackupPanel />
          </div>
        )}
      </div>

      {/* Modals */}
      {isLandingPageModalOpen && (
        <LandingPageSettingsModal
          isOpen={isLandingPageModalOpen}
          initialSetting={siteSetting}
          onClose={() => setIsLandingPageModalOpen(false)}
        />
      )}

      {isPrintTemplateModalOpen && (
        <PrintTemplateManagerModal
          isOpen={isPrintTemplateModalOpen}
          onClose={() => setIsPrintTemplateModalOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}

      {isCreateSuperAdminOpen && (
        <CreateSuperAdminModal
          isOpen={isCreateSuperAdminOpen}
          onClose={() => setIsCreateSuperAdminOpen(false)}
        />
      )}

      {isCreateAdminOpen && (
        <CreateAdminModal
          onClose={() => setIsCreateAdminOpen(false)}
        />
      )}

      {editingAdmin && (
        <EditAdminModal
          admin={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {editingSuperAdmin && (
        <EditSuperAdminModal
          admin={editingSuperAdmin}
          onClose={() => setEditingSuperAdmin(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {isProfileModalOpen && (
        <EditProfileModal
          user={{
            fullName: currentUser.fullName || "Super Admin",
            email: currentUser.email || "",
            whatsappNumber: (currentUser as unknown as { whatsappNumber?: string }).whatsappNumber || "",
          }}
          onClose={() => setIsProfileModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {isBatchGenerateOpen && (
        <BatchGenerateModal
          admins={admins.map((a) => ({ id: a.id, fullName: a.fullName }))}
          superAdmins={superAdmins.map((sa) => ({
            id: sa.id,
            fullName: sa.fullName,
            isSuperAdminMaster: sa.isSuperAdminMaster,
          }))}
          onClose={() => setIsBatchGenerateOpen(false)}
        />
      )}

      {isBatchExportOpen && (
        <BatchExportModal
          cards={allCards as unknown as CardExportItem[]}
          onClose={() => setIsBatchExportOpen(false)}
        />
      )}

      {isBypassOutletOpen && (
        <RegisterOutletModal
          prefilledCode={prefilledCardCode}
          blankCards={allCards.filter((c) => !c.outlet).map((c) => ({ code: c.code }))}
          onClose={() => {
            setIsBypassOutletOpen(false);
            setPrefilledCardCode("");
          }}
        />
      )}

      {previewCard && (
        <QrCodeModal
          card={previewCard}
          version={siteSetting?.appVersion || "V 1.1.2"}
          onClose={() => setPreviewCard(null)}
        />
      )}

      {editingCard && (
        <EditCardModal
          card={editingCard}
          admins={admins.map((a) => ({ id: a.id, fullName: a.fullName }))}
          superAdmins={superAdmins.map((sa) => ({
            id: sa.id,
            fullName: sa.fullName,
            isSuperAdminMaster: sa.isSuperAdminMaster,
          }))}
          outlets={allOutlets.map((o) => ({ id: o.id, name: o.name }))}
          onClose={() => setEditingCard(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {editingOutlet && (
        <EditOutletModal
          outlet={editingOutlet}
          onClose={() => setEditingOutlet(null)}
        />
      )}

      {assigningOutlet && (
        <AssignCardToOutletModal
          outlet={assigningOutlet}
          blankCards={allCards
            .filter((c) => !c.outletId && !c.outlet)
            .map((c) => ({ code: c.code, status: c.status }))}
          onClose={() => setAssigningOutlet(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* QR Camera Scanner & Physical Card Recovery Modal */}
      <QrCameraScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        currentUserRole="SUPER_ADMIN"
        isMaster={isMaster}
        admins={admins.map((a) => ({ id: a.id, fullName: a.fullName, email: a.email }))}
        outlets={allOutlets.map((o) => ({ id: o.id, name: o.name }))}
        onCardRestored={() => router.refresh()}
      />
    </div>
  );
}
