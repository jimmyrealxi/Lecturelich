import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Kanit_600SemiBold } from "@expo-google-fonts/kanit";
import {
  IBMPlexSansThai_400Regular,
  IBMPlexSansThai_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans-thai";
import { Silkscreen_400Regular } from "@expo-google-fonts/silkscreen";
import { registerServiceWorker } from "@/lib/web/webPush";
import { XpPop } from "@/components/game/XpPop";
import { CACHE_BUSTER, persister, queryClient } from "@/lib/queryClient";

export default function RootLayout() {
  const [loaded] = useFonts({
    Kanit_600SemiBold,
    IBMPlexSansThai_400Regular,
    IBMPlexSansThai_600SemiBold,
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
