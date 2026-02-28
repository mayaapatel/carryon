import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { geoMercator, geoPath } from "d3-geo";
import Svg, { Path } from "react-native-svg";
import { feature } from "topojson-client";

// ✅ TopoJSON with all country shapes (110m = lightweight)
import worldData from "world-atlas/countries-110m.json";

const GREY = "#CBD5E1";
const GREEN = "#22C55E";

function StatCard({ label, value, hint }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export default function TravelHistory() {
  const { width } = useWindowDimensions();

  // map sizing
const mapWidth = Math.min(width * 0.8, 420);
const mapHeight = Math.round(mapWidth * 0.52);

  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visited, setVisited] = useState(() => new Set());

  // Build GeoJSON features from topojson
  const countries = useMemo(() => {
    const fc = feature(worldData, worldData.objects.countries);
    // fc.features have geometry + properties (often name may be missing depending on dataset)
    return fc.features;
  }, []);

  /**
   * IMPORTANT:
   * countries-110m.json uses numeric ids. Some builds include names, some don’t.
   * To guarantee a stable label for the checklist, we’ll create our own label:
   * - If properties.name exists -> use it
   * - else use the numeric id as a fallback string
   */
  const countriesWithLabels = useMemo(() => {
    const list = countries.map((f) => {
      const label = f?.properties?.name
        ? String(f.properties.name)
        : `Country ${f.id}`; // fallback label
      return { feature: f, label };
    });

    // Sort for nicer list
    list.sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, [countries]);

  // Filtered list for modal
  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countriesWithLabels;
    return countriesWithLabels.filter((c) =>
      c.label.toLowerCase().includes(q)
    );
  }, [query, countriesWithLabels]);

  // Projection + path generator
  const { pathsByLabel } = useMemo(() => {
    // Projection tuned for world view
    const projection = geoMercator();

    // Fit projection to our size
    // d3-geo doesn't have fitSize in older builds, so we do a manual scale/translate:
    // We'll start with a guess then fit by bounding box.
    projection.scale(mapWidth / 6.2).translate([mapWidth / 2, mapHeight / 1.6]);

    const pathGen = geoPath(projection);

    // Precompute path strings for each country
    const map = new Map();
    for (const item of countriesWithLabels) {
      const d = pathGen(item.feature);
      if (d) map.set(item.label, d);
    }

    return { pathsByLabel: map };
  }, [countriesWithLabels, mapWidth, mapHeight]);

  const toggleCountry = (label) => {
    setVisited((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const stats = useMemo(() => {
    const visitedCount = visited.size;
    const total = countriesWithLabels.length;
    const progress = total ? Math.round((visitedCount / total) * 100) : 0;
    const remaining = total - visitedCount;
    return { visitedCount, total, progress, remaining };
  }, [visited, countriesWithLabels]);

  const renderCountryRow = ({ item }) => {
    const checked = visited.has(item.label);
    return (
      <TouchableOpacity
        onPress={() => toggleCountry(item.label)}
        style={[styles.countryRow, checked && styles.countryRowChecked]}
        activeOpacity={0.85}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </View>
        <Text style={styles.countryText}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Travel History</Text>
          <Text style={styles.subtitle}>
            Tap the map to check off countries you’ve visited.
          </Text>
        </View>

        {/* MAP */}
        <Pressable onPress={() => setModalOpen(true)} style={styles.mapWrap}>
          <View style={styles.mapCard}>
            <Text style={styles.mapTitle}>Tap to edit visited countries</Text>

            <Svg width={mapWidth} height={mapHeight}>
              {countriesWithLabels.map((c) => {
                const d = pathsByLabel.get(c.label);
                if (!d) return null;
                const isVisited = visited.has(c.label);
                return (
                  <Path
                    key={c.label}
                    d={d}
                    fill={isVisited ? GREEN : GREY}
                    stroke="#FFFFFF"
                    strokeWidth={0.5}
                  />
                );
              })}
            </Svg>
          </View>
        </Pressable>

        {/* STATS */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Countries visited"
            value={stats.visitedCount}
            hint="Based on your checklist"
          />
          <StatCard
            label="World progress"
            value={`${stats.progress}%`}
            hint={`${stats.total} total`}
          />
          <StatCard
            label="Remaining"
            value={stats.remaining}
            hint="Keep going 😌"
          />
          <StatCard
            label="Map status"
            value="Live"
            hint="Green updates instantly"
          />
        </View>

        {/* MODAL */}
        <Modal visible={modalOpen} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Visited countries</Text>
                <TouchableOpacity onPress={() => setModalOpen(false)}>
                  <Text style={styles.modalClose}>Done</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Search a country…"
                value={query}
                onChangeText={setQuery}
                style={styles.search}
              />

              <View style={styles.modalMetaRow}>
                <Text style={styles.modalMeta}>
                  Checked:{" "}
                  <Text style={styles.modalMetaStrong}>{visited.size}</Text>
                </Text>

                <TouchableOpacity
                  onPress={() => setVisited(new Set())}
                  disabled={visited.size === 0}
                >
                  <Text
                    style={[
                      styles.clearBtn,
                      visited.size === 0 && { opacity: 0.4 },
                    ]}
                  >
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={filteredList}
                keyExtractor={(item) => item.label}
                renderItem={renderCountryRow}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 18 },

  header: { paddingTop: 10, paddingBottom: 14 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  subtitle: { marginTop: 6, fontSize: 14, color: "rgba(15,23,42,0.65)" },

  mapWrap: { marginBottom: 14 },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mapTitle: { fontSize: 13, color: "rgba(15,23,42,0.7)", marginBottom: 8 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statLabel: { fontSize: 12, color: "rgba(15,23,42,0.65)" },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginTop: 6 },
  statHint: { fontSize: 12, color: "rgba(15,23,42,0.55)", marginTop: 6 },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    height: "82%",
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  modalClose: { fontSize: 15, fontWeight: "800", color: "#2563EB" },

  search: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  modalMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  modalMeta: { fontSize: 13, color: "rgba(15,23,42,0.6)" },
  modalMetaStrong: { fontWeight: "900", color: "#0F172A" },
  clearBtn: { fontSize: 13, fontWeight: "800", color: "#EF4444" },

  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  countryRowChecked: { borderColor: "rgba(34,197,94,0.45)" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    borderColor: "#22C55E",
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  checkboxTick: { fontWeight: "900", color: "#16A34A", marginTop: -1 },
  countryText: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
});