import {
  extractMeasurement,
  stripMeasurement,
  segmentMeasurements,
} from "./measurementDetection";

// ── Quantity parsing ──────────────────────────────────────────────────────────

function parseQtyStr(s: string): number {
  const t = s.trim();
  if (t.includes("/")) {
    const [num, den] = t.split("/");
    return parseFloat(num) / parseFloat(den);
  }
  // Range "1-2" or "1–2" → take lower bound
  const rangeMatch = t.match(/^([\d.]+)\s*[-–]/);
  if (rangeMatch) return parseFloat(rangeMatch[1]);
  return parseFloat(t) || 0;
}

/** Parse total qty + canonical unit from an ingredient string, e.g. "500g chicken breast" */
function parseTotalFromIngredient(
  ing: string
): { qty: number; unit: string } | null {
  const m = extractMeasurement(ing);
  if (!m) return null;
  // normalised is like "500 g", "2 tbsp", "1/2 cup", "2 fl oz"
  const spaceIdx = m.normalised.indexOf(" ");
  if (spaceIdx === -1) return null;
  return {
    qty: parseQtyStr(m.normalised.slice(0, spaceIdx)),
    unit: m.normalised.slice(spaceIdx + 1),
  };
}

// ── Word boundary check ───────────────────────────────────────────────────────

function isWordBoundary(
  text: string,
  start: number,
  end: number
): boolean {
  const before = start > 0 ? text[start - 1] : " ";
  const after = end < text.length ? text[end] : " ";
  return !/\w/.test(before) && !/\w/.test(after);
}

// ── Core step-scanning logic ──────────────────────────────────────────────────

/**
 * Returns the total quantity of `ingredientName` (with matching `targetUnit`)
 * referenced in a single step text.
 *
 * Strategy: for each whole-word occurrence of the ingredient name, look at the
 * 70-char window directly before it and take the LAST highlighted measurement
 * segment whose canonical unit equals targetUnit.
 */
function findIngredientUsageInStep(
  stepText: string,
  ingredientName: string,
  targetUnit: string
): number {
  const lowerStep = stepText.toLowerCase();
  const lowerName = ingredientName.toLowerCase();
  let totalUsed = 0;
  let searchIdx = 0;
  const WINDOW = 70;

  while (true) {
    const namePos = lowerStep.indexOf(lowerName, searchIdx);
    if (namePos === -1) break;

    // Whole-word boundary guard
    if (!isWordBoundary(lowerStep, namePos, namePos + lowerName.length)) {
      searchIdx = namePos + 1;
      continue;
    }

    // Scan the 70-char window BEFORE the ingredient name
    const beforeStart = Math.max(0, namePos - WINDOW);
    const before = stepText.slice(beforeStart, namePos);
    const segs = segmentMeasurements(before);

    // Take the LAST highlighted segment (closest to the ingredient name)
    for (let i = segs.length - 1; i >= 0; i--) {
      if (segs[i].isHighlight) {
        const measured = extractMeasurement(segs[i].text);
        if (measured) {
          const sp = measured.normalised.indexOf(" ");
          const mUnit = sp >= 0 ? measured.normalised.slice(sp + 1) : "";
          if (mUnit === targetUnit) {
            totalUsed += parseQtyStr(measured.normalised.slice(0, sp));
          }
        }
        break; // only the closest measurement counts
      }
    }

    searchIdx = namePos + lowerName.length;
  }

  return totalUsed;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type IngredientUsage = {
  /** Parsed total qty from the ingredient string, or null if no measurement */
  totalQty: number | null;
  /** Canonical unit (e.g. "g", "tbsp"), or null */
  totalUnit: string | null;
  /** Sum of qty found in step texts with matching unit */
  usedQty: number;
  /** totalQty − usedQty, clamped to 0. null when totalQty is null. */
  remainingQty: number | null;
};

/**
 * For each ingredient string, compute how much of it is referenced across the
 * provided step texts. Returns one IngredientUsage per ingredient.
 */
export function computeIngredientUsage(
  ingredients: string[],
  steps: string[]
): IngredientUsage[] {
  return ingredients.map((ing) => {
    const parsed = parseTotalFromIngredient(ing);
    if (!parsed) {
      return { totalQty: null, totalUnit: null, usedQty: 0, remainingQty: null };
    }

    const name = stripMeasurement(ing).trim().toLowerCase();
    if (!name) {
      return { totalQty: null, totalUnit: null, usedQty: 0, remainingQty: null };
    }

    const usedQty = steps.reduce(
      (sum, step) =>
        sum + findIngredientUsageInStep(step, name, parsed.unit),
      0
    );

    return {
      totalQty: parsed.qty,
      totalUnit: parsed.unit,
      usedQty,
      remainingQty: Math.max(0, parsed.qty - usedQty),
    };
  });
}

/**
 * Returns a short display string for the badge, or null if nothing to show.
 * - null  → ingredient has no measurement, or 0 usage found in steps
 * - "✓"   → usedQty >= totalQty (fully accounted for)
 * - "Xu left" → remaining amount with unit
 */
export function formatUsageBadge(usage: IngredientUsage): string | null {
  if (
    usage.usedQty === 0 ||
    usage.totalQty === null ||
    usage.totalUnit === null
  ) {
    return null;
  }
  if ((usage.remainingQty ?? 1) <= 0) return "✓";

  const r = usage.remainingQty ?? 0;
  const fmt =
    Number.isInteger(r)
      ? r.toString()
      : parseFloat(r.toFixed(2)).toString();
  return `${fmt}${usage.totalUnit} left`;
}
