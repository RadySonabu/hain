import { useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { RECIPES, Recipe } from "@/lib/mockData";

function PostCard({ post, onImagePress }: { post: Recipe; onImagePress: () => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <View>
      {/* Post header */}
      <View className="flex-row items-center justify-between px-3 py-2">
        <View className="flex-row items-center gap-2">
          <Image
            source={{ uri: post.avatar }}
            style={{ width: 34, height: 34, borderRadius: 17 }}
            contentFit="cover"
          />
          <Text className="font-semibold text-sm text-black">{post.username}</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
      </View>

      {/* Post image — tappable to open recipe detail */}
      <TouchableOpacity onPress={onImagePress} activeOpacity={0.95}>
        <Image
          source={{ uri: post.imageUrl }}
          style={{ width: "100%", aspectRatio: 1 }}
          contentFit="cover"
        />
      </TouchableOpacity>

      {/* Action row */}
      <View className="flex-row items-center justify-between px-3 pt-3 pb-1">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => setLiked(!liked)} activeOpacity={0.7}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={27}
              color={liked ? "#E1306C" : "#000"}
            />
          </TouchableOpacity>
          <Ionicons name="chatbubble-outline" size={25} color="#000" />
          <Ionicons name="paper-plane-outline" size={25} color="#000" />
        </View>
        <TouchableOpacity onPress={() => setSaved(!saved)} activeOpacity={0.7}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={25}
            color="#000"
          />
        </TouchableOpacity>
      </View>

      {/* Likes */}
      <Text className="px-3 pb-1 text-sm font-bold text-black">
        {(post.likes + (liked ? 1 : 0)).toLocaleString()} likes
      </Text>

      {/* Caption */}
      <TouchableOpacity onPress={onImagePress} activeOpacity={0.75}>
        <View className="px-3 pb-1">
          <Text className="text-sm text-black leading-5">
            <Text className="font-semibold">{post.username}</Text>{"  "}
            {post.description}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Comments */}
      <Text className="px-3 pb-1 text-sm text-gray-400">
        View all {post.commentCount} comments
      </Text>

      {/* Timestamp */}
      <Text className="px-3 pb-4 text-xs text-gray-400">{post.timeAgo}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-2"
        style={{ borderBottomWidth: 0.5, borderBottomColor: "#dbdbdb" }}
      >
        <Text
          style={{
            fontFamily: "SpaceMono",
            fontSize: 24,
            color: "#000",
            letterSpacing: -0.5,
          }}
        >
          Hain
        </Text>
        <View className="flex-row items-center gap-5">
          <Ionicons name="heart-outline" size={27} color="#000" />
          <Ionicons name="chatbubble-ellipses-outline" size={25} color="#000" />
        </View>
      </View>

      {/* Feed */}
      <FlatList
        data={RECIPES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onImagePress={() => router.push(`/recipe/${item.id}`)}
          />
        )}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={{ height: 0.5, backgroundColor: "#dbdbdb" }} />
        )}
      />
    </SafeAreaView>
  );
}
