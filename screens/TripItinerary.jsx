import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { deleteTripItem, getTripItems, toSortableDate } from "../utils/tripStorage";

const BLUE = "#4967E8";
const BG = "#F7F7F7";
const TEXT = "#1F1F1F";

export default function TripItinerary() {
  const router = useRouter();
  const [items, setItems] = useState([]);

  const loadItems = useCallback(async () => {
    const data = await getTripItems();
    setItems(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  async function onDelete(id) {
    Alert.alert("Delete item?", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await deleteTripItem(id);
          setItems(updated);
        },
      },
    ]);
  }

  const hotelItems = useMemo(() => {
    return [...items]
      .filter((item) => item.category === "hotel")
      .sort((a, b) => toSortableDate(a) - toSortableDate(b));
  }, [items]);

  const groupedItems = useMemo(() => {
    const normalItems = [...items]
      .filter((item) => item.category !== "hotel")
      .sort((a, b) => toSortableDate(a) - toSortableDate(b));

    const grouped = {};

    normalItems.forEach((item) => {
      if (!grouped[item.dateLabel]) grouped[item.dateLabel] = [];
      grouped[item.dateLabel].push(item);
    });

    return grouped;
  }, [items]);

  function categoryColor(category) {
    if (category === "transportation") return "#FFE8CC";
    if (category === "food") return "#E7F7EC";
    if (category === "hotel") return "#F3E8FF";
    return "#E8EEFF";
  }

  function categoryText(category) {
    if (category === "transportation") return "Transportation";
    if (category === "food") return "Food";
    if (category === "hotel") return "Hotel";
    return "Activity";
  }

  function ItineraryCard({ item }) {
    return (
      <View style={styles.card}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/activitydetails",
              params: { id: item.id },
            })
          }
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryColor(item.category) },
              ]}
            >
              <Text style={styles.categoryBadgeText}>
                {categoryText(item.category)}
              </Text>
            </View>

            <Text style={styles.timeText}>{item.timeLabel || ""}</Text>
          </View>

          <Text style={styles.cardTitle}>{item.description || "Untitled"}</Text>

          {!!item.location && (
            <Text style={styles.cardSubtext}>{item.location}</Text>
          )}

          <View style={styles.cardBottom}>
            <Text style={styles.priceText}>${item.price ?? 0}</Text>

            {item.attachments?.length ? (
              <Text style={styles.attachmentsText}>
                {item.attachments.length} attachment
                {item.attachments.length === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.cardActions}>
          <Pressable
            style={styles.smallIconButton}
            onPress={() =>
              router.push({
                pathname: "/addactivity",
                params: { editId: item.id },
              })
            }
          >
            <Ionicons name="create-outline" size={18} color={TEXT} />
          </Pressable>

          <Pressable
            style={styles.smallIconButton}
            onPress={() => onDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#D9534F" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={TEXT} />
          </Pressable>

          <Text style={styles.title}>Trip Itinerary</Text>

          <Pressable
            onPress={() => router.push("/addactivity")}
            style={styles.headerButton}
          >
            <Ionicons name="add" size={24} color={TEXT} />
          </Pressable>
        </View>

        <View style={styles.hotelSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Hotel Reservations</Text>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/addactivity",
                  params: { presetCategory: "hotel" },
                })
              }
            >
              <Text style={styles.sectionLink}>+ Add Hotel</Text>
            </Pressable>
          </View>

          {hotelItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No hotel reservations yet.</Text>
            </View>
          ) : (
            hotelItems.map((item) => (
              <View key={item.id} style={styles.hotelCard}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/activitydetails",
                      params: { id: item.id },
                    })
                  }
                >
                  <Text style={styles.hotelTitle}>{item.description}</Text>
                  {!!item.location && (
                    <Text style={styles.hotelText}>{item.location}</Text>
                  )}
                  {!!item.reservationNumber && (
                    <Text style={styles.hotelText}>
                      Reservation: {item.reservationNumber}
                    </Text>
                  )}
                  {!!item.timeLabel && (
                    <Text style={styles.hotelText}>
                      {item.dateLabel} • {item.timeLabel}
                    </Text>
                  )}
                </Pressable>

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.smallIconButton}
                    onPress={() =>
                      router.push({
                        pathname: "/addactivity",
                        params: { editId: item.id },
                      })
                    }
                  >
                    <Ionicons name="create-outline" size={18} color={TEXT} />
                  </Pressable>

                  <Pressable
                    style={styles.smallIconButton}
                    onPress={() => onDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#D9534F" />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {Object.keys(groupedItems).length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No itinerary items yet.</Text>
          </View>
        ) : (
          Object.keys(groupedItems).map((date) => (
            <View key={date} style={styles.section}>
              <Text style={styles.dateHeader}>{date}</Text>

              <View style={styles.grid}>
                {groupedItems[date].map((item) => (
                  <ItineraryCard key={item.id} item={item} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  content: {
    padding: 20,
    backgroundColor: BG,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  headerButton: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
  },

  hotelSection: {
    marginBottom: 24,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT,
  },

  sectionLink: {
    fontSize: 14,
    color: BLUE,
    fontWeight: "600",
  },

  hotelCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },

  hotelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 4,
  },

  hotelText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 3,
  },

  section: {
    marginBottom: 24,
  },

  dateHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },

  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT,
  },

  timeText: {
    fontSize: 11,
    color: "#666",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 4,
  },

  cardSubtext: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },

  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  priceText: {
    fontSize: 14,
    color: BLUE,
    fontWeight: "700",
  },

  attachmentsText: {
    fontSize: 11,
    color: "#666",
  },

  cardActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },

  smallIconButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F4",
  },

  emptyBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ECECEC",
    borderRadius: 16,
    padding: 18,
  },

  emptyText: {
    color: "#777",
    fontSize: 14,
  },
});