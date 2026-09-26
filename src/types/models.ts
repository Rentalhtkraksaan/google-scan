export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  whatsappNumber?: string | null;
  avatarUrl?: string | null;
  isSuperAdminMaster?: boolean;
  canEditLandingPage?: boolean;
  canManagePrintTemplates?: boolean;
  canDeleteCards?: boolean;
  canViewAnalytics?: boolean;
}

export interface SiteSettingModel {
  id: string;
  appVersion?: string;
  whatsappNumber: string;
  globalFallbackUrl: string;
  heroBadge: string;
  heroHeadline: string;
  heroSubheadline: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
  ctaSecondaryUrl: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  footerText: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  dashboardLogoUrl?: string | null;
  landingPageLogoUrl?: string | null;
  faviconUrl?: string | null;
  printTemplates?: string | null;
  visitorCount?: number;
  membershipPrice?: number;
  membershipBankName?: string;
  membershipAccountNumber?: string;
  membershipAccountName?: string;
  membershipNotes?: string | null;
  membershipTrialNotice?: string | null;
  midtransServerKey?: string | null;
  midtransClientKey?: string | null;
  midtransIsProduction?: boolean;
  trialDurationDays?: number;
  autoVipTrialOnActivation?: boolean;
  updatedAt?: string | Date;
}

export interface SuperAdminItem {
  id: string;
  fullName: string;
  email: string;
  whatsappNumber: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  isSuperAdminMaster: boolean;
  canEditLandingPage: boolean;
  canManagePrintTemplates: boolean;
  canDeleteCards: boolean;
  canViewAnalytics: boolean;
  createdAt: string | Date;
}

export interface OutletModel {
  id: string;
  name: string;
  googleReviewUrl: string;
  ownerId?: string;
  isMember?: boolean;
  membershipStartedAt?: string | Date | null;
  membershipExpiresAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  owner?: {
    id: string;
    fullName: string;
    email: string;
    whatsappNumber: string | null;
    isActive?: boolean;
    createdById?: string | null;
    createdBy?: {
      id?: string;
      fullName: string;
      role?: string;
      isSuperAdminMaster?: boolean;
      createdById?: string | null;
      createdBy?: {
        id?: string;
        fullName?: string;
        isSuperAdminMaster?: boolean;
      } | null;
    } | null;
  } | null;
  qrCards?: {
    code: string;
    status: "ACTIVE" | "INACTIVE" | string;
    scanCount: number;
    fallbackUrl?: string;
    assignedAdminId?: string | null;
    assignedAdmin?: {
      id: string;
      fullName: string;
      email: string;
      role?: string;
      isSuperAdminMaster?: boolean;
      createdById?: string | null;
      createdBy?: {
        id?: string;
        fullName?: string;
        isSuperAdminMaster?: boolean;
      } | null;
    } | null;
  }[];
  // Helper for single/primary card backwards compatibility
  qrCard?: {
    code: string;
    status: "ACTIVE" | "INACTIVE" | string;
    scanCount: number;
    fallbackUrl?: string;
    assignedAdminId?: string | null;
    assignedAdmin?: {
      id: string;
      fullName: string;
      email: string;
      role?: string;
      isSuperAdminMaster?: boolean;
      createdById?: string | null;
      createdBy?: {
        id?: string;
        fullName?: string;
        isSuperAdminMaster?: boolean;
      } | null;
    } | null;
  } | null;
}

export interface QrCardModel {
  code: string;
  status: "ACTIVE" | "INACTIVE";
  scanCount: number;
  fallbackUrl: string;
  assignedAdminId: string | null;
  outletId?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  assignedAdmin?: {
    id: string;
    fullName: string;
    email: string;
    isActive?: boolean;
    role?: string;
    isSuperAdminMaster?: boolean;
    createdById?: string | null;
    createdBy?: {
      id?: string;
      fullName?: string;
      isSuperAdminMaster?: boolean;
    } | null;
  } | null;
  outlet?: {
    id: string;
    name: string;
    googleReviewUrl: string;
    owner?: {
      id: string;
      fullName: string;
      email: string;
      whatsappNumber: string | null;
      isActive?: boolean;
      createdById?: string | null;
      createdBy?: {
        id?: string;
        fullName?: string;
        role?: string;
        isSuperAdminMaster?: boolean;
        createdById?: string | null;
        createdBy?: {
          id?: string;
          fullName?: string;
          isSuperAdminMaster?: boolean;
        } | null;
      } | null;
    } | null;
  } | null;
}

export interface AdminWithRelations {
  id: string;
  fullName: string;
  email: string;
  whatsappNumber: string | null;
  isActive: boolean;
  createdById?: string | null;
  createdBy?: {
    id?: string;
    fullName?: string;
    isSuperAdminMaster?: boolean;
  } | null;
  createdAt: string | Date;
  assignedCards: {
    code: string;
    status: string;
    scanCount: number;
    outletId: string | null;
  }[];
  createdUsers: {
    id: string;
    fullName: string;
    outlet?: {
      id: string;
      name: string;
    } | null;
  }[];
}

export interface OutletUserItem {
  id: string;
  fullName: string;
  email: string;
  whatsappNumber: string | null;
  isActive: boolean;
  createdById?: string | null;
  createdAt: string | Date;
  outlet: {
    id: string;
    name: string;
    googleReviewUrl: string;
    isMember?: boolean;
    membershipStartedAt?: string | Date | null;
    membershipExpiresAt?: string | Date | null;
    customVipPrice?: number | null;
    qrCards?: {
      code: string;
      status: string;
      scanCount: number;
    }[];
    qrCard?: {
      code: string;
      status: string;
      scanCount: number;
    } | null;
  } | null;
}

export interface CustomerFeedbackItem {
  id: string;
  outletId: string;
  cardCode?: string | null;
  rating: number;
  customerName?: string | null;
  phone?: string | null;
  message: string;
  isResolved: boolean;
  createdAt: string | Date;
  outlet?: {
    id: string;
    name: string;
  };
}

export interface MembershipPaymentItem {
  id: string;
  outletId: string;
  outlet?: {
    id: string;
    name: string;
    isMember: boolean;
    owner?: {
      fullName: string;
      whatsappNumber?: string | null;
      email: string;
    } | null;
  };
  amount: number;
  paymentType?: string;
  proofImageUrl?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | string;
  midtransOrderId?: string | null;
  midtransTransactionId?: string | null;
  qrisUrl?: string | null;
  snapToken?: string | null;
  senderName?: string | null;
  senderNotes?: string | null;
  adminNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

