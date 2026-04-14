import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert("Errore", error.message);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-0">
      <View className="flex-1 justify-center px-6">
        <Text className="text-gold text-4xl font-bold mb-2" style={{ fontFamily: "Inter_700Bold" }}>
          Salute di Ferro
        </Text>
        <Text className="text-white/60 mb-10" style={{ fontFamily: "Inter_400Regular" }}>
          Accedi al tuo account
        </Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          className="bg-bg-1 text-white rounded-xl px-4 py-4 mb-3 border border-bg-2"
          style={{ fontFamily: "Inter_400Regular" }}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          className="bg-bg-1 text-white rounded-xl px-4 py-4 mb-6 border border-bg-2"
          style={{ fontFamily: "Inter_400Regular" }}
        />

        <Pressable
          onPress={onSubmit}
          disabled={loading}
          className="bg-gold rounded-xl py-4 items-center active:opacity-80"
        >
          {loading ? (
            <ActivityIndicator color="#0A0A0A" />
          ) : (
            <Text className="text-bg-0 font-bold" style={{ fontFamily: "Inter_700Bold" }}>
              Accedi
            </Text>
          )}
        </Pressable>

        <Link href="/(auth)/register" className="mt-6 text-center text-white/60">
          Non hai un account? <Text className="text-gold">Registrati</Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}
