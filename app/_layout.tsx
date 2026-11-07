import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { VT323_400Regular } from "@expo-google-fonts/vt323";
import { Anuphan_400Regular, Anuphan_500Medium, Anuphan_600SemiBold } from "@expo-google-fonts/anuphan";
import { Chonburi_400Regular } from "@expo-google-fonts/chonburi";
import { CourierPrime_400Regular, CourierPrime_700Bold } from "@expo-google-fonts/courier-prime";
import { Silkscreen_400Regular } from "@expo-google-fonts/silkscreen";
import { registerServiceWorker } from "@/lib/web/webPush";
import { XpPop } from "@/components/game/XpPop";
import { CACHE_BUSTER, persister, queryClient } from "@/lib/queryClient";

export default function RootLayout() {
  const [loaded] = useFonts({
    Anuphan_400Regular,
    Anuphan_500Medium,
    Anuphan_600SemiBold,
    Chonburi_400Regular,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
    VT323_400Regular,
    Silkscreen_400Regular,
  });

  useEffect(() => {
    if (Platform.OS === "web") registerServiceWorker((path) => router.push(path as never));
  }, []);

  if (!loaded) return null;
  const app = (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
      <XpPop />
    </>
  );
  return persister ? (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, buster: CACHE_BUSTER }}>
      {app}
    </PersistQueryClientProvider>
  ) : (
    <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>
  );
}
