import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RECIPES, Recipe, RecipeStep } from "@/lib/mockData";
import { getUserRecipes, deleteUserRecipe } from "@/lib/recipeStore";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { detectDurationFromText } from "@/lib/detectDuration";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Ingredients Sheet ──────────────────────────────────────────────────────────

function IngredientsSheet({
  visible,
  onClose,
  ingredients,
}: {
  visible: boolean;
  onClose: () => void;
  ingredients: string[];
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: "#fff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: "65%",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 20,
            borderBottomWidth: 0.5,
            borderBottomColor: "#f3f4f6",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#000" }}>Ingredients</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="#000" />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {ingredients.map((ing, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
                paddingVertical: 11,
                borderBottomWidth: 0.5,
                borderBottomColor: "#f9fafb",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#9ca3af",
                  marginTop: 8,
                  flexShrink: 0,
                }}
              />
              <Text style={{ flex: 1, fontSize: 15, color: "#000", lineHeight: 22 }}>{ing}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Instruction Modal ──────────────────────────────────────────────────────────

const CARD_HEIGHT = 96; // minHeight 80 + marginBottom 8 + gap 8

function InstructionModal({
  visible,
  onClose,
  title,
  steps,
  ingredients,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  steps: RecipeStep[];
  ingredients: string[];
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [listHeight, setListHeight] = useState(300);
  const [pipExpanded, setPipExpanded] = useState(false);
  // LLM-detected durations keyed by step index (null = no time found)
  const [detectedDurations, setDetectedDurations] = useState<Map<number, number | null>>(new Map());
  const [detecting, setDetecting] = useState(false);
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const activeStepRef = useRef(0);
  const notifIdRef = useRef<string | null>(null);

  const currentStep = steps[activeStep];

  // Reset on open
  useEffect(() => {
    if (visible) {
      if (notifIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
        notifIdRef.current = null;
      }
      setActiveStep(0);
      setTimerRunning(false);
      setDetectedDurations(new Map());
      setDetecting(false);
      setTimerSeconds(steps[0]?.duration ?? null);
      // Kick off LLM detection for step 0 if it has no explicit duration
      if (!steps[0]?.duration) {
        setDetecting(true);
        detectDurationFromText(steps[0]?.text ?? "").then((secs) => {
          setDetectedDurations((prev) => new Map(prev).set(0, secs));
          setTimerSeconds(secs);
          setDetecting(false);
        });
      }
    }
  }, [visible]);

  // Countdown
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (s !== null && s > 1) return s - 1;
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          notifIdRef.current = null;
          return 0;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Collapse PiP whenever the active step changes
  useEffect(() => {
    setPipExpanded(false);
  }, [activeStep]);

  const handleStepSelect = useCallback(
    (index: number) => {
      activeStepRef.current = index;
      setActiveStep(index);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerRunning(false);
      if (notifIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
        notifIdRef.current = null;
      }

      const step = steps[index];

      if (step?.duration) {
        // Explicit duration in the data — use it immediately
        setTimerSeconds(step.duration);
      } else if (detectedDurations.has(index)) {
        // Already detected by LLM — use cached result
        setTimerSeconds(detectedDurations.get(index) ?? null);
      } else {
        // No duration known — ask Claude Haiku
        setTimerSeconds(null);
        setDetecting(true);
        detectDurationFromText(step?.text ?? "").then((secs) => {
          setDetectedDurations((prev) => new Map(prev).set(index, secs));
          setTimerSeconds(secs);
          setDetecting(false);
        });
      }
    },
    [steps, detectedDurations]
  );

  const effectiveDuration: number | null =
    currentStep?.duration ?? detectedDurations.get(activeStep) ?? null;

  const handleTimerTap = async () => {
    if (timerSeconds === 0) {
      // Reset
      setTimerSeconds(effectiveDuration);
      setTimerRunning(false);
      return;
    }
    if (timerRunning) {
      // Pause — cancel scheduled notification
      setTimerRunning(false);
      if (notifIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
        notifIdRef.current = null;
      }
    } else {
      // Start — schedule lock-screen notification
      setTimerRunning(true);
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted" && timerSeconds !== null && timerSeconds > 0) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏱ Timer done!",
            body: currentStep?.text?.slice(0, 80) ?? "Step complete",
            sound: true,
          },
          trigger: {
            seconds: timerSeconds,
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          },
        });
        notifIdRef.current = id;
      }
    }
  };

  const hasDuration = effectiveDuration !== null && effectiveDuration > 0;

  // Dynamic snap: measure each card's rendered height and compute exact offsets.
  // marginBottom (8) is not captured by onLayout, so we add it manually.
  const MARGIN = 8;
  const itemHeights = useRef<number[]>(new Array(steps.length).fill(CARD_HEIGHT));
  const snapOffsetsRef = useRef<number[]>(steps.map((_, i) => i * CARD_HEIGHT));

  const recomputeOffsets = useCallback(() => {
    const offsets: number[] = [];
    let total = 0;
    for (const h of itemHeights.current) {
      offsets.push(total);
      total += h + MARGIN;
    }
    snapOffsetsRef.current = offsets;
  }, []);

  const handleItemLayout = useCallback(
    (index: number, height: number) => {
      if (itemHeights.current[index] !== height) {
        itemHeights.current[index] = height;
        recomputeOffsets();
      }
    },
    [recomputeOffsets]
  );

  const scrollToStep = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, index));
      const offset = snapOffsetsRef.current[clamped] ?? 0;
      flatListRef.current?.scrollToOffset({ offset, animated: true });
      handleStepSelect(clamped);
    },
    [steps.length, handleStepSelect]
  );

  // Stable ref so the PanResponder closure (created once) calls the latest version
  const scrollToStepRef = useRef(scrollToStep);
  useEffect(() => { scrollToStepRef.current = scrollToStep; }, [scrollToStep]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderRelease: (_, gs) => {
        const { dy, vy } = gs;
        const absDy = Math.abs(dy);
        if (absDy < 8) return; // ignore accidental touches
        const direction = dy < 0 ? 1 : -1; // swipe up = next, swipe down = prev
        const isBig = Math.abs(vy) >= 0.5 || absDy >= 80;
        const delta = isBig ? 3 : 1;
        scrollToStepRef.current(activeStepRef.current + direction * delta);
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#111" }}
        edges={["bottom"]}
      >
        {/* Header with step counter */}
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingBottom: 10,
            paddingHorizontal: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{ flex: 1, color: "#fff", fontSize: 17, fontWeight: "700" }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={{ color: "#555", fontSize: 12, fontWeight: "500", marginTop: 4 }}>
            Step {activeStep + 1} of {steps.length}
          </Text>
        </View>

        {/* Circular timer — only shown when step has a duration */}
        {hasDuration && (
          <TouchableOpacity
            onPress={handleTimerTap}
            activeOpacity={0.85}
            style={{ alignItems: "center", marginVertical: 16 }}
          >
            <View
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor:
                  timerSeconds === 0
                    ? "#14532d"
                    : timerRunning
                    ? "#1a1a1a"
                    : "#2d2d2d",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 40,
                  fontWeight: "700",
                  fontVariant: ["tabular-nums"],
                  color: timerSeconds === 0 ? "#4ade80" : "#fff",
                }}
              >
                {timerSeconds === 0
                  ? "Done"
                  : formatTime(timerSeconds ?? effectiveDuration!)}
              </Text>
              <Ionicons
                name={
                  timerSeconds === 0
                    ? "checkmark-circle"
                    : timerRunning
                    ? "pause"
                    : "play"
                }
                size={28}
                color={timerSeconds === 0 ? "#4ade80" : "#aaa"}
              />
            </View>
            {!timerRunning && timerSeconds !== 0 && (
              <Text style={{ color: "#555", fontSize: 12, marginTop: 8 }}>
                Tap to start
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Gesture-driven step list — PanResponder classifies small/big swipe */}
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <FlatList
          ref={flatListRef}
          data={steps}
          keyExtractor={(_, i) => String(i)}
          scrollEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isActive = activeStep === index;
            return (
              <TouchableOpacity
                onLayout={(e) =>
                  handleItemLayout(index, e.nativeEvent.layout.height)
                }
                onPress={() => scrollToStepRef.current(index)}
                activeOpacity={0.9}
                style={{
                  minHeight: 80,
                  marginBottom: 8,
                  backgroundColor: isActive ? "#fff" : "#1a1a1a",
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                {/* Step number badge */}
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isActive ? "#111" : "#333",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? "#fff" : "#555",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: isActive ? "#111" : "#555",
                    fontSize: 14,
                    lineHeight: 21,
                  }}
                >
                  {item.text}
                </Text>
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: 50, height: 50, borderRadius: 8, flexShrink: 0 }}
                    contentFit="cover"
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
        </View>

        {/* PiP — floating media preview for the active step */}
        {!!(currentStep?.imageUrl || currentStep?.videoUrl) && (() => {
          const screenW = Dimensions.get("window").width;
          const expandedW = screenW - 32;
          const expandedH = Math.round(expandedW * 9 / 16);

          const mediaContent = (expanded: boolean) =>
            currentStep?.videoUrl ? (
              <Video
                source={{ uri: currentStep.videoUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted={!expanded}
              />
            ) : (
              <Image
                source={{ uri: currentStep!.imageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            );

          if (pipExpanded) {
            return (
              <>
                {/* Backdrop — tap outside to collapse back to small */}
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => setPipExpanded(false)}
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.72)",
                  }}
                />
                {/* Expanded media box */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 24 + insets.bottom,
                    left: 16,
                    right: 16,
                    height: expandedH,
                    borderRadius: 18,
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.6,
                    shadowRadius: 16,
                    elevation: 16,
                  }}
                >
                  {mediaContent(true)}
                  {/* Minimize hint */}
                  <View
                    style={{
                      position: "absolute",
                      bottom: 10,
                      left: 0,
                      right: 0,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "rgba(0,0,0,0.5)",
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                        Tap outside to minimize
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            );
          }

          // Small PiP — tap to expand
          return (
            <TouchableOpacity
              onPress={() => setPipExpanded(true)}
              activeOpacity={0.9}
              style={{
                position: "absolute",
                bottom: 20 + insets.bottom,
                right: 16,
                width: 180,
                height: 116,
                borderRadius: 14,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.55,
                shadowRadius: 12,
                elevation: 12,
              }}
            >
              {mediaContent(false)}
              {/* Expand hint */}
              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  left: 0,
                  right: 0,
                  alignItems: "center",
                }}
              >
                <Ionicons name="expand-outline" size={14} color="rgba(255,255,255,0.6)" />
              </View>
            </TouchableOpacity>
          );
        })()}

      </SafeAreaView>

    </Modal>
  );
}

// ── Recipe Detail Screen ───────────────────────────────────────────────────────

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | undefined>(
    RECIPES.find((r) => r.id === id)
  );

  // Fall back to AsyncStorage for user-created recipes
  useEffect(() => {
    if (!recipe) {
      getUserRecipes().then((list) =>
        setRecipe(list.find((r) => r.id === id))
      );
    }
  }, [id]);

  const handleDelete = () => {
    Alert.alert("Delete Recipe", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteUserRecipe(id!);
          router.back();
        },
      },
    ]);
  };

  const handleEdit = () => {
    if (!recipe) return;
    router.push({
      pathname: "/create-recipe",
      params: {
        recipeId: recipe.id,
        prefillTitle: recipe.title,
        prefillDescription: recipe.description,
        prefillIngredients: JSON.stringify(recipe.ingredients),
        prefillSteps: JSON.stringify(recipe.steps.map((s) => s.text)),
        prefillImage: recipe.imageUrl,
        prefillCategory: recipe.category,
        prefillDifficulty: recipe.difficulty ?? "",
        prefillCookTime: recipe.cookTime,
        prefillServings: String(recipe.servings),
        prefillFlavors: JSON.stringify(recipe.primaryFlavors ?? []),
        prefillAuthor: recipe.username,
      },
    });
  };

  if (!recipe) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <Text style={{ color: "#9ca3af" }}>Recipe not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Custom header — paddingTop accounts for status bar / notch */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: insets.top + 6,
            paddingHorizontal: 16,
            paddingBottom: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#f3f4f6",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#000" />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: "600",
              color: "#000",
              textAlign: "center",
              marginHorizontal: 12,
            }}
            numberOfLines={1}
          >
            {recipe.title}
          </Text>
          {recipe.isUserCreated ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={handleEdit}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "#f3f4f6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={18} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: "#fee2e2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setSaved((s) => !s)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "#f3f4f6",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={20}
                color="#000"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Scrollable body */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero image card */}
          <View
            style={{
              marginHorizontal: 16,
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: "#f0eeea",
              height: 320,
            }}
          >
            <Image
              source={{ uri: recipe.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>

          {/* Info block */}
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>
              {recipe.tagline}
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: "#000",
                lineHeight: 32,
                marginBottom: 12,
              }}
            >
              {recipe.title}
            </Text>

            {/* Meta row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 12,
              }}
            >
              {recipe.rating > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="star" size={14} color="#F5A623" />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>
                    {recipe.rating}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#9ca3af" }}>
                    ({recipe.ratingCount})
                  </Text>
                </View>
              )}
              {!!recipe.cookTime && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="time-outline" size={14} color="#9ca3af" />
                  <Text style={{ fontSize: 14, color: "#9ca3af" }}>{recipe.cookTime}</Text>
                </View>
              )}
              {recipe.servings > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="people-outline" size={14} color="#9ca3af" />
                  <Text style={{ fontSize: 14, color: "#9ca3af" }}>
                    {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
                  </Text>
                </View>
              )}
              {!!recipe.difficulty && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 999,
                    backgroundColor:
                      recipe.difficulty === "Easy" ? "#dcfce7" :
                      recipe.difficulty === "Medium" ? "#fef9c3" : "#fee2e2",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color:
                        recipe.difficulty === "Easy" ? "#16a34a" :
                        recipe.difficulty === "Medium" ? "#ca8a04" : "#dc2626",
                    }}
                  >
                    {recipe.difficulty}
                  </Text>
                </View>
              )}
            </View>

            {/* Primary Flavors */}
            {recipe.primaryFlavors && recipe.primaryFlavors.length > 0 && (
              <Text style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
                {recipe.primaryFlavors.join(" · ")}
              </Text>
            )}

            {/* Description */}
            {!!recipe.description && (
              <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, marginBottom: 28 }}>
                {recipe.description}
              </Text>
            )}

            {/* Ingredients — inline */}
            {recipe.ingredients.length > 0 && (
              <>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: "#000",
                    marginBottom: 14,
                  }}
                >
                  Ingredients
                </Text>
                {recipe.ingredients.map((ing, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 12,
                      paddingVertical: 10,
                      borderBottomWidth: 0.5,
                      borderBottomColor: "#f3f4f6",
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "#9ca3af",
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                    />
                    <Text style={{ flex: 1, fontSize: 15, color: "#111", lineHeight: 22 }}>
                      {ing}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </ScrollView>

        {/* Fixed bottom — single Start Cooking button */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 34 : 20,
            backgroundColor: "#fff",
            borderTopWidth: 0.5,
            borderTopColor: "#f3f4f6",
          }}
        >
          <TouchableOpacity
            onPress={() => setShowInstructions(true)}
            style={{
              backgroundColor: "#000",
              borderRadius: 16,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle-outline" size={20} color="#fff" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
              Start Cooking
            </Text>
          </TouchableOpacity>
        </View>

        <InstructionModal
          visible={showInstructions}
          onClose={() => setShowInstructions(false)}
          title={recipe.title}
          steps={recipe.steps}
          ingredients={recipe.ingredients}
        />
      </View>
    </>
  );
}
