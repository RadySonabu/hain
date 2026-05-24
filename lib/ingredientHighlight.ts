import type { Segment } from "./timeDetection";
import { stripMeasurement } from "./measurementDetection";

/**
 * Converts raw ingredient strings into clean names suitable for matching
 * (measurement stripped, lowercased, deduped, sorted longest-first).
 */
export function buildIngredientNames(ingredients: string[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const raw of ingredients) {
    const name = stripMeasurement(raw).trim().toLowerCase();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }

  // Longest first so multi-word phrases match before their substrings
  return names.sort((a, b) => b.length - a.length);
}

/**
 * Splits `text` into plain and ingredient-highlight segments.
 * Matches are case-insensitive and word-boundary guarded.
 */
export function segmentIngredients(
  text: string,
  ingredientNames: string[] // pre-built via buildIngredientNames
): Segment[] {
  if (!ingredientNames.length) return [{ text, isHighlight: false }];

  const escaped = ingredientNames.map((s) =>
    s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isHighlight: false });
    }
    segments.push({ text: match[0], isHighlight: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isHighlight: false });
  }

  return segments.length > 0 ? segments : [{ text, isHighlight: false }];
}
