import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/auth";
import { useXp } from "@/lib/queries/xp";
import { color, font, radius, space } from "@/lib/theme";

// +XP เด้งเป็นตัวเลขพิกเซล และเลเวลอัป (≤ 1 วินาที) · ใช้ transform/opacity เท่านั้น · reduce motion = จางอย่างเดียว
// เด้งเมื่อ XP รวมจาก DB เพิ่มขึ้น จึงแสดงค่าหลังหักเพดานแล้วเสมอ

type Pop = { id: number; gained: number; levelUp: number | null };

export function XpPop() {
  const session = useSession();
  const total = useXp(!!session).data?.total;
  const [seen, setSeen] = useState<{ xp: number; level: number } | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [anim] = useState(() => new Animated.Value(0));

  // ปรับ state ระหว่าง render (แทน setState ใน effect) เมื่อ XP เปลี่ยน
  if (total && (seen?.xp !== total.xp || seen?.level !== total.level)) {
    setSeen({ xp: total.xp, level: total.level });
    if (seen && total.xp > seen.xp) {
      setPop({ id: total.xp, gained: total.xp - seen.xp, levelUp: total.level > seen.level ? total.level : null });
    }
  }

  useEffect(() => {
    if (!pop) return;
    let stop = false;
    anim.setValue(0);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (stop) return;
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: reduce ? 0 : 250, useNativeDriver: false }),
          Animated.delay(pop.levelUp ? 600 : 500),
          Animated.timing(anim, { toValue: 2, duration: reduce ? 0 : 150, useNativeDriver: false }),
        ]).start();
      });
    return () => {
      stop = true;
      anim.stopAnimation();
    };
  }, [pop, anim]);

  if (!pop) return null;
  const opacity = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] });
  const translateY = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [16, 0, -12] });
  const scale = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 1] });

  return (
    <View pointerEvents="none" style={s.wrap} accessibilityLiveRegion="polite">
      <Animated.View style={[s.box, { opacity, transform: [{ translateY }, { scale }] }]}>
        <Text style={s.xp}>+{pop.gained} XP</Text>
        {pop.levelUp && <Text style={s.lv}>LEVEL UP · LV {pop.levelUp}</Text>}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", top: 72, left: 0, right: 0, alignItems: "center" },
  box: {
    backgroundColor: color.cave, borderWidth: 2, borderColor: color.gold, borderRadius: radius.sm,
    paddingHorizontal: space.lg, paddingVertical: space.sm, alignItems: "center",
  },
  xp: { fontFamily: font.pixel, fontSize: 18, color: color.warn },
  lv: { fontFamily: font.pixel, fontSize: 13, color: color.gold, marginTop: 2 },
});
