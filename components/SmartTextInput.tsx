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

export type SmartTextInputHandle = {
  focus: () => void;
};

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onTimeDetected?: (seconds: number | null) => void;
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
    const [segments, setSegments] = useState<Segment[]>([]);
    const [detectedSeconds, setDetectedSeconds] = useState<number | null>(null);

    // If the input has a value but segments haven't been computed yet (e.g.
    // a prefilled value on first render), derive them directly from the prop.
    const viewSegments = segments.length > 0 ? segments : segmentText(value);
    const hasHighlight = viewSegments.some((s) => s.isHighlight);

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
      const segs = segmentText(value);
      setSegments(segs);
      const secs = extractTimeSeconds(value);
      setDetectedSeconds(secs);
      onTimeDetected?.(secs);
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
            borderBottomColor: hasHighlight ? "#FDE68A" : "#e5e7eb",
            paddingBottom: 8,
            gap: 4,
          }}
        >
          {/* Highlighted text spans */}
          <Text style={{ fontSize: 14, color: "#000", lineHeight: 20, flexShrink: 1 }}>
            {viewSegments.map((seg, i) =>
              seg.isHighlight ? (
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
              ) : (
                <Text key={i}>{seg.text}</Text>
              )
            )}
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
