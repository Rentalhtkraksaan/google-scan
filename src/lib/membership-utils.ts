/**
 * Membership Date & Expiration Utilities
 */

/**
 * Returns default expiration Date: 30 September 2026 23:59:59.999 WIB
 * Sesuai instruksi: "seluruh masa aktif member hanya smpai 30 septmber ya"
 */
export function getDefaultSeptember30Expiry(): Date {
  const target = new Date("2026-09-30T23:59:59.999+07:00");
  // Jika saat ini belum melewati 30 September 2026, gunakan 30 September 2026
  if (Date.now() <= target.getTime()) {
    return target;
  }
  // Fallback: 30 hari ke depan jika waktu sudah lewat 30 September 2026
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

/**
 * Evaluates whether an outlet currently has an ACTIVE Member Premium status.
 * Returns false if isMember is false, or if membershipExpiresAt is missing or already expired!
 * "dan jika habis otomatis udh ga member dan fitur dihilangkan smua"
 */
export function isOutletMemberActive(outlet: {
  isMember?: boolean | null;
  membershipExpiresAt?: Date | string | null;
} | null | undefined): boolean {
  if (!outlet || !outlet.isMember) return false;
  if (!outlet.membershipExpiresAt) return false;

  const expiryTime = new Date(outlet.membershipExpiresAt).getTime();
  if (isNaN(expiryTime)) return false;

  return expiryTime > Date.now();
}

/**
 * Formats membership expiration date in Indonesian localized format
 */
export function formatMembershipExpiry(
  dateInput: Date | string | null | undefined,
  short = false
): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

/**
 * Calculate remaining days until expiration. Returns negative if already expired.
 */
export function getMembershipDaysRemaining(
  dateInput: Date | string | null | undefined
): number {
  if (!dateInput) return 0;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 0;

  const diffMs = d.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
