import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";

const BLUE = "#4967E8";
const TEXT = "#111827";
const BORDER = "#E5E7EB";
const BG = "#FFFFFF";

function getTimestampMillis(value) {
  if (!value) return 0;

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  if (typeof value?.seconds === "number") {
    return value.seconds * 1000;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function startOfTodayMillis() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function isPastTrip(trip) {
  const endMillis = getTimestampMillis(trip.endDate);
  return endMillis > 0 && endMillis < startOfTodayMillis();
}

function formatDateRange(startDate, endDate) {
  const startMillis = getTimestampMillis(startDate);
  const endMillis = getTimestampMillis(endDate);

  if (!startMillis || !endMillis) return "";

  const start = new Date(startMillis);
  const end = new Date(endMillis);

  const startText = `${String(start.getMonth() + 1).padStart(2, "0")}/${String(
    start.getDate()
  ).padStart(2, "0")}/${String(start.getFullYear()).slice(-2)}`;

  const endText = `${String(end.getMonth() + 1).padStart(2, "0")}/${String(
    end.getDate()
  ).padStart(2, "0")}/${String(end.getFullYear()).slice(-2)}`;

  return `${startText}-${endText}`;
}

export default function PastTripList() {
  const router = useRouter();
  const [pastTrips, setPastTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTripId, setUpdatingTripId] = useState(null);

  const loadPastTrips = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;
      if (!user) {
        setPastTrips([]);
        return;
      }

      const tripsRef = collection(db, "users", user.uid, "trips");
      const snapshot = await getDocs(tripsRef);

      const loadedTrips = snapshot.docs
        .map((tripDoc) => ({
          id: tripDoc.id,
          ...tripDoc.data(),
        }))
        .filter((trip) => isPastTrip(trip))
        .sort((a, b) => {
          const aEnd = getTimestampMillis(a.endDate);
          const bEnd = getTimestampMillis(b.endDate);
          return bEnd - aEnd;
        });

      setPastTrips(loadedTrips);
    } catch (error) {
      console.log("Error loading past trips:", error);
      setPastTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPastTrips();
    }, [])
  );

  const saveTripPhotoUri = async (trip, uri) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "Please log in first.");
        return;
      }

      setUpdatingTripId(trip.id);

      const tripRef = doc(db, "users", user.uid, "trips", trip.id);

      await updateDoc(tripRef, {
        imageUrl: uri,
      });

      setPastTrips((currentTrips) =>
        currentTrips.map((item) =>
          item.id === trip.id ? { ...item, imageUrl: uri } : item
        )
      );
    } catch (error) {
      console.log("saveTripPhotoUri error:", error);
      Alert.alert("Error", "Could not save photo.");
    } finally {
      setUpdatingTripId(null);
    }
  };

  const pickFromLibrary = async (trip) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        allowsMultipleSelection: false,
      });

      if (result.canceled) return;

      const selectedUri = result.assets?.[0]?.uri;
      if (!selectedUri) return;

      await saveTripPhotoUri(trip, selectedUri);
    } catch (error) {
      console.log("pickFromLibrary error:", error);
      Alert.alert("Error", "Could not add photo.");
    }
  };

  const takePhoto = async (trip) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow camera access.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const selectedUri = result.assets?.[0]?.uri;
      if (!selectedUri) return;

      await saveTripPhotoUri(trip, selectedUri);
    } catch (error) {
      console.log("takePhoto error:", error);
      Alert.alert("Error", "Could not take photo.");
    }
  };

  const removePhoto = async (trip) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      setUpdatingTripId(trip.id);

      const tripRef = doc(db, "users", user.uid, "trips", trip.id);

      await updateDoc(tripRef, {
        imageUrl: "",
      });

      setPastTrips((currentTrips) =>
        currentTrips.map((item) =>
          item.id === trip.id ? { ...item, imageUrl: "" } : item
        )
      );
    } catch (error) {
      console.log("removePhoto error:", error);
      Alert.alert("Error", "Could not remove photo.");
    } finally {
      setUpdatingTripId(null);
    }
  };

  const onChangePhoto = (trip) => {
    Alert.alert("Trip Photo", "Choose what you want to add.", [
      { text: "Take Photo", onPress: () => takePhoto(trip) },
      { text: "Upload Photo", onPress: () => pickFromLibrary(trip) },
      ...(trip.imageUrl
        ? [{ text: "Remove Photo", style: "destructive", onPress: () => removePhoto(trip) }]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const tripCards = useMemo(() => {
    return pastTrips.map((trip) => ({
      ...trip,
      dateText: formatDateRange(trip.startDate, trip.endDate),
    }));
  }, [pastTrips]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </Pressable>

        <Text style={styles.headerTitle}>Past Trips</Text>

        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : tripCards.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyText}>No past trips yet.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {tripCards.map((trip) => {
            const isUpdating = updatingTripId === trip.id;

            return (
              <Pressable
                key={trip.id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/maintrip",
                    params: {
                      tripId: trip.id,
                      title: trip.title || trip.location || "Trip",
                    },
                  })
                }
              >
                {trip.imageUrl ? (
                  <Image source={{ uri: trip.imageUrl }} style={styles.cardImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="image-outline" size={26} color="#9CA3AF" />
                  </View>
                )}

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>
                    {trip.title || trip.location || "Trip"}
                  </Text>

                  {!!trip.dateText && (
                    <Text style={styles.cardDates}>{trip.dateText}</Text>
                  )}

                  <Pressable
                    style={styles.changePhotoBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      onChangePhoto(trip);
                    }}
                  >
                    <Ionicons
                      name={trip.imageUrl ? "create-outline" : "camera-outline"}
                      size={14}
                      color={BLUE}
                    />
                    <Text style={styles.changePhotoText}>Change Photo</Text>

                    {isUpdating && (
                      <ActivityIndicator
                        size="small"
                        color={BLUE}
                        style={styles.photoLoader}
                      />
                    )}
                  </Pressable>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
  },

  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    fontSize: 15,
    color: "#6B7280",
  },

  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },

  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    resizeMode: "cover",
    marginRight: 12,
    backgroundColor: "#EEE",
  },

  placeholderImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  cardBody: {
    flex: 1,
    justifyContent: "center",
    marginRight: 10,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
  },

  cardDates: {
    marginTop: 4,
    fontSize: 13,
    color: BLUE,
    fontWeight: "600",
  },

  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    alignSelf: "flex-start",
  },

  changePhotoText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: BLUE,
  },

  photoLoader: {
    marginLeft: 8,
  },
});