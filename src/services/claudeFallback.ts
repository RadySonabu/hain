import type { RecipeForm } from "@/src/types/recipe";

/**
 * Calls the backend /api/parse-recipe endpoint which proxies to Claude Haiku.
 *
 * The API key MUST live on the server — never in the RN bundle.
 *
 * TODO: replace the placeholder URL with your actual backend once it is
 *       deployed (e.g. a Next.js API route or an Express server).
 *       Expected contract:
 *         POST /api/parse-recipe
 *         Body:    { text: string }
 *         Returns: RecipeForm JSON
 */
const BACKEND_URL = ""; // ← set your backend base URL here

export async function claudeFallback(text: string): Promise<RecipeForm> {
  if (!BACKEND_URL) {
    // TODO: wire up your backend before shipping
    throw new Error(
      "Backend not configured — set BACKEND_URL in claudeFallback.ts"
    );
  }

  const response = await fetch(`${BACKEND_URL}/api/parse-recipe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(
      `Backend returned ${response.status}: ${await response.text()}`
    );
  }

  const data = (await response.json()) as RecipeForm;

  if (!data.title || !data.ingredients || !data.steps) {
    throw new Error("Backend returned incomplete recipe data.");
  }

  return data;
}
