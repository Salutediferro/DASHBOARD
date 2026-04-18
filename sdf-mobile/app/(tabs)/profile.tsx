import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/hooks/use-home";
import { colors } from "@/constants/colors";

function roleLabel(role: string) {
  return role === "DOCTOR"
    ? "Medico"
    : role === "COACH"
      ? "Coach"
      : role === "ADMIN"
        ? "Admin"
        : "Paziente";
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="py-3 border-b border-bg-2">
      <Text
        className="text-white/40 text-xs mb-1"
        style={{
          fontFamily: "Inter_500Medium",
          letterSpacing: 0.8,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        className="text-white text-base"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {value && value.trim() !== "" ? value : "—"}
      </Text>
    </View>
  );
}

export default function ProfileTab() {
  const { data, isLoading } = useMe();

  async function onLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Errore", error.message);
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-0" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Text
          className="text-gold text-3xl mb-1"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          Profilo
        </Text>
        {data && (
          <Text
            className="text-white/50 text-xs mb-6"
            style={{ fontFamily: "Inter_500Medium", letterSpacing: 1 }}
          >
            {roleLabel(data.role).toUpperCase()}
          </Text>
        )}

        {isLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : data ? (
          <View className="bg-bg-1 border border-bg-2 rounded-2xl px-5 mb-6">
            <Row label="Nome" value={data.fullName} />
            <Row label="Email" value={data.email} />
            <Row label="Ruolo" value={roleLabel(data.role)} />
          </View>
        ) : (
          <Text
            className="text-white/50 mb-6"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Impossibile caricare il profilo.
          </Text>
        )}

        <Text
          className="text-white/40 text-xs mb-3"
          style={{ fontFamily: "Inter_500Medium", letterSpacing: 1 }}
        >
          MODIFICHE AL PROFILO
        </Text>
        <View className="bg-bg-1 border border-bg-2 rounded-2xl p-5 mb-6">
          <Text
            className="text-white/70 text-sm"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Per aggiornare dati anagrafici, clinici o professionali usa la web
            app su my.salutediferro.com — l'editor completo è lì.
          </Text>
        </View>

        <Pressable
          onPress={onLogout}
          className="bg-bg-1 border border-bg-2 rounded-xl py-4 items-center active:opacity-80"
        >
          <Text
            className="text-white"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Esci
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
