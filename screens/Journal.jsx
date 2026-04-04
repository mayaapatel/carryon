import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Compress + convert a local image URI → base64 string (jpeg, ≤800px wide). */
async function uriToBase64(uri) {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return manipulated.base64; // plain base64, no data-URI prefix
}

function getRelativeTime(timestamp) {
  if (!timestamp?.toDate) return "Just now";
  const created = timestamp.toDate();
  const diffMs = Date.now() - created;
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(diffMs / 3600000);
  const day = Math.floor(diffMs / 86400000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (day === 1) return "1 day ago";
  return `${day} days ago`;
}

// ─── component ──────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const router = useRouter();
  const { journalId: rawJournalId, tripId: rawTripId } = useLocalSearchParams();
  const passedJournalId = rawJournalId ? String(rawJournalId) : null;
  const tripId = rawTripId ? String(rawTripId) : null;

  const [resolvedJournalId, setResolvedJournalId] = useState(passedJournalId);
  const [entryText, setEntryText] = useState("");
  const [pendingImages, setPendingImages] = useState([]); // { uri, base64 }[]
  const [messages, setMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // ── resolve journalId: use passed one, or look up by tripId ──────────────
  useEffect(() => {
    console.log("passedJournalId:", passedJournalId, "tripId:", tripId);
    if (passedJournalId) {
      setResolvedJournalId(passedJournalId);
      return;
    }

    // no journalId passed (e.g. navigating from dashboard to old trip),
    // so query journals to find the one that matches this tripId
    const user = auth.currentUser;
    if (!user || !tripId) return;

    const journalsRef = collection(db, "users", user.uid, "journals");
    const q = query(journalsRef, where("tripId", "==", tripId));

    getDocs(q).then((snap) => {
      if (!snap.empty) {
        setResolvedJournalId(snap.docs[0].id);
      }
    }).catch((err) => console.error("Journal lookup error:", err));
  }, [passedJournalId, tripId]);

  // ── real-time listener on messages subcollection ──────────────────────────
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !resolvedJournalId) { setMessages([]); return; }

    const messagesRef = collection(db, "users", user.uid, "journals", resolvedJournalId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(loaded);
    }, (err) => {
      console.error("Journal listener error:", err);
      Alert.alert("Error", "Could not load journal entries.");
    });

    return unsub;
  }, [resolvedJournalId]);

  // ── image picker ─────────────────────────────────────────────────────────

  async function requestPermission(type) {
    if (type === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === "granted";
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  }

  async function pickFromLibrary() {
    const ok = await requestPermission("library");
    if (!ok) { Alert.alert("Permission denied", "Allow photo access in Settings."); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 1,
    });

    if (!result.canceled) await addImages(result.assets);
  }

  async function pickFromCamera() {
    const ok = await requestPermission("camera");
    if (!ok) { Alert.alert("Permission denied", "Allow camera access in Settings."); return; }

    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) await addImages(result.assets);
  }

  async function addImages(assets) {
    const slots = 4 - pendingImages.length;
    if (slots <= 0) { Alert.alert("Limit reached", "You can attach up to 4 images."); return; }
    const toAdd = assets.slice(0, slots);

    const prepared = await Promise.all(
      toAdd.map(async (asset) => {
        const base64 = await uriToBase64(asset.uri);
        return { uri: asset.uri, base64 };
      })
    );
    setPendingImages((prev) => [...prev, ...prepared]);
  }

  function removeImage(idx) {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── show action sheet (iOS-style) or fallback alert ──────────────────────
  function showImageOptions() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) pickFromCamera();
          if (idx === 2) pickFromLibrary();
        }
      );
    } else {
      Alert.alert("Add Image", "", [
        { text: "Take Photo", onPress: pickFromCamera },
        { text: "Choose from Library", onPress: pickFromLibrary },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const user = auth.currentUser;
    if (!user) { Alert.alert("Not logged in", "Please log in again."); return; }
    if (!resolvedJournalId) { Alert.alert("Missing journal", "No journal ID found."); return; }
    if (!entryText.trim() && pendingImages.length === 0) return;
    if (submitting) return;

    setSubmitting(true);
    try {
      const messagesRef = collection(db, "users", user.uid, "journals", resolvedJournalId, "messages");

      await addDoc(messagesRef, {
        text: entryText.trim(),
        // store images as base64 strings directly in Firestore
        images: pendingImages.map((img) => img.base64),
        createdAt: serverTimestamp(),
      });

      setEntryText("");
      setPendingImages([]);
    } catch (err) {
      console.error("Submit error:", err);
      Alert.alert("Error", err?.message || "Could not save entry.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  const renderMessage = ({ item }) => (
    <View style={styles.entryBlock}>
      <Text style={styles.daysAgo}>{getRelativeTime(item.createdAt)}</Text>

      {/* images grid */}
      {Array.isArray(item.images) && item.images.length > 0 && (
        <View style={styles.imageGrid}>
          {item.images.map((b64, i) => {
            // strip accidental data-URI prefix if already present
            const clean = b64.replace(/^data:image\/[a-z]+;base64,/, "");
            const isSingle = item.images.length === 1;
            return (
              <Image
                key={i}
                source={{ uri: `data:image/jpeg;base64,${clean}` }}
                style={isSingle ? styles.savedImageFull : styles.savedImage}
                resizeMode="cover"
              />
            );
          })}
        </View>
      )}

      {!!item.text && <Text style={styles.entryText}>{item.text}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* ── header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.title}>Journal</Text>
        <View style={styles.iconButton} />
      </View>

      {/* ── message list ── */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={null}
      />

      {/* ── bottom composer ── */}
      <View style={styles.bottomArea}>
        <View style={styles.addRow}>
          <Text style={styles.addLabel}>Add Journal Entry</Text>
        </View>

        {/* pending image preview strip */}
        {pendingImages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.previewStrip}
            contentContainerStyle={styles.previewStripContent}
          >
            {pendingImages.map((img, idx) => (
              <View key={idx} style={styles.previewWrapper}>
                <Image source={{ uri: img.uri }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeImage(idx)}
                  hitSlop={4}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {/* "add more" tile if < 4 images */}
            {pendingImages.length < 4 && (
              <TouchableOpacity style={styles.addMoreTile} onPress={showImageOptions}>
                <Ionicons name="add" size={28} color="#4F6BFF" />
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* text + actions row */}
        <View style={styles.inputRow}>
          {/* camera / image button */}
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={showImageOptions}
            disabled={pendingImages.length >= 4}
          >
            <Ionicons
              name="camera"
              size={22}
              color={pendingImages.length >= 4 ? "#ccc" : "#4F6BFF"}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Write the entry here"
            placeholderTextColor="#aaa"
            value={entryText}
            onChangeText={setEntryText}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (submitting || (!entryText.trim() && pendingImages.length === 0)) &&
                styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || (!entryText.trim() && pendingImages.length === 0)}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  // header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },

  // list
  listContent: { paddingHorizontal: 20, paddingBottom: 16, flexGrow: 1 },
  entryBlock: { marginBottom: 28 },
  daysAgo: { fontSize: 13, fontWeight: "700", color: "#999", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  entryText: { fontSize: 14, color: "#333", lineHeight: 21, marginTop: 8 },
  emptyText: { textAlign: "center", color: "#aaa", fontSize: 14, marginTop: 40 },

  // saved images (in message)
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  savedImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  savedImageFull: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },

  // bottom composer
  bottomArea: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: "#fff",
  },
  addRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  addLabel: { fontSize: 14, fontWeight: "600", color: "#111" },

  // pending image preview strip
  previewStrip: { marginBottom: 10 },
  previewStripContent: { gap: 8, paddingRight: 8 },
  previewWrapper: { position: "relative" },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
  },
  addMoreTile: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#4F6BFF",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f3ff",
  },

  // input row
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  cameraBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f0f3ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fafafa",
    maxHeight: 100,
  },
  submitBtn: {
    backgroundColor: "#4F6BFF",
    borderRadius: 20,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  submitBtnDisabled: { opacity: 0.4 },
});