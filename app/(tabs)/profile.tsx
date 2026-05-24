import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useModelStatus } from "@/src/context/ModelContext";
import {
  downloadModel,
  getModelPath,
} from "@/src/services/modelManager";

const MODEL_SIZE_MB = 360;

export default function ProfileScreen() {
  const { modelReady, refreshModelStatus } = useModelStatus();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    setDownloadError(null);
    try {
      await downloadModel((pct) => setProgress(pct));
      setProgress(100);
      await refreshModelStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setDownloadError(msg);
    } finally {
      setDownloading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove AI Model",
      `This will delete the on-device model (~${MODEL_SIZE_MB} MB). AI features will be disabled until you re-download it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const path = await getModelPath();
            if (path) {
              await FileSystem.deleteAsync(path, { idempotent: true });
            }
            await refreshModelStatus();
          },
        },
      ]
    );
  };

  const downloadedMB = Math.round((progress / 100) * MODEL_SIZE_MB);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 20,
            borderBottomWidth: 0.5,
            borderBottomColor: "#f3f4f6",
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#000" }}>
            Settings
          </Text>
        </View>

        {/* ── Profile placeholder ──────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, marginBottom: 28 }}>
          <View
            style={{
              borderRadius: 16,
              backgroundColor: "#f9fafb",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#e5e7eb",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={28} color="#9ca3af" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}
              >
                Your Profile
              </Text>
              <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
                Sign-in coming soon
              </Text>
            </View>
          </View>
        </View>

        {/* ── AI Features section header ───────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            AI Features
          </Text>
        </View>

        {/* ── Model card ───────────────────────────────────────── */}
        <View
          style={{
            marginHorizontal: 20,
            borderRadius: 16,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            overflow: "hidden",
          }}
        >
          {/* Identity row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#f3f4f6",
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                backgroundColor: modelReady ? "#f0fdf4" : "#f9fafb",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="hardware-chip-outline"
                size={22}
                color={modelReady ? "#16a34a" : "#9ca3af"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: 2,
                }}
              >
                SmolLM2 360M
              </Text>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                {modelReady
                  ? "On-device AI · Active"
                  : "On-device AI · ~360 MB download"}
              </Text>
            </View>
            {/* Status badge */}
            {modelReady ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: "#f0fdf4",
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#22c55e",
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#16a34a",
                  }}
                >
                  Ready
                </Text>
              </View>
            ) : !downloading ? (
              <View
                style={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#9ca3af",
                  }}
                >
                  Not installed
                </Text>
              </View>
            ) : null}
          </View>

          {/* Download progress */}
          {downloading && (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: "#f9fafb",
                borderBottomWidth: 1,
                borderBottomColor: "#f3f4f6",
              }}
            >
              <View
                style={{
                  height: 6,
                  backgroundColor: "#e5e7eb",
                  borderRadius: 999,
                  overflow: "hidden",
                  marginBottom: 10,
                }}
              >
                <Animated.View
                  style={{
                    height: "100%",
                    backgroundColor: "#111827",
                    borderRadius: 999,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ActivityIndicator size="small" color="#6b7280" />
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>
                    Downloading…
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: "#9ca3af" }}>
                  {downloadedMB} / {MODEL_SIZE_MB} MB
                </Text>
              </View>
            </View>
          )}

          {/* Error state */}
          {downloadError && !downloading && (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: "#fef2f2",
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-start",
                borderBottomWidth: 1,
                borderBottomColor: "#fecaca",
              }}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color="#ef4444"
                style={{ marginTop: 1 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: "#dc2626",
                  lineHeight: 18,
                }}
              >
                {downloadError}
              </Text>
            </View>
          )}

          {/* Action button */}
          {!downloading && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              {!modelReady ? (
                <TouchableOpacity
                  onPress={handleDownload}
                  style={{
                    backgroundColor: "#111827",
                    borderRadius: 12,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="cloud-download-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#fff",
                    }}
                  >
                    {downloadError ? "Retry Download" : "Download Model"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleRemove}
                  style={{
                    backgroundColor: "#fef2f2",
                    borderRadius: 12,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderWidth: 1,
                    borderColor: "#fecaca",
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#ef4444",
                    }}
                  >
                    Remove Model
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Info note */}
        {!modelReady && !downloading && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              flexDirection: "row",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <Ionicons
              name="lock-closed-outline"
              size={14}
              color="#9ca3af"
              style={{ marginTop: 1 }}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                color: "#9ca3af",
                lineHeight: 17,
              }}
            >
              The model runs fully on your device — no data leaves your phone.
              Required for "Describe with Text" and recipe auto-parsing.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
