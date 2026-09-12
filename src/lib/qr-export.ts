import QRCode from "qrcode";
import JSZip from "jszip";
import {
  PrintSizeKey,
  PrintTemplateConfig,
  PRINT_SIZE_PRESETS,
  generateReviewCardDataUrl,
} from "./card-canvas";

/**
 * Generate standard QR code URL for a given card code
 */
export function getCardScanUrl(code: string, baseUrl?: string): string {
  const host =
    baseUrl ||
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  return `${host}/c/${code}`;
}

/**
 * Generate raw QR code as a PNG data URL (Base64)
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 600,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}

/**
 * Generate raw QR code as a PNG Buffer (for server side)
 */
export async function generateQrBuffer(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    width: 600,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
}

export type CardExportItem = {
  code: string;
  status: string;
  scanCount: number;
  fallbackUrl: string;
  assignedAdmin?: { fullName: string; email: string } | null;
  outlet?: {
    name: string;
    googleReviewUrl: string;
    owner?: { fullName: string; whatsappNumber: string | null; email: string } | null;
  } | null;
  createdAt: Date | string;
};

/**
 * Generate CSV formatted string from list of cards
 */
export function generateCardsCsv(cards: CardExportItem[], baseUrl?: string): string {
  const headers = [
    "Kode Kartu",
    "Link Scan QR",
    "Status",
    "Total Scan",
    "Nama Outlet",
    "Nama Pemilik",
    "No WhatsApp",
    "Admin Pemegang",
    "Link Google Review",
    "Fallback URL",
    "Tanggal Dibuat",
  ];

  const escapeCsv = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = cards.map((c) => {
    const scanUrl = getCardScanUrl(c.code, baseUrl);
    const dateStr =
      typeof c.createdAt === "string"
        ? c.createdAt
        : new Date(c.createdAt).toLocaleDateString("id-ID");
    return [
      escapeCsv(c.code),
      escapeCsv(scanUrl),
      escapeCsv(c.status),
      escapeCsv(c.scanCount),
      escapeCsv(c.outlet?.name || "- (Belum Terpakai)"),
      escapeCsv(c.outlet?.owner?.fullName || "-"),
      escapeCsv(c.outlet?.owner?.whatsappNumber || "-"),
      escapeCsv(c.assignedAdmin?.fullName || "-"),
      escapeCsv(c.outlet?.googleReviewUrl || "-"),
      escapeCsv(c.fallbackUrl || "-"),
      escapeCsv(dateStr),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

export interface ZipExportOptions {
  baseUrl?: string;
  format?: "CARDS" | "QR_ONLY" | "BOTH";
  sizeKey?: PrintSizeKey;
  templateConfigs?: Record<PrintSizeKey, PrintTemplateConfig>;
}

/**
 * Create a ZIP blob containing print-ready card PNGs (for chosen size) and/or QR codes + CSV manifest
 */
export async function generateQrZipBlob(
  cards: CardExportItem[],
  options?: ZipExportOptions | string
): Promise<Blob> {
  const baseUrl = typeof options === "string" ? options : options?.baseUrl;
  const format = typeof options === "object" && options?.format ? options.format : "CARDS";
  const sizeKey: PrintSizeKey =
    typeof options === "object" && options?.sizeKey ? options.sizeKey : "square";
  const templateConfig =
    typeof options === "object" && options?.templateConfigs?.[sizeKey]
      ? options.templateConfigs[sizeKey]
      : PRINT_SIZE_PRESETS[sizeKey] || PRINT_SIZE_PRESETS.square;

  const zip = new JSZip();
  const folderName = `kartu-siap-cetak-${sizeKey}-${templateConfig.badge.replace(/\s+/g, "")}`;
  const cardsFolder = format !== "QR_ONLY" ? zip.folder(folderName) : null;
  const rawQrFolder = format === "QR_ONLY" || format === "BOTH" ? zip.folder("raw-qr-codes") : null;

  for (const card of cards) {
    const scanUrl = getCardScanUrl(card.code, baseUrl);

    // 1. Generate full card PNG for chosen size (Print Ready @ 300+ DPI)
    if (cardsFolder) {
      try {
        const cardDataUrl = await generateReviewCardDataUrl(
          scanUrl,
          {
            code: card.code,
            outletName: card.outlet?.name,
            showCode: true,
          },
          sizeKey,
          templateConfig
        );
        const base64Data = cardDataUrl.split(",")[1];
        const filename = `Kartu-GoogleReview-${card.code}-${sizeKey}.png`;
        cardsFolder.file(filename, base64Data, { base64: true });
      } catch (err) {
        console.error("Failed to render card for zip:", card.code, err);
      }
    }

    // 2. Generate raw QR code if requested
    if (rawQrFolder) {
      const rawDataUrl = await generateQrDataUrl(scanUrl);
      const base64Data = rawDataUrl.split(",")[1];
      const filename = `QR-${card.code}.png`;
      rawQrFolder.file(filename, base64Data, { base64: true });
    }
  }

  // Also include the CSV manifest inside the ZIP
  const csvContent = generateCardsCsv(cards, baseUrl);
  zip.file("daftar-kartu.csv", "\uFEFF" + csvContent); // Add UTF-8 BOM for Excel compatibility

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6,
    },
  });
}

