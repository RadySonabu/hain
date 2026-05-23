import { useRef, useState } from "react";
import { initLlama, LlamaContext } from "llama.rn";
import { getModelPath } from "@/src/services/modelManager";
import { claudeFallback } from "@/src/services/claudeFallback";
import {
  type RecipeForm,
  type LlamaRecipeOutput,
  llamaOutputToRecipeForm,
} from "@/src/types/recipe";

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a recipe parser. Extract recipe data from the text and return ONLY a valid JSON object with no explanation, no markdown, no backticks. Use exactly these fields:
{
  "title": "string",
  "description": "string (one sentence)",
  "servings": number,
  "difficulty": "easy" | "medium" | "hard",
  "prepTime": { "value": number, "unit": "mins" | "hours" },
  "cookTime": { "value": number, "unit": "mins" | "hours" },
  "ingredients": [{ "quantity": "string", "unit": "string", "name": "string" }],
  "steps": ["string"]
}
If a field cannot be determined, use null. Return JSON only.`;

// ── Return type ───────────────────────────────────────────────────────────────
export interface UseRecipeParseReturn {
  isLoading: boolean;
  result: RecipeForm | null;
  error: string | null;
  usedFallback: boolean;
  parse: (text: string) => Promise<void>;
  reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useRecipeParse(): UseRecipeParseReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecipeForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const contextRef = useRef<LlamaContext | null>(null);
  const initializingRef = useRef(false);

  // Lazy-initialize the LlamaContext on first parse call
  const ensureContext = async (): Promise<LlamaContext> => {
    if (contextRef.current) return contextRef.current;

    // Guard against concurrent init calls
    if (initializingRef.current) {
      // Spin-wait (rare race during rapid double-tap)
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!initializingRef.current) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
      if (contextRef.current) return contextRef.current;
    }

    initializingRef.current = true;
    try {
      const modelPath = await getModelPath();
      if (!modelPath) {
        throw new Error(
          "Model not found. Please restart the app to trigger the download."
        );
      }

      const ctx = await initLlama({
        model: modelPath, // llama.rn strips file:// internally
        use_mlock: true,
        n_ctx: 2048,
        n_threads: 4,
        n_gpu_layers: 0,
      });

      contextRef.current = ctx;
      return ctx;
    } finally {
      initializingRef.current = false;
    }
  };

  // Strip potential markdown fences from raw model output
  const cleanJson = (raw: string): string =>
    raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

  const tryLocalModel = async (text: string): Promise<RecipeForm> => {
    const ctx = await ensureContext();

    const response = await ctx.completion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      n_predict: 1024,
      temperature: 0.1,
      top_p: 0.9,
      stop: ["<|im_end|>", "</s>", "<|end|>", "<|endoftext|>"],
    });

    const cleaned = cleanJson(response.text);
    const parsed = JSON.parse(cleaned) as LlamaRecipeOutput;

    if (!parsed.title || !parsed.ingredients || !parsed.steps) {
      throw new Error("Incomplete output from local model.");
    }

    return llamaOutputToRecipeForm(parsed);
  };

  const parse = async (text: string): Promise<void> => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setUsedFallback(false);

    try {
      // 1️⃣ Try on-device model
      const recipeForm = await tryLocalModel(text);
      setResult(recipeForm);
    } catch {
      // 2️⃣ Fall back to Claude Haiku via backend
      try {
        const fallbackResult = await claudeFallback(text);
        setResult(fallbackResult);
        setUsedFallback(true);
      } catch (fallbackErr) {
        const msg =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : "Could not parse recipe. Please fill in manually.";
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reset = (): void => {
    setResult(null);
    setError(null);
    setUsedFallback(false);
  };

  return { isLoading, result, error, usedFallback, parse, reset };
}
