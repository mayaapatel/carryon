import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StatusBar, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

// 🔑 OpenCage API
const OPENCAGE_API_KEY = "252b650d2acb4397ab93916025da875e";

// 🔥 Firebase
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function SettingsScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [marker, setMarker] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
  });

  // 📥 Load saved location from Firebase
  useEffect(() => {
    const loadUserData = async () => {
      if (!userId) return;

      try {
        const userRef = doc(db, "users", userId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data.location) {
            const loc = data.location;

            setStreet(loc.street || "");
            setCity(loc.city || "");
            setState(loc.state || "");
            setZip(loc.zip || "");

            if (loc.latitude && loc.longitude) {
              setRegion({
                latitude: loc.latitude,
                longitude: loc.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              });

              setMarker({
                latitude: loc.latitude,
                longitude: loc.longitude,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId]);

  const buildAddress = () => {
    return `${street} ${city} ${state} ${zip}`.trim();
  };

  // 📍 Forward Geocoding
  const fetchCoordinates = async () => {
    const address = buildAddress();
    if (!address) return;

    try {
      const res = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${OPENCAGE_API_KEY}`
      );
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry;

        setRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });

        setMarker({ latitude: lat, longitude: lng });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 📍 Reverse Geocoding
  const fetchAddressFromCoords = async (latitude, longitude) => {
    try {
      const res = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${OPENCAGE_API_KEY}`
      );
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const components = data.results[0].components;

        setStreet(components.road || "");
        setCity(components.city || components.town || components.village || "");
        setState(components.state || "");
        setZip(components.postcode || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    setMarker({ latitude, longitude });

    setRegion({
      ...region,
      latitude,
      longitude,
    });

    fetchAddressFromCoords(latitude, longitude);
  };

  // 💾 Save to Firebase
  const saveLocationToFirebase = async () => {
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);

      await updateDoc(userRef, {
        location: {
          street,
          city,
          state,
          zip,
          latitude: marker.latitude,
          longitude: marker.longitude,
        },
      });

      alert("Location saved successfully!");
    } catch (error) {
      console.error(error);
      alert("Error saving location");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}> 
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Before You Travel</Text>
          <View style={{ width: 36 }} />
    </View>

      {/* Toggle */}
      <View style={styles.row}>
        <Text style={styles.label}>Enable Notifications</Text>
        <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
      </View>

      {/* Address Fields */}
      <Text style={styles.label}>Street</Text>
      <TextInput style={styles.input} value={street} onChangeText={setStreet} />

      <Text style={styles.label}>City</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} />

      <Text style={styles.label}>State</Text>
      <TextInput style={styles.input} value={state} onChangeText={setState} />

      <Text style={styles.label}>ZIP Code</Text>
      <TextInput style={styles.input} value={zip} onChangeText={setZip} keyboardType="numeric" />

      {/* Show on Map */}
      <TouchableOpacity style={styles.button} onPress={fetchCoordinates}>
        <Text style={styles.buttonText}>Show on Map</Text>
      </TouchableOpacity>

      {/* Save */}
      <TouchableOpacity style={styles.saveButton} onPress={saveLocationToFirebase}>
        <Text style={styles.buttonText}>Save Location</Text>
      </TouchableOpacity>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView style={styles.map} region={region} onPress={handleMapPress}>
          <Marker coordinate={marker} />
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 50,
  },
  topRow: {
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#007BFF",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#007BFF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    color: "#000",
  },
  button: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "#0056D2",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  mapContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
});
