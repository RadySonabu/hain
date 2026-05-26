import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  extractMeasurement,
  stripMeasurement,
} from "@/lib/measurementDetection";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShoppingItem = {
  id: string;
  ingredientText: string;     // original string from the first recipe that added it
  name: string;               // stripped name e.g. "chicken breast"
  measurement: string | null; // combined normalised measurement e.g. "700 g"
  checked: boolean;
  recipeNames: string[];      // all recipes that contributed to this item
};

interface ShoppingListContextValue {
  items: ShoppingItem[];
  uncheckedCount: number;
  addRecipeIngredients: (
    recipeId: string,
    recipeName: string,
    ingredients: string[]
  ) => void;
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearList: () => void;
}

// ── Measurement arithmetic ────────────────────────────────────────────────────

function parseNormalisedQtyUnit(
  normalised: string
): { qty: number; unit: string } | null {
  const sp = normalised.indexOf(" ");
  if (sp === -1) return null;
  const qtyStr = normalised.slice(0, sp);
  const unit = normalised.slice(sp + 1);
  if (qtyStr.includes("/")) {
    const [n, d] = qtyStr.split("/");
    return { qty: parseFloat(n) / parseFloat(d), unit };
  }
  const qty = parseFloat(qtyStr);
  return isNaN(qty) ? null : { qty, unit };
}

function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString();
  return parseFloat(qty.toFixed(2)).toString();
}

/**
 * Adds two normalised measurement strings.
 * Returns the combined string if units match, or null if they can't be combined.
 */
function combineMeasurements(a: string, b: string): string | null {
  const pa = parseNormalisedQtyUnit(a);
  const pb = parseNormalisedQtyUnit(b);
  if (!pa || !pb || pa.unit !== pb.unit) return null;
  return `${formatQty(pa.qty + pb.qty)} ${pa.unit}`;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ShoppingListContext = createContext<ShoppingListContextValue>({
  items: [],
  uncheckedCount: 0,
  addRecipeIngredients: () => {},
  toggleItem: () => {},
  removeItem: () => {},
  clearList: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function ShoppingListProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<ShoppingItem[]>([]);

  const addRecipeIngredients = useCallback(
    (_recipeId: string, recipeName: string, ingredients: string[]) => {
      // Parse each incoming ingredient into a candidate ShoppingItem
      const incoming: ShoppingItem[] = ingredients
        .filter((ing) => ing.trim().length > 0)
        .map((ing, idx) => {
          const m = extractMeasurement(ing);
          const name = stripMeasurement(ing).trim() || ing.trim();
          return {
            id: `item-${Date.now()}-${idx}`,
            ingredientText: ing,
            name,
            measurement: m ? m.normalised : null,
            checked: false,
            recipeNames: [recipeName],
          };
        });

      setItems((prev) => {
        const result = [...prev];

        for (const candidate of incoming) {
          // Match by name (case-insensitive)
          const existingIdx = result.findIndex(
            (item) =>
              item.name.toLowerCase() === candidate.name.toLowerCase()
          );

          if (existingIdx === -1) {
            // Brand-new ingredient — just append
            result.push(candidate);
            continue;
          }

          const existing = result[existingIdx];

          // Build merged recipe name list (deduplicate)
          const mergedNames = existing.recipeNames.includes(recipeName)
            ? existing.recipeNames
            : [...existing.recipeNames, recipeName];

          if (existing.measurement && candidate.measurement) {
            const combined = combineMeasurements(
              existing.measurement,
              candidate.measurement
            );
            if (combined) {
              // Same unit → merge with summed measurement
              result[existingIdx] = {
                ...existing,
                measurement: combined,
                recipeNames: mergedNames,
              };
            } else {
              // Different units → can't combine, add as a new row
              result.push({ ...candidate, recipeNames: [recipeName] });
            }
          } else if (!existing.measurement && !candidate.measurement) {
            // Both unmeasured → deduplicate, just record recipe name
            result[existingIdx] = { ...existing, recipeNames: mergedNames };
          } else {
            // One has a measurement and the other doesn't → separate rows
            result.push({ ...candidate, recipeNames: [recipeName] });
          }
        }

        return result;
      });
    },
    []
  );

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearList = useCallback(() => {
    setItems([]);
  }, []);

  const uncheckedCount = useMemo(
    () => items.filter((item) => !item.checked).length,
    [items]
  );

  return (
    <ShoppingListContext.Provider
      value={{
        items,
        uncheckedCount,
        addRecipeIngredients,
        toggleItem,
        removeItem,
        clearList,
      }}
    >
      {children}
    </ShoppingListContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useShoppingList(): ShoppingListContextValue {
  return useContext(ShoppingListContext);
}
