import AsyncStorage from "@react-native-async-storage/async-storage";
import { Recipe } from "./mockData";

const KEY = "hain:user_recipes";

export async function getUserRecipes(): Promise<Recipe[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? (JSON.parse(json) as Recipe[]) : [];
  } catch {
    return [];
  }
}

export async function saveUserRecipe(recipe: Recipe): Promise<void> {
  const existing = await getUserRecipes();
  await AsyncStorage.setItem(KEY, JSON.stringify([...existing, recipe]));
}

export async function updateUserRecipe(
  id: string,
  updates: Partial<Recipe>
): Promise<void> {
  const existing = await getUserRecipes();
  const updated = existing.map((r) => (r.id === id ? { ...r, ...updates } : r));
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

export async function deleteUserRecipe(id: string): Promise<void> {
  const existing = await getUserRecipes();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(existing.filter((r) => r.id !== id))
  );
}
