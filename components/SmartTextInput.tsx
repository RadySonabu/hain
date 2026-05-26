import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  ReturnKeyType,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  extractTimeSeconds,
  formatDetectedTime,
  segmentText,
  Segment,
} from "@/lib/timeDetection";
import {
  extractMeasurement,
  segmentMeasurements,
} from "@/lib/measurementDetection";
import { segmentIngredients } from "@/lib/ingredientHighlight";

export type SmartTextInputHandle = {
  focus: () => void;
};

// Extended segment carrying all highlight types
type RichSegment = Segment & { isMeasurement?: boolean; isIngredient?: boolean };

/**
 * Merges time, measurement, and ingredient segments into one ordered list.
 * Priority: time (T) > measurement (M) > ingredient (I) on overlaps.
 */
function mergeSegments(
  text: string,
  enableMeasurements: boolean,
  ingredientNames: string[]
): RichSegment[] {
  const hasIngredients = ingredientNames.length > 0;
  if (!enableMeasurements && !hasIngredients) {
    return segmentText(text);
  }

  // Per-character tag: 'T' = time, 'M' = measurement, 'I' = ingredient, '' = plain
  const tags = new Array<"T" | "M" | "I" | "">(text.length).fill("");

  // Time — highest priority
  const timeSegs = segmentText(text);
  let pos = 0;
  for (const seg of timeSegs) {
    if (seg.isHighlight) {
      for (let i = pos; i < pos + seg.text.length; i++) tags[i] = "T";
    }
    pos += seg.text.length;
  }

  // Measurement
  if (enableMeasurements) {
    const measSegs = segmentMeasurements(text);
    pos = 0;
    for (const seg of measSegs) {
      if (seg.isHighlight) {
        for (let i = pos; i < pos + seg.text.length; i++) {
          if (tags[i] === "") tags[i] = "M";
        }
      }
      pos += seg.text.length;
    }
  }

  // Ingredient — lowest priority
  if (hasIngredients) {
    const ingSegs = segmentIngredients(text, ingredientNames);
    pos = 0;
    for (const seg of ingSegs) {
      if (seg.isHighlight) {
        for (let i = pos; i < pos + seg.text.length; i++) {
          if (tags[i] === "") tags[i] = "I";
        }
      }
      pos += seg.text.length;
    }
  }

  // Collapse into runs
  const result: RichSegment[] = [];
  let i = 0;
  while (i < text.length) {
    const tag = tags[i];
    let j = i + 1;
    while (j < text.length && tags[j] === tag) j++;
    result.push({
      text: text.slice(i, j),
      isHighlight: tag === "T",
      isMeasurement: tag === "M",
      isIngredient: tag === "I",
    });
    i = j;
  }
  return result.length > 0 ? result : [{ text, isHighlight: false }];
}

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onTimeDetected?: (seconds: number | null) => void;
  enableMeasurements?: boolean;
  ingredientNames?: string[];
  placeholder?: string;
  multiline?: boolean;
  style?: StyleProp<TextStyle>;
  returnKeyType?: ReturnKeyType;
  blurOnSubmit?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
};

const SmartTextInput = forwardRef<SmartTextInputHandle, Props>(
  function SmartTextInput(
    {
      value,
      onChangeText,
      onTimeDetected,
      enableMeasurements = false,
      ingredientNames = [],
      placeholder,
      multiline,
      style,
      returnKeyType,
      blurOnSubmit,
      onFocus: onFocusProp,
      onBlur: onBlurProp,
      onSubmitEditing,
    },
    ref
  ) {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [segments, setSegments] = useState<RichSegment[]>([]);
    const [detectedSeconds, setDetectedSeconds] = useState<number | null>(null);

    // If the input has a value but segments haven't been computed yet (e.g.
    // a prefilled value on first render), derive them directly from the prop.
    const viewSegments =
      segments.length > 0 ? segments : mergeSegments(value, enableMeasurements, ingredientNames);

    const hasTimeHighlight = viewSegments.some((s) => s.isHighlight);
    const hasMeasurementHighlight = viewSegments.some((s) => s.isMeasurement);
    const hasAnyHighlight = hasTimeHighlight || hasMeasurementHighlight;

    // Expose focus() so parent can programmatically focus this input
    useImperativeHandle(ref, () => ({
      focus: () => {
        setIsFocused(true);
        onFocusProp?.();
        setTimeout(() => inputRef.current?.focus(), 50);
      },
    }));

    const handleBlur = () => {
      setIsFocused(false);
      if (!value.trim()) return;

      const segs = mergeSegments(value, enableMeasurements, ingredientNames);
      setSegments(segs);

      const secs = extractTimeSeconds(value);
      setDetectedSeconds(secs);
      onTimeDetected?.(secs);

      onBlurProp?.();
    };

    const handleFocus = () => {
      setIsFocused(true);
      onFocusProp?.();
    };

    const handlePressView = () => {
      setIsFocused(true);
      onFocusProp?.();
      // Small timeout lets state update before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    // While editing — show normal TextInput with live border colour
    if (isFocused || !value.trim()) {
      const liveHasTime = !!extractTimeSeconds(value);
      const liveHasMeasurement = enableMeasurements ? !!extractMeasurement(value) : false;
      const liveBorderColor = liveHasTime
        ? "#FDE68A"
        : liveHasMeasurement
        ? "#A7F3D0"
        : "#e5e7eb";

      return (
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline={multiline}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit ?? !multiline}
          autoFocus={isFocused && !!value.trim()}
          style={[
            {
              flex: 1,
              fontSize: 14,
              color: "#000",
              borderBottomWidth: 1,
              borderBottomColor: liveBorderColor,
              paddingBottom: 8,
              textAlignVertical: multiline ? "top" : "center",
            },
            style,
          ]}
        />
      );
    }

    // View mode — render rich text with highlights
    return (
      <TouchableOpacity
        onPress={handlePressView}
        activeOpacity={0.75}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            flexWrap: "wrap",
            borderBottomWidth: 1,
            borderBottomColor: hasTimeHighlight
              ? "#FDE68A"
              : hasMeasurementHighlight
              ? "#A7F3D0"
              : "#e5e7eb",
            paddingBottom: 8,
            gap: 4,
          }}
        >
          {/* Highlighted text spans */}
          <Text style={{ fontSize: 14, color: "#000", lineHeight: 20, flexShrink: 1 }}>
            {viewSegments.map((seg, i) => {
              if (seg.isHighlight) {
                return (
                  <Text
                    key={i}
                    style={{ color: "#D97706", fontWeight: "700" }}
                  >
                    {seg.text}
                  </Text>
                );
              }
              if (seg.isMeasurement) {
                return (
                  <Text
                    key={i}
                    style={{ color: "#059669", fontWeight: "700" }}
                  >
                    {seg.text}
                  </Text>
                );
              }
              if (seg.isIngredient) {
                return (
                  <Text
                    key={i}
                    style={{ color: "#1d4ed8", fontWeight: "700" }}
                  >
                    {seg.text}
                  </Text>
                );
              }
              return <Text key={i}>{seg.text}</Text>;
            })}
          </Text>

          {/* Timer badge */}
          {detectedSeconds !== null && detectedSeconds > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                backgroundColor: "#FEF3C7",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
                alignSelf: "flex-start",
              }}
            >
              <Ionicons name="timer-outline" size={12} color="#D97706" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#D97706" }}>
                {formatDetectedTime(detectedSeconds)}
              </Text>
            </View>
          )}

        </View>
      </TouchableOpacity>
    );
  }
);

export default SmartTextInput;
