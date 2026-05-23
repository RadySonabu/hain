import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { downloadModel } from "@/src/services/modelManager";

interface Props {
  onComplete: () => void;
}

type ScreenState = "idle" | "downloading" | "error";

const MODEL_SIZE_MB = 360;

export default function ModelDownloadScreen({ onComplete }: Props) {
  const [screenState, setScreenState] = useState<ScreenState>("idle");
  const [progress, setProgress] = useState(0); // 0–100
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animate the progress bar smoothly
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Start downloading immediately on mount
  useEffect(() => {
    startDownload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDownload = async () => {
    setScreenState("downloading");
    setProgress(0);
    setErrorMsg(null);

    try {
      await downloadModel((pct) => {
        setProgress(pct);
      });
      setProgress(100);
      // Brief pause so user sees 100% before transitioning
      setTimeout(onComplete, 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(msg);
      setScreenState("error");
    }
  };

  const downloadedMB = Math.round((progress / 100) * MODEL_SIZE_MB);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* ── App identity ─────────────────────────────────────── */}
        <View style={styles.logoArea}>
          <View style={styles.iconCircle}>
            <Ionicons name="restaurant" size={40} color="#fff" />
          </View>
          <Text style={styles.appName}>foodai</Text>
          <Text style={styles.appTagline}>Recipes powered by on-device AI</Text>
        </View>

        {/* ── Card ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.heading}>Setting up AI</Text>
          <Text style={styles.subheading}>
            One-time download of the on-device model
          </Text>

          {/* Progress bar */}
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          {/* Progress label */}
          {screenState === "downloading" && (
            <View style={styles.progressRow}>
              <Text style={styles.pctLabel}>{progress}%</Text>
              <Text style={styles.sizeLabel}>
                {downloadedMB} MB of {MODEL_SIZE_MB} MB
              </Text>
            </View>
          )}

          {/* Loading spinner */}
          {screenState === "downloading" && progress < 100 && (
            <View style={styles.spinnerRow}>
              <ActivityIndicator size="small" color="#6b7280" />
              <Text style={styles.spinnerText}>Downloading…</Text>
            </View>
          )}

          {/* Error state */}
          {screenState === "error" && (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color="#ef4444"
                style={{ flexShrink: 0 }}
              />
              <Text style={styles.errorText} numberOfLines={3}>
                {errorMsg ?? "Download failed. Please try again."}
              </Text>
            </View>
          )}

          {screenState === "error" && (
            <TouchableOpacity
              onPress={startDownload}
              style={styles.retryBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Footer note ──────────────────────────────────────── */}
        <View style={styles.footer}>
          <Ionicons name="lock-closed-outline" size={14} color="#9ca3af" />
          <Text style={styles.footerText}>
            This only happens once. The AI runs fully on your device — no data
            leaves your phone.
          </Text>
        </View>

        {/* Platform notice */}
        {Platform.OS === "android" && (
          <Text style={styles.platformNote}>
            Tip: keep the app open during download.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  // Logo
  logoArea: {
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  // Card
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    gap: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  subheading: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  // Progress bar
  barTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#111827",
    borderRadius: 999,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pctLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  sizeLabel: {
    fontSize: 13,
    color: "#9ca3af",
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  spinnerText: {
    fontSize: 14,
    color: "#6b7280",
  },
  // Error
  errorBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 14,
    alignItems: "flex-start",
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#dc2626",
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    color: "#9ca3af",
    lineHeight: 18,
  },
  platformNote: {
    fontSize: 12,
    color: "#d1d5db",
    textAlign: "center",
  },
});
