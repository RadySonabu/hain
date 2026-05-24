// Raw JSON the on-device model (SmolLM2) returns
export interface LlamaIngredient {
  quantity: string;
  unit: string;
  name: string;
}

export interface LlamaTimeValue {
  value: number;
  unit: "mins" | "hours";
}

export interface LlamaRecipeOutput {
  title: string | null;
  description: string | null;
  servings: number | null;
  difficulty: "easy" | "medium" | "hard" | null;
  prepTime: LlamaTimeValue | null;
  cookTime: LlamaTimeValue | null;
  ingredients: LlamaIngredient[] | null;
  steps: string[] | null;
}

// Flattened form-friendly type used throughout the app
export interface RecipeForm {
  title: string;
  description: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard" | "";
  cookTime: string;
  servings: number;
  ingredients: string[];
  steps: string[];
}

// react-hook-form internal shape (arrays must be objects for useFieldArray)
export interface IngredientField {
  value: string;
}

export interface StepField {
  value: string;
  duration: number | null;
  media?: { uri: string; type: "image" | "video" } | null;
}

export interface RecipeFormValues {
  title: string;
  authorName: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard" | "";
  cookTime: string;
  servings: number;
  description: string;
  primaryFlavors: string[];
  isPublic: boolean;
  ingredients: IngredientField[];
  steps: StepField[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: LlamaTimeValue | null): string {
  if (!t) return "";
  const v = t.value;
  const u = t.unit === "hours" ? (v === 1 ? "hr" : "hrs") : "min";
  return `${v} ${u}`;
}

function formatIngredient(i: LlamaIngredient): string {
  const parts = [i.quantity, i.unit, i.name].filter(Boolean);
  return parts.join(" ");
}

function capitalize(s: string): "Easy" | "Medium" | "Hard" | "" {
  if (s === "easy") return "Easy";
  if (s === "medium") return "Medium";
  if (s === "hard") return "Hard";
  return "";
}

export function llamaOutputToRecipeForm(raw: LlamaRecipeOutput): RecipeForm {
  // Combine prep + cook for a single "cook time" display
  const totalMin =
    (raw.prepTime
      ? raw.prepTime.unit === "hours"
        ? raw.prepTime.value * 60
        : raw.prepTime.value
      : 0) +
    (raw.cookTime
      ? raw.cookTime.unit === "hours"
        ? raw.cookTime.value * 60
        : raw.cookTime.value
      : 0);

  let cookTimeStr = "";
  if (totalMin > 0) {
    cookTimeStr =
      totalMin >= 60
        ? `${Math.round(totalMin / 60)} hr`
        : `${totalMin} min`;
  } else {
    cookTimeStr = formatTime(raw.cookTime);
  }

  return {
    title: raw.title ?? "",
    description: raw.description ?? "",
    category: "Dinner", // model doesn't return category; default sensibly
    difficulty: raw.difficulty ? capitalize(raw.difficulty) : "",
    cookTime: cookTimeStr,
    servings: raw.servings ?? 2,
    ingredients: (raw.ingredients ?? []).map(formatIngredient).filter(Boolean),
    steps: (raw.steps ?? []).filter(Boolean),
  };
}
