import { type ComponentProps, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRecipeParse } from "@/src/hooks/useRecipeParse";
import { saveUserRecipe } from "@/lib/recipeStore";

const LABEL_STYLE = {
  fontSize: 11,
  fontWeight: "600" as const,
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: 1,
  marginBottom: 6,
};

export default function DescribeRecipeScreen() {
  const router = useRouter();
  const [text, setText] = useState("");
  const { isLoading, result, error, usedFallback, parse, reset } =
    useRecipeParse();

  const handleParse = async () => {
    if (!text.trim()) return;
    await parse(text.trim());
  };

  const handleEdit = () => {
    if (!result) return;
    router.push({
      pathname: "/create-recipe",
      params: {
        prefillTitle: result.title,
        prefillDescription: result.description,
        prefillCategory: result.category,
        prefillDifficulty: result.difficulty,
        prefillCookTime: result.cookTime,
        prefillServings: String(result.servings),
        prefillIngredients: JSON.stringify(result.ingredients),
        prefillSteps: JSON.stringify(result.steps),
      },
    });
  };

  const handleSave = async () => {
    if (!result) return;
    await saveUserRecipe({
      id: Date.now().toString(),
      title: result.title,
      description: result.description,
      tagline: "",
      category: result.category,
      cookTime: result.cookTime,
      servings: result.servings,
      rating: 0,
      ratingCount: 0,
      imageUrl: "",
      username: "You",
      avatar: "",
      likes: 0,
      commentCount: 0,
      timeAgo: "Just now",
      ingredients: result.ingredients,
      steps: result.steps.map((t) => ({ text: t })),
      isUserCreated: true,
      isPublic: false,
      difficulty:
        result.difficulty !== "" ? result.difficulty : undefined,
    });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Describe Recipe" }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#fff" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── AI badge ──────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#f5f3ff",
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
            }}
          >
            <Ionicons name="hardware-chip-outline" size={18} color="#7c3aed" />
            <Text
              style={{
                fontSize: 13,
                color: "#7c3aed",
                fontWeight: "600",
                flex: 1,
              }}
            >
              On-device AI — private, no internet required
            </Text>
            {usedFallback && (
              <View
                style={{
                  backgroundColor: "#e0e7ff",
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, color: "#4338ca", fontWeight: "600" }}>
                  Cloud
                </Text>
              </View>
            )}
          </View>

          {/* ── Input ─────────────────────────────────────────── */}
          <Text style={LABEL_STYLE}>Describe your recipe</Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>
            e.g. "Make spaghetti carbonara with 400 g pasta, 4 eggs, 200 g
            pancetta and parmesan. Serves 4, takes 30 minutes."
          </Text>
          <TextInput
            style={{
              fontSize: 15,
              color: "#000",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 14,
              padding: 14,
              minHeight: 140,
              textAlignVertical: "top",
              marginBottom: 6,
              lineHeight: 22,
            }}
            placeholder="Describe your recipe in plain language…"
            placeholderTextColor="#9ca3af"
            value={text}
            onChangeText={(v) => {
              setText(v);
              if (result || error) reset();
            }}
            multiline
            autoFocus
          />
          <Text
            style={{
              fontSize: 12,
              color: "#9ca3af",
              textAlign: "right",
              marginBottom: 16,
            }}
          >
            {text.length} characters
          </Text>

          {/* ── Error ─────────────────────────────────────────── */}
          {error && (
            <View
              style={{
                backgroundColor: "#fef2f2",
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#ef4444"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: "#dc2626",
                  flex: 1,
                  lineHeight: 20,
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* ── Analyze button ────────────────────────────────── */}
          {!result && (
            <TouchableOpacity
              onPress={handleParse}
              disabled={!text.trim() || isLoading}
              style={{
                backgroundColor:
                  !text.trim() || isLoading ? "#d1d5db" : "#000",
                borderRadius: 14,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 24,
              }}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text
                    style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                  >
                    Analyzing…
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={18} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                  >
                    Analyze Recipe
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* ── Preview card ──────────────────────────────────── */}
          {result && (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                padding: 20,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }}
            >
              {/* Cloud badge */}
              {usedFallback && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "#eef2ff",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    alignSelf: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="cloud-outline" size={12} color="#6366f1" />
                  <Text
                    style={{ fontSize: 11, color: "#6366f1", fontWeight: "600" }}
                  >
                    Parsed via cloud
                  </Text>
                </View>
              )}

              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: "#000",
                  marginBottom: 12,
                }}
              >
                {result.title}
              </Text>

              {/* Meta chips */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {[
                  { icon: "restaurant-outline", label: result.category },
                  { icon: "time-outline", label: result.cookTime },
                  {
                    icon: "people-outline",
                    label: `${result.servings} servings`,
                  },
                  { icon: "bar-chart-outline", label: result.difficulty },
                ].map(({ icon, label }) =>
                  label ? (
                    <View
                      key={icon}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: "#f3f4f6",
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Ionicons
                        name={icon as ComponentProps<typeof Ionicons>["name"]}
                        size={12}
                        color="#6b7280"
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#374151",
                          fontWeight: "500",
                        }}
                      >
                        {label}
                      </Text>
                    </View>
                  ) : null
                )}
              </View>

              {/* Description */}
              {!!result.description && (
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    lineHeight: 20,
                    marginBottom: 16,
                  }}
                >
                  {result.description}
                </Text>
              )}

              {/* Ingredients */}
              <Text style={{ ...LABEL_STYLE, marginBottom: 8 }}>
                Ingredients
              </Text>
              {result.ingredients.map((ing, i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: "#9ca3af",
                      marginTop: 8,
                      flexShrink: 0,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#111",
                      lineHeight: 20,
                      flex: 1,
                    }}
                  >
                    {ing}
                  </Text>
                </View>
              ))}

              {/* Steps */}
              <Text style={{ ...LABEL_STYLE, marginTop: 16, marginBottom: 8 }}>
                Instructions
              </Text>
              {result.steps.map((step, i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "#000",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}
                    >
                      {i + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#111",
                      lineHeight: 20,
                      flex: 1,
                    }}
                  >
                    {step}
                  </Text>
                </View>
              ))}

              {/* Action buttons */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginTop: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    reset();
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: "#f3f4f6",
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Re-analyze
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleEdit}
                  style={{
                    flex: 1,
                    backgroundColor: "#f3f4f6",
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{ fontSize: 15, fontWeight: "600", color: "#000" }}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={{
                    flex: 1,
                    backgroundColor: "#000",
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}
                  >
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
