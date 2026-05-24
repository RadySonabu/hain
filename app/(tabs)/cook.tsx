import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { RECIPES, Recipe } from "@/lib/mockData";
import { getUserRecipes, deleteUserRecipe } from "@/lib/recipeStore";

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
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);

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
              prefillSteps: JSON.stringify(recipe.steps.map((s) => s.text)),
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
        <TouchableOpacity
          onPress={() => router.push("/add-recipe")}
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
    </SafeAreaView>
  );
}
