"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role, Prisma } from "@prisma/client";

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

    if (currentUser.role === Role.SUPER_ADMIN && currentUser.isSuperAdminMaster) {
      // 👑 Super Admin 1 (Master): Full global access
      roleWhereClause = {};
    } else if (currentUser.role === Role.SUPER_ADMIN && !currentUser.isSuperAdminMaster) {
      // 🛡️ Super Admin 2:
      // Can only see:
      // 1. Actions performed by this SA2
      // 2. Actions tagged with superAdminId == this SA2
      // 3. Actions from Field Admins created by this SA2
      // 4. Actions from Outlets created by those Admins (or directly by this SA2)
      // STRICT FILTER: Strictly exclude any log created by Super Admin 1 or other Super Admins.
      const managedAdmins = await prisma.user.findMany({
        where: { createdById: currentUser.id, role: Role.ADMIN },
        select: { id: true },
      });
      const managedAdminIds = managedAdmins.map((a) => a.id);

      const managedOutlets = await prisma.outlet.findMany({
        where: {
          owner: {
            OR: [
              { createdById: currentUser.id },
              ...(managedAdminIds.length > 0 ? [{ createdById: { in: managedAdminIds } }] : []),
            ],
          },
        },
        select: { id: true, ownerId: true },
      });
      const managedOutletIds = managedOutlets.map((o) => o.id);
      const managedOutletOwnerIds = managedOutlets.map((o) => o.ownerId);

      roleWhereClause = {
        AND: [
          // Never see other Super Admins' logs (SA1 or other SA2)
          {
            OR: [
              { userId: currentUser.id },
              { userRole: { not: Role.SUPER_ADMIN } },
            ],
          },
          // Must belong to this SA2's realm
          {
            OR: [
              { userId: currentUser.id },
              { superAdminId: currentUser.id },
              ...(managedAdminIds.length > 0
                ? [
                    { adminId: { in: managedAdminIds } },
                    { userId: { in: managedAdminIds } },
                  ]
                : []),
              ...(managedOutletIds.length > 0
                ? [
                    { outletId: { in: managedOutletIds } },
                    { userId: { in: managedOutletOwnerIds } },
                  ]
                : []),
            ],
          },
        ],
      };
    } else if (currentUser.role === Role.ADMIN) {
      // 🧑‍💼 Field Admin:
      // Can only see:
      // 1. Actions performed by this Admin
      // 2. Actions tagged with adminId == this Admin
      // 3. Actions from Outlets created by this Admin
      // STRICT FILTER: Strictly exclude ALL Super Admin logs.
      const managedOutlets = await prisma.outlet.findMany({
        where: {
          owner: { createdById: currentUser.id },
        },
        select: { id: true, ownerId: true },
      });
      const managedOutletIds = managedOutlets.map((o) => o.id);
      const managedOutletOwnerIds = managedOutlets.map((o) => o.ownerId);

      roleWhereClause = {
        AND: [
          // Strictly exclude any Super Admin log
          { userRole: { not: Role.SUPER_ADMIN } },
          // Must belong to this Admin's realm
          {
            OR: [
              { userId: currentUser.id },
              { adminId: currentUser.id },
              ...(managedOutletIds.length > 0
                ? [
                    { outletId: { in: managedOutletIds } },
                    { userId: { in: managedOutletOwnerIds } },
                  ]
                : []),
            ],
          },
        ],
      };
    } else {
      // 🏪 USER (Outlet Owner):
      // Hanya menampilkan riwayat kapan pemilik login dan logout dari sistem.
      // STRICT FILTER: Bebas dari log scan kartu pengunjung, masukan/feedback, atau log admin.
      roleWhereClause = {
        AND: [
          { userId: currentUser.id },
          {
            action: {
              in: ["AUTH_LOGIN", "AUTH_LOGOUT", "LOGIN", "LOGOUT"],
            },
          },
        ],
      };
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
      andFilters.push({
        action: { startsWith: actionCategory },
      });
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
