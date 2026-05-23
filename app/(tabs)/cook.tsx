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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { RECIPES, Recipe } from "@/lib/mockData";
import { getUserRecipes, deleteUserRecipe } from "@/lib/recipeStore";

const CATEGORIES = ["All", "Breakfast", "Pasta", "Vegan", "Quick", "Dessert"];

function OptionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: "#f3f4f6",
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

function RecipeCard({
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
      className="flex-1 mb-4"
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.88}
      delayLongPress={400}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: recipe.imageUrl }}
          style={{ width: "100%", aspectRatio: 1, borderRadius: 12 }}
          contentFit="cover"
        />
        {recipe.isUserCreated && !recipe.isPublic && (
          <View
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.55)",
              borderRadius: 999,
              padding: 4,
            }}
          >
            <Ionicons name="lock-closed" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text className="font-bold text-black text-sm mt-2" numberOfLines={1}>
        {recipe.title}
      </Text>
      <View className="flex-row items-center gap-3 mt-1">
        {recipe.cookTime ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-400">{recipe.cookTime}</Text>
          </View>
        ) : null}
        {recipe.rating > 0 ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={12} color="#F5A623" />
            <Text className="text-xs text-gray-400">{recipe.rating}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function CookScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showSheet, setShowSheet] = useState(false);
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
                setUserRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
              },
            },
          ]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-2"
        style={{ borderBottomWidth: 0.5, borderBottomColor: "#dbdbdb" }}
      >
        <Text className="text-2xl font-bold text-black">Cook</Text>
        <TouchableOpacity
          onPress={() => setShowSheet(true)}
          className="w-9 h-9 bg-black rounded-full items-center justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View className="px-4 pt-3 pb-1">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 gap-2">
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 py-3 text-sm text-black"
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
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
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

      {/* Recipe grid */}
      <View style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="search-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 mt-3 text-base">No recipes found</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
            renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => router.push(`/recipe/${item.id}`)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
            showsVerticalScrollIndicator={false}
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
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setShowSheet(false)}
        />
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 48,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#000", marginBottom: 8 }}>
            Add a Recipe
          </Text>
          <OptionCard
            icon="create-outline"
            title="Manual"
            subtitle="Fill in the details yourself"
            onPress={() => { setShowSheet(false); router.push("/create-recipe"); }}
          />
          <OptionCard
            icon="link-outline"
            title="From URL"
            subtitle="Import from any recipe website"
            onPress={() => { setShowSheet(false); router.push("/create-recipe-url"); }}
          />
          <OptionCard
            icon="phone-portrait-outline"
            title="Social / Screenshot"
            subtitle="From Instagram, TikTok, or a photo"
            onPress={() => { setShowSheet(false); router.push("/create-recipe-social"); }}
          />
          <OptionCard
            icon="sparkles-outline"
            title="Describe with text"
            subtitle="Type a recipe — Apple Intelligence fills the form"
            onPress={() => { setShowSheet(false); router.push("/describe-recipe"); }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
