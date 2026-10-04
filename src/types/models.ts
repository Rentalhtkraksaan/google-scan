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
  isResellerUnlocked?: boolean;
  resellerVipRewardsClaimed?: number;
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
  midtransEnabled?: boolean;
  midtransServerKey?: string | null;
  midtransClientKey?: string | null;
  midtransIsProduction?: boolean;
  trialDurationDays?: number;
  autoVipTrialOnActivation?: boolean;
  resellerModulePrice?: number;
  resellerVipDiscountPerCard?: number;
  resellerCardBasePrice?: number;
  resellerMinOrder?: number;
  resellerShippingFee?: number;
  orderPackingFee?: number;
  resellerModuleTitle?: string;
  resellerModuleDesc?: string | null;
  resellerModulePdfUrl?: string | null;
  resellerBankName?: string;
  resellerAccountNumber?: string;
  resellerAccountName?: string;
  manualBniAccountNumber?: string;
  manualBniAccountHolder?: string;
  affiliateShippingDiscount?: number;
  affiliateDefaultCommission?: number;
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
  logoUrl?: string | null;
  ownerId?: string;
  isMember?: boolean;
  membershipStartedAt?: string | Date | null;
  membershipExpiresAt?: string | Date | null;
  customVipPrice?: number | null;
  enableSmartFilter?: boolean;
  allowSmartFilter?: boolean;
  soundEffect?: string | null;
  customGreetingText?: string | null;
  instagramUrl?: string | null;
  enableInstagram?: boolean;
  tiktokUrl?: string | null;
  enableTiktok?: boolean;
  menuUrl?: string | null;
  menuImages?: string | null;
  menuTitle?: string | null;
  enableMenu?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  owner?: {
    id: string;
    fullName: string;
    email: string;
    whatsappNumber: string | null;
    avatarUrl?: string | null;
    isActive?: boolean;
    createdById?: string | null;
    createdBy?: {
      id?: string;
      fullName: string;
      role?: string;
      avatarUrl?: string | null;
      isSuperAdminMaster?: boolean;
      createdById?: string | null;
      createdBy?: {
        id?: string;
        fullName?: string;
        avatarUrl?: string | null;
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
      avatarUrl?: string | null;
      isSuperAdminMaster?: boolean;
      createdById?: string | null;
      createdBy?: {
        id?: string;
        fullName?: string;
        avatarUrl?: string | null;
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
      avatarUrl?: string | null;
      isSuperAdminMaster?: boolean;
      createdById?: string | null;
      createdBy?: {
        id?: string;
        fullName?: string;
        avatarUrl?: string | null;
        isSuperAdminMaster?: boolean;
      } | null;
    } | null;
  } | null;
  staffPairingToken?: string | null;
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
    avatarUrl?: string | null;
    isSuperAdminMaster?: boolean;
    createdById?: string | null;
    createdBy?: {
      id?: string;
      fullName?: string;
      avatarUrl?: string | null;
      isSuperAdminMaster?: boolean;
    } | null;
  } | null;
  outlet?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    googleReviewUrl: string;
    owner?: {
      id: string;
      fullName: string;
      email: string;
      whatsappNumber: string | null;
      avatarUrl?: string | null;
      isActive?: boolean;
      createdById?: string | null;
      createdBy?: {
        id?: string;
        fullName?: string;
        role?: string;
        avatarUrl?: string | null;
        isSuperAdminMaster?: boolean;
        createdById?: string | null;
        createdBy?: {
          id?: string;
          fullName?: string;
          avatarUrl?: string | null;
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
  avatarUrl?: string | null;
  isActive: boolean;
  isResellerUnlocked?: boolean;
  resellerVipRewardsClaimed?: number;
  createdById?: string | null;
  createdBy?: {
    id?: string;
    fullName?: string;
    avatarUrl?: string | null;
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
      isMember?: boolean;
      membershipExpiresAt?: string | Date | null;
    } | null;
  }[];
}

export interface OutletUserItem {
  id: string;
  fullName: string;
  email: string;
  whatsappNumber: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  createdById?: string | null;
  createdBy?: {
    id?: string;
    fullName?: string;
    role?: string;
    avatarUrl?: string | null;
    isSuperAdminMaster?: boolean;
  } | null;
  createdAt: string | Date;
  outlet: {
    id: string;
    name: string;
    logoUrl?: string | null;
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

export interface ResellerModulePaymentItem {
  id: string;
  userId: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    whatsappNumber: string | null;
  };
  amount: number;
  paymentType?: string;
  proofImageUrl?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
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

export interface ResellerProductModel {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  retailPrice?: number;
  minOrder: number;
  unit?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ResellerOrderItemModel {
  id: string;
  orderId: string;
  productId?: string | null;
  product?: ResellerProductModel | null;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
  createdAt?: string | Date;
}

export interface ResellerOrderModel {
  id: string;
  orderNumber: string;
  orderType?: "RESELLER" | "RETAIL" | string;
  adminId?: string | null;
  admin?: {
    id: string;
    fullName: string;
    email: string;
    role?: string;
    whatsappNumber?: string | null;
    avatarUrl?: string | null;
    outlet?: {
      id: string;
      name: string;
      googleReviewUrl: string;
      qrCards?: { code: string; status?: string }[];
    } | null;
  } | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress?: string | null;
  province?: string | null;
  notes?: string | null;
  affiliateCode?: string | null;
  affiliateCommission?: number;
  paymentMethod: string;
  paymentStatus: "PENDING" | "PAID" | "REJECTED" | "CANCELLED" | string;
  orderStatus: "PENDING" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | string;
  courierName?: string | null;
  trackingNumber?: string | null;
  courierStatus?: "ON_PROCESS" | "DELIVERED" | "ON_DELIVERY" | "NOT_FOUND" | string | null;
  courierHistory?: any;
  deliveredAt?: string | Date | null;
  totalQuantity: number;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  packingFee?: number;
  totalAmount: number;
  receiptImageUrl?: string | null;
  midtransSnapToken?: string | null;
  midtransOrderId?: string | null;
  midtransTransactionId?: string | null;
  items: ResellerOrderItemModel[];
  createdAt: string | Date;
  updatedAt: string | Date;
}


