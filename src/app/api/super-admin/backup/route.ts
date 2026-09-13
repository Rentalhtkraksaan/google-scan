import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createDatabaseBackup,
  listBackupFiles,
  deleteBackupFile,
  getBackupFilePath,
  getBackupFileContent,
  getAutoBackupStatus,
  performMidnightCheckAndBackup,
} from "@/lib/db-backup";
import fs from "fs";

async function verifyMasterSuperAdmin(session: any) {
  if (!session?.user?.id || session.user.role !== Role.SUPER_ADMIN) {
    return false;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isSuperAdminMaster: true },
  });
  return user?.role === Role.SUPER_ADMIN && !!user?.isSuperAdminMaster;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const isMaster = await verifyMasterSuperAdmin(session);
    if (!isMaster) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Fitur Database Backup hanya dapat diakses oleh Super Admin 1 (Master)." },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const downloadFilename = searchParams.get("download");
    const isMidnightCheck = searchParams.get("check") === "midnight";

    // 1. Download file scenario (100% resilient across serverless replicas)
    if (downloadFilename) {
      const sqlContent = await getBackupFileContent(downloadFilename);
      const fileBuffer = Buffer.from(sqlContent, "utf-8");

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="${downloadFilename}"`,
          "Content-Type": "application/octet-stream",
          "Content-Length": String(fileBuffer.length),
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // 2. Midnight Auto-Check scenario
    if (isMidnightCheck) {
      const checkResult = await performMidnightCheckAndBackup();
      const status = await getAutoBackupStatus();
      const backups = await listBackupFiles();
      return NextResponse.json({
        success: true,
        checkResult,
        status,
        backups,
      });
    }

    // 3. Standard List & Status scenario
    const status = await getAutoBackupStatus();
    const backups = await listBackupFiles();

    return NextResponse.json({
      success: true,
      status,
      backups,
    });
  } catch (error) {
    console.error("Backup API GET error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memproses data backup.";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isMaster = await verifyMasterSuperAdmin(session);
    if (!isMaster) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Fitur Database Backup hanya dapat diakses oleh Super Admin 1 (Master)." },
        { status: 403 }
      );
    }

    const newBackup = await createDatabaseBackup(session?.user?.name || "SUPER_ADMIN_1");
    const status = await getAutoBackupStatus();
    const backups = await listBackupFiles();

    return NextResponse.json({
      success: true,
      message: `Database backup berhasil dibuat: ${newBackup.filename} (${newBackup.formattedSize})`,
      backup: newBackup,
      status,
      backups,
    });
  } catch (error) {
    console.error("Backup API POST error:", error);
    const msg = error instanceof Error ? error.message : "Gagal membuat database backup.";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const isMaster = await verifyMasterSuperAdmin(session);
    if (!isMaster) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Fitur Database Backup hanya dapat diakses oleh Super Admin 1 (Master)." },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    let filename = searchParams.get("filename");

    if (!filename) {
      try {
        const body = await req.json();
        filename = body?.filename;
      } catch {
        // body might be empty
      }
    }

    if (!filename) {
      return NextResponse.json(
        { success: false, message: "Nama file backup harus disertakan." },
        { status: 400 }
      );
    }

    const deleted = await deleteBackupFile(filename);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "File backup tidak ditemukan atau gagal dihapus." },
        { status: 404 }
      );
    }

    const status = await getAutoBackupStatus();
    const backups = await listBackupFiles();

    return NextResponse.json({
      success: true,
      message: `File backup ${filename} berhasil dihapus.`,
      status,
      backups,
    });
  } catch (error) {
    console.error("Backup API DELETE error:", error);
    const msg = error instanceof Error ? error.message : "Gagal menghapus file backup.";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
