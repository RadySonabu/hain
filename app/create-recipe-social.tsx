import { useState } from "react";
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
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { scrapeRecipe } from "@/lib/scrapeRecipe";

export default function CreateRecipeSocialScreen() {
  const router = useRouter();

  // Social URL section
  const [socialUrl, setSocialUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Screenshot section
  const [photo, setPhoto] = useState<string | null>(null);

  const handleUrlImport = async () => {
    const trimmed = socialUrl.trim();
    if (!trimmed.startsWith("http")) {
      setUrlError("Please enter a valid URL.");
      return;
    }
    setUrlLoading(true);
    setUrlError(null);
    const result = await scrapeRecipe(trimmed);
    setUrlLoading(false);
    if (!result) {
      setUrlError("This link couldn't be parsed. Try uploading a screenshot instead.");
      return;
    }
    router.replace({
      pathname: "/create-recipe",
      params: {
        prefillTitle: result.title,
        prefillDescription: result.description,
        prefillIngredients: JSON.stringify(result.ingredients),
        prefillSteps: JSON.stringify(result.steps),
        prefillImage: result.image,
      },
    });
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleContinueWithPhoto = () => {
    router.push({
      pathname: "/create-recipe",
      params: { prefillImage: photo ?? "" },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Social / Screenshot" }} />
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section A — Social URL */}
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#000",
              marginBottom: 4,
            }}
          >
            Paste a social media link
          </Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            Try a TikTok or Instagram post URL
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#f3f4f6",
              borderRadius: 12,
              paddingHorizontal: 14,
              gap: 10,
              marginBottom: 6,
            }}
          >
            <Ionicons name="logo-instagram" size={18} color="#9ca3af" />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: "#000", paddingVertical: 14 }}
              placeholder="https://www.instagram.com/p/..."
              placeholderTextColor="#9ca3af"
              value={socialUrl}
              onChangeText={(v) => { setSocialUrl(v); setUrlError(null); }}
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleUrlImport}
            />
            {socialUrl.length > 0 && (
              <TouchableOpacity onPress={() => { setSocialUrl(""); setUrlError(null); }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {urlError && (
            <Text style={{ fontSize: 13, color: "#ef4444", marginBottom: 8, lineHeight: 18 }}>
              {urlError}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleUrlImport}
            disabled={urlLoading || socialUrl.trim().length === 0}
            style={{
              backgroundColor:
                urlLoading || socialUrl.trim().length === 0 ? "#d1d5db" : "#000",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginBottom: 28,
            }}
            activeOpacity={0.85}
          >
            {urlLoading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                  Fetching...
                </Text>
              </>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                Try Import
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 28,
            }}
          >
            <View style={{ flex: 1, height: 0.5, backgroundColor: "#e5e7eb" }} />
            <Text style={{ fontSize: 13, color: "#9ca3af", fontWeight: "500" }}>or</Text>
            <View style={{ flex: 1, height: 0.5, backgroundColor: "#e5e7eb" }} />
          </View>

          {/* Section B — Screenshot / Photo */}
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#000",
              marginBottom: 4,
            }}
          >
            Upload a screenshot or photo
          </Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            Pick an image from your camera roll
          </Text>

          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85}>
            {photo ? (
              <View style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
                <Image
                  source={{ uri: photo }}
                  style={{ width: "100%", aspectRatio: 4 / 3 }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  onPress={() => setPhoto(null)}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: 999,
                    width: 30,
                    height: 30,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={{
                  borderWidth: 1.5,
                  borderColor: "#e5e7eb",
                  borderStyle: "dashed",
                  borderRadius: 16,
                  height: 160,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f9fafb",
                  marginBottom: 16,
                  gap: 8,
                }}
              >
                <Ionicons name="image-outline" size={36} color="#9ca3af" />
                <Text style={{ fontSize: 14, color: "#9ca3af", fontWeight: "500" }}>
                  Tap to choose an image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {photo && (
            <TouchableOpacity
              onPress={handleContinueWithPhoto}
              style={{
                backgroundColor: "#000",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Continue with Photo
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
