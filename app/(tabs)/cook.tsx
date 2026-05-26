import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { RECIPES, Recipe } from "@/lib/mockData";
import { getUserRecipes, deleteUserRecipe } from "@/lib/recipeStore";
import { useModelStatus } from "@/src/context/ModelContext";
import { useShoppingList } from "@/src/context/ShoppingListContext";

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
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 2 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: "#9ca3af" }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const CATEGORIES = ["All", "Breakfast", "Pasta", "Vegan", "Quick", "Dessert"];

function RecipeListRow({
  recipe,
  onPress,
  onLongPress,
}: {
  recipe: Recipe;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.82}
      delayLongPress={400}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 0.5,
        borderBottomColor: "#f3f4f6",
      }}
    >
      {/* Thumbnail */}
      <View
        style={{
          borderRadius: 10,
          overflow: "hidden",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <Image
          source={{ uri: recipe.imageUrl }}
          style={{ width: 72, height: 72 }}
          contentFit="cover"
        />
        {recipe.isUserCreated && !recipe.isPublic && (
          <View
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              backgroundColor: "rgba(0,0,0,0.55)",
              borderRadius: 999,
              padding: 3,
            }}
          >
            <Ionicons name="lock-closed" size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Title + meta */}
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "700", color: "#000", lineHeight: 20 }}
          numberOfLines={2}
        >
          {recipe.title}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {recipe.cookTime ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="time-outline" size={12} color="#9ca3af" />
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                {recipe.cookTime}
              </Text>
            </View>
          ) : null}

          {recipe.category ? (
            <View
              style={{
                backgroundColor: "#f3f4f6",
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{ fontSize: 11, color: "#374151", fontWeight: "500" }}
              >
                {recipe.category}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Rating */}
      {recipe.rating > 0 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
          }}
        >
          <Ionicons name="star" size={13} color="#F5A623" />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
            {recipe.rating}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function CookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { modelReady } = useModelStatus();
  const { uncheckedCount } = useShoppingList();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [showSheet, setShowSheet] = useState(false);

  const openAndGo = (path: string) => {
    setShowSheet(false);
    // Small delay so the sheet closes before the new screen pushes
    setTimeout(() => router.push(path as any), 150);
  };

  useFocusEffect(
    useCallback(() => {
      getUserRecipes().then(setUserRecipes);
    }, [])
  );

  const allRecipes = useMemo(
    () => [...RECIPES, ...userRecipes],
    [userRecipes]
  );

  const filtered = useMemo(
    () =>
      allRecipes
        .filter(
          (r) =>
            selectedCategory === "All" ||
            r.category === selectedCategory ||
            (selectedCategory === "All" && r.isUserCreated)
        )
        .filter((r) => r.title.toLowerCase().includes(query.toLowerCase())),
    [allRecipes, query, selectedCategory]
  );

  const handleLongPress = (recipe: Recipe) => {
    if (!recipe.isUserCreated) return;
    Alert.alert(recipe.title, undefined, [
      {
        text: "Edit",
        onPress: () =>
          router.push({
            pathname: "/create-recipe",
            params: {
              recipeId: recipe.id,
              prefillTitle: recipe.title,
              prefillDescription: recipe.description,
              prefillIngredients: JSON.stringify(recipe.ingredients),
              prefillSteps: JSON.stringify(
                recipe.steps.map((s) => ({
                  text: s.text,
                  imageUrl: s.imageUrl ?? null,
                  videoUrl: s.videoUrl ?? null,
                }))
              ),
              prefillImage: recipe.imageUrl,
              prefillCategory: recipe.category,
              prefillDifficulty: recipe.difficulty ?? "",
              prefillCookTime: recipe.cookTime,
              prefillServings: String(recipe.servings),
              prefillFlavors: JSON.stringify(recipe.primaryFlavors ?? []),
              prefillAuthor: recipe.username,
            },
          }),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete Recipe", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await deleteUserRecipe(recipe.id);
                setUserRecipes((prev) =>
                  prev.filter((r) => r.id !== recipe.id)
                );
              },
            },
          ]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 0.5,
          borderBottomColor: "#dbdbdb",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#000" }}>
          Cook
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Cart icon — navigates to shopping list */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/shop")}
            style={{ position: "relative", padding: 4 }}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={26} color="#000" />
            {uncheckedCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  backgroundColor: "#ef4444",
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 3,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                  {uncheckedCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Add recipe button */}
          <TouchableOpacity
            onPress={() => setShowSheet(true)}
            style={{
              width: 36,
              height: 36,
              backgroundColor: "#000",
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#f3f4f6",
            borderRadius: 12,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={{ flex: 1, paddingVertical: 11, fontSize: 14, color: "#000" }}
            placeholder="Search recipes..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          paddingVertical: 10,
        }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: selectedCategory === cat ? "#000" : "#f3f4f6",
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: selectedCategory === cat ? "#fff" : "#374151",
              }}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recipe list */}
      <View style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="search-outline" size={48} color="#d1d5db" />
            <Text style={{ color: "#9ca3af", marginTop: 12, fontSize: 15 }}>
              No recipes found
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RecipeListRow
                recipe={item}
                onPress={() => router.push(`/recipe/${item.id}`)}
                onLongPress={() => handleLongPress(item)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>

      {/* Add Recipe bottom sheet */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={() => setShowSheet(false)}
        />

        {/* Sheet card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 12,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: "center", paddingVertical: 10 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#e5e7eb",
              }}
            />
          </View>

          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#000",
              marginBottom: 4,
              paddingBottom: 8,
            }}
          >
            Add Recipe
          </Text>

          <OptionCard
            icon="create-outline"
            title="Manual"
            subtitle="Fill in the details yourself"
            onPress={() => openAndGo("/create-recipe")}
          />
          <OptionCard
            icon="link-outline"
            title="From URL"
            subtitle="Import from any recipe website"
            onPress={() => openAndGo("/create-recipe-url")}
          />
          <OptionCard
            icon="phone-portrait-outline"
            title="Social / Screenshot"
            subtitle="From Instagram, TikTok, or a photo"
            onPress={() => openAndGo("/create-recipe-social")}
          />
          <OptionCard
            icon="sparkles-outline"
            title="Describe with text"
            subtitle={
              modelReady
                ? "Type a recipe — on-device AI fills the form"
                : "Download AI model in Settings to use"
            }
            onPress={() => openAndGo("/describe-recipe")}
            disabled={!modelReady}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
