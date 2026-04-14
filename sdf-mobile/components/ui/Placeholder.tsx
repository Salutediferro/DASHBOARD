import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Placeholder({ title }: { title: string }) {
  return (
    <SafeAreaView className="flex-1 bg-bg-0">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-gold text-2xl mb-2" style={{ fontFamily: "Inter_700Bold" }}>
          {title}
        </Text>
        <Text className="text-white/50 text-center" style={{ fontFamily: "Inter_400Regular" }}>
          Schermata in sviluppo.
        </Text>
      </View>
    </SafeAreaView>
  );
}
