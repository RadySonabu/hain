import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useModelStatus } from "@/src/context/ModelContext";

function OptionCard({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      disabled={disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: "#f3f4f6",
        opacity: disabled ? 0.42 : 1,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: "#f3f4f6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={24} color="#374151" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#000",
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: "#9ca3af" }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

export default function AddRecipeScreen() {
  const router = useRouter();
  const { modelReady } = useModelStatus();

  return (
    <>
      <Stack.Screen options={{ headerTitle: "Add Recipe" }} />
      <View
        style={{
          flex: 1,
          backgroundColor: "#fff",
          paddingHorizontal: 24,
          paddingTop: 8,
        }}
      >
        <OptionCard
          icon="create-outline"
          title="Manual"
          subtitle="Fill in the details yourself"
          onPress={() => router.push("/create-recipe")}
        />
        <OptionCard
          icon="link-outline"
          title="From URL"
          subtitle="Import from any recipe website"
          onPress={() => router.push("/create-recipe-url")}
        />
        <OptionCard
          icon="phone-portrait-outline"
          title="Social / Screenshot"
          subtitle="From Instagram, TikTok, or a photo"
          onPress={() => router.push("/create-recipe-social")}
        />
        <OptionCard
          icon="sparkles-outline"
          title="Describe with text"
          subtitle={
            modelReady
              ? "Type a recipe — on-device AI fills the form"
              : "Download AI model in Settings to use"
          }
          onPress={() => router.push("/describe-recipe")}
          disabled={!modelReady}
        />
      </View>
    </>
  );
}
