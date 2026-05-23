import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import "../global.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { ModelProvider } from "@/src/context/ModelContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ModelProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="create-recipe" options={{ headerBackTitle: "Cook" }} />
          <Stack.Screen name="create-recipe-url" options={{ headerTitle: "Import from URL", headerBackTitle: "Back" }} />
          <Stack.Screen name="create-recipe-social" options={{ headerTitle: "Social / Screenshot", headerBackTitle: "Back" }} />
          <Stack.Screen name="describe-recipe" options={{ headerTitle: "Describe Recipe", headerBackTitle: "Back" }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </ModelProvider>
  );
}
