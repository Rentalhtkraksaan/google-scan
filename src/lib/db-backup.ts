import fs from "fs";
import path from "path";
import { prisma } from "./prisma";

const BACKUP_DIR = path.join(process.cwd(), "backups");

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
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Helper to escape MySQL string values safely
 */
function escapeSqlValue(val: any): string {
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
    const rows = (await prisma.$queryRawUnsafe<Array<Record<string, any>>>(
      `SELECT * FROM \`${tableName}\``
    )) as Array<Record<string, any>>;

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
 * Creates a new SQL backup file in the backups/ directory
 */
export async function createDatabaseBackup(triggeredBy = "SYSTEM"): Promise<{
  filename: string;
  filePath: string;
  sizeBytes: number;
  createdAt: Date;
  formattedSize: string;
}> {
  ensureBackupDirExists();

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const filename = `saas_qr_review_backup_${dateStr}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  const sqlContent = await generateDatabaseSqlDump();
  fs.writeFileSync(filePath, sqlContent, "utf-8");

  const stat = fs.statSync(filePath);

  // Clean up backups older than 30 days
  cleanupOldBackups(30);

  return {
    filename,
    filePath,
    sizeBytes: stat.size,
    createdAt: now,
    formattedSize: formatBytes(stat.size),
  };
}

/**
 * List all backup files available in the backups/ directory
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
  ensureBackupDirExists();

  const files = fs.readdirSync(BACKUP_DIR);
  const sqlFiles = files.filter((f) => f.endsWith(".sql"));

  const results = sqlFiles.map((filename) => {
    const fullPath = path.join(BACKUP_DIR, filename);
    const stat = fs.statSync(fullPath);
    // Check if filename indicates a midnight backup (e.g. 00-00 or _00- or system auto)
    const isAutoMidnight = filename.includes("_00-") || filename.includes("midnight");

    return {
      filename,
      sizeBytes: stat.size,
      createdAt: stat.mtime,
      formattedSize: formatBytes(stat.size),
      isAutoMidnight,
    };
  });

  // Sort descending by creation date
  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return results;
}

/**
 * Delete a specific backup file safely
 */
export async function deleteBackupFile(filename: string): Promise<boolean> {
  // Sanitize filename to prevent directory traversal
  const safeFilename = path.basename(filename);
  if (!safeFilename.endsWith(".sql")) return false;

  const filePath = path.join(BACKUP_DIR, safeFilename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * Get the full filesystem path for a valid backup file
 */
export function getBackupFilePath(filename: string): string | null {
  const safeFilename = path.basename(filename);
  if (!safeFilename.endsWith(".sql")) return null;

  const filePath = path.join(BACKUP_DIR, safeFilename);
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
    ensureBackupDirExists();
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith(".sql")) continue;
      const fullPath = path.join(BACKUP_DIR, file);
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
