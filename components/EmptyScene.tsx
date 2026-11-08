import { createElement, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { T } from "@/components/ui";
import { pickLine, type EmptyKind } from "@/lib/emptyLines";
import { sceneHtml } from "@/lib/emptyScenes";
import { color, font, space } from "@/lib/theme";

/** ฉากหมึกขยับเบา ๆ + คำขำสุ่มตอนเปิดหน้า · fact = ข้อความบอกจริงของหน้านั้น */
export function EmptyScene({ kind, fact }: { kind: EmptyKind; fact: string }) {
  const [line] = useState(() => pickLine(kind));
  return (
    <View style={s.box}>
      {Platform.OS === "web" &&
        createElement("div", { "aria-hidden": true, style: { width: "100%", maxWidth: 300 }, dangerouslySetInnerHTML: { __html: sceneHtml(kind) } })}
      <Text style={s.joke}>{line}</Text>
      <Text style={[T.muted, s.fact]}>{fact}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { alignItems: "center", paddingVertical: space.sm },
  joke: { fontFamily: font.title, fontSize: 20, lineHeight: 31, color: color.paper, textAlign: "center", marginTop: space.xs },
  fact: { textAlign: "center" },
});
