// screens/PastTripList.jsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function PastTripList() {
  const router = useRouter();

  const trips = [
    {
      id: "hawaii",
      title: "Hawaii, USA",
      dates: "12/24/25-01/02/26",
      img: require("../assets/images/past-hawaii.jpeg"),
    },
    {
      id: "dc",
      title: "Washington D.C., USA",
      dates: "07/17/25-07/23/25",
      img: require("../assets/images/past-dc.jpg"),
    },
    {
      id: "california",
      title: "California, USA",
      dates: "05/28/25-06/01/25",
      img: require("../assets/images/past-california.jpg"),
    },
    {
      id: "peru",
      title: "Peru",
      dates: "03/21/25-03/29/25",
      img: require("../assets/images/past-peru.jpg"),
    },
    {
      id: "nyc",
      title: "New York City, USA",
      dates: "11/24/24-11/29/24",
      img: require("../assets/images/past-nyc.png"),
    },
    {
      id: "portugal",
      title: "Portugal",
      dates: "06/10/24-06/18/24",
      img: require("../assets/images/past-portugal.png"),
    },
  ];

  const openTrip = (trip) => {
    router.push({ pathname: "/trip/[id]", params: { id: trip.id } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.replace("/travelhistory")} style={styles.iconButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>

        <Text style={styles.title}>Past Trips</Text>

        <View style={styles.iconButton} />
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {trips.map((t) => (
          <Pressable key={t.id} onPress={() => openTrip(t)} style={styles.row}>
            <Image source={t.img} style={styles.thumb} />
            <View style={styles.textCol}>
              <Text style={styles.tripTitle}>{t.title}</Text>
              <Text style={styles.tripDates}>{t.dates}</Text>
            </View>
          </Pressable>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  topRow: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 22,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  textCol: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  tripTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  tripDates: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(17,24,39,0.75)",
  },
});