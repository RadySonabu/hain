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

export type SmartTextInputHandle = {
  focus: () => void;
};

// Extended segment that also carries a measurement tag
type RichSegment = Segment & { isMeasurement?: boolean };

/**
 * Merges time segments and measurement segments into a single ordered list.
 * Time highlights take priority over measurement highlights when they overlap.
 */
function mergeSegments(text: string, enableMeasurements: boolean): RichSegment[] {
  if (!enableMeasurements) {
    return segmentText(text);
  }

  // Build a per-character tag array: 'T' = time, 'M' = measurement, '' = plain
  const tags = new Array<"T" | "M" | "">(text.length).fill("");

  const timeSegs = segmentText(text);
  let pos = 0;
  for (const seg of timeSegs) {
    if (seg.isHighlight) {
      for (let i = pos; i < pos + seg.text.length; i++) tags[i] = "T";
    }
    pos += seg.text.length;
  }

  const measSegs = segmentMeasurements(text);
  pos = 0;
  for (const seg of measSegs) {
    if (seg.isHighlight) {
      for (let i = pos; i < pos + seg.text.length; i++) {
        if (tags[i] === "") tags[i] = "M"; // time wins on overlap
      }
    }
    pos += seg.text.length;
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
  placeholder?: string;
  multiline?: boolean;
  style?: StyleProp<TextStyle>;
  returnKeyType?: ReturnKeyType;
  blurOnSubmit?: boolean;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
};

const SmartTextInput = forwardRef<SmartTextInputHandle, Props>(
  function SmartTextInput(
    {
      value,
      onChangeText,
      onTimeDetected,
      enableMeasurements = false,
      placeholder,
      multiline,
      style,
      returnKeyType,
      blurOnSubmit,
      onFocus: onFocusProp,
      onSubmitEditing,
    },
    ref
  ) {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [segments, setSegments] = useState<RichSegment[]>([]);
    const [detectedSeconds, setDetectedSeconds] = useState<number | null>(null);
    const [detectedMeasurement, setDetectedMeasurement] = useState<string | null>(null);

    // If the input has a value but segments haven't been computed yet (e.g.
    // a prefilled value on first render), derive them directly from the prop.
    const viewSegments =
      segments.length > 0 ? segments : mergeSegments(value, enableMeasurements);

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

      const segs = mergeSegments(value, enableMeasurements);
      setSegments(segs);

      const secs = extractTimeSeconds(value);
      setDetectedSeconds(secs);
      onTimeDetected?.(secs);

      if (enableMeasurements) {
        const m = extractMeasurement(value);
        setDetectedMeasurement(m ? m.normalised : null);
      }
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

    // While editing — show normal TextInput
    if (isFocused || !value.trim()) {
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
              borderBottomColor: "#e5e7eb",
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
                    style={{
                      backgroundColor: "#FEF3C7",
                      color: "#D97706",
                      fontWeight: "600",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    {seg.text}
                  </Text>
                );
              }
              if (seg.isMeasurement) {
                return (
                  <Text
                    key={i}
                    style={{
                      backgroundColor: "#D1FAE5",
                      color: "#059669",
                      fontWeight: "600",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
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

          {/* Measurement badge */}
          {detectedMeasurement !== null && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                backgroundColor: "#D1FAE5",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
                alignSelf: "flex-start",
              }}
            >
              <Ionicons name="scale-outline" size={12} color="#059669" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#059669" }}>
                {detectedMeasurement}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

export default SmartTextInput;
