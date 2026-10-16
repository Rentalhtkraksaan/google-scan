/**
 * Utility functions for WhatsApp number formatting and normalization
 */

export function normalizeWhatsappNumber(raw: string): string {
  let clean = (raw || "").replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  } else if (clean.startsWith("8")) {
    clean = "62" + clean;
  }
  return clean;
}
