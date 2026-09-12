import QRCode from "qrcode";

export type PrintSizeKey = "square";

export interface TemplateElementPosition {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  size?: number; // percentage of canvas width 0 - 100
  fontSize?: number; // px
  color?: string;
  show?: boolean;
  borderRadius?: number; // percentage of QR size 0 - 30% for rounded corners
}

export interface PrintTemplateConfig {
  sizeKey: PrintSizeKey;
  name: string;
  badge: string;
  widthMm: number;
  heightMm: number;
  canvasWidth: number;
  canvasHeight: number;
  aspectRatio: string;
  description: string;
  isActive?: boolean;
  backgroundUrl?: string | null; // Custom uploaded image URL
  qr: TemplateElementPosition;
  versionTag: TemplateElementPosition;
  codeTag: TemplateElementPosition;
  outletNameTag?: TemplateElementPosition;
  themeColor?: string;
}

export interface CardRenderOptions {
  code?: string;
  version?: string;
  outletName?: string;
  showCode?: boolean;
  customTemplateConfig?: Partial<PrintTemplateConfig>;
}

/**
 * Master Preset Definition for Standard Square Format (Stiker Meja Persegi 10 x 10 cm)
 */
export const PRINT_SIZE_PRESETS: Record<PrintSizeKey, PrintTemplateConfig> = {
  square: {
    sizeKey: "square",
    name: "Stiker Meja Persegi",
    badge: "10 x 10 cm",
    widthMm: 100,
    heightMm: 100,
    canvasWidth: 1500,
    canvasHeight: 1500,
    aspectRatio: "1/1",
    description: "Ukuran standar stiker meja persegi (10 x 10 cm) untuk nomor meja, akrilik kasir, atau coaster.",
    isActive: true,
    backgroundUrl: null,
    qr: {
      x: 50,
      y: 58,
      size: 52,
      borderRadius: 12,
      show: true,
    },
    versionTag: {
      x: 7,
      y: 5,
      fontSize: 22,
      show: true,
    },
    codeTag: {
      x: 93,
      y: 5,
      fontSize: 22,
      show: true,
    },
    outletNameTag: {
      x: 50,
      y: 89,
      fontSize: 28,
      show: true,
    },
  },
};

/**
 * Load Image from path/URL safely
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${src} - ${err}`));
    img.src = src;
  });
}

/**
 * Draw pill badge (for Version and Code tags)
 */
function drawPillBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  fontSize: number = 22,
  align: "center" | "left" | "right" = "center"
) {
  ctx.save();
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
  const textMetrics = ctx.measureText(text);
  const pillW = textMetrics.width + fontSize * 1.2;
  const pillH = fontSize * 1.6;
  const pillRadius = pillH / 2;

  let pillX = centerX - pillW / 2;
  if (align === "left") pillX = centerX;
  if (align === "right") pillX = centerX - pillW;
  const pillY = centerY - pillH / 2;

  // Background
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.moveTo(pillX + pillRadius, pillY);
  ctx.lineTo(pillX + pillW - pillRadius, pillY);
  ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + pillRadius);
  ctx.lineTo(pillX + pillW, pillY + pillH - pillRadius);
  ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - pillRadius, pillY + pillH);
  ctx.lineTo(pillX + pillRadius, pillY + pillH);
  ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - pillRadius);
  ctx.lineTo(pillX, pillY + pillRadius);
  ctx.quadraticCurveTo(pillX, pillY, pillX + pillRadius, pillY);
  ctx.closePath();
  ctx.fill();

  // Border & shadow
  ctx.strokeStyle = "rgba(203, 213, 225, 0.9)";
  ctx.lineWidth = Math.max(1.5, fontSize * 0.07);
  ctx.stroke();

  // Text
  ctx.fillStyle = "#334155";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pillX + pillW / 2, pillY + pillH / 2 + 1);
  ctx.restore();
}

/**
 * Draw 5 Gold Review Stars on Canvas
 */
function drawFiveStars(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  starSize: number,
  spacing: number = 8
) {
  const totalWidth = 5 * starSize + 4 * spacing;
  const startX = centerX - totalWidth / 2;

  for (let i = 0; i < 5; i++) {
    const x = startX + i * (starSize + spacing) + starSize / 2;
    drawStar(ctx, x, centerY, 5, starSize / 2, starSize / 4, "#FBBC04");
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  color: string
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/**
 * Draw Beautiful Built-in Default Background for Square (Stiker Meja Persegi 10 x 10 cm)
 */
function drawDefaultBackground(
  ctx: CanvasRenderingContext2D,
  _sizeKey: PrintSizeKey,
  width: number,
  height: number,
  outletName?: string
) {
  // 1. Clean White Base
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Top Google Rainbow Stripe
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "#4285F4");
  grad.addColorStop(0.33, "#EA4335");
  grad.addColorStop(0.66, "#FBBC04");
  grad.addColorStop(1, "#34A853");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, 14);

  ctx.save();
  ctx.textAlign = "center";

  // Header Text
  ctx.fillStyle = "#334155";
  ctx.font = `bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("REVIEW KAMI DI", width / 2, 130);

  // Google Logo Multi-Color
  const googleColors = [
    { letter: "G", color: "#4285F4" },
    { letter: "o", color: "#EA4335" },
    { letter: "o", color: "#FBBC04" },
    { letter: "g", color: "#4285F4" },
    { letter: "l", color: "#34A853" },
    { letter: "e", color: "#EA4335" },
  ];
  ctx.font = `900 80px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  let totalGWidth = 0;
  for (const item of googleColors) {
    totalGWidth += ctx.measureText(item.letter).width + 2;
  }
  let curX = width / 2 - totalGWidth / 2;
  for (const item of googleColors) {
    ctx.fillStyle = item.color;
    ctx.fillText(item.letter, curX + ctx.measureText(item.letter).width / 2, 230);
    curX += ctx.measureText(item.letter).width + 2;
  }

  // 5 Google Golden Review Stars
  drawFiveStars(ctx, width / 2, 300, 42, 10);

  // QR Box Cavity with soft rounded rectangle
  const boxW = width * 0.58;
  const boxX = (width - boxW) / 2;
  const boxY = height * 0.35;

  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 4;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxW, 32);
  ctx.fill();
  ctx.stroke();

  // Bottom Scan Call-To-Action
  ctx.fillStyle = "#0F172A";
  ctx.font = `800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("SCAN UNTUK ULASAN BINTANG 5", width / 2, boxY + boxW + 70);

  if (outletName) {
    ctx.fillStyle = "#475569";
    ctx.font = `bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(outletName, width / 2, boxY + boxW + 120);
  }

  ctx.fillStyle = "#94A3B8";
  ctx.font = `500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("Google Reviews", width / 2, height - 35);
  ctx.restore();
}

/**
 * Universal Card Canvas Renderer for Square format
 */
export async function renderCardCanvasBySize(
  scanUrl: string,
  sizeKey: PrintSizeKey = "square",
  customConfig?: Partial<PrintTemplateConfig> | null,
  options?: CardRenderOptions
): Promise<HTMLCanvasElement> {
  const preset = PRINT_SIZE_PRESETS[sizeKey] || PRINT_SIZE_PRESETS.square;
  const config: PrintTemplateConfig = {
    ...preset,
    ...customConfig,
    qr: { ...preset.qr, ...customConfig?.qr },
    versionTag: { ...preset.versionTag, ...customConfig?.versionTag },
    codeTag: { ...preset.codeTag, ...customConfig?.codeTag },
    outletNameTag:
      preset.outletNameTag || customConfig?.outletNameTag
        ? {
            x: 50,
            y: 89,
            fontSize: 28,
            show: true,
            ...preset.outletNameTag,
            ...customConfig?.outletNameTag,
          }
        : undefined,
  };

  const canvas = document.createElement("canvas");
  canvas.width = config.canvasWidth;
  canvas.height = config.canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  // 1. Draw Background
  if (config.backgroundUrl) {
    try {
      const bgImg = await loadImage(config.backgroundUrl);
      ctx.drawImage(bgImg, 0, 0, config.canvasWidth, config.canvasHeight);
    } catch (err) {
      console.warn("Failed to load custom background, falling back to default:", err);
      drawDefaultBackground(ctx, sizeKey, config.canvasWidth, config.canvasHeight, options?.outletName);
    }
  } else {
    // Draw built-in high-quality default square background
    drawDefaultBackground(ctx, sizeKey, config.canvasWidth, config.canvasHeight, options?.outletName);
  }

  // 2. Generate and Render High-Resolution QR Code
  if (config.qr?.show !== false) {
    const qrPixelSize = Math.max(256, Math.round((config.canvasWidth * (config.qr.size || 52)) / 100));

    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: qrPixelSize,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    });

    const qrImg = await loadImage(qrDataUrl);

    const qrX = (config.canvasWidth * config.qr.x) / 100 - qrPixelSize / 2;
    const qrY = (config.canvasHeight * config.qr.y) / 100 - qrPixelSize / 2;

    // Draw QR Code directly into the template cavity (with optional corner rounding)
    const borderRadiusPct = typeof config.qr.borderRadius === "number" ? config.qr.borderRadius : 0;
    if (borderRadiusPct > 0) {
      const cornerRadiusPx = (qrPixelSize * borderRadiusPct) / 100;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrPixelSize, qrPixelSize, cornerRadiusPx);
      ctx.clip();
      ctx.drawImage(qrImg, qrX, qrY, qrPixelSize, qrPixelSize);
      ctx.restore();
    } else {
      ctx.drawImage(qrImg, qrX, qrY, qrPixelSize, qrPixelSize);
    }
  }

  // 3. Render Version Tag
  const versionText = options?.version || "V 1.1.2";
  if (versionText && config.versionTag?.show !== false) {
    const vx = (config.canvasWidth * config.versionTag.x) / 100;
    const vy = (config.canvasHeight * config.versionTag.y) / 100;
    drawPillBadge(ctx, versionText, vx, vy, config.versionTag.fontSize || 22, "left");
  }

  // 4. Render Card Code Tag
  if (options?.code && (options.showCode !== false || config.codeTag?.show !== false)) {
    const cx = (config.canvasWidth * config.codeTag.x) / 100;
    const cy = (config.canvasHeight * config.codeTag.y) / 100;
    drawPillBadge(ctx, options.code, cx, cy, config.codeTag.fontSize || 22, "right");
  }

  // 5. Render Outlet Name (if configured on custom template)
  if (options?.outletName && config.outletNameTag?.show) {
    const ox = (config.canvasWidth * config.outletNameTag.x) / 100;
    const oy = (config.canvasHeight * config.outletNameTag.y) / 100;
    ctx.save();
    ctx.font = `bold ${config.outletNameTag.fontSize || 28}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = config.outletNameTag.color || "#0F172A";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(options.outletName, ox, oy);
    ctx.restore();
  }

  return canvas;
}

/**
 * Generate Card as PNG Data URL for Square format
 */
export async function generateReviewCardDataUrl(
  scanUrl: string,
  options?: CardRenderOptions,
  sizeKey: PrintSizeKey = "square",
  customConfig?: Partial<PrintTemplateConfig> | null
): Promise<string> {
  const canvas = await renderCardCanvasBySize(scanUrl, sizeKey, customConfig, options);
  return canvas.toDataURL("image/png", 1.0);
}

/**
 * Generate Card as Blob for Square format
 */
export async function generateReviewCardBlob(
  scanUrl: string,
  options?: CardRenderOptions,
  sizeKey: PrintSizeKey = "square",
  customConfig?: Partial<PrintTemplateConfig> | null
): Promise<Blob> {
  const canvas = await renderCardCanvasBySize(scanUrl, sizeKey, customConfig, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to convert canvas to blob"));
    }, "image/png", 1.0);
  });
}
