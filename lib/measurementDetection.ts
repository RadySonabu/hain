import type { Segment } from "./timeDetection";

// ── Regex ────────────────────────────────────────────────────────────────────
//
// Quantity: integer, decimal (1.5), fraction (1/2), or range (1-2 / 1.5-2.5)
// Unit:     listed longest-first so greedy match doesn't swallow a prefix
//
// NOTE: standalone single-letter units (g, l) are word-boundary guarded to
// avoid false positives inside other words.

const UNIT_PATTERN = [
  // Weight — longest aliases first
  "kilograms?", "kilos?", "kgs?",
  "grams?", "(?<![a-z])g(?![a-z])", // bare "g" — word-boundary via lookaround
  "pounds?", "lbs?",
  "ounces?", "oz",
  // Volume
  "milliliters?", "millilitres?", "ml",
  "liters?", "litres?", "(?<![a-z])l(?![a-z])", // bare "l"
  "fl\\.?\\s*oz",
  "tablespoons?", "tbsps?",
  "teaspoons?", "tsps?",
  "cups?",
  // Count / informal
  "pieces?", "pcs?",
  "cloves?",
  "slices?",
  "bunch(?:es)?",
  "cans?",
  "pack(?:ets?)?", "pkts?", "pck",
  "handfuls?",
  "pinch(?:es)?",
  "dash(?:es)?",
  "splashes?",
  "sprigs?",
].join("|");

const QTY_PATTERN =
  "\\d+(?:[\\./]\\d+)?(?:\\s*[-–]\\s*\\d+(?:[\\./]\\d+)?)?";

// Full pattern: quantity + optional whitespace + unit (case-insensitive)
const MEASUREMENT_REGEX = new RegExp(
  `(${QTY_PATTERN})\\s*(${UNIT_PATTERN})\\b`,
  "gi"
);

// ── Compound packaging pattern ────────────────────────────────────────────────
// Matches "1 500g pack", "2 400ml cans", "3 250g bags" as a single span.
// Format: COUNT  WEIGHT/VOLUME_QTY  WEIGHT/VOLUME_UNIT  CONTAINER_UNIT
const COUNT_UNITS =
  "pack(?:ets?)?|pkts?|pck|cans?|bottles?|bags?|jars?|boxes?|box(?:es)?";
const WEIGHT_VOLUME_UNITS = "kg|g|ml|l|oz|lb";

const PACKAGING_REGEX = new RegExp(
  `(${QTY_PATTERN})\\s+(${QTY_PATTERN})\\s*(${WEIGHT_VOLUME_UNITS})\\b\\s*(${COUNT_UNITS})\\b`,
  "gi"
);

// ── Normalisation map ────────────────────────────────────────────────────────

function normaliseUnit(raw: string): string {
  const u = raw.toLowerCase().replace(/\s+/g, "");
  if (/^kilograms?$|^kilos?$|^kgs?$/.test(u)) return "kg";
  if (/^grams?$/.test(u)) return "g";
  if (/^pounds?$|^lbs?$/.test(u)) return "lb";
  if (/^ounces?$|^oz$/.test(u)) return "oz";
  if (/^milli(liters?|litres?)$|^ml$/.test(u)) return "ml";
  if (/^liters?$|^litres?$/.test(u)) return "L";
  if (/^fl\.?oz$/.test(u)) return "fl oz";
  if (/^tablespoons?$|^tbsps?$/.test(u)) return "tbsp";
  if (/^teaspoons?$|^tsps?$/.test(u)) return "tsp";
  if (/^cups?$/.test(u)) return u.endsWith("s") ? "cups" : "cup";
  if (/^pieces?$|^pcs?$/.test(u)) return u === "piece" || u === "pc" ? "piece" : "pieces";
  if (/^cloves?$/.test(u)) return u.endsWith("s") ? "cloves" : "clove";
  if (/^slices?$/.test(u)) return u.endsWith("s") ? "slices" : "slice";
  if (/^bunch(es)?$/.test(u)) return "bunch";
  if (/^cans?$/.test(u)) return u.endsWith("s") ? "cans" : "can";
  if (/^pack(ets?)?$|^pkts?$|^pck$/.test(u)) return "pack";
  if (/^handfuls?$/.test(u)) return "handful";
  if (/^pinch(es)?$/.test(u)) return "pinch";
  if (/^dash(es)?$/.test(u)) return "dash";
  if (/^splashes?$/.test(u)) return "splash";
  if (/^sprigs?$/.test(u)) return u.endsWith("s") ? "sprigs" : "sprig";
  return raw.toLowerCase();
}

export function normaliseMeasurement(amount: string, unit: string): string {
  return `${amount} ${normaliseUnit(unit)}`;
}

// ── Core exports ─────────────────────────────────────────────────────────────

/** Splits text into plain and measurement-highlighted segments. */
export function segmentMeasurements(text: string): Segment[] {
  // Per-character highlight flag
  const tagged = new Array<boolean>(text.length).fill(false);

  // 1. Compound packaging spans first (higher priority)
  PACKAGING_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PACKAGING_REGEX.exec(text)) !== null) {
    for (let i = m.index; i < m.index + m[0].length; i++) tagged[i] = true;
  }

  // 2. Standard measurement spans (skip chars already covered by compound)
  MEASUREMENT_REGEX.lastIndex = 0;
  while ((m = MEASUREMENT_REGEX.exec(text)) !== null) {
    if (!tagged[m.index]) {
      for (let i = m.index; i < m.index + m[0].length; i++) tagged[i] = true;
    }
  }

  // 3. Collapse into runs
  const segments: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const isHighlight = tagged[i];
    let j = i + 1;
    while (j < text.length && tagged[j] === isHighlight) j++;
    segments.push({ text: text.slice(i, j), isHighlight });
    i = j;
  }
  return segments.length > 0 ? segments : [{ text, isHighlight: false }];
}

/** Returns the first detected measurement as { raw, normalised }, or null. */
export function extractMeasurement(
  text: string
): { raw: string; normalised: string } | null {
  MEASUREMENT_REGEX.lastIndex = 0;
  const match = MEASUREMENT_REGEX.exec(text);
  if (!match) return null;
  return {
    raw: match[0],
    normalised: normaliseMeasurement(match[1], match[2]),
  };
}

// Matches a leading standalone number (int, decimal, fraction, range)
// that is NOT already covered by a unit — used as a count fallback.
const LEADING_COUNT_REGEX =
  /^(\d+(?:[\/\.]\d+)?(?:\s*[-–]\s*\d+(?:[\/\.]\d+)?)?)(?:\s|$)/;

/** Returns the ingredient text with the measurement span removed and trimmed. */
export function stripMeasurement(raw: string): string {
  const m = extractMeasurement(raw);
  if (!m) return raw;
  return raw.replace(m.raw, "").replace(/^[\s,]+|[\s,]+$/g, "").trim() || raw;
}

/**
 * When `extractMeasurement` finds nothing, looks for a bare leading number
 * and returns it formatted as "Nx" (e.g. "1 large egg" → "1x").
 * Returns null if there is no leading number or if a unit was already found.
 */
export function extractLeadingCount(text: string): string | null {
  if (extractMeasurement(text)) return null; // unit already handled
  const match = LEADING_COUNT_REGEX.exec(text.trim());
  if (!match) return null;
  return `${match[1]}x`;
}
