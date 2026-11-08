import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Btn, head, Skeleton, T, Tape, Tick } from "@/components/ui";
import { guessSubject } from "@/lib/classroom";
import { useCurrentTerm, useSubjects } from "@/lib/queries/core";
import { useClassroomAccount, useClassroomCourses, useRefreshCourses, useSaveCourses } from "@/lib/queries/classroom";
import { color, font, minTouch, radius, space } from "@/lib/theme";

type Draft = Record<string, { enabled?: boolean; subject_id?: string | null }>;

const ERRORS: Record<string, string> = {
  denied: "ยังไม่ได้เชื่อม เพราะยกเลิกหน้าอนุญาตของ Google หรือหน้านั้นหมดเวลา",
  scope: "ยังไม่ได้เชื่อม ต้องติ๊กอนุญาตให้ครบทุกข้อในหน้าของ Google",
};

/** เลือกห้อง Classroom ที่จะดึง (docs/mockups/a-classroom-connect.html จอ 2) */
export default function Classroom() {
  const { error } = useLocalSearchParams<{ error?: string }>();
  const account = useClassroomAccount();
  const courses = useClassroomCourses();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const refresh = useRefreshCourses();
  const save = useSaveCourses();
  const [draft, setDraft] = useState<Draft>({});
  const [picking, setPicking] = useState<string | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/settings"));

  const connected = !!account.data;
  const asked = useRef(false);
  const { mutate: refreshCourses } = refresh;
  useEffect(() => {
    if (connected && !asked.current) {
      asked.current = true;
      refreshCourses();
    }
  }, [connected, refreshCourses]);

  const subs = useMemo(() => subjects.data ?? [], [subjects.data]);
  const rows = useMemo(() => (courses.data ?? []).map((c) => {
    const d = draft[c.course_id];
    return {
      ...c,
      enabled: d?.enabled ?? c.enabled,
      subject_id: d && "subject_id" in d ? d.subject_id ?? null : c.subject_id ?? guessSubject(c.name, subs),
    };
  }), [courses.data, draft, subs]);
  const count = rows.filter((r) => r.enabled).length;
  const name = (id: string | null) => subs.find((x) => x.id === id)?.name;

  const edit = (id: string, patch: Draft[string]) => setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  const onSave = () => save.mutate(
    rows.map(({ course_id, subject_id, enabled }) => ({ course_id, subject_id, enabled })),
    { onSuccess: () => router.replace("/tasks") },
  );

  const message = error ? ERRORS[error] ?? ERRORS.denied : null;
  const loading = account.isPending || courses.isPending || (refresh.isPending && rows.length === 0);
  return (
    <View style={{ flex: 1 }}>
      <View style={head.top}>
        <Pressable onPress={back} style={head.backBtn} accessibilityRole="button"><Text style={head.back}>‹ ยกเลิก</Text></Pressable>
        <Text style={head.title} accessibilityRole="header">เลือกห้องเรียน</Text>
      </View>
      <ScrollView contentContainerStyle={s.page}>
        {!!message && <Text style={s.warn}>{message}</Text>}
        {loading ? (
          <Skeleton height={220} />
        ) : !connected ? (
          <Text style={T.muted}>ยังไม่ได้เชื่อม Classroom กดเชื่อมได้ที่หน้าตั้งค่า</Text>
        ) : rows.length === 0 ? (
          <Text style={T.muted}>{refresh.isError ? "โหลดห้องเรียนไม่สำเร็จ กลับไปแล้วลองเปิดใหม่อีกครั้ง" : "บัญชีนี้ยังไม่มีห้องเรียนที่เปิดอยู่"}</Text>
        ) : (
          <>
            {rows.map((c, i) => (
              <View key={c.course_id} style={[s.row, i > 0 && s.divider]}>
                <Pressable onPress={() => edit(c.course_id, { enabled: !c.enabled })} style={s.hit} accessibilityRole="checkbox"
                  accessibilityState={{ checked: c.enabled }} accessibilityLabel={`ดึงงานจาก ${c.name}`}>
                  <View style={[s.check, c.enabled && s.checked]}>{c.enabled && <Tick />}</View>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[T.body, !c.enabled && { color: color.faint }]}>{[c.name, c.section].filter(Boolean).join(" ")}</Text>
                  <Text style={T.muted}>{!c.enabled ? "ไม่ดึง" : name(c.subject_id) ? `ลงวิชา ${name(c.subject_id)}` : "ยังไม่ผูกวิชา"}</Text>
                </View>
                {c.enabled && (
                  <Pressable onPress={() => setPicking(c.course_id)} style={s.change} accessibilityRole="button" accessibilityLabel={`เลือกวิชาของ ${c.name}`}>
                    <Text style={s.changeText}>{name(c.subject_id) ? "เปลี่ยน" : "เลือก"}</Text>
                  </Pressable>
                )}
              </View>
            ))}
            <Text style={[T.muted, { marginTop: space.sm }]}>งานที่เลยกำหนดไปแล้วก่อนวันนี้จะไม่ถูกดึงมา</Text>
            {save.isError && <Text style={s.err}>ดึงงานไม่สำเร็จ ลองใหม่อีกครั้ง</Text>}
          </>
        )}
      </ScrollView>
      {connected && rows.length > 0 && (
        <View style={s.bar}>
          <Btn kind="primary" label={save.isPending ? "กำลังดึงงาน..." : count ? `เริ่มดึงงาน ${count} ห้อง` : "บันทึก"} onPress={() => !save.isPending && onSave()} />
        </View>
      )}

      <Modal visible={picking !== null} transparent animationType="slide" onRequestClose={() => setPicking(null)}>
        <Pressable style={s.dim} onPress={() => setPicking(null)} accessibilityLabel="ปิด" />
        <View style={s.sheet}>
          <Tape />
          <ScrollView>
            <Text style={T.h3}>ลงวิชาไหน</Text>
            {[...subs.map((x) => ({ id: x.id as string | null, name: x.name })), { id: null, name: "ไม่ผูกวิชา" }].map((x) => (
              <Pressable key={x.id ?? "none"} style={s.option} accessibilityRole="button"
                onPress={() => { if (picking) edit(picking, { subject_id: x.id }); setPicking(null); }}>
                <Text style={T.body}>{x.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}


const s = StyleSheet.create({
  page: { padding: space.lg, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 64, paddingVertical: 4 },
  divider: { borderTopWidth: 1, borderTopColor: color.rule },
  hit: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  check: {
    width: 22, height: 22, borderWidth: 2, borderColor: color.paper, alignItems: "center", justifyContent: "center",
    borderTopLeftRadius: 2, borderTopRightRadius: 4, borderBottomRightRadius: 3, borderBottomLeftRadius: 2,
  },
  checked: { borderColor: color.pen },
  change: { minHeight: minTouch, minWidth: 56, alignItems: "center", justifyContent: "center" },
  changeText: { fontFamily: font.bodyBold, fontSize: 15, color: color.pen, textDecorationLine: "underline" },
  bar: { flexDirection: "row", padding: space.lg, borderTopWidth: 1, borderTopColor: color.rule2, width: "100%", maxWidth: 560, alignSelf: "center" },
  warn: { fontFamily: font.body, fontSize: 14, color: color.dangerInk, backgroundColor: color.dangerBg, borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  err: { fontFamily: font.body, fontSize: 14, color: color.danger, marginTop: space.sm },
  dim: { flex: 1, backgroundColor: "rgba(42,33,24,0.45)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "70%", backgroundColor: color.deck, borderTopWidth: 1, borderColor: color.rule2,
    padding: space.lg, width: "100%", maxWidth: 560, alignSelf: "center",
  },
  option: { minHeight: 52, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: color.rule },
});
