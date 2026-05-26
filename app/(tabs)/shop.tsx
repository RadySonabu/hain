import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useShoppingList, type ShoppingItem } from "@/src/context/ShoppingListContext";

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
      }}
    >
      <Ionicons name="cart-outline" size={72} color="#d1d5db" />
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#111",
          marginTop: 20,
          textAlign: "center",
        }}
      >
        Your shopping list is empty
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: "#9ca3af",
          marginTop: 8,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        Tap "Add to list" on any recipe to get started
      </Text>
    </View>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({ item, onToggle }: { item: ShoppingItem; onToggle: () => void }) {
  const fromMultiple = item.recipeNames.length > 1;

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: "#f3f4f6",
      }}
    >
      {/* Checkbox */}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: item.checked ? "#059669" : "#d1d5db",
          backgroundColor: item.checked ? "#059669" : "transparent",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {item.checked && (
          <Ionicons name="checkmark" size={13} color="#fff" />
        )}
      </View>

      {/* Name + recipe source */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 15,
            color: item.checked ? "#9ca3af" : "#111",
            textDecorationLine: item.checked ? "line-through" : "none",
            lineHeight: 22,
          }}
        >
          {item.name}
        </Text>
        {/* Recipe attribution — shown subtly below the name */}
        <Text
          style={{
            fontSize: 11,
            color: item.checked ? "#d1d5db" : "#9ca3af",
            lineHeight: 15,
          }}
          numberOfLines={1}
        >
          {fromMultiple
            ? `Combined from ${item.recipeNames.length} recipes`
            : item.recipeNames[0]}
        </Text>
      </View>

      {/* Measurement pill */}
      {item.measurement && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            backgroundColor: item.checked ? "#f3f4f6" : "#D1FAE5",
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 3,
            flexShrink: 0,
          }}
        >
          <Ionicons
            name="scale-outline"
            size={11}
            color={item.checked ? "#9ca3af" : "#059669"}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: item.checked ? "#9ca3af" : "#059669",
            }}
          >
            {item.measurement}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const { items, uncheckedCount, toggleItem, clearList } = useShoppingList();

  const checkedCount = items.length - uncheckedCount;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: "#dbdbdb",
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#000" }}>
            Shopping List
          </Text>
          {items.length > 0 && (
            <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 1 }}>
              {checkedCount} of {items.length} done
            </Text>
          )}
        </View>
        {items.length > 0 && (
          <TouchableOpacity
            onPress={clearList}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 7,
              backgroundColor: "#f3f4f6",
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>
              Clear All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemRow item={item} onToggle={() => toggleItem(item.id)} />
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}
