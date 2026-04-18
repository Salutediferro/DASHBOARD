import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { session, initialized, setSession, setInitialized } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialized(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, [setSession, setInitialized]);

  useEffect(() => {
    if (!initialized || !fontsLoaded) return;
    SplashScreen.hideAsync().catch(() => {});
    // Route gating: signed-in users go to tabs; everyone else to the
    // auth stack. Segment check prevents redirect loops.
    const inAuthGroup = segments[0] === "(auth)";
    if (session && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [initialized, fontsLoaded, session, segments, router]);

  if (!fontsLoaded || !initialized) {
    return <View className="flex-1 bg-bg-0" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0A0A" } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout/session" options={{ presentation: "modal" }} />
      </Stack>
    </QueryClientProvider>
  );
}
