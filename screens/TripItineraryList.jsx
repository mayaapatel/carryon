import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { auth, db } from "../firebaseConfig"; // adjust path
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";

/** ---------- helpers ---------- */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function minToLabel(min) {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${pad2(m)} ${ampm}`;
}
function prettyDay(dateKey) {
  // dateKey: YYYY-MM-DD
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = dt.toLocaleDateString(undefined, { weekday: "long" });
  const md = dt.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
  return `${dow} • ${md}`;
}

const CATEGORY = {
  need: { label: "Still Need to Book", color: "#F8B4C7" },
  check: { label: "Check", color: "#FDE68A" },
  transport: { label: "Transportation", color: "#86EFAC" },
  bought: { label: "Already Bought", color: "#67E8F9" },
  food: { label: "Food", color: "#D8B4FE" },
  default: { label: "Other", color: "rgba(15,23,42,0.12)" },
};

function groupByDay(activities) {
  const map = new Map();
  for (const a of activities) {
    const k = a.date || "unknown";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(a);
  }
  // sort activities within day by startMin
  for (const [k, arr] of map.entries()) {
    arr.sort((x, y) => (x.startMin ?? 0) - (y.startMin ?? 0));
  }
  // convert to array sorted by date
  const days = Array.from(map.entries())
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([date, items]) => ({ date, items }));
  return days;
}

export default function TripItineraryList({ tripId = "hawaii-2025" }) {
  const uid = auth.currentUser?.uid;
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!uid || !tripId) return;

    const ref = collection(db, "activities");
    const qy = query(
      ref,
      where("userId", "==", uid),
      where("tripId", "==", tripId),
      orderBy("date", "asc"),
      orderBy("startMin", "asc")
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setActivities(rows);
      },
      (err) => console.log("itinerary snapshot error:", err)
    );

    return unsub;
  }, [uid, tripId]);

  const days = useMemo(() => groupByDay(activities), [activities]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Trip Itinerary</Text>
        <Text style={styles.sub}>Scroll through all days</Text>
      </View>

      <FlatList
        data={days}
        keyExtractor={(d) => d.date}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <DayCard
            dateKey={item.date}
            items={item.items}
            onPressItem={(a) => console.log("pressed", a.id)}
          />
        )}
        ListEmptyComponent={
          <View style={{ padding: 14 }}>
            <Text style={{ color: "rgba(15,23,42,0.65)" }}>
              No activities yet. Add one and it’ll show up here instantly.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function DayCard({ dateKey, items, onPressItem }) {
  return (
    <View style={styles.dayCard}>
      <Text style={styles.dayTitle}>{prettyDay(dateKey)}</Text>

      {items.map((a) => {
        const cat = CATEGORY[a.category] || CATEGORY.default;
        const start = a.startMin ?? 0;
        const end = a.endMin ?? start + 30;
        const duration = Math.max(5, Math.round((end - start) / 5) * 5);

        return (
          <Pressable
            key={a.id}
            onPress={() => onPressItem?.(a)}
            style={[styles.item, { borderLeftColor: cat.color }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {a.title}
              </Text>

              {!!a.location && (
                <Text style={styles.itemSub} numberOfLines={1}>
                  {a.location}
                </Text>
              )}

              <Text style={styles.itemSub}>
                {minToLabel(start)} – {minToLabel(end)} • {duration} min
              </Text>

              <Text style={[styles.pill, { backgroundColor: cat.color }]}>
                {cat.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  header: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800" },
  sub: { marginTop: 2, color: "rgba(15,23,42,0.55)" },

  dayCard: {
    backgroundColor: "rgba(15,23,42,0.03)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  dayTitle: { fontWeight: "900", fontSize: 15, marginBottom: 10 },

  item: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    borderLeftWidth: 6,
    marginBottom: 10,
  },
  itemTitle: { fontWeight: "900", fontSize: 14, color: "rgba(15,23,42,0.92)" },
  itemSub: { marginTop: 3, fontSize: 12, color: "rgba(15,23,42,0.70)" },

  pill: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(15,23,42,0.85)",
    overflow: "hidden",
  },
});