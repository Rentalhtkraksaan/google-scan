"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role, Prisma } from "@prisma/client";
import { isOutletMemberActive } from "@/lib/membership-utils";

export type ActionResult<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

export interface CreateActivityLogParams {
  userId?: string | null;
  userName?: string;
  userRole?: Role;
  action: string;
  title: string;
  description: string;
  targetId?: string | null;
  targetName?: string | null;
  outletId?: string | null;
  adminId?: string | null;
  superAdminId?: string | null;
}

/**
 * Helper to record activity log in a safe, non-blocking way.
 */
export async function recordActivityLog(params: CreateActivityLogParams): Promise<void> {
  try {
    let resolvedUserName = params.userName;
    let resolvedUserRole = params.userRole;
    let resolvedAdminId = params.adminId;
    let resolvedSuperAdminId = params.superAdminId;
    let resolvedOutletId = params.outletId;

    // If userId provided but no userName/role, resolve from database
    if (params.userId && (!resolvedUserName || !resolvedUserRole)) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          id: true,
          fullName: true,
          role: true,
          createdById: true,
          createdBy: { select: { id: true, role: true, createdById: true } },
          outlet: { select: { id: true } },
        },
      });

      if (user) {
        resolvedUserName = resolvedUserName || user.fullName;
        resolvedUserRole = resolvedUserRole || user.role;
        if (!resolvedOutletId && user.outlet) {
          resolvedOutletId = user.outlet.id;
        }

        // Trace up the hierarchy if not explicitly provided
        if (user.role === Role.ADMIN) {
          resolvedAdminId = resolvedAdminId || user.id;
          if (user.createdBy && user.createdBy.role === Role.SUPER_ADMIN) {
            resolvedSuperAdminId = resolvedSuperAdminId || user.createdBy.id;
          }
        } else if (user.role === Role.USER) {
          if (user.createdBy) {
            if (user.createdBy.role === Role.ADMIN) {
              resolvedAdminId = resolvedAdminId || user.createdBy.id;
              if (user.createdBy.createdById) {
                resolvedSuperAdminId = resolvedSuperAdminId || user.createdBy.createdById;
              }
            } else if (user.createdBy.role === Role.SUPER_ADMIN) {
              resolvedSuperAdminId = resolvedSuperAdminId || user.createdBy.id;
            }
          }
        }
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: params.userId || null,
        userName: resolvedUserName || "Sistem / Pengunjung",
        userRole: resolvedUserRole || Role.USER,
        action: params.action,
        title: params.title,
        description: params.description,
        targetId: params.targetId || null,
        targetName: params.targetName || null,
        outletId: resolvedOutletId || null,
        adminId: resolvedAdminId || null,
        superAdminId: resolvedSuperAdminId || null,
      },
    });
  } catch (error) {
    console.error("Gagal mencatat ActivityLog:", error);
  }
}

export interface ActivityLogFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  actionCategory?: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string | null;
  userName: string;
  userRole: Role;
  action: string;
  title: string;
  description: string;
  targetId: string | null;
  targetName: string | null;
  outletId: string | null;
  adminId: string | null;
  superAdminId: string | null;
  createdAt: Date;
}

/**
 * Fetch activity logs with STRICT Top-Down Hierarchical Isolation:
 * - Super Admin 1: Can see ALL logs globally.
 * - Super Admin 2: Can see logs of self + Field Admins and Outlets managed by this SA2. CANNOT see SA1 or other SA2 logs.
 * - Field Admin: Can see logs of self + Outlets managed by this Admin. CANNOT see any Super Admin logs.
 * - Outlet Owner: Can ONLY see logs of own outlet / self. CANNOT see Admin or Super Admin logs.
 */
export async function getActivityLogsAction(
  params: ActivityLogFilterParams = {}
): Promise<
  ActionResult<{
    logs: ActivityLogItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const currentUserId = session.user.id;
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: {
        outlet: true,
      },
    });

    if (!currentUser) {
      return { success: false, message: "Pengguna tidak ditemukan." };
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(params.limit) || 20));
    const skip = (page - 1) * limit;
    const search = params.search?.trim() || "";
    const actionCategory = params.actionCategory?.trim() || "ALL";

    // ─── Build Role-based Filter ───────────────────────────────────────────
    let roleWhereClause: Prisma.ActivityLogWhereInput = {};

    if (currentUser.role === Role.SUPER_ADMIN) {
      // 👑 Super Admin 1 (Master) & Super Admin 2: Full global audit trail access
      roleWhereClause = {};
    } else if (currentUser.role === Role.ADMIN) {
      // 🧑‍💼 Field Admin:
      // Dapat memantau seluruh aktivitas outlet dan kartu yang menjadi binaan atau jatah kartu miliknya
      const managedCards = await prisma.qrCard.findMany({
        where: { assignedAdminId: currentUser.id },
        select: { outletId: true },
      });
      const cardOutletIds = managedCards.map((c) => c.outletId).filter(Boolean) as string[];

      const managedOutlets = await prisma.outlet.findMany({
        where: {
          OR: [
            { owner: { createdById: currentUser.id } },
            ...(cardOutletIds.length > 0 ? [{ id: { in: cardOutletIds } }] : []),
          ],
        },
        select: { id: true, ownerId: true },
      });
      const managedOutletIds = managedOutlets.map((o) => o.id);
      const managedOutletOwnerIds = managedOutlets.map((o) => o.ownerId);

      roleWhereClause = {
        AND: [
          // Strictly exclude any Super Admin private log
          { userRole: { not: Role.SUPER_ADMIN } },
          {
            OR: [
              { userId: currentUser.id },
              { adminId: currentUser.id },
              ...(managedOutletIds.length > 0
                ? [
                    { outletId: { in: managedOutletIds } },
                    { userId: { in: managedOutletOwnerIds } },
                    { targetId: { in: managedOutletIds } },
                  ]
                : []),
            ],
          },
        ],
      };
    } else {
      // 🏪 USER (Outlet Owner):
      // Pemilik outlet dapat melihat seluruh rekaman log yang terkait dengan outlet dan akunnya sendiri
      const outlet = currentUser.outlet;
      if (outlet) {
        roleWhereClause = {
          OR: [
            { outletId: outlet.id },
            { userId: currentUser.id },
            { targetId: outlet.id },
          ],
        };
      } else {
        roleWhereClause = {
          userId: currentUser.id,
        };
      }
    }

    // ─── Search & Category Filters ─────────────────────────────────────────
    const andFilters: Prisma.ActivityLogWhereInput[] = [];
    if (Object.keys(roleWhereClause).length > 0) {
      andFilters.push(roleWhereClause);
    }

    if (search) {
      andFilters.push({
        OR: [
          { userName: { contains: search } },
          { title: { contains: search } },
          { description: { contains: search } },
          { targetName: { contains: search } },
          { action: { contains: search } },
        ],
      });
    }

    if (actionCategory && actionCategory !== "ALL") {
      if (actionCategory === "AUTH") {
        andFilters.push({
          OR: [
            { action: { startsWith: "AUTH" } },
            { action: { in: ["LOGIN", "LOGOUT"] } },
          ],
        });
      } else if (actionCategory === "VIP") {
        andFilters.push({
          OR: [
            { action: { startsWith: "VIP" } },
            { action: "UPDATE_STATUS" },
          ],
        });
      } else if (actionCategory === "FEEDBACK") {
        andFilters.push({
          action: { startsWith: "FEEDBACK" },
        });
      } else {
        andFilters.push({
          action: { startsWith: actionCategory },
        });
      }
    }

    const where: Prisma.ActivityLogWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      message: "Data log aktivitas berhasil diambil.",
      data: {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    const msg = error instanceof Error ? error.message : "Gagal memuat data log aktivitas.";
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Delete a single activity log by ID.
 * Hanya Super Admin yang boleh menghapus log.
 */
export async function deleteActivityLogAction(logId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isSuperAdminMaster: true },
    });

    if (!currentUser || currentUser.role !== Role.SUPER_ADMIN || !currentUser.isSuperAdminMaster) {
      return { success: false, message: "Hanya Super Admin Master yang dapat menghapus log aktivitas." };
    }

    await prisma.activityLog.delete({ where: { id: logId } });

    return { success: true, message: "Log aktivitas berhasil dihapus." };
  } catch (error) {
    console.error("Error deleting activity log:", error);
    return { success: false, message: "Gagal menghapus log aktivitas." };
  }
}

/**
 * Delete activity logs.
 * Jika parameter filter (search / actionCategory) diberikan, hanya log yang cocok dengan filter yang dihapus.
 * Jika tidak ada filter, menghapus seluruh log aktivitas sistem.
 * Hanya Super Admin Master (isSuperAdminMaster = true) yang boleh.
 */
export async function deleteAllActivityLogsAction(params?: {
  search?: string;
  actionCategory?: string;
}): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isSuperAdminMaster: true },
    });

    if (!currentUser || currentUser.role !== Role.SUPER_ADMIN || !currentUser.isSuperAdminMaster) {
      return { success: false, message: "Hanya Super Admin Master yang dapat menghapus semua log." };
    }

    const andFilters: Prisma.ActivityLogWhereInput[] = [];

    const search = params?.search?.trim();
    if (search) {
      andFilters.push({
        OR: [
          { userName: { contains: search } },
          { title: { contains: search } },
          { description: { contains: search } },
          { targetName: { contains: search } },
          { action: { contains: search } },
        ],
      });
    }

    const actionCategory = params?.actionCategory;
    if (actionCategory && actionCategory !== "ALL") {
      if (actionCategory === "AUTH") {
        andFilters.push({
          OR: [
            { action: { startsWith: "AUTH" } },
            { action: { in: ["LOGIN", "LOGOUT"] } },
          ],
        });
      } else {
        andFilters.push({
          action: { startsWith: actionCategory },
        });
      }
    }

    const where: Prisma.ActivityLogWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};

    const { count } = await prisma.activityLog.deleteMany({ where });

    const isFiltered = andFilters.length > 0;
    return {
      success: true,
      message: isFiltered
        ? `Berhasil menghapus ${count} log aktivitas terfilter.`
        : `Berhasil menghapus seluruh ${count} log aktivitas.`,
      data: { count },
    };
  } catch (error) {
    console.error("Error deleting activity logs:", error);
    return { success: false, message: "Gagal menghapus log aktivitas." };
  }
}

export interface LiveTickerItem {
  id: string;
  type: "SCAN" | "REGISTER" | "CARD" | "AUTH" | "DEFAULT";
  title: string;
  description: string;
  userName: string;
  timeAgo: string;
  createdAt: string;
}

/**
 * Mendapatkan event aktivitas terkini untuk Ticker Realtime
 */
export async function getLiveTickerEventsAction(): Promise<ActionResult<LiveTickerItem[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: "Unauthorized", data: [] };
    }

    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const now = Date.now();

    const formatted: LiveTickerItem[] = logs.map((log) => {
      const diffMs = now - new Date(log.createdAt).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      let timeAgo = "Baru saja";
      if (diffMins >= 1 && diffMins < 60) {
        timeAgo = `${diffMins}m lalu`;
      } else if (diffHours >= 1 && diffHours < 24) {
        timeAgo = `${diffHours}j lalu`;
      } else if (diffHours >= 24) {
        timeAgo = `${Math.floor(diffHours / 24)}h lalu`;
      }

      let type: LiveTickerItem["type"] = "DEFAULT";
      const act = log.action.toUpperCase();
      const tit = log.title.toUpperCase();

      if (act.includes("SCAN") || tit.includes("SCAN")) {
        type = "SCAN";
      } else if (act.includes("REGISTER") || tit.includes("DAFTAR") || tit.includes("OUTLET")) {
        type = "REGISTER";
      } else if (act.includes("CARD") || tit.includes("KARTU") || act.includes("ASSIGN")) {
        type = "CARD";
      } else if (act.includes("LOGIN") || act.includes("AUTH")) {
        type = "AUTH";
      }

      return {
        id: log.id,
        type,
        title: log.title,
        description: log.description,
        userName: log.userName || "Sistem",
        timeAgo,
        createdAt: log.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      message: "Data realtime berhasil dimuat.",
      data: formatted,
    };
  } catch (error) {
    console.error("Error loading live ticker:", error);
    return { success: false, message: "Gagal memuat ticker realtime.", data: [] };
  }
}


