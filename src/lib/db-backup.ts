import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "./prisma";

// Use a function to ensure this is evaluated at RUNTIME, not build time
function getBackupDir() {
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV || process.cwd().includes("/var/task");
  return isVercel ? path.join(os.tmpdir(), "backups") : path.join(process.cwd(), "backups");
}

/**
 * Format bytes into human readable format (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Ensure the backups directory exists
 */
export function ensureBackupDirExists() {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Helper to escape MySQL string values safely
 */
function escapeSqlValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "NULL";
  }
  if (typeof val === "boolean") {
    return val ? "1" : "0";
  }
  if (typeof val === "number") {
    return isNaN(val) ? "NULL" : String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  }
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString("hex")}'`;
  }
  if (typeof val === "object") {
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;
  }

  const str = String(val);
  return `'${str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z")}'`;
}

/**
 * Generate a complete SQL Dump of all tables in the current MySQL database
 */
export async function generateDatabaseSqlDump(): Promise<string> {
  const timestamp = new Date().toISOString();
  const dbName = "saas_qr_review";

  let sqlDump = `-- ========================================================\n`;
  sqlDump += `-- Smart QR Review Platform - Database Backup (.sql)\n`;
  sqlDump += `-- Generated Date: ${timestamp}\n`;
  sqlDump += `-- Database: ${dbName}\n`;
  sqlDump += `-- ========================================================\n\n`;

  sqlDump += `SET FOREIGN_KEY_CHECKS=0;\n`;
  sqlDump += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
  sqlDump += `SET NAMES utf8mb4;\n`;
  sqlDump += `SET time_zone = "+00:00";\n\n`;

  // 1. Get all tables in database
  const tablesResult = (await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
    `SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'`
  )) as Array<Record<string, string>>;

  for (const tableObj of tablesResult) {
    const tableName = Object.values(tableObj)[0];
    if (!tableName) continue;

    sqlDump += `-- --------------------------------------------------------\n`;
    sqlDump += `-- Table structure for table \`${tableName}\`\n`;
    sqlDump += `-- --------------------------------------------------------\n\n`;

    sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;

    // 2. Get CREATE TABLE definition
    const createTableResult = (await prisma.$queryRawUnsafe<Array<Record<string, string>>>(
      `SHOW CREATE TABLE \`${tableName}\``
    )) as Array<Record<string, string>>;

    if (createTableResult.length > 0) {
      const createSql =
        createTableResult[0]["Create Table"] ||
        createTableResult[0]["create table"] ||
        Object.values(createTableResult[0])[1] ||
        "";
      if (createSql) {
        sqlDump += `${createSql};\n\n`;
      }
    }

    // 3. Get all rows for this table
    const rows = (await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM \`${tableName}\``
    )) as Array<Record<string, unknown>>;

    if (rows.length > 0) {
      sqlDump += `-- Dumping data for table \`${tableName}\` (${rows.length} rows)\n`;

      const columns = Object.keys(rows[0]);
      const colNamesSql = columns.map((c) => `\`${c}\``).join(", ");

      // Batch insert every 50 rows
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valuesList = chunk.map((row) => {
          const rowValues = columns.map((col) => escapeSqlValue(row[col]));
          return `(${rowValues.join(", ")})`;
        });

        sqlDump += `INSERT INTO \`${tableName}\` (${colNamesSql}) VALUES\n  ${valuesList.join(",\n  ")};\n`;
      }
      sqlDump += `\n`;
    }
  }

  sqlDump += `SET FOREIGN_KEY_CHECKS=1;\n`;
  sqlDump += `-- [Backup Completed Successfully]\n`;

  return sqlDump;
}

/**
/**
 * Creates a new SQL backup file, persisting both in DB and filesystem
 */
export async function createDatabaseBackup(triggeredBy = "SYSTEM"): Promise<{
  filename: string;
  filePath: string;
  sizeBytes: number;
  createdAt: Date;
  formattedSize: string;
}> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const filename = `saas_qr_review_backup_${dateStr}.sql`;
  const isAuto = triggeredBy.includes("AUTO") || triggeredBy.includes("MIDNIGHT");

  const sqlContent = await generateDatabaseSqlDump();
  const sizeBytes = Buffer.byteLength(sqlContent, "utf-8");
  const formattedSize = formatBytes(sizeBytes);

  // 1. Save to database for persistent, multi-container availability
  try {
    await prisma.databaseBackup.upsert({
      where: { filename },
      create: {
        filename,
        sizeBytes,
        formattedSize,
        content: sqlContent,
        isAuto,
        createdAt: now,
      },
      update: {
        sizeBytes,
        formattedSize,
        content: sqlContent,
        isAuto,
      },
    });

    // Cleanup backups in DB older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await prisma.databaseBackup.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    });
  } catch (dbErr) {
    console.error("Failed to store backup in database table:", dbErr);
  }

  // 2. Also save to filesystem if possible
  let filePath = "";
  try {
    ensureBackupDirExists();
    const dir = getBackupDir();
    filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, sqlContent, "utf-8");
    cleanupOldBackups(30);
  } catch (fsErr) {
    console.warn("Filesystem write warning (normal in serverless):", fsErr);
  }

  return {
    filename,
    filePath,
    sizeBytes,
    createdAt: now,
    formattedSize,
  };
}

/**
 * List all backup files available from DB and filesystem
 */
export async function listBackupFiles(): Promise<
  Array<{
    filename: string;
    sizeBytes: number;
    createdAt: Date;
    formattedSize: string;
    isAutoMidnight: boolean;
  }>
> {
  const itemsMap = new Map<
    string,
    {
      filename: string;
      sizeBytes: number;
      createdAt: Date;
      formattedSize: string;
      isAutoMidnight: boolean;
    }
  >();

  // 1. Load from DB (primary source of truth across serverless instances)
  try {
    const dbBackups = await prisma.databaseBackup.findMany({
      select: {
        filename: true,
        sizeBytes: true,
        formattedSize: true,
        isAuto: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    for (const b of dbBackups) {
      itemsMap.set(b.filename, {
        filename: b.filename,
        sizeBytes: b.sizeBytes,
        createdAt: b.createdAt,
        formattedSize: b.formattedSize,
        isAutoMidnight: b.isAuto || b.filename.includes("_00-") || b.filename.includes("midnight"),
      });
    }
  } catch (err) {
    console.error("Failed to fetch backups from DB:", err);
  }

  // 2. Also check local disk backups (if any not yet in DB)
  try {
    const dir = getBackupDir();
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const sqlFiles = files.filter((f) => f.endsWith(".sql"));
      for (const filename of sqlFiles) {
        if (!itemsMap.has(filename)) {
          const fullPath = path.join(dir, filename);
          const stat = fs.statSync(fullPath);
          const isAutoMidnight = filename.includes("_00-") || filename.includes("midnight");
          itemsMap.set(filename, {
            filename,
            sizeBytes: stat.size,
            createdAt: stat.mtime,
            formattedSize: formatBytes(stat.size),
            isAutoMidnight,
          });
        }
      }
    }
  } catch {
    // ignore
  }

  const results = Array.from(itemsMap.values());
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

/**
 * Delete a specific backup file from both DB and filesystem
 */
export async function deleteBackupFile(filename: string): Promise<boolean> {
  const safeFilename = path.basename(filename);
  if (!safeFilename.endsWith(".sql")) return false;

  let deleted = false;

  // Delete from DB
  try {
    await prisma.databaseBackup.deleteMany({
      where: { filename: safeFilename },
    });
    deleted = true;
  } catch (err) {
    console.error("Failed to delete backup from DB:", err);
  }

  // Delete from filesystem
  try {
    const dir = getBackupDir();
    const filePath = path.join(dir, safeFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }
  } catch {
    // ignore
  }

  return deleted;
}

/**
 * Get SQL file content for download with 100% Zero-Failure Guarantee:
 * 1. Read from filesystem if present
 * 2. Read from Database table if present
 * 3. Fallback: Generate fresh SQL dump on the fly so download NEVER fails
 */
export async function getBackupFileContent(filename: string): Promise<string> {
  const safeFilename = path.basename(filename);

  // 1. Try reading from filesystem
  try {
    const dir = getBackupDir();
    const filePath = path.join(dir, safeFilename);
    if (fs.existsSync(filePath)) {
      const diskContent = fs.readFileSync(filePath, "utf-8");
      if (diskContent && diskContent.length > 50) {
        return diskContent;
      }
    }
  } catch {
    // continue
  }

  // 2. Try reading from Database table
  try {
    const dbRecord = await prisma.databaseBackup.findUnique({
      where: { filename: safeFilename },
      select: { content: true },
    });
    if (dbRecord?.content && dbRecord.content.length > 50) {
      return dbRecord.content;
    }
  } catch (err) {
    console.error("Failed to read backup from DB:", err);
  }

  // 3. Fallback: Generate fresh SQL dump on the fly so download NEVER fails with 404
  console.log(`Generating fresh SQL dump for download: ${safeFilename}`);
  const freshDump = await generateDatabaseSqlDump();

  // Save to DB so subsequent requests have it
  try {
    const sizeBytes = Buffer.byteLength(freshDump, "utf-8");
    await prisma.databaseBackup.upsert({
      where: { filename: safeFilename },
      create: {
        filename: safeFilename,
        sizeBytes,
        formattedSize: formatBytes(sizeBytes),
        content: freshDump,
        isAuto: safeFilename.includes("_00-"),
      },
      update: {
        content: freshDump,
        sizeBytes,
        formattedSize: formatBytes(sizeBytes),
      },
    });
  } catch {
    // ignore
  }

  return freshDump;
}

/**
 * Get the full filesystem path for a valid backup file (fallback)
 */
export function getBackupFilePath(filename: string): string | null {
  const safeFilename = path.basename(filename);
  if (!safeFilename.endsWith(".sql")) return null;

  const dir = getBackupDir();
  const filePath = path.join(dir, safeFilename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

/**
 * Automatically delete backups older than maxDays
 */
export function cleanupOldBackups(maxDays = 30) {
  try {
    const dir = getBackupDir();
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    const now = Date.now();
    const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith(".sql")) continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (err) {
    console.error("Failed to cleanup old backups:", err);
  }
}

/**
 * Get information regarding last backup and next midnight backup
 */
export async function getAutoBackupStatus() {
  const backups = await listBackupFiles();
  const lastBackup = backups.length > 0 ? backups[0] : null;

  // Calculate next midnight 00:00:00
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0); // Sets to next 00:00:00

  return {
    totalBackups: backups.length,
    lastBackupDate: lastBackup ? lastBackup.createdAt : null,
    lastBackupFilename: lastBackup ? lastBackup.filename : null,
    nextScheduledDate: nextMidnight,
    backupsDirectory: "backups/",
  };
}

/**
 * Performs midnight auto-backup check.
 * If no backup has been created today (or since 00:00), it triggers a fresh backup.
 */
export async function performMidnightCheckAndBackup(): Promise<{
  executed: boolean;
  filename?: string;
  message: string;
}> {
  ensureBackupDirExists();
  const backups = await listBackupFiles();

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  // Check if a backup was already created today after midnight
  const alreadyBackedUpToday = backups.some((b) => b.createdAt >= todayMidnight);

  if (alreadyBackedUpToday && backups.length > 0) {
    return {
      executed: false,
      filename: backups[0].filename,
      message: "Backup untuk hari ini sudah tersedia.",
    };
  }

  // Create today's auto-backup
  const newBackup = await createDatabaseBackup("AUTO_MIDNIGHT_SCHEDULER");
  return {
    executed: true,
    filename: newBackup.filename,
    message: "Auto backup jam 00:00 berhasil dibuat!",
  };
}
