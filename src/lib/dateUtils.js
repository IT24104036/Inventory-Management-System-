/**
 * Local-calendar helpers for YYYY-MM-DD strings.
 * Matches Java LocalDate + ChronoUnit.DAYS.between for the same calendar zone.
 */

export function localTodayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Days from local today to expiry date (YYYY-MM-DD). Negative = already past. */
export function daysLeftUntilExpiryYMD(expiryYMD) {
  if (!expiryYMD || typeof expiryYMD !== "string") return null;
  const raw = expiryYMD.length >= 10 ? expiryYMD.slice(0, 10) : expiryYMD;
  const parts = raw.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [ey, em, ed] = parts;
  const [ty, tm, td] = localTodayYMD().split("-").map(Number);
  const e0 = new Date(ey, em - 1, ed);
  const t0 = new Date(ty, tm - 1, td);
  return Math.round((e0 - t0) / 86400000);
}

export function isExpiredYMD(expiryYMD) {
  if (!expiryYMD || typeof expiryYMD !== "string") return false;
  const ymd = expiryYMD.length >= 10 ? expiryYMD.slice(0, 10) : expiryYMD;
  return ymd <= localTodayYMD();
}
