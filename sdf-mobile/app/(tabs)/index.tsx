import { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { useMe, useNotifications } from "@/hooks/use-home";

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Ciao";
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function roleLabel(role: string) {
  return role === "DOCTOR"
    ? "Medico"
    : role === "COACH"
      ? "Coach"
      : role === "ADMIN"
        ? "Admin"
        : "Paziente";
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-bg-1 rounded-2xl p-5 border border-bg-2 mb-4">
      {children}
    </View>
  );
}

export default function HomeScreen() {
  const me = useMe();
  const notif = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([me.refetch(), notif.refetch()]);
    setRefreshing(false);
  }, [me, notif]);

  const displayName =
    me.data?.firstName ?? me.data?.fullName?.split(" ")[0] ?? "";
  const unread = notif.data?.unreadCount ?? 0;
  const latest = (notif.data?.notifications ?? []).slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-bg-0" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
      >
        <Text
          className="text-white/50 text-sm"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {greeting()},
        </Text>
        <Text
          className="text-white text-3xl mb-1"
          style={{ fontFamily: "Inter_700Bold" }}
        >
          {me.isLoading ? "…" : displayName || "Benvenuto"}
        </Text>
        {me.data && (
          <Text
            className="text-gold text-xs mb-6"
            style={{
              fontFamily: "Inter_600SemiBold",
              letterSpacing: 1,
            }}
          >
            {roleLabel(me.data.role).toUpperCase()}
          </Text>
        )}

        {me.isLoading && (
          <View className="items-center py-8">
            <ActivityIndicator color={colors.gold} />
          </View>
        )}

        {me.error && (
          <Card>
            <Text
              className="text-white"
              style={{ fontFamily: "Inter_500Medium" }}
            >
              Impossibile caricare il profilo. Controlla la connessione.
            </Text>
          </Card>
        )}

        {me.data && (
          <Card>
            <Text
              className="text-gold text-xs mb-2"
              style={{
                fontFamily: "Inter_600SemiBold",
                letterSpacing: 1,
              }}
            >
              PROFILO
            </Text>
            <Text
              className="text-white text-lg"
              style={{ fontFamily: "Inter_700Bold" }}
            >
              {me.data.fullName}
            </Text>
            <Text
              className="text-white/60 mt-1"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {me.data.email}
            </Text>
            {!me.data.onboardingCompleted && me.data.role === "PATIENT" && (
              <Text
                className="text-gold/80 mt-3 text-xs"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Completa l'onboarding dalla web app per sbloccare tutte le
                funzioni.
              </Text>
            )}
          </Card>
        )}

        <Card>
          <View className="flex-row items-center justify-between mb-3">
            <Text
              className="text-gold text-xs"
              style={{
                fontFamily: "Inter_600SemiBold",
                letterSpacing: 1,
              }}
            >
              NOTIFICHE
            </Text>
            {unread > 0 && (
              <View className="bg-gold rounded-full px-2 py-0.5">
                <Text
                  className="text-bg-0 text-xs"
                  style={{ fontFamily: "Inter_700Bold" }}
                >
                  {unread}
                </Text>
              </View>
            )}
          </View>
          {notif.isLoading ? (
            <ActivityIndicator color={colors.gold} />
          ) : latest.length === 0 ? (
            <Text
              className="text-white/50 text-sm"
              style={{ fontFamily: "Inter_400Regular" }}
            >
              Nessuna notifica recente.
            </Text>
          ) : (
            latest.map((n, i) => (
              <View
                key={n.id}
                className={i === latest.length - 1 ? "" : "mb-3"}
              >
                <Text
                  className={
                    n.isRead ? "text-white/80 text-sm" : "text-white text-sm"
                  }
                  style={{
                    fontFamily: n.isRead ? "Inter_400Regular" : "Inter_600SemiBold",
                  }}
                >
                  {n.title}
                </Text>
                <Text
                  className="text-white/50 text-xs mt-0.5"
                  numberOfLines={2}
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {n.body}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
