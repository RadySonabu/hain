import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ShopScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Ionicons name="bag-handle-outline" size={64} color="#d1d5db" />
      <Text className="text-2xl font-bold text-black mt-4">Shop</Text>
      <Text className="text-gray-400 mt-2 text-center px-10 text-base">
        Browse ingredients, kitchen gear, and food products.
      </Text>
    </SafeAreaView>
  );
}
