import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Kanit_600SemiBold } from "@expo-google-fonts/kanit";
import {
  IBMPlexSansThai_400Regular,
  IBMPlexSansThai_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans-thai";
import { Silkscreen_400Regular } from "@expo-google-fonts/silkscreen";
import { registerServiceWorker } from "@/lib/web/serviceWorker";

export default function RootLayout() {
  const [loaded] = useFonts({
    Kanit_600SemiBold,
    IBMPlexSansThai_400Regular,
    IBMPlexSansThai_600SemiBold,
    Silkscreen_400Regular,
  });

  useEffect(() => {
    if (Platform.OS === "web") registerServiceWorker();
  }, []);

  if (!loaded) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
