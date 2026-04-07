/**
 * Shared HVAC model number utilities — used on both client and server.
 */

/**
 * Strip a full HVAC model number to its base identifier.
 * Manuals are catalogued by base model — not the full config string.
 *
 * ZE060H12A2A1ABA1A2  → ZE060     York/JCI
 * 24ACC636A003        → 24ACC636  Carrier
 * 4TTR3036E1000AA     → 4TTR3036  Trane
 * GSX160601           → GSX160601 Goodman (short, unchanged)
 * RA1636AJ1NA         → RA1636    Rheem
 * GMVC960803BN        → GMVC9608  Goodman furnace
 * SL280UH110XV60C     → SL280     Lennox
 */
export function getBaseModel(model: string): string {
  if (!model) return model;
  const m = model.replace(/[\s\-_]/g, "").toUpperCase();
  if (m.length <= 10) return m;

  // Pattern A: leading letters + digits  (York, Rheem, Goodman, Lennox...)
  const patA = m.match(/^([A-Z]{1,5}\d{3,6})/);
  if (patA && patA[1].length < m.length - 2) return patA[1];

  // Pattern B: leading digit(s) + letters + digits  (Carrier, Trane...)
  const patB = m.match(/^(\d{1,2}[A-Z]{2,5}\d{3,6})/);
  if (patB && patB[1].length < m.length - 2) return patB[1];

  // Fallback: first 9 characters
  return m.slice(0, 9);
}

/**
 * Normalize a model number for deduplication comparison.
 * Strips non-alphanumeric and lowercases.
 * Two models are the "same" if one base starts with the other's base.
 */
export function normalizeModelForCompare(model: string): string {
  return getBaseModel(model).replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

/**
 * Estimate manufacture year from a serial number.
 * Returns the 4-digit year, or null if it can't be determined.
 * When null, assume modern — don't suppress manuals.
 *
 * Brand serial formats (year position):
 *   Goodman/Amana/Daikin: pos 0-1 = YY  (e.g. 0904... = 2009)
 *   Lennox/Ducane:        pos 2-3 = YY  (e.g. 5196... = 1996)
 *   Carrier/Bryant/Payne: pos 4-5 = YY  (e.g. 5204E... = 2004)
 *   Trane/American Std:   pos 2-3 = YY  (e.g. 12L4... = 2012)
 *   York/JCI:             pos 2   = letter A-Z = year 1971+  (A=1971)
 *   Rheem/Ruud:           pos 2-3 = YY  (e.g. F00A... = 2000)
 *   Heil/Tempstar/ICP:    pos 4-5 = YY  (e.g. E954... = 1995)
 */
export function estimateYearFromSerial(brand: string, serial: string): number | null {
  if (!serial || serial.length < 6) return null;
  const s = serial.toUpperCase().replace(/[\s\-_]/g, "");
  const b = brand.toLowerCase();

  function twoDigitYear(yy: string): number | null {
    const n = parseInt(yy, 10);
    if (isNaN(n)) return null;
    // 85-99 → 1985-1999, 00-30 → 2000-2030
    return n >= 85 ? 1900 + n : 2000 + n;
  }

  // York/JCI: pos 2 is a letter, A=1971 ... Z=1996, then restarts AA=1997...
  if (/york|jci|johnson/i.test(b)) {
    const ch = s[2];
    if (/[A-Z]/.test(ch)) {
      const yr = 1971 + (ch.charCodeAt(0) - 65);
      if (yr >= 1971 && yr <= 2030) return yr;
    }
  }

  // Carrier/Bryant/Payne: digits at pos 4-5
  if (/carrier|bryant|payne/i.test(b) && /\d/.test(s[4])) {
    return twoDigitYear(s.slice(4, 6));
  }

  // Heil/Tempstar/ICP/Comfortmaker: year at pos 0-1 (e.g. 0404... = 2004)
  if (/heil|tempstar|icp|comfortmaker|arcoaire|international comfort/i.test(b) && /\d/.test(s[0])) {
    return twoDigitYear(s.slice(0, 2));
  }

  // Goodman/Amana/Daikin: digits at pos 0-1
  if (/goodman|amana|daikin/i.test(b) && /\d/.test(s[0])) {
    return twoDigitYear(s.slice(0, 2));
  }

  // Lennox/Ducane: digits at pos 2-3
  if (/lennox|ducane/i.test(b) && /\d/.test(s[2])) {
    return twoDigitYear(s.slice(2, 4));
  }

  // Rheem/Ruud: digits at pos 2-3
  if (/rheem|ruud/i.test(b) && /\d/.test(s[2])) {
    return twoDigitYear(s.slice(2, 4));
  }

  // Trane/American Standard: digits at pos 2-3
  if (/trane|american standard/i.test(b) && /\d/.test(s[2])) {
    return twoDigitYear(s.slice(2, 4));
  }

  return null;
}

/**
 * Returns true if two model numbers refer to the same unit.
 * Handles full config strings vs base models (ZE060H12... === ZE060).
 */
export function isSameModel(a: string, b: string): boolean {
  const ka = normalizeModelForCompare(a);
  const kb = normalizeModelForCompare(b);
  if (ka === kb) return true;
  // Longer must start with shorter, AND next char must be non-alphanumeric boundary
  const [longer, shorter] = ka.length >= kb.length ? [ka, kb] : [kb, ka];
  if (!longer.startsWith(shorter)) return false;
  const nextChar = longer[shorter.length];
  return !nextChar || !/[a-z0-9]/.test(nextChar);
}
