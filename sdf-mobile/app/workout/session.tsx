import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function WorkoutSession() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-bg-0">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-gold text-3xl mb-2" style={{ fontFamily: "Inter_700Bold" }}>
          Sessione attiva
        </Text>
        <Text className="text-white/50 mb-8" style={{ fontFamily: "Inter_400Regular" }}>
          Logging esercizi (TODO).
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="bg-gold rounded-xl py-4 items-center active:opacity-80"
        >
          <Text className="text-bg-0" style={{ fontFamily: "Inter_700Bold" }}>
            Chiudi
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
