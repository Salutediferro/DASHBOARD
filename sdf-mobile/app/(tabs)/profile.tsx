import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

export default function ProfileTab() {
  async function onLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Errore", error.message);
  }
  return (
    <SafeAreaView className="flex-1 bg-bg-0">
      <View className="flex-1 px-6 pt-8">
        <Text className="text-gold text-3xl mb-8" style={{ fontFamily: "Inter_700Bold" }}>
          Profilo
        </Text>
        <Pressable
          onPress={onLogout}
          className="bg-bg-1 border border-bg-2 rounded-xl py-4 items-center active:opacity-80"
        >
          <Text className="text-white" style={{ fontFamily: "Inter_600SemiBold" }}>
            Esci
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
