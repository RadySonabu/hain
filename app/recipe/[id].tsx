import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RECIPES, Recipe, RecipeStep } from "@/lib/mockData";
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
  const [showIngSheet, setShowIngSheet] = useState(false);
  const [listHeight, setListHeight] = useState(300);
  // LLM-detected durations keyed by step index (null = no time found)
  const [detectedDurations, setDetectedDurations] = useState<Map<number, number | null>>(new Map());
  const [detecting, setDetecting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = steps[activeStep];

  // Reset on open
  useEffect(() => {
    if (visible) {
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

  const handleStepSelect = useCallback(
    (index: number) => {
      setActiveStep(index);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerRunning(false);

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

  const toggleTimer = () => {
    if (timerSeconds === 0) {
      setTimerSeconds(effectiveDuration);
      setTimerRunning(false);
    } else {
      setTimerRunning((r) => !r);
    }
  };

  const hasDuration = effectiveDuration !== null && effectiveDuration > 0;

  // Dynamic snap: measure each card's rendered height and compute exact offsets.
  // marginBottom (8) is not captured by onLayout, so we add it manually.
  const MARGIN = 8;
  const itemHeights = useRef<number[]>(new Array(steps.length).fill(CARD_HEIGHT));
  const snapOffsetsRef = useRef<number[]>(steps.map((_, i) => i * CARD_HEIGHT));
  const [snapOffsets, setSnapOffsets] = useState<number[]>(snapOffsetsRef.current);

  const recomputeOffsets = useCallback(() => {
    const offsets: number[] = [];
    let total = 0;
    for (const h of itemHeights.current) {
      offsets.push(total);
      total += h + MARGIN;
    }
    snapOffsetsRef.current = offsets;
    setSnapOffsets([...offsets]);
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

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = e.nativeEvent.contentOffset.y;
      const offsets = snapOffsetsRef.current;
      let best = 0;
      let bestDiff = Infinity;
      offsets.forEach((offset, i) => {
        const diff = Math.abs(offset - y);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = i;
        }
      });
      handleStepSelect(best);
    },
    [handleStepSelect]
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#111" }}
        edges={["top", "bottom"]}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 14,
          }}
        >
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

        {/* Step media */}
        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "#2a2a2a",
            aspectRatio: 16 / 9,
            marginBottom: 8,
          }}
        >
          {currentStep?.imageUrl ? (
            <Image
              source={{ uri: currentStep.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Ionicons name="image-outline" size={36} color="#555" />
              <Text style={{ color: "#555", fontSize: 13 }}>No image for this step</Text>
            </View>
          )}

          {/* Detecting spinner */}
          {detecting && !hasDuration && (
            <View
              style={{
                position: "absolute",
                bottom: 10,
                right: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(0,0,0,0.78)",
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 12,
              }}
            >
              <Ionicons name="time-outline" size={13} color="#aaa" />
              <Text style={{ color: "#aaa", fontSize: 13 }}>detecting…</Text>
            </View>
          )}

          {/* Timer pill overlay */}
          {hasDuration && (
            <TouchableOpacity
              onPress={toggleTimer}
              style={{
                position: "absolute",
                bottom: 10,
                right: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(0,0,0,0.78)",
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 12,
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={timerRunning ? "pause" : "play"}
                size={13}
                color="#fff"
              />
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 15,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {timerSeconds !== null
                  ? formatTime(timerSeconds)
                  : formatTime(effectiveDuration!)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step counter */}
        <Text
          style={{
            color: "#555",
            fontSize: 12,
            textAlign: "center",
            marginBottom: 10,
            fontWeight: "500",
          }}
        >
          Step {activeStep + 1} of {steps.length}
        </Text>

        {/* Swipeable step list — snapToOffsets handles variable card heights */}
        <FlatList
          data={steps}
          keyExtractor={(_, i) => String(i)}
          snapToOffsets={snapOffsets}
          decelerationRate="fast"
          disableIntervalMomentum
          onMomentumScrollEnd={onMomentumScrollEnd}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
          ListFooterComponent={
            <View
              style={{
                height: Math.max(
                  0,
                  listHeight - itemHeights.current[steps.length - 1]
                ),
              }}
            />
          }
          contentContainerStyle={{ paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isActive = activeStep === index;
            return (
              <TouchableOpacity
                onLayout={(e) =>
                  handleItemLayout(index, e.nativeEvent.layout.height)
                }
                onPress={() => handleStepSelect(index)}
                activeOpacity={0.9}
                style={{
                  minHeight: 80,
                  marginBottom: 8,
                  opacity: isActive ? 1 : 0.4,
                  backgroundColor: isActive ? "#2d2d2d" : "#1c1c1c",
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: isActive ? "#fff" : "transparent",
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
                    backgroundColor: isActive ? "#fff" : "#333",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? "#000" : "#666",
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
                    color: isActive ? "#fff" : "#999",
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

        {/* Bottom chips */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 28 : 16,
            gap: 10,
            borderTopWidth: 0.5,
            borderTopColor: "#2a2a2a",
          }}
        >
          {[
            { icon: "help-circle-outline" as const, label: "Help" },
            { icon: "restaurant-outline" as const, label: "Bite" },
          ].map((chip) => (
            <TouchableOpacity
              key={chip.label}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: "#1f1f1f",
                borderRadius: 999,
                paddingVertical: 13,
              }}
              activeOpacity={0.75}
            >
              <Ionicons name={chip.icon} size={15} color="#666" />
              <Text style={{ color: "#666", fontSize: 14, fontWeight: "600" }}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setShowIngSheet(true)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: "#1f1f1f",
              borderRadius: 999,
              paddingVertical: 13,
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="list-outline" size={15} color="#aaa" />
            <Text style={{ color: "#aaa", fontSize: 14, fontWeight: "600" }}>
              Ingredients
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <IngredientsSheet
        visible={showIngSheet}
        onClose={() => setShowIngSheet(false)}
        ingredients={ingredients}
      />
    </Modal>
  );
}

// ── Recipe Detail Screen ───────────────────────────────────────────────────────

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const recipe: Recipe | undefined = RECIPES.find((r) => r.id === id);

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
                gap: 16,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="star" size={14} color="#F5A623" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>
                  {recipe.rating}
                </Text>
                <Text style={{ fontSize: 14, color: "#9ca3af" }}>
                  ({recipe.ratingCount})
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text style={{ fontSize: 14, color: "#9ca3af" }}>{recipe.cookTime}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="people-outline" size={14} color="#9ca3af" />
                <Text style={{ fontSize: 14, color: "#9ca3af" }}>
                  {recipe.servings} servings
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24 }}>
              {recipe.description}
            </Text>
          </View>
        </ScrollView>

        {/* Fixed bottom bar */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: "row",
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 34 : 20,
            backgroundColor: "#fff",
            borderTopWidth: 0.5,
            borderTopColor: "#f3f4f6",
          }}
        >
          <TouchableOpacity
            onPress={() => setShowIngredients(true)}
            style={{
              flex: 1,
              backgroundColor: "#f3f4f6",
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>
              Ingredients
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowInstructions(true)}
            style={{
              flex: 1,
              backgroundColor: "#000",
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: "center",
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
              Instructions
            </Text>
          </TouchableOpacity>
        </View>

        <IngredientsSheet
          visible={showIngredients}
          onClose={() => setShowIngredients(false)}
          ingredients={recipe.ingredients}
        />
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
