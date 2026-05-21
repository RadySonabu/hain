import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { scrapeRecipe } from "@/lib/scrapeRecipe";

export default function CreateRecipeUrlScreen() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http")) {
      setError("Please enter a valid URL starting with http.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await scrapeRecipe(trimmed);
    setLoading(false);
    if (!result) {
      setError(
        "Couldn't find a recipe on that page. Try a different URL or use Manual."
      );
      return;
    }
    router.replace({
      pathname: "/create-recipe",
      params: {
        prefillTitle: result.title,
        prefillDescription: result.description,
        prefillIngredients: JSON.stringify(result.ingredients),
        prefillSteps: JSON.stringify(result.steps),
        prefillImage: result.image,
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Import from URL" }} />
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 px-5 pt-8">
          {/* Illustration area */}
          <View className="items-center mb-8">
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                backgroundColor: "#f3f4f6",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="link" size={36} color="#374151" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#000", textAlign: "center" }}>
              Import a Recipe
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#9ca3af",
                textAlign: "center",
                marginTop: 6,
                lineHeight: 20,
                maxWidth: 280,
              }}
            >
              Paste a link from AllRecipes, Food Network, Serious Eats, or any recipe site.
            </Text>
          </View>

          {/* URL Input */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Recipe URL
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#f3f4f6",
              borderRadius: 12,
              paddingHorizontal: 14,
              gap: 10,
              marginBottom: 6,
            }}
          >
            <Ionicons name="globe-outline" size={18} color="#9ca3af" />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: "#000", paddingVertical: 14 }}
              placeholder="https://www.allrecipes.com/recipe/..."
              placeholderTextColor="#9ca3af"
              value={url}
              onChangeText={(v) => { setUrl(v); setError(null); }}
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleImport}
            />
            {url.length > 0 && (
              <TouchableOpacity onPress={() => { setUrl(""); setError(null); }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Error message */}
          {error && (
            <Text style={{ fontSize: 13, color: "#ef4444", marginBottom: 8, lineHeight: 18 }}>
              {error}
            </Text>
          )}

          {/* Import button */}
          <TouchableOpacity
            onPress={handleImport}
            disabled={loading || url.trim().length === 0}
            style={{
              backgroundColor: loading || url.trim().length === 0 ? "#d1d5db" : "#000",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              marginTop: 12,
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
            }}
            activeOpacity={0.85}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                  Fetching recipe...
                </Text>
              </>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Import Recipe
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
