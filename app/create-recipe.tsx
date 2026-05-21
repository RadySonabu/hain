import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function CreateRecipeScreen() {
  const {
    prefillTitle,
    prefillDescription,
    prefillIngredients,
    prefillSteps,
    prefillImage,
  } = useLocalSearchParams<{
    prefillTitle?: string;
    prefillDescription?: string;
    prefillIngredients?: string;
    prefillSteps?: string;
    prefillImage?: string;
  }>();

  const [photo, setPhoto] = useState<string | null>(prefillImage ?? null);
  const [title, setTitle] = useState(prefillTitle ?? "");
  const [description, setDescription] = useState(prefillDescription ?? "");
  const [ingredients, setIngredients] = useState<string[]>(
    prefillIngredients ? (JSON.parse(prefillIngredients) as string[]) : [""]
  );
  const [steps, setSteps] = useState<string[]>(
    prefillSteps ? (JSON.parse(prefillSteps) as string[]) : [""]
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const updateIngredient = (index: number, value: string) => {
    const updated = [...ingredients];
    updated[index] = value;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = value;
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please add a title for your recipe.");
      return;
    }
    Alert.alert("Recipe saved!", "Your recipe has been saved successfully.");
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Create Recipe",
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>
                Save
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo picker */}
          <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
            {photo ? (
              <View>
                <Image
                  source={{ uri: photo }}
                  style={{ width: "100%", aspectRatio: 1 }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  onPress={() => setPhoto(null)}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: 999,
                    width: 32,
                    height: 32,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={{
                  marginHorizontal: 16,
                  marginTop: 16,
                  aspectRatio: 1,
                  borderWidth: 1.5,
                  borderColor: "#e5e7eb",
                  borderStyle: "dashed",
                  borderRadius: 16,
                  backgroundColor: "#f9fafb",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="camera-outline" size={40} color="#9ca3af" />
                <Text
                  style={{
                    color: "#9ca3af",
                    marginTop: 8,
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  Add Photo
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View className="px-4 pt-6">
            {/* Title */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Title
            </Text>
            <TextInput
              style={{
                fontSize: 18,
                fontWeight: "500",
                color: "#000",
                borderBottomWidth: 1,
                borderBottomColor: "#e5e7eb",
                paddingBottom: 12,
                marginBottom: 24,
              }}
              placeholder="e.g. Creamy Tomato Pasta"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />

            {/* Description */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Description
            </Text>
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
              placeholder="A short summary of your recipe..."
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Ingredients */}
            <View className="flex-row items-center justify-between mb-3">
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Ingredients
              </Text>
              <TouchableOpacity
                onPress={() => setIngredients([...ingredients, ""])}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>
                  + Add
                </Text>
              </TouchableOpacity>
            </View>
            {ingredients.map((ing, index) => (
              <View
                key={index}
                className="flex-row items-center gap-3 mb-3"
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: "#9ca3af",
                    marginLeft: 4,
                  }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "#000",
                    borderBottomWidth: 1,
                    borderBottomColor: "#e5e7eb",
                    paddingBottom: 8,
                  }}
                  placeholder={`Ingredient ${index + 1}`}
                  placeholderTextColor="#9ca3af"
                  value={ing}
                  onChangeText={(val) => updateIngredient(index, val)}
                  returnKeyType="next"
                />
                {ingredients.length > 1 && (
                  <TouchableOpacity onPress={() => removeIngredient(index)}>
                    <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Instructions */}
            <View className="flex-row items-center justify-between mt-6 mb-3">
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Instructions
              </Text>
              <TouchableOpacity onPress={() => setSteps([...steps, ""])}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>
                  + Add
                </Text>
              </TouchableOpacity>
            </View>
            {steps.map((step, index) => (
              <View key={index} className="flex-row items-start gap-3 mb-4">
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
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
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "#000",
                    borderBottomWidth: 1,
                    borderBottomColor: "#e5e7eb",
                    paddingBottom: 8,
                    textAlignVertical: "top",
                  }}
                  placeholder={`Step ${index + 1}`}
                  placeholderTextColor="#9ca3af"
                  value={step}
                  onChangeText={(val) => updateStep(index, val)}
                  multiline
                />
                {steps.length > 1 && (
                  <TouchableOpacity onPress={() => removeStep(index)}>
                    <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSave}
              style={{
                backgroundColor: "#000",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 24,
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
              >
                Save Recipe
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
