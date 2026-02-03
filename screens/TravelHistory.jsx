import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * --- Data models (simple MVP) ---
 * Trip object shape:
 * { id: string, countryCode: "JP", countryName: "Japan", completedAt: number }
 *
 * Highlights object shape:
 * { id: string, title: string, subtitle: string, countryCode: string, blurb: string, image: any(require) }
 */

/** Total countries (world) */
const TOTAL_COUNTRIES = 195;

/** 7 Wonders of the World (New 7 Wonders) */
const WONDERS = [
  { id: "great_wall", name: "Great Wall of China" },
  { id: "petra", name: "Petra" },
  { id: "colosseum", name: "Colosseum" },
  { id: "chichen_itza", name: "Chichén Itzá" },
  { id: "machu_picchu", name: "Machu Picchu" },
  { id: "taj_mahal", name: "Taj Mahal" },
  { id: "christ_redeemer", name: "Christ the Redeemer" },
];

export default function TravelHistory() {
  // ---- Local (IN-MEMORY) state ONLY ----
  // This resets when the app reloads/closes (no saving).
  const [completedTrips, setCompletedTrips] = useState([]); // array of trips
  const [visitedWonders, setVisitedWonders] = useState({}); // { wonderId: true/false }

  // ---- Modals ----
  const [highlightModalOpen, setHighlightModalOpen] = useState(false);
  const [wondersModalOpen, setWondersModalOpen] = useState(false);
  const [allHighlightsOpen, setAllHighlightsOpen] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState(null);

  // ---- Highlights (you’ll replace images + blurbs with your own) ----
  const highlights = useMemo(
    () => [
      {
        id: "big_ben",
        title: "London",
        subtitle: "Big Ben",
        countryCode: "GB",
        blurb:
          "Big Ben is the nickname for the Great Bell of the clock at the Palace of Westminster in London. It became one of the most recognizable symbols of the UK.",
        image: require("../assets/images/highlight-bigben.jpg"),
      },
      {
        id: "machu_picchu",
        title: "Peru",
        subtitle: "Machu Picchu",
        countryCode: "PE",
        blurb:
          "Machu Picchu is an Incan citadel built in the 15th century high in the Andes. It’s famous for its stone structures and dramatic mountain setting.",
        image: require("../assets/images/highlight-machu.jpg"),
      },
      {
        id: "eiffel",
        title: "France",
        subtitle: "Eiffel Tower",
        countryCode: "FR",
        blurb:
          "The Eiffel Tower was built for the 1889 World's Fair in Paris. It later became a global icon of French engineering and culture.",
        image: require("../assets/images/highlight-eiffel.jpg"),
      },
      // Add more highlights as you want:
      // { id: "...", title: "...", subtitle: "...", countryCode:"..", blurb:"...", image: require("../assets/images/....jpg") }
    ],
    []
  );

  // ---- Helpers / derived stats ----
  const visitedCountryCodes = useMemo(() => {
    const s = new Set();
    for (const t of completedTrips) {
      if (t?.countryCode) s.add(t.countryCode);
    }
    return s;
  }, [completedTrips]);

  const visitedCountriesCount = visitedCountryCodes.size;

  const visitedWondersCount = useMemo(() => {
    let c = 0;
    for (const w of WONDERS) {
      if (visitedWonders[w.id]) c += 1;
    }
    return c;
  }, [visitedWonders]);

  // ---- Actions ----
  const onBack = () => {
    // If using expo-router later, replace with router.back()
    console.log("Back");
  };

  const onOpenHighlight = (h) => {
    setActiveHighlight(h);
    setHighlightModalOpen(true);
  };

  // In-memory toggle only (no saving)
  const toggleWonder = (wonderId) => {
    setVisitedWonders((prev) => ({
      ...prev,
      [wonderId]: !prev[wonderId],
    }));
  };

  /**
   * IMPORTANT: How the map “updates”
   * - Right now we render a map image and show the visited country count.
   * - When you’re ready, we’ll swap the map image for an SVG world map
   *   and color the visitedCountryCodes orange.
   */
  const MAP_IMAGE = require("../assets/images/world-map.png"); // add this file (simple gray map image)

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Travel History</Text>

          {/* Right side placeholder to keep center title centered */}
          <View style={{ width: 36 }} />
        </View>

        {/* Map */}
        <View style={styles.mapCard}>
          <Image source={MAP_IMAGE} style={styles.mapImage} />

          {/* Little legend / note */}
          <View style={styles.mapMetaRow}>
            <View style={styles.dotOrange} />
            <Text style={styles.mapMetaText}>
              Visited countries update when a trip is marked completed.
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {/* Been to */}
          <View style={styles.statCircleWrap}>
            <View style={styles.statCircle}>
              <Text style={styles.statKicker}>Been to</Text>
              <Text style={styles.statBig}>{visitedCountriesCount}</Text>
              <Text style={styles.statSmall}>countries</Text>
              <Text style={styles.statTiny}>of {TOTAL_COUNTRIES}</Text>
            </View>
          </View>

          {/* Wonders */}
          <View style={styles.statCircleWrap}>
            <TouchableOpacity
              onPress={() => setWondersModalOpen(true)}
              style={styles.statCircle}
              activeOpacity={0.85}
            >
              <Text style={styles.statKicker}>Seen</Text>
              <Text style={styles.statBig}>{visitedWondersCount}/7</Text>
              <Text style={styles.statSmall}>wonders of</Text>
              <Text style={styles.statTiny}>the world</Text>
            </TouchableOpacity>
          </View>

          {/* Past Trips button (placeholder) */}
          <TouchableOpacity
            onPress={() => console.log("Past Trips pressed")}
            style={styles.pastTripsButton}
            activeOpacity={0.85}
          >
            <Text style={styles.pastTripsText}>Past Trips</Text>
          </TouchableOpacity>
        </View>

        {/* Highlights header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Highlights</Text>

          <TouchableOpacity
            onPress={() => setAllHighlightsOpen(true)}
            style={styles.chevBtn}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-forward" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Highlights horizontal scroll (only a few visible) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.highlightsRow}
        >
          {highlights.slice(0, 6).map((h) => (
            <TouchableOpacity
              key={h.id}
              onPress={() => onOpenHighlight(h)}
              style={styles.highlightCard}
              activeOpacity={0.9}
            >
              <Image source={h.image} style={styles.highlightImg} />
              <Text style={styles.highlightTitle}>{h.title}</Text>
              <Text style={styles.highlightSub}>{h.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ height: 22 }} />
      </ScrollView>

      {/* ---------- Highlight Info Bubble Modal ---------- */}
      <Modal visible={highlightModalOpen} transparent animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setHighlightModalOpen(false)}
        >
          <Pressable style={styles.bubble} onPress={() => {}}>
            <View style={styles.bubbleHeader}>
              <Text style={styles.bubbleTitle}>
                {activeHighlight?.subtitle || "Highlight"}
              </Text>
              <TouchableOpacity
                onPress={() => setHighlightModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.bubbleBody}>
              {activeHighlight?.blurb ||
                "Add a short 2–4 sentence history blurb here (quick, fun, not a whole Wikipedia essay)."}
            </Text>

            <TouchableOpacity
              onPress={() => {
                setHighlightModalOpen(false);
                console.log("Open full highlight page");
              }}
              style={styles.bubbleAction}
              activeOpacity={0.85}
            >
              <Text style={styles.bubbleActionText}>View more</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---------- ALL Highlights Modal (Comprehensive list) ---------- */}
      <Modal visible={allHighlightsOpen} animationType="slide">
        <SafeAreaView style={styles.fullSafe}>
          <View style={styles.fullTop}>
            <TouchableOpacity
              onPress={() => setAllHighlightsOpen(false)}
              style={styles.iconButton}
            >
              <Ionicons name="chevron-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.fullTitle}>All Highlights</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.fullList}>
            {highlights.map((h) => (
              <TouchableOpacity
                key={h.id}
                onPress={() => onOpenHighlight(h)}
                style={styles.fullItem}
                activeOpacity={0.9}
              >
                <Image source={h.image} style={styles.fullItemImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullItemTitle}>{h.subtitle}</Text>
                  <Text style={styles.fullItemSub}>{h.title}</Text>
                  <Text style={styles.fullItemBlurb} numberOfLines={2}>
                    {h.blurb}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="rgba(17,24,39,0.55)"
                />
              </TouchableOpacity>
            ))}
            <View style={{ height: 22 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ---------- Wonders Modal (Checklist) ---------- */}
      <Modal visible={wondersModalOpen} animationType="slide">
        <SafeAreaView style={styles.fullSafe}>
          <View style={styles.fullTop}>
            <TouchableOpacity
              onPress={() => setWondersModalOpen(false)}
              style={styles.iconButton}
            >
              <Ionicons name="chevron-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.fullTitle}>Wonders of the World</Text>
            <View style={{ width: 36 }} />
          </View>

          <Text style={styles.wondersHint}>
            Tap a wonder to mark it visited. Your count on Travel History updates
            automatically.
          </Text>

          <ScrollView contentContainerStyle={styles.fullList}>
            {WONDERS.map((w) => {
              const checked = !!visitedWonders[w.id];
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => toggleWonder(w.id)}
                  style={styles.wonderRow}
                  activeOpacity={0.85}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                    {checked ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : null}
                  </View>
                  <Text style={styles.wonderName}>{w.name}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 22 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const ORANGE = "#F59E0B"; // similar to your map highlight color
const BLUE = "#3F63F3";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 16, paddingBottom: 18 },

  topRow: {
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
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

  mapCard: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
  },
  mapImage: {
    width: "100%",
    height: 170,
    resizeMode: "cover",
  },
  mapMetaRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
  },
  dotOrange: { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE },
  mapMetaText: { fontSize: 12, color: "rgba(17,24,39,0.65)" },

  statsRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  statCircleWrap: { width: 98 },
  statCircle: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 2,
    borderColor: "rgba(59,130,246,0.75)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  statKicker: { fontSize: 11, color: "rgba(17,24,39,0.6)", marginBottom: 2 },
  statBig: { fontSize: 22, fontWeight: "900", color: "#111827" },
  statSmall: { fontSize: 11, color: "rgba(17,24,39,0.6)", marginTop: 2 },
  statTiny: { fontSize: 10, color: "rgba(17,24,39,0.5)" },

  pastTripsButton: {
    flex: 1,
    height: 98,
    borderRadius: 49,
    backgroundColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  pastTripsText: { fontWeight: "800", color: "#111827" },

  sectionHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  chevBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  highlightsRow: { paddingTop: 12, paddingBottom: 8, gap: 12 },

  highlightCard: { width: 120 },
  highlightImg: {
    width: 120,
    height: 86,
    borderRadius: 10,
    resizeMode: "cover",
    backgroundColor: "#e5e7eb",
  },
  highlightTitle: { marginTop: 8, fontSize: 12, color: "rgba(17,24,39,0.6)" },
  highlightSub: { marginTop: 2, fontSize: 13, fontWeight: "800", color: "#111827" },

  // ---- Bubble modal ----
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  bubble: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 14,
    backgroundColor: "#fff",
    padding: 14,
  },
  bubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  bubbleTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
  },
  bubbleBody: { fontSize: 13, lineHeight: 18, color: "rgba(17,24,39,0.75)" },
  bubbleAction: {
    marginTop: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bubbleActionText: { color: "#fff", fontWeight: "900" },

  // ---- Full-screen modals ----
  fullSafe: { flex: 1, backgroundColor: "#fff" },
  fullTop: {
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,24,39,0.08)",
  },
  fullTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  fullList: { padding: 16, gap: 12 },

  fullItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
    backgroundColor: "#fff",
  },
  fullItemImg: { width: 72, height: 54, borderRadius: 10, backgroundColor: "#e5e7eb" },
  fullItemTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  fullItemSub: { fontSize: 12, color: "rgba(17,24,39,0.6)", marginTop: 2 },
  fullItemBlurb: { fontSize: 12, color: "rgba(17,24,39,0.65)", marginTop: 6 },

  wondersHint: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    fontSize: 12,
    color: "rgba(17,24,39,0.65)",
  },
  wonderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(17,24,39,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxOn: { backgroundColor: BLUE, borderColor: BLUE },
  wonderName: { fontSize: 14, fontWeight: "700", color: "#111827" },
});
