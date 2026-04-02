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
