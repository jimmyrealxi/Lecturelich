import { useEffect, useRef, type ComponentRef } from "react";
import type { ScrollView } from "react-native";
import { useNavigation } from "expo-router";

/** ออกจากแท็บแล้วเลื่อนกลับบนสุด · ฟังการสลับแท็บ ไม่ใช่ blur เพราะเปิดหน้าซ้อน (จด/รายละเอียดวิชา) แล้วกลับมาต้องอยู่ที่เดิม */
export function useTabTop() {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const nav = useNavigation();
  useEffect(() => nav.addListener("state", () => {
    if (!nav.isFocused()) ref.current?.scrollTo({ y: 0, animated: false });
  }), [nav]);
  return ref;
}
