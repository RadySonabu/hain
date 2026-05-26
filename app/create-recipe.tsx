import { createRef, RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  LayoutChangeEvent,
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
import * as Haptics from "expo-haptics";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { saveUserRecipe, updateUserRecipe } from "@/lib/recipeStore";
import SmartTextInput, { type SmartTextInputHandle } from "@/components/SmartTextInput";
import type { IngredientField, RecipeFormValues } from "@/src/types/recipe";
import { stripMeasurement, extractMeasurement } from "@/lib/measurementDetection";
import { buildIngredientNames } from "@/lib/ingredientHighlight";
import { INGREDIENT_MEASUREMENTS, FALLBACK_MEASUREMENTS } from "@/lib/commonIngredients";

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

const COOKING_TIPS = [
  "Be specific with measurements — \"2 cloves garlic, minced\" beats \"some garlic\" every time.",
  "Prep everything before you start cooking. It makes the whole process smoother.",
  "Taste as you go and adjust seasoning in small amounts.",
  "Let meat rest after cooking to redistribute the juices — 5 minutes makes a real difference.",
  "Room-temperature eggs and butter blend together much better in baked goods.",
  "A splash of the pasta cooking water helps sauce cling beautifully to noodles.",
  "Dry your proteins before searing — moisture is the enemy of a good crust.",
];

const CATEGORY_IMAGES: Record<string, string> = {
  Breakfast: "https://picsum.photos/seed/breakfast-food/600/400",
  Lunch:     "https://picsum.photos/seed/lunch-food/600/400",
  Dinner:    "https://picsum.photos/seed/dinner-food/600/400",
  Pasta:     "https://picsum.photos/seed/pasta-food/600/400",
  Vegan:     "https://picsum.photos/seed/vegan-food/600/400",
  Quick:     "https://picsum.photos/seed/quick-meal/600/400",
  Dessert:   "https://picsum.photos/seed/dessert-food/600/400",
  BBQ:       "https://picsum.photos/seed/bbq-food/600/400",
  Snack:     "https://picsum.photos/seed/snack-food/600/400",
};
const DEFAULT_IMAGE = "https://picsum.photos/seed/recipe-default/600/400";

/** Returns up to 5 ingredient names whose first word starts with the last typed word (≥3 chars). */
function getIngredientSuggestions(
  stepText: string,
  ingredients: IngredientField[]
): string[] {
  const tokens = stepText.trimEnd().split(/\s+/);
  const lastWord = tokens[tokens.length - 1] ?? "";
  if (lastWord.length < 3) return [];
  const lw = lastWord.toLowerCase();

  const seen = new Set<string>();
  const results: string[] = [];

  for (const ing of ingredients) {
    if (!ing.value.trim()) continue;
    const name = stripMeasurement(ing.value);
    const firstWord = name.toLowerCase().split(/\s+/)[0] ?? "";
    if (firstWord.startsWith(lw) && firstWord !== lw && !seen.has(name)) {
      seen.add(name);
      results.push(name);
    }
    if (results.length === 5) break;
  }
  return results;
}

/**
 * Returns the leading measurement raw string if the text begins with a
 * recognised measurement, otherwise null.
 * e.g. "1kg" → "1kg"  |  "1kg chi" → "1kg"  |  "chicken" → null
 */
function getLeadingMeasurement(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const m = extractMeasurement(trimmed);
  if (!m) return null;
  return trimmed.startsWith(m.raw) ? m.raw : null;
}

/**
 * Measurement-first flow: text starts with a measurement → suggest ingredient
 * names from OTHER already-entered rows, optionally filtered by partial text
 * typed after the measurement.
 */
function getMeasurementFirstSuggestions(
  text: string,
  currentIndex: number,
  ingredients: IngredientField[]
): string[] {
  const leading = getLeadingMeasurement(text);
  if (!leading) return [];
  const afterMeasurement = text.trim().slice(leading.length).trim().toLowerCase();

  const seen = new Set<string>();
  const results: string[] = [];
  for (let i = 0; i < ingredients.length; i++) {
    if (i === currentIndex) continue;
    const name = stripMeasurement(ingredients[i].value).trim().toLowerCase();
    if (!name) continue;
    if (!seen.has(name) && (afterMeasurement === "" || name.startsWith(afterMeasurement))) {
      seen.add(name);
      results.push(name);
      if (results.length === 5) break;
    }
  }
  return results;
}

/**
 * Ingredient-first flow: text has no leading measurement → suggest measurements.
 * Looks up INGREDIENT_MEASUREMENTS by first-word prefix, falls back to
 * FALLBACK_MEASUREMENTS.
 */
function getIngredientFirstSuggestions(text: string): string[] {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return [];
  // If there's any measurement in the text already, skip
  if (extractMeasurement(trimmed)) return [];
  const firstWord = trimmed.split(/\s+/)[0];
  const matchKey = Object.keys(INGREDIENT_MEASUREMENTS).find(
    (k) => k.split(" ")[0].startsWith(firstWord) || firstWord.startsWith(k.split(" ")[0])
  );
  const specific = matchKey ? INGREDIENT_MEASUREMENTS[matchKey] : [];
  return [...new Set([...specific, ...FALLBACK_MEASUREMENTS])].slice(0, 5);
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

  // ── Keyboard & layout ────────────────────────────────────────────────────
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToRef = (viewRef: RefObject<View | null>) => {
    if (!viewRef.current || !scrollViewRef.current) return;
    viewRef.current.measureLayout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scrollViewRef.current as any,
      (_x: number, y: number) => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
      },
      () => {}
    );
  };

  // Per-row View refs (used for scroll-into-view)
  const ingredientRowRefs = useRef<RefObject<View | null>[]>([]);
  const stepRowRefs = useRef<RefObject<View | null>[]>([]);

  // Per-row input refs (used for programmatic focus)
  const ingredientInputRefs = useRef<RefObject<SmartTextInputHandle | null>[]>([]);
  const stepInputRefs = useRef<RefObject<SmartTextInputHandle | null>[]>([]);

  // Pending focus index — set before appending; consumed after render
  const pendingIngredientFocusRef = useRef<number | null>(null);
  const pendingStepFocusRef = useRef<number | null>(null);

  // ── react-hook-form ──────────────────────────────────────────────────────
  const { control, setValue, handleSubmit, watch } = useForm<RecipeFormValues>({
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
        ? (
            JSON.parse(prefillSteps) as Array<
              string | { text: string; imageUrl?: string | null; videoUrl?: string | null }
            >
          ).map((v) => {
            if (typeof v === "string") {
              return { value: v, duration: null, media: null };
            }
            return {
              value: v.text,
              duration: null,
              media: v.videoUrl
                ? { uri: v.videoUrl, type: "video" as const }
                : v.imageUrl
                ? { uri: v.imageUrl, type: "image" as const }
                : null,
            };
          })
        : [{ value: "", duration: null, media: null }],
    },
  });

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({ control, name: "ingredients" });

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
  } = useFieldArray({ control, name: "steps" });

  // ── Watched values ───────────────────────────────────────────────────────
  const category = watch("category");
  const difficulty = watch("difficulty");
  const cookTime = watch("cookTime");
  const servings = watch("servings");
  const primaryFlavors = watch("primaryFlavors");
  const isPublic = watch("isPublic");
  const watchedSteps = watch("steps");
  const watchedIngredients = watch("ingredients");
  const [focusedStepIndex, setFocusedStepIndex] = useState<number | null>(null);
  const [focusedIngredientIndex, setFocusedIngredientIndex] = useState<number | null>(null);

  // Pre-built ingredient names for step input highlighting
  const stepIngredientNames = useMemo(
    () => buildIngredientNames((watchedIngredients ?? []).map((f) => f.value)),
    [watchedIngredients]
  );

  // ── Photo (not a form field) ─────────────────────────────────────────────
  const [photo, setPhoto] = useState<string | null>(prefillImage ?? null);

  // ── Stable random tip for this session ──────────────────────────────────
  const [tipIndex] = useState(() => Math.floor(Math.random() * COOKING_TIPS.length));

  // Focus newly-appended ingredient/step inputs after render
  useEffect(() => {
    if (pendingIngredientFocusRef.current !== null) {
      const idx = pendingIngredientFocusRef.current;
      pendingIngredientFocusRef.current = null;
      setTimeout(() => ingredientInputRefs.current[idx]?.current?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientFields.length]);

  useEffect(() => {
    if (pendingStepFocusRef.current !== null) {
      const idx = pendingStepFocusRef.current;
      pendingStepFocusRef.current = null;
      setTimeout(() => stepInputRefs.current[idx]?.current?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepFields.length]);

  // ── "More details" accordion ─────────────────────────────────────────────
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const isDetailsExpandedRef = useRef(false); // stale-closure-safe version
  const detailsHeight = useSharedValue(0);
  const detailsMeasuredHeight = useRef(0);
  const chevronRotation = useSharedValue(0);

  const accordionStyle = useAnimatedStyle(() => ({
    height: detailsHeight.value,
    overflow: "hidden" as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const onDetailsLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      detailsMeasuredHeight.current = h;
      // If already expanded, keep height in sync (handles font-scale changes)
      if (isDetailsExpandedRef.current) detailsHeight.value = h;
    }
  };

  const toggleDetails = () => {
    const next = !isDetailsExpanded;
    setIsDetailsExpanded(next);
    isDetailsExpandedRef.current = next;
    detailsHeight.value = withTiming(next ? detailsMeasuredHeight.current : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    chevronRotation.value = withTiming(next ? 180 : 0, { duration: 250 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Compact summary shown when accordion is collapsed and fields have values
  const accordionSummary = useMemo(() => {
    const parts: string[] = [];
    if (category && category !== "Dinner") parts.push(category);
    if (cookTime) parts.push(cookTime);
    if (servings && servings !== 2) parts.push(`${servings} servings`);
    if (difficulty) parts.push(difficulty);
    if (photo) parts.push("Photo added");
    return parts.join(" · ") || null;
  }, [category, cookTime, servings, difficulty, photo]);

  // ── Toast ────────────────────────────────────────────────────────────────
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

  // ── Step media picker ────────────────────────────────────────────────────
  const pickStepMedia = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setValue(`steps.${index}.media`, {
        uri: asset.uri,
        type: (asset.type ?? "image") as "image" | "video",
      });
    }
  };

  // Default image shown in the accordion placeholder
  const defaultImageUri = CATEGORY_IMAGES[category] ?? DEFAULT_IMAGE;

  // ── Save handler ─────────────────────────────────────────────────────────
  const onSave = async (data: RecipeFormValues) => {
    if (!data.title.trim()) {
      Alert.alert("Missing title", "Please add a title for your recipe.");
      return;
    }

    const savedId = recipeId ?? Date.now().toString();

    const recipe = {
      id: savedId,
      title: data.title.trim(),
      description: data.description.trim(),
      tagline: "",
      category: data.category,
      cookTime: data.cookTime,
      servings: data.servings,
      rating: 0,
      ratingCount: 0,
      imageUrl: photo ?? CATEGORY_IMAGES[data.category] ?? DEFAULT_IMAGE,
      username: data.authorName.trim() || "You",
      avatar: "",
      likes: 0,
      commentCount: 0,
      timeAgo: "Just now",
      ingredients: data.ingredients.map((i) => i.value).filter(Boolean),
      steps: data.steps
        .filter((s) => s.value.trim())
        .map((s) => ({
          text: s.value,
          duration: s.duration ?? undefined,
          imageUrl: s.media?.type === "image" ? s.media.uri : undefined,
          videoUrl: s.media?.type === "video" ? s.media.uri : undefined,
        })),
      isUserCreated: true as const,
      isPublic: data.isPublic,
      difficulty:
        data.difficulty !== ""
          ? (data.difficulty as "Easy" | "Medium" | "Hard")
          : undefined,
      primaryFlavors: data.primaryFlavors.length
        ? data.primaryFlavors
        : undefined,
    };

    if (isEditing) {
      await updateUserRecipe(recipeId, recipe);
    } else {
      await saveUserRecipe(recipe);
    }

    // Clear the entire creation stack (create-recipe + add-recipe) then open
    // the recipe detail — back from detail now goes straight to the Cook tab
    router.dismissAll();
    router.push(`/recipe/${savedId}`);
  };

  // ── Grow ref arrays to match field array lengths ─────────────────────────
  while (ingredientRowRefs.current.length < ingredientFields.length) {
    ingredientRowRefs.current.push(createRef<View | null>());
  }
  while (ingredientInputRefs.current.length < ingredientFields.length) {
    ingredientInputRefs.current.push(createRef<SmartTextInputHandle | null>());
  }
  while (stepRowRefs.current.length < stepFields.length) {
    stepRowRefs.current.push(createRef<View | null>());
  }
  while (stepInputRefs.current.length < stepFields.length) {
    stepInputRefs.current.push(createRef<SmartTextInputHandle | null>());
  }

  const toastColors = {
    success: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
    error:   { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
    info:    { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: isEditing ? "Edit Recipe" : "Create Recipe",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSubmit(onSave)}
              activeOpacity={0.8}
              style={{
                backgroundColor: "#000",
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                {isEditing ? "Update" : "Save"}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: "#fff" }}>
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
          </View>
        )}

        {/* ── Scrollable form ────────────────────────────────── */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          <View style={{ paddingHorizontal: 16 }}>

            {/* ── Title ─────────────────────────────────────── */}
            <Text style={[LABEL_STYLE, { marginTop: 16 }]}>Title *</Text>
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
                    marginBottom: 20,
                  }}
                  placeholder="e.g. Creamy Tomato Pasta"
                  placeholderTextColor="#9ca3af"
                  value={value}
                  onChangeText={onChange}
                  autoFocus
                  returnKeyType="next"
                />
              )}
            />

            {/* ── More details accordion toggle ─────────────── */}
            <TouchableOpacity
              onPress={toggleDetails}
              activeOpacity={0.75}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 13,
                paddingHorizontal: 14,
                backgroundColor: "#f9fafb",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                marginBottom: 4,
              }}
            >
              <Ionicons name="options-outline" size={16} color="#6b7280" />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
                {isDetailsExpanded ? "Less details" : "More details"}
              </Text>
              {!isDetailsExpanded && accordionSummary && (
                <Text
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "#9ca3af",
                    marginLeft: 2,
                  }}
                  numberOfLines={1}
                >
                  {accordionSummary}
                </Text>
              )}
              <Reanimated.View style={chevronStyle}>
                <Ionicons name="chevron-down" size={16} color="#9ca3af" />
              </Reanimated.View>
            </TouchableOpacity>

            {/* ── Accordion content ─────────────────────────── */}
            <Reanimated.View style={accordionStyle}>
              <View onLayout={onDetailsLayout} style={{ paddingTop: 16 }}>

                {/* ── Cover Photo ───────────────────────────── */}
                <Text style={LABEL_STYLE}>Cover Photo</Text>
                <TouchableOpacity
                  onPress={pickImage}
                  activeOpacity={0.85}
                  style={{ marginBottom: 24 }}
                >
                  {photo ? (
                    /* User-selected photo */
                    <View style={{ borderRadius: 12, overflow: "hidden" }}>
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
                    /* Default category image preview with overlay */
                    <View
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        aspectRatio: 16 / 9,
                      }}
                    >
                      <Image
                        source={{ uri: defaultImageUri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: "rgba(0,0,0,0.38)",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <Ionicons name="camera-outline" size={28} color="#fff" />
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          Add Photo
                        </Text>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.75)",
                            fontSize: 11,
                          }}
                        >
                          Default image will be used
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>

                {/* ── Author ────────────────────────────────── */}
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

                {/* ── Category ──────────────────────────────── */}
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

                {/* ── Difficulty ────────────────────────────── */}
                <Text style={LABEL_STYLE}>Difficulty</Text>
                <View
                  style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}
                >
                  {DIFFICULTIES.map((d) => {
                    const active = difficulty === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setValue("difficulty", active ? "" : d)}
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

                {/* ── Cook Time + Servings ──────────────────── */}
                <View
                  style={{ flexDirection: "row", gap: 16, marginBottom: 24 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={LABEL_STYLE}>Cook Time</Text>
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
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={LABEL_STYLE}>Servings</Text>
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
                  </View>
                </View>

                {/* ── Description ──────────────────────────── */}
                <Text style={LABEL_STYLE}>Description</Text>
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

                {/* ── Primary Flavors ───────────────────────── */}
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

                {/* ── Visibility toggle ─────────────────────── */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                    marginBottom: 16,
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

              </View>
            </Reanimated.View>

            {/* ── Spacer between accordion and core lists ─────── */}
            <View style={{ height: 16 }} />

            {/* ── Ingredients ──────────────────────────────────── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={LABEL_STYLE}>Ingredients</Text>
              <TouchableOpacity onPress={() => appendIngredient({ value: "" })}>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#000" }}
                >
                  + Add
                </Text>
              </TouchableOpacity>
            </View>

            {ingredientFields.map((field, index) => (
              <View
                key={field.id}
                ref={ingredientRowRefs.current[index]}
                style={{ marginBottom: 12 }}
              >
                {/* Input row */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
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
                        ref={ingredientInputRefs.current[index]}
                        value={value}
                        onChangeText={onChange}
                        enableMeasurements
                        placeholder={`Ingredient ${index + 1}`}
                        returnKeyType="next"
                        onFocus={() => {
                          setFocusedIngredientIndex(index);
                          setFocusedStepIndex(null);
                          scrollToRef(ingredientRowRefs.current[index]);
                        }}
                        onBlur={() => setTimeout(() => setFocusedIngredientIndex(null), 200)}
                        onSubmitEditing={() => {
                          if (index === ingredientFields.length - 1) {
                            // Last row — append a new one and focus it
                            pendingIngredientFocusRef.current = index + 1;
                            appendIngredient({ value: "" });
                          } else {
                            // Jump to the next existing row
                            ingredientInputRefs.current[index + 1]?.current?.focus();
                          }
                        }}
                      />
                    )}
                  />
                  {ingredientFields.length > 1 && (
                    <TouchableOpacity onPress={() => removeIngredient(index)}>
                      <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Bi-directional suggestion chips */}
                {focusedIngredientIndex === index && (() => {
                  const text = watchedIngredients?.[index]?.value ?? "";
                  const isMeasurementFirst = !!getLeadingMeasurement(text);
                  const suggestions = isMeasurementFirst
                    ? getMeasurementFirstSuggestions(text, index, watchedIngredients ?? [])
                    : getIngredientFirstSuggestions(text);
                  if (suggestions.length === 0) return null;
                  return (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="always"
                      contentContainerStyle={{
                        paddingTop: 8,
                        paddingLeft: 18,
                        paddingRight: 4,
                        gap: 6,
                      }}
                    >
                      {suggestions.map((suggestion) => (
                        <TouchableOpacity
                          key={suggestion}
                          onPress={() => {
                            const current = watchedIngredients?.[index]?.value ?? "";
                            if (isMeasurementFirst) {
                              const leading = getLeadingMeasurement(current)!;
                              setValue(
                                `ingredients.${index}.value`,
                                leading + " " + suggestion
                              );
                            } else {
                              setValue(
                                `ingredients.${index}.value`,
                                suggestion + " " + current.trim()
                              );
                            }
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: "#DBEAFE",
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                          }}
                        >
                          <Ionicons
                            name={isMeasurementFirst ? "leaf-outline" : "scale-outline"}
                            size={13}
                            color="#1d4ed8"
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#1d4ed8",
                              fontWeight: "600",
                            }}
                          >
                            {suggestion}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  );
                })()}
              </View>
            ))}

            {/* ── Instructions ─────────────────────────────────── */}
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
                onPress={() => appendStep({ value: "", duration: null, media: null })}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#000" }}
                >
                  + Add
                </Text>
              </TouchableOpacity>
            </View>

            {stepFields.map((field, index) => {
              const stepMedia = watchedSteps[index]?.media ?? null;
              return (
                <View
                  key={field.id}
                  ref={stepRowRefs.current[index]}
                  style={{ marginBottom: 16 }}
                >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  {/* Step number */}
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
                      style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}
                    >
                      {index + 1}
                    </Text>
                  </View>

                  {/* Step text — flex: 1 keeps it filling remaining width */}
                  <Controller
                    control={control}
                    name={`steps.${index}.value`}
                    render={({ field: { onChange, value } }) => (
                      <SmartTextInput
                        ref={stepInputRefs.current[index]}
                        value={value}
                        onChangeText={onChange}
                        onTimeDetected={(secs) =>
                          setValue(`steps.${index}.duration`, secs)
                        }
                        enableMeasurements
                        ingredientNames={stepIngredientNames}
                        placeholder={`Step ${index + 1}`}
                        multiline
                        returnKeyType="next"
                        blurOnSubmit={true}
                        onFocus={() => {
                          setFocusedStepIndex(index);
                          setFocusedIngredientIndex(null);
                          scrollToRef(stepRowRefs.current[index]);
                        }}
                        onBlur={() => setTimeout(() => setFocusedStepIndex(null), 200)}
                        onSubmitEditing={() => {
                          if (index === stepFields.length - 1) {
                            pendingStepFocusRef.current = index + 1;
                            appendStep({ value: "", duration: null, media: null });
                          } else {
                            stepInputRefs.current[index + 1]?.current?.focus();
                          }
                        }}
                      />
                    )}
                  />

                  {/* Media icon / thumbnail */}
                  {stepMedia ? (
                    /* Thumbnail with × to remove, tap body to replace */
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        overflow: "hidden",
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => pickStepMedia(index)}
                        activeOpacity={0.85}
                        style={{ width: "100%", height: "100%" }}
                      >
                        {stepMedia.type === "image" ? (
                          <Image
                            source={{ uri: stepMedia.uri }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                          />
                        ) : (
                          <View
                            style={{
                              flex: 1,
                              backgroundColor: "#111827",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons
                              name="play-circle-outline"
                              size={18}
                              color="#fff"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                      {/* × remove */}
                      <TouchableOpacity
                        onPress={() =>
                          setValue(`steps.${index}.media`, null)
                        }
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          backgroundColor: "rgba(0,0,0,0.62)",
                          borderBottomLeftRadius: 6,
                          width: 18,
                          height: 18,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="close" size={11} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Empty icon button */
                    <TouchableOpacity
                      onPress={() => pickStepMedia(index)}
                      activeOpacity={0.75}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        backgroundColor: "#f3f4f6",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Ionicons
                        name="images-outline"
                        size={18}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  )}

                  {/* Trash */}
                  {stepFields.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeStep(index)}
                      style={{ marginTop: 2 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  )}
                </View>{/* end inner row */}

                {/* Live hints row: measurement badge + ingredient autocomplete chips */}
                {focusedStepIndex === index && (() => {
                  const text = watchedSteps[index]?.value ?? "";
                  const suggestions = getIngredientSuggestions(text, watchedIngredients ?? []);
                  const detectedMeasurement = extractMeasurement(text);
                  if (suggestions.length === 0 && !detectedMeasurement) return null;
                  return (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="always"
                      contentContainerStyle={{
                        paddingTop: 8,
                        paddingLeft: 34,
                        paddingRight: 4,
                        gap: 6,
                      }}
                    >
                      {/* Live measurement badge — only shown when raw ≠ normalised (something to fix) */}
                      {detectedMeasurement && detectedMeasurement.raw !== detectedMeasurement.normalised && (
                        <TouchableOpacity
                          onPress={() => {
                            const current = watchedSteps[index]?.value ?? "";
                            const normalized = current.replace(
                              detectedMeasurement.raw,
                              detectedMeasurement.normalised
                            );
                            if (normalized !== current) {
                              setValue(`steps.${index}.value`, normalized);
                            }
                          }}
                          activeOpacity={0.75}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 3,
                            backgroundColor: "#D1FAE5",
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                          }}
                        >
                          <Ionicons name="scale-outline" size={13} color="#059669" />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669" }}>
                            {detectedMeasurement.normalised}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {/* Ingredient autocomplete chips */}
                      {suggestions.map((name) => (
                        <TouchableOpacity
                          key={name}
                          onPress={() => {
                            const current = watchedSteps[index]?.value ?? "";
                            const tokens = current.trimEnd().split(/\s+/);
                            tokens[tokens.length - 1] = name;
                            setValue(`steps.${index}.value`, tokens.join(" ") + " ");
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: "#DBEAFE",
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                          }}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={13}
                            color="#1d4ed8"
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#1d4ed8",
                              fontWeight: "600",
                            }}
                          >
                            {name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  );
                })()}
                </View>
              );
            })}

            {/* ── Pro tip card ──────────────────────────────── */}
            <View
              style={{
                marginTop: 24,
                backgroundColor: "#f9fafb",
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: "#f3f4f6",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                💡 Pro tip
              </Text>
              <Text style={{ fontSize: 13, color: "#6b7280", lineHeight: 19 }}>
                {COOKING_TIPS[tipIndex]}
              </Text>
            </View>

          </View>
        </ScrollView>

      </View>
    </>
  );
}
