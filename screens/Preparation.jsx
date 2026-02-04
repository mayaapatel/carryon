// screens/BeforeYouTravel.jsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * UI-only screen to match the mock.
 * - Accordion sections (Documents expanded by default)
 * - Bottom stats: days until date + tasks completed + small progress bar
 *
 * Drop into: carryon/screens/BeforeYouTravel.jsx
 */

export default function BeforeYouTravel() {

    const router = useRouter();

  const sections = useMemo(
    () => [
      {
        key: "documents",
        title: "DOCUMENTS",
        body:
          "Make sure you have a VISA for international travel. You can either mail your passport to a consulate or visit their physical location.",
      },
      { key: "essentials", title: "ESSENTIALS", body: "Add your essentials checklist here." },
      { key: "specific", title: "SPECIFIC ITEMS", body: "Add destination-specific items here." },
      { key: "reservations", title: "RESERVATIONS", body: "Add your reservations checklist here." },
      { key: "group", title: "GROUP COORDINATION", body: "Add group coordination notes here." },
    ],
    []
  );

  // Expanded accordion keys
  const [openKey, setOpenKey] = useState("documents");

  // Mock stats (swap with real values later)
  const daysUntil = 43;
  const tasksDone = 8;
  const tasksTotal = 11;

  const progress = tasksTotal > 0 ? tasksDone / tasksTotal : 0;

  const onBack = () => {
    // If using expo-router later: router.back()
    router.back()
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Before You Travel:</Text>

          {/* spacer so title stays centered */}
          <View style={{ width: 36 }} />
        </View>

        {/* Accordion stack */}
        <View style={styles.stack}>
          {sections.map((s) => {
            const isOpen = openKey === s.key;
            return (
              <View key={s.key} style={[styles.card, isOpen && styles.cardOpen]}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setOpenKey(isOpen ? "" : s.key)}
                  style={styles.cardHeader}
                >
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="rgba(17,24,39,0.65)"
                  />
                </TouchableOpacity>

                {isOpen ? (
                  <View style={styles.cardBody}>
                    <Text style={styles.cardText}>{s.body}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Bottom stats area */}
        <View style={styles.bottomArea}>
          <View style={styles.statRow}>
            {/* Left: clock + days */}
            <View style={styles.leftStat}>
              <View style={styles.clockWrap}>
                <Ionicons name="time-outline" size={28} color="#2E5BFF" />
              </View>

              <View>
                <Text style={styles.bigNumber}>{daysUntil}</Text>
                <Text style={styles.smallLabel}>days until *date*</Text>
              </View>
            </View>

            {/* Right: progress + tasks */}
            <View style={styles.rightStat}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>

              <View style={styles.tasksRow}>
                <Text style={styles.bigNumber}>{tasksDone}</Text>
                <Text style={styles.slash}>/</Text>
                <Text style={styles.bigNumber}>{tasksTotal}</Text>
              </View>
              <Text style={styles.smallLabelCenter}>Tasks completed</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },

  topRow: {
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  stack: {
    gap: 12,
    marginTop: 10,
  },

  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  cardOpen: {
    backgroundColor: "#ffffff",
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: "rgba(17,24,39,0.55)",
    fontWeight: "700",
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(17,24,39,0.8)",
  },

  bottomArea: {
    marginTop: 26,
    borderTopWidth: 1,
    borderTopColor: "rgba(17,24,39,0.08)",
    paddingTop: 18,
  },

  statRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 18,
  },

  leftStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  clockWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  rightStat: {
    flex: 1,
    alignItems: "center",
  },

  progressTrack: {
    width: "90%",
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(17,24,39,0.15)",
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#2E5BFF",
  },

  tasksRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginBottom: 2,
  },

  bigNumber: {
    fontSize: 38,
    fontWeight: "500",
    color: "#111827",
    lineHeight: 40,
  },
  slash: {
    fontSize: 28,
    color: "rgba(17,24,39,0.45)",
    paddingBottom: 4,
  },

  smallLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(17,24,39,0.6)",
  },
  smallLabelCenter: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(17,24,39,0.6)",
    textAlign: "center",
  },
});
