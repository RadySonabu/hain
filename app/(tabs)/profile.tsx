import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Ionicons name="person-outline" size={64} color="#d1d5db" />
      <Text className="text-2xl font-bold text-black mt-4">Profile</Text>
      <Text className="text-gray-400 mt-2 text-center px-10 text-base">
        Your profile, posts, and food journey.
      </Text>
    </SafeAreaView>
  );
}
