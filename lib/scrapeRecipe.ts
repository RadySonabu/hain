export type ScrapedRecipe = {
  title: string;
  description: string;
  image: string;
  ingredients: string[];
  steps: string[];
};

function findRecipeSchema(json: unknown): Record<string, unknown> | null {
  if (Array.isArray(json)) {
    for (const item of json) {
      const found = findRecipeSchema(item);
      if (found) return found;
    }
    return null;
  }
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (obj["@graph"]) return findRecipeSchema(obj["@graph"]);
    const type = obj["@type"];
    if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe")))
      return obj;
  }
  return null;
}

function parseRecipe(json: Record<string, unknown>): ScrapedRecipe {
  const ingredients = ((json.recipeIngredient as unknown[]) ?? [])
    .map(String)
    .filter(Boolean);

  const steps = ((json.recipeInstructions as unknown[]) ?? [])
    .map((s) =>
      typeof s === "string" ? s : ((s as Record<string, unknown>).text as string) ?? ""
    )
    .filter(Boolean);

  let image = "";
  if (typeof json.image === "string") image = json.image;
  else if (Array.isArray(json.image)) image = String(json.image[0] ?? "");
  else if (json.image && typeof json.image === "object")
    image = String((json.image as Record<string, unknown>).url ?? "");

  return {
    title: String(json.name ?? ""),
    description: String(json.description ?? ""),
    image,
    ingredients: ingredients.length ? ingredients : [""],
    steps: steps.length ? steps : [""],
  };
}

export async function scrapeRecipe(url: string): Promise<ScrapedRecipe | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    });
    const html = await res.text();
    const ldJsonRegex =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = ldJsonRegex.exec(html)) !== null) {
      try {
        const json: unknown = JSON.parse(match[1]);
        const recipe = findRecipeSchema(json);
        if (recipe) return parseRecipe(recipe);
      } catch {
        // ignore malformed JSON-LD blocks
      }
    }
    return null;
  } catch {
    return null;
  }
}
