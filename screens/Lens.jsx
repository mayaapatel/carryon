
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";

const BLUE = "#3F63F3";
const API_URL =
  "https://carryon-lens-api.mayaanishpatel.workers.dev/scan";

export default function Lens() {
  const router = useRouter();

  const [photo, setPhoto] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [discovery, setDiscovery] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectPhoto = (uri) => {
    setPhoto(uri);
    setDiscovery(null);
    setSaved(false);
  };

  const takePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Camera Permission",
          "Please allow camera access to use CarryOn Lens."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        selectPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Camera Error", error.message);
    }
  };

  const choosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        selectPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Gallery Error", error.message);
    }
  };

  const scanPhoto = async () => {
    if (!photo || scanning) return;

    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in before using CarryOn Lens."
      );
      return;
    }

    setScanning(true);
    setDiscovery(null);
    setSaved(false);

    try {
      // Resize and convert the photo to JPEG.
      const processed = await ImageManipulator.manipulateAsync(
        photo,
        [{ resize: { width: 1200 } }],
        {
          compress: 0.65,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Read the JPEG as Base64 for Gemini.
      const base64 = await FileSystem.readAsStringAsync(
        processed.uri,
        { encoding: FileSystem.EncodingType.Base64 }
      );

      if (base64.length > 5_000_000) {
        throw new Error(
          "This photo is too large. Please choose another."
        );
      }

      // Firebase token proves the user is signed in.
      const token = await user.getIdToken();

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: base64,
          mimeType: "image/jpeg",
        }),
      });

      const result = await response.json();

if (!response.ok) {
  console.log("Lens API error:", result);

  throw new Error(
    result.details ||
    result.error ||
    `Scan failed (${response.status})`
  );
}

      if (!result.discovery) {
        throw new Error("No discovery information returned.");
      }

      setDiscovery(result.discovery);
    } catch (error) {
      console.log("CarryOn Lens scan error:", error);
      Alert.alert(
        "Unable to Scan",
        error.message || "Please try again."
      );
    } finally {
      setScanning(false);
    }
  };

  const saveDiscovery = async () => {
    if (!discovery || saving || saved) return;

    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Sign In Required", "Please sign in first.");
      return;
    }

    setSaving(true);

    try {
      await addDoc(
        collection(db, "users", user.uid, "discoveries"),
        {
          name: discovery.name || "Unknown Discovery",
          category: discovery.category || "Other",
          description: discovery.description || "",
          history: discovery.history || "",
          funFacts: Array.isArray(discovery.funFacts)
            ? discovery.funFacts
            : [],
          confidence: discovery.confidence || "unknown",
          createdAt: serverTimestamp(),
        }
      );

      setSaved(true);

      Alert.alert(
        "Discovery Saved!",
        "Your discovery has been saved to CarryOn."
      );
    } catch (error) {
      console.log("Save discovery error:", error);
      Alert.alert(
        "Save Failed",
        "Could not save your discovery. Check your Firestore permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={BLUE} />
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.heading}>
          <View style={styles.logo}>
            <Ionicons
              name="scan-outline"
              size={32}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.title}>CarryOn Lens</Text>
          <Text style={styles.tagline}>POINT. SCAN. DISCOVER.</Text>

          <Text style={styles.description}>
            Every place has a story. Discover the world around you,
            one photo at a time.
          </Text>
        </View>

        <View style={styles.previewCard}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={styles.previewImage}
            />
          ) : (
            <View style={styles.emptyPreview}>
              <Ionicons
                name="scan-outline"
                size={72}
                color="#8298F9"
              />
              <Text style={styles.emptyTitle}>
                What will you discover?
              </Text>
              <Text style={styles.emptyDescription}>
                Capture a landmark, artwork, food, plant,
                animal, or anything interesting!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={takePhoto}
            disabled={scanning}
          >
            <Ionicons
              name="camera-outline"
              size={21}
              color="#FFFFFF"
            />
            <Text style={styles.cameraText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.galleryButton}
            onPress={choosePhoto}
            disabled={scanning}
          >
            <Ionicons
              name="images-outline"
              size={21}
              color={BLUE}
            />
            <Text style={styles.galleryText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {photo && (
          <>
            <TouchableOpacity
              style={[
                styles.scanButton,
                scanning && styles.disabledButton,
              ]}
              onPress={scanPhoto}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.scanText}>
                    Discovering...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="sparkles-outline"
                    size={21}
                    color="#FFFFFF"
                  />
                  <Text style={styles.scanText}>
                    Discover with AI
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                selectPhoto(null);
              }}
              disabled={scanning}
            >
              <Text style={styles.clearText}>
                Remove Photo
              </Text>
            </TouchableOpacity>
          </>
        )}

        {discovery && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons
                name="sparkles"
                size={22}
                color={BLUE}
              />
              <Text style={styles.resultLabel}>
                YOUR DISCOVERY
              </Text>
            </View>

            <Text style={styles.discoveryName}>
              {discovery.name || "Interesting Discovery"}
            </Text>

            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {discovery.category || "Discovery"}
              </Text>
            </View>

            <Text style={styles.sectionHeading}>
              What is it?
            </Text>
            <Text style={styles.resultText}>
              {discovery.description || "No description available."}
            </Text>

            {!!discovery.history && (
              <>
                <Text style={styles.sectionHeading}>
                  History & Significance
                </Text>
                <Text style={styles.resultText}>
                  {discovery.history}
                </Text>
              </>
            )}

            {Array.isArray(discovery.funFacts) &&
              discovery.funFacts.length > 0 && (
                <>
                  <Text style={styles.sectionHeading}>
                    Fun Facts
                  </Text>

                  {discovery.funFacts.map((fact, index) => (
                    <View
                      key={index}
                      style={styles.factRow}
                    >
                      <Ionicons
                        name="bulb-outline"
                        size={18}
                        color={BLUE}
                      />
                      <Text style={styles.factText}>
                        {fact}
                      </Text>
                    </View>
                  ))}
                </>
              )}

            <Text style={styles.confidenceText}>
              AI confidence: {discovery.confidence || "unknown"}
            </Text>

            <Text style={styles.disclaimer}>
              AI can make mistakes. Verify important facts
              and uncertain identifications.
            </Text>

            <TouchableOpacity
              style={[
                styles.saveButton,
                saved && styles.savedButton,
              ]}
              onPress={saveDiscovery}
              disabled={saving || saved}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={saved ? "checkmark-circle" : "bookmark-outline"}
                    size={21}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveText}>
                    {saved ? "Discovery Saved" : "Save Discovery"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons
            name="bulb-outline"
            size={23}
            color={BLUE}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Explore beyond landmarks
            </Text>
            <Text style={styles.infoText}>
              Discover architecture, art, history, local food,
              wildlife, nature, and hidden gems.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DCE6FF",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingBottom: 45,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 25,
  },
  backText: {
    color: BLUE,
    fontSize: 15,
    fontWeight: "700",
  },
  heading: {
    alignItems: "center",
    marginBottom: 26,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: BLUE,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: BLUE,
  },
  tagline: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6681FF",
    letterSpacing: 2,
    marginTop: 7,
  },
  description: {
    textAlign: "center",
    fontSize: 14,
    color: "#53617D",
    lineHeight: 22,
    marginTop: 13,
    paddingHorizontal: 12,
  },
  previewCard: {
    height: 310,
    borderRadius: 22,
    backgroundColor: "#C9D7FF",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#B4C6FF",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  emptyPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: BLUE,
    marginTop: 20,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 13,
    color: "#53617D",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  cameraText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  galleryButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#B4C6FF",
  },
  galleryText: {
    color: BLUE,
    fontWeight: "700",
    fontSize: 14,
  },
  scanButton: {
    marginTop: 16,
    backgroundColor: "#2749D8",
    paddingVertical: 17,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  disabledButton: {
    opacity: 0.65,
  },
  scanText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  clearButton: {
    alignItems: "center",
    paddingVertical: 15,
  },
  clearText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  resultCard: {
    marginTop: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#B4C6FF",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: BLUE,
    letterSpacing: 1.3,
  },
  discoveryName: {
    fontSize: 25,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E6ECFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  categoryText: {
    color: BLUE,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: BLUE,
    marginTop: 20,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 23,
  },
  factRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  factText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
  },
  confidenceText: {
    marginTop: 15,
    fontSize: 12,
    fontWeight: "700",
    color: "#53617D",
  },
  disclaimer: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 17,
    color: "#6B7280",
  },
  saveButton: {
    backgroundColor: BLUE,
    borderRadius: 13,
    paddingVertical: 16,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  savedButton: {
    backgroundColor: "#2F855A",
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  infoCard: {
    marginTop: 25,
    padding: 17,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: BLUE,
    fontWeight: "800",
    fontSize: 14,
  },
  infoText: {
    color: "#53617D",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
});
