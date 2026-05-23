import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { saveUserRecipe, updateUserRecipe } from "@/lib/recipeStore";
import SmartTextInput from "@/components/SmartTextInput";
import { useRecipeParse } from "@/src/hooks/useRecipeParse";
import type { RecipeFormValues } from "@/src/types/recipe";

// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Breakfast", "Lunch", "Dinner", "Pasta",
  "Vegan", "Quick", "Dessert", "BBQ", "Snack",
];
const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
const FLAVOR_OPTIONS = [
  { label: "🍬 Sweet", value: "Sweet" },
  { label: "🧂 Savory", value: "Savory" },
  { label: "🌶️ Spicy", value: "Spicy" },
  { label: "🍋 Sour", value: "Sour" },
  { label: "🫙 Umami", value: "Umami" },
  { label: "🫐 Rich", value: "Rich" },
];
const LABEL_STYLE = {
  fontSize: 11,
  fontWeight: "600" as const,
  color: "#6b7280",
  textTransform: "uppercase" as const,
  letterSpacing: 1,
  marginBottom: 10,
};

// ── Shimmer placeholder ───────────────────────────────────────────────────────
function ShimmerBar({
  anim,
  height = 40,
  style,
}: {
  anim: Animated.Value;
  height?: number;
  style?: object;
}) {
  return (
    <Animated.View
      style={[
        {
          height,
          backgroundColor: "#e5e7eb",
          borderRadius: 8,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CreateRecipeScreen() {
  const router = useRouter();
  const {
    recipeId,
    prefillTitle,
    prefillDescription,
    prefillIngredients,
    prefillSteps,
    prefillImage,
    prefillCategory,
    prefillDifficulty,
    prefillCookTime,
    prefillServings,
    prefillFlavors,
    prefillAuthor,
  } = useLocalSearchParams<{
    recipeId?: string;
    prefillTitle?: string;
    prefillDescription?: string;
    prefillIngredients?: string;
    prefillSteps?: string;
    prefillImage?: string;
    prefillCategory?: string;
    prefillDifficulty?: string;
    prefillCookTime?: string;
    prefillServings?: string;
    prefillFlavors?: string;
    prefillAuthor?: string;
  }>();

  const isEditing = !!recipeId;

  // ── react-hook-form ─────────────────────────────────────────────────────────
  const {
    control,
    setValue,
    handleSubmit,
    watch,
  } = useForm<RecipeFormValues>({
    defaultValues: {
      title: prefillTitle ?? "",
      authorName: prefillAuthor ?? "You",
      category: prefillCategory ?? "Dinner",
      difficulty: (prefillDifficulty as RecipeFormValues["difficulty"]) ?? "",
      cookTime: prefillCookTime ?? "",
      servings: prefillServings ? parseInt(prefillServings, 10) : 2,
      description: prefillDescription ?? "",
      primaryFlavors: prefillFlavors
        ? (JSON.parse(prefillFlavors) as string[])
        : [],
      isPublic: false,
      ingredients: prefillIngredients
        ? (JSON.parse(prefillIngredients) as string[]).map((v) => ({ value: v }))
        : [{ value: "" }],
      steps: prefillSteps
        ? (JSON.parse(prefillSteps) as string[]).map((v) => ({
            value: v,
            duration: null,
          }))
        : [{ value: "", duration: null }],
    },
  });

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
    replace: replaceIngredients,
  } = useFieldArray({ control, name: "ingredients" });

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
    replace: replaceSteps,
  } = useFieldArray({ control, name: "steps" });

  // ── Watch for the controlled values we need inline ───────────────────────
  const category = watch("category");
  const difficulty = watch("difficulty");
  const servings = watch("servings");
  const primaryFlavors = watch("primaryFlavors");
  const isPublic = watch("isPublic");

  // ── Photo (not a form field) ─────────────────────────────────────────────
  const [photo, setPhoto] = useState<string | null>(prefillImage ?? null);

  // ── Recipe paste-and-parse ───────────────────────────────────────────────
  const [pasteText, setPasteText] = useState("");
  const { isLoading: isParsing, result: parseResult, error: parseError, usedFallback, parse } =
    useRecipeParse();

  // Shimmer animation while parsing
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  const shimmerLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isParsing) {
      shimmerAnim.setValue(0.3);
      shimmerLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 0.8,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerLoop.current.start();
    } else {
      shimmerLoop.current?.stop();
      shimmerAnim.setValue(0);
    }
  }, [isParsing]);

  // Toast state
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (
    msg: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  // When parse succeeds, populate all form fields
  useEffect(() => {
    if (!parseResult) return;

    const filledFields: string[] = [];

    if (parseResult.title) {
      setValue("title", parseResult.title);
      filledFields.push("title");
    }
    if (parseResult.description) {
      setValue("description", parseResult.description);
      filledFields.push("description");
    }
    if (parseResult.cookTime) {
      setValue("cookTime", parseResult.cookTime);
      filledFields.push("cook time");
    }
    if (parseResult.servings) {
      setValue("servings", parseResult.servings);
      filledFields.push("servings");
    }
    if (
      parseResult.difficulty &&
      (parseResult.difficulty === "Easy" ||
        parseResult.difficulty === "Medium" ||
        parseResult.difficulty === "Hard")
    ) {
      setValue("difficulty", parseResult.difficulty);
      filledFields.push("difficulty");
    }
    if (parseResult.category) {
      setValue("category", parseResult.category);
    }
    if (parseResult.ingredients.length > 0) {
      replaceIngredients(
        parseResult.ingredients.map((v) => ({ value: v }))
      );
      filledFields.push(`${parseResult.ingredients.length} ingredients`);
    }
    if (parseResult.steps.length > 0) {
      replaceSteps(
        parseResult.steps.map((v) => ({ value: v, duration: null }))
      );
      filledFields.push(`${parseResult.steps.length} steps`);
    }

    const label = filledFields.join(", ");
    showToast(`Filled ${filledFields.length} fields from your recipe`, "success");

    if (usedFallback) {
      setTimeout(() => showToast("Parsed via cloud (AI model)", "info"), 3500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseResult]);

  // When parse fails, notify
  useEffect(() => {
    if (parseError) {
      showToast("Couldn't parse — please fill in manually", "error");
    }
  }, [parseError]);

  // ── Image picker ─────────────────────────────────────────────────────────
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  // ── Save handler ─────────────────────────────────────────────────────────
  const onSave = async (data: RecipeFormValues) => {
    if (!data.title.trim()) {
      Alert.alert("Missing title", "Please add a title for your recipe.");
      return;
    }

    const recipe = {
      id: recipeId ?? Date.now().toString(),
      title: data.title.trim(),
      description: data.description.trim(),
      tagline: "",
      category: data.category,
      cookTime: data.cookTime,
      servings: data.servings,
      rating: 0,
      ratingCount: 0,
      imageUrl: photo ?? "",
      username: data.authorName.trim() || "You",
      avatar: "",
      likes: 0,
      commentCount: 0,
      timeAgo: "Just now",
      ingredients: data.ingredients.map((i) => i.value).filter(Boolean),
      steps: data.steps
        .filter((s) => s.value.trim())
        .map((s) => ({ text: s.value, duration: s.duration ?? undefined })),
      isUserCreated: true as const,
      isPublic: data.isPublic,
      difficulty: data.difficulty !== "" ? (data.difficulty as "Easy" | "Medium" | "Hard") : undefined,
      primaryFlavors: data.primaryFlavors.length ? data.primaryFlavors : undefined,
    };

    if (isEditing) {
      await updateUserRecipe(recipeId, recipe);
    } else {
      await saveUserRecipe(recipe);
    }

    router.back();
  };

  const toastColors = {
    success: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
    error: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
    info: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: isEditing ? "Edit Recipe" : "Create Recipe",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSubmit(onSave)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>
                Save
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#fff" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Toast overlay ─────────────────────────────────── */}
        {toast && (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 16,
              right: 16,
              zIndex: 100,
              backgroundColor: toastColors[toast.type].bg,
              borderWidth: 1,
              borderColor: toastColors[toast.type].border,
              borderRadius: 12,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons
              name={
                toast.type === "success"
                  ? "checkmark-circle-outline"
                  : toast.type === "error"
                  ? "alert-circle-outline"
                  : "information-circle-outline"
              }
              size={18}
              color={toastColors[toast.type].text}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                color: toastColors[toast.type].text,
                fontWeight: "500",
              }}
            >
              {toast.msg}
            </Text>
            {usedFallback && toast.type === "success" && (
              <View
                style={{
                  backgroundColor: "#e0e7ff",
                  borderRadius: 999,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{ fontSize: 10, color: "#4338ca", fontWeight: "700" }}
                >
                  Cloud
                </Text>
              </View>
            )}
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ╔════════════════════════════════════════════════╗ */}
          {/* ║  PASTE & PARSE SECTION                         ║ */}
          {/* ╚════════════════════════════════════════════════╝ */}
          <View
            style={{
              margin: 16,
              backgroundColor: "#f9fafb",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <Ionicons name="sparkles" size={15} color="#7c3aed" />
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: "#7c3aed" }}
              >
                Auto-fill from recipe text
              </Text>
            </View>
            <TextInput
              style={{
                fontSize: 14,
                color: "#111827",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 10,
                padding: 12,
                minHeight: 80,
                textAlignVertical: "top",
                backgroundColor: "#fff",
                lineHeight: 20,
                marginBottom: 10,
              }}
              placeholder="Paste or type a recipe here and let AI fill in the fields below…"
              placeholderTextColor="#9ca3af"
              value={pasteText}
              onChangeText={setPasteText}
              multiline
            />
            <TouchableOpacity
              onPress={() => parse(pasteText)}
              disabled={!pasteText.trim() || isParsing}
              style={{
                backgroundColor:
                  !pasteText.trim() || isParsing ? "#e5e7eb" : "#7c3aed",
                borderRadius: 10,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              activeOpacity={0.85}
            >
              {isParsing ? (
                <>
                  <Animated.View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: "#9ca3af",
                      opacity: shimmerAnim,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#6b7280",
                    }}
                  >
                    Parsing…
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={15} color="#fff" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#fff",
                    }}
                  >
                    Parse Recipe
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Cover photo ─────────────────────────────────── */}
          <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
            {photo ? (
              <View
                style={{ margin: 16, borderRadius: 12, overflow: "hidden" }}
              >
                <Image
                  source={{ uri: photo }}
                  style={{ width: "100%", aspectRatio: 16 / 9 }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  onPress={() => setPhoto(null)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    borderRadius: 999,
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={15} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={{
                  margin: 16,
                  aspectRatio: 16 / 9,
                  borderWidth: 1.5,
                  borderColor: "#e5e7eb",
                  borderStyle: "dashed",
                  borderRadius: 12,
                  backgroundColor: "#f9fafb",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="camera-outline" size={28} color="#9ca3af" />
                <Text
                  style={{
                    color: "#9ca3af",
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  Add Cover Photo
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ paddingHorizontal: 16 }}>
            {/* ── Title ─────────────────────────────────────── */}
            <Text style={LABEL_STYLE}>Title *</Text>
            {isParsing ? (
              <ShimmerBar anim={shimmerAnim} height={36} style={{ marginBottom: 24 }} />
            ) : (
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={{
                      fontSize: 18,
                      fontWeight: "500",
                      color: "#000",
                      borderBottomWidth: 1,
                      borderBottomColor: "#e5e7eb",
                      paddingBottom: 10,
                      marginBottom: 24,
                    }}
                    placeholder="e.g. Creamy Tomato Pasta"
                    placeholderTextColor="#9ca3af"
                    value={value}
                    onChangeText={onChange}
                    returnKeyType="next"
                  />
                )}
              />
            )}

            {/* ── Author ─────────────────────────────────────── */}
            <Text style={LABEL_STYLE}>Author</Text>
            <Controller
              control={control}
              name="authorName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={{
                    fontSize: 15,
                    color: "#000",
                    borderBottomWidth: 1,
                    borderBottomColor: "#e5e7eb",
                    paddingBottom: 10,
                    marginBottom: 24,
                  }}
                  placeholder="Your name"
                  placeholderTextColor="#9ca3af"
                  value={value}
                  onChangeText={onChange}
                  returnKeyType="next"
                />
              )}
            />

            {/* ── Category ──────────────────────────────────── */}
            <Text style={LABEL_STYLE}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 24 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setValue("category", cat)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: active ? "#000" : "#f3f4f6",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: active ? "#fff" : "#374151",
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Difficulty ────────────────────────────────── */}
            <Text style={LABEL_STYLE}>Difficulty</Text>
            {isParsing ? (
              <ShimmerBar anim={shimmerAnim} height={40} style={{ marginBottom: 24 }} />
            ) : (
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                {DIFFICULTIES.map((d) => {
                  const active = difficulty === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() =>
                        setValue("difficulty", active ? "" : d)
                      }
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 10,
                        backgroundColor: active ? "#000" : "#f3f4f6",
                        alignItems: "center",
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: active ? "#fff" : "#374151",
                        }}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Cook Time + Servings ──────────────────────── */}
            <View
              style={{ flexDirection: "row", gap: 16, marginBottom: 24 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={LABEL_STYLE}>Cook Time</Text>
                {isParsing ? (
                  <ShimmerBar anim={shimmerAnim} height={36} />
                ) : (
                  <Controller
                    control={control}
                    name="cookTime"
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        style={{
                          fontSize: 15,
                          color: "#000",
                          borderBottomWidth: 1,
                          borderBottomColor: "#e5e7eb",
                          paddingBottom: 8,
                        }}
                        placeholder="e.g. 30 min"
                        placeholderTextColor="#9ca3af"
                        value={value}
                        onChangeText={onChange}
                        returnKeyType="next"
                      />
                    )}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={LABEL_STYLE}>Servings</Text>
                {isParsing ? (
                  <ShimmerBar anim={shimmerAnim} height={36} />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        setValue("servings", Math.max(1, servings - 1))
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#f3f4f6",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="remove" size={18} color="#374151" />
                    </TouchableOpacity>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#000",
                        minWidth: 24,
                        textAlign: "center",
                      }}
                    >
                      {servings}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setValue("servings", servings + 1)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#f3f4f6",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={18} color="#374151" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* ── Description ──────────────────────────────── */}
            <Text style={LABEL_STYLE}>Description</Text>
            {isParsing ? (
              <ShimmerBar anim={shimmerAnim} height={80} style={{ marginBottom: 24, borderRadius: 12 }} />
            ) : (
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={{
                      fontSize: 14,
                      color: "#000",
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 24,
                      minHeight: 80,
                      textAlignVertical: "top",
                    }}
                    placeholder="A short summary of your recipe…"
                    placeholderTextColor="#9ca3af"
                    value={value}
                    onChangeText={onChange}
                    multiline
                    numberOfLines={3}
                  />
                )}
              />
            )}

            {/* ── Primary Flavors ──────────────────────────── */}
            <Text style={LABEL_STYLE}>Primary Flavors</Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {FLAVOR_OPTIONS.map(({ label, value }) => {
                const active = primaryFlavors.includes(value);
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() =>
                      setValue(
                        "primaryFlavors",
                        active
                          ? primaryFlavors.filter((f) => f !== value)
                          : [...primaryFlavors, value]
                      )
                    }
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? "#000" : "#f3f4f6",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: active ? "#fff" : "#374151",
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Visibility toggle ─────────────────────────── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                marginBottom: 24,
                borderTopWidth: 0.5,
                borderBottomWidth: 0.5,
                borderColor: "#e5e7eb",
              }}
            >
              <View>
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#000" }}
                >
                  {isPublic ? "Public recipe" : "Private recipe"}
                </Text>
                <Text
                  style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}
                >
                  {isPublic
                    ? "Visible in Cook tab and Home feed"
                    : "Only visible in your Cook tab"}
                </Text>
              </View>
              <Controller
                control={control}
                name="isPublic"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: "#e5e7eb", true: "#000" }}
                    thumbColor="#fff"
                  />
                )}
              />
            </View>

            {/* ── Ingredients ──────────────────────────────── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={LABEL_STYLE}>Ingredients</Text>
              <TouchableOpacity
                onPress={() => appendIngredient({ value: "" })}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#000" }}
                >
                  + Add
                </Text>
              </TouchableOpacity>
            </View>

            {isParsing ? (
              <>
                <ShimmerBar anim={shimmerAnim} height={36} style={{ marginBottom: 12 }} />
                <ShimmerBar anim={shimmerAnim} height={36} style={{ marginBottom: 12 }} />
                <ShimmerBar anim={shimmerAnim} height={36} style={{ marginBottom: 12 }} />
              </>
            ) : (
              ingredientFields.map((field, index) => (
                <View
                  key={field.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#9ca3af",
                      flexShrink: 0,
                    }}
                  />
                  <Controller
                    control={control}
                    name={`ingredients.${index}.value`}
                    render={({ field: { onChange, value } }) => (
                      <SmartTextInput
                        value={value}
                        onChangeText={onChange}
                        placeholder={`Ingredient ${index + 1}`}
                        returnKeyType="next"
                      />
                    )}
                  />
                  {ingredientFields.length > 1 && (
                    <TouchableOpacity onPress={() => removeIngredient(index)}>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            {/* ── Instructions ──────────────────────────────── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 20,
                marginBottom: 10,
              }}
            >
              <Text style={LABEL_STYLE}>Instructions</Text>
              <TouchableOpacity
                onPress={() =>
                  appendStep({ value: "", duration: null })
                }
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#000" }}
                >
                  + Add
                </Text>
              </TouchableOpacity>
            </View>

            {isParsing ? (
              <>
                <ShimmerBar anim={shimmerAnim} height={60} style={{ marginBottom: 16, borderRadius: 10 }} />
                <ShimmerBar anim={shimmerAnim} height={60} style={{ marginBottom: 16, borderRadius: 10 }} />
              </>
            ) : (
              stepFields.map((field, index) => (
                <View
                  key={field.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "#000",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <Controller
                    control={control}
                    name={`steps.${index}.value`}
                    render={({ field: { onChange, value } }) => (
                      <SmartTextInput
                        value={value}
                        onChangeText={onChange}
                        onTimeDetected={(secs) =>
                          setValue(`steps.${index}.duration`, secs)
                        }
                        placeholder={`Step ${index + 1}`}
                        multiline
                      />
                    )}
                  />
                  {stepFields.length > 1 && (
                    <TouchableOpacity onPress={() => removeStep(index)}>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            {/* ── Save button ───────────────────────────────── */}
            <TouchableOpacity
              onPress={handleSubmit(onSave)}
              style={{
                backgroundColor: "#000",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 24,
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
              >
                {isEditing ? "Update Recipe" : "Save Recipe"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
