/**
 * Date utility functions for Interarrival Time (IAT) calculations
 */

/**
 * Parses various date formats into a standard Date object (UTC normalized for consistent math).
 */
export function parseDate(dateStr: string | Date | undefined | null): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  const str = String(dateStr).trim();
  if (!str) return null;

  // Try standard ISO/YYYY-MM-DD format
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback to JS Date constructor
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return new Date(Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()));
  }

  return null;
}

/**
 * Formats a Date object as YYYY-MM-DD string
 */
export function formatDateYMD(date: Date | null): string {
  if (!date) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates the lookback start date given a snapshot date and lookback days (default 182)
 */
export function getLookbackWindow(snapshotDateStr: string, lookbackDays: number = 182): {
  snapshotDate: Date;
  windowStartDate: Date;
  snapshotDateStr: string;
  windowStartDateStr: string;
} {
  const snapshotDate = parseDate(snapshotDateStr) || new Date(Date.UTC(2026, 7, 10)); // Default 2026-08-10
  
  const windowStartDate = new Date(snapshotDate.getTime());
  windowStartDate.setUTCDate(windowStartDate.getUTCDate() - lookbackDays);

  return {
    snapshotDate,
    windowStartDate,
    snapshotDateStr: formatDateYMD(snapshotDate),
    windowStartDateStr: formatDateYMD(windowStartDate),
  };
}

/**
 * Checks if a posting date falls within [windowStartDate, snapshotDate]
 */
export function isDateInWindow(date: Date | null, windowStartDate: Date, snapshotDate: Date): boolean {
  if (!date) return false;
  const t = date.getTime();
  return t >= windowStartDate.getTime() && t <= snapshotDate.getTime();
}

/**
 * Returns ISO-8601 week key e.g. "2026-W06" for a given date.
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Sunday = 7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
