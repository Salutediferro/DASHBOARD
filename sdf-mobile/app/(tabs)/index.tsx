import { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useHomeData } from "@/hooks/use-mock-home";
import { colors } from "@/constants/colors";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function Card({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  const content = (
    <View className="bg-bg-1 rounded-2xl p-5 border border-bg-2 mb-4">{children}</View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        className="active:opacity-80"
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-bg-1 rounded-2xl p-4 border border-bg-2">
      <Text className="text-white/50 text-xs mb-1" style={{ fontFamily: "Inter_500Medium" }}>
        {label}
      </Text>
      <Text className="text-white text-xl" style={{ fontFamily: "Inter_700Bold" }}>
        {value}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { data, refetch } = useHomeData();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const kcalPct = Math.min(100, Math.round((data.nutrition.kcalConsumed / data.nutrition.kcalTarget) * 100));
  const proteinPct = Math.min(100, Math.round((data.nutrition.proteinG / data.nutrition.proteinTargetG) * 100));

  return (
    <SafeAreaView className="flex-1 bg-bg-0" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        <Text className="text-white/50 text-sm" style={{ fontFamily: "Inter_400Regular" }}>
          {greeting()},
        </Text>
        <Text className="text-white text-3xl mb-6" style={{ fontFamily: "Inter_700Bold" }}>
          {data.userName}
        </Text>

        {data.nextWorkout && (
          <Card onPress={() => router.push("/workout/session")}>
            <Text className="text-gold text-xs mb-2" style={{ fontFamily: "Inter_600SemiBold", letterSpacing: 1 }}>
              PROSSIMO ALLENAMENTO
            </Text>
            <Text className="text-white text-xl mb-1" style={{ fontFamily: "Inter_700Bold" }}>
              {data.nextWorkout.name}
            </Text>
            <Text className="text-white/60 mb-4" style={{ fontFamily: "Inter_400Regular" }}>
              {data.nextWorkout.dayLabel}
            </Text>
            <View className="flex-row gap-4">
              <Text className="text-white/80" style={{ fontFamily: "Inter_500Medium" }}>
                {data.nextWorkout.exercises} esercizi
              </Text>
              <Text className="text-white/80" style={{ fontFamily: "Inter_500Medium" }}>
                ~{data.nextWorkout.durationMin} min
              </Text>
            </View>
          </Card>
        )}

        <Card>
          <Text className="text-gold text-xs mb-3" style={{ fontFamily: "Inter_600SemiBold", letterSpacing: 1 }}>
            NUTRIZIONE OGGI
          </Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-white" style={{ fontFamily: "Inter_500Medium" }}>
              Calorie
            </Text>
            <Text className="text-white/80" style={{ fontFamily: "Inter_500Medium" }}>
              {data.nutrition.kcalConsumed} / {data.nutrition.kcalTarget} kcal
            </Text>
          </View>
          <View className="h-2 bg-bg-2 rounded-full mb-4 overflow-hidden">
            <View className="h-full bg-gold" style={{ width: `${kcalPct}%` }} />
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-white" style={{ fontFamily: "Inter_500Medium" }}>
              Proteine
            </Text>
            <Text className="text-white/80" style={{ fontFamily: "Inter_500Medium" }}>
              {data.nutrition.proteinG} / {data.nutrition.proteinTargetG} g
            </Text>
          </View>
          <View className="h-2 bg-bg-2 rounded-full overflow-hidden">
            <View className="h-full bg-gold" style={{ width: `${proteinPct}%` }} />
          </View>
        </Card>

        <Text className="text-white/50 text-xs mb-3 mt-2" style={{ fontFamily: "Inter_600SemiBold", letterSpacing: 1 }}>
          METRICHE RAPIDE
        </Text>
        <View className="flex-row gap-3 mb-3">
          <Metric label="Peso" value={`${data.metrics.weightKg} kg`} />
          <Metric label="Massa grassa" value={`${data.metrics.bodyFatPct}%`} />
        </View>
        <View className="flex-row gap-3">
          <Metric label="Passi" value={data.metrics.steps.toLocaleString("it-IT")} />
          <Metric label="Sonno" value={`${data.metrics.sleepHours}h`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
