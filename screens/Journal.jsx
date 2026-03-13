import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export default function JournalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tripId = params.tripId ? String(params.tripId) : null;

  const [entryText, setEntryText] = useState("");
  const [entries, setEntries] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user || !tripId) {
      setEntries([]);
      return;
    }

    const journalRef = doc(db, "users", user.uid, "journals", tripId);

    const unsubscribe = onSnapshot(
      journalRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setEntries([]);
          return;
        }

        const data = snapshot.data();
        const loadedEntries = Array.isArray(data.entries) ? data.entries : [];

        const sortedEntries = [...loadedEntries].sort((a, b) => {
          const aMs = a?.createdAt?.seconds
            ? a.createdAt.seconds * 1000
            : 0;
          const bMs = b?.createdAt?.seconds
            ? b.createdAt.seconds * 1000
            : 0;
          return bMs - aMs;
        });

        const formattedEntries = sortedEntries.map((entry, index) => ({
          id:
            entry.id ||
            `${index}-${entry.createdAt?.seconds || Date.now()}`,
          text: entry.text || "",
          createdAt: entry.createdAt || null,
          daysAgo: getRelativeTime(entry.createdAt),
        }));

        setEntries(formattedEntries);
      },
      (error) => {
        console.log("Journal load error:", error);
        Alert.alert("Error", "Could not load journal entries.");
      }
    );

    return unsubscribe;
  }, [tripId]);

  function getRelativeTime(timestamp) {
    if (!timestamp?.toDate) return "Just Now";

    const createdDate = timestamp.toDate();
    const now = new Date();
    const diffMs = now - createdDate;

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just Now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    if (days === 1) return "1 Day Ago";
    return `${days} Days Ago`;
  }

  async function handleSubmit() {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    if (!tripId) {
      Alert.alert("Missing trip", "No trip ID was passed to the journal screen.");
      return;
    }

    if (!entryText.trim()) return;
    if (submitting) return;

    try {
      setSubmitting(true);

      const journalRef = doc(db, "users", user.uid, "journals", tripId);

      const newEntry = {
        id: Date.now().toString(),
        text: entryText.trim(),
        createdAt: Timestamp.now(),
      };

      const existingEntries = entries.map((entry) => ({
        id: entry.id,
        text: entry.text,
        createdAt: entry.createdAt || Timestamp.now(),
      }));

      await setDoc(
        journalRef,
        {
          tripId,
          updatedAt: serverTimestamp(),
          entries: [newEntry, ...existingEntries],
        },
        { merge: true }
      );

      setEntryText("");
    } catch (error) {
      console.log("Journal submit error:", error);
      Alert.alert("Error", error?.message || "Could not save journal entry.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUploadPhoto() {
    Alert.alert("Photos removed", "This journal currently supports text entries only.");
  }

  const renderEntry = ({ item }) => (
    <View style={styles.entryBlock}>
      <Text style={styles.daysAgo}>{item.daysAgo}</Text>
      {item.text ? <Text style={styles.entryText}>{item.text}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconButton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>

        <Text style={styles.title}>Journal</Text>
        <View style={styles.iconButton} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No journal entries yet for this trip.</Text>
        }
      />

      <View style={styles.bottomArea}>
        <View style={styles.addRow}>
          <Text style={styles.addLabel}>Add Journal Entry</Text>
          <Ionicons
            name="cloud-upload-outline"
            size={22}
            color="#4F6BFF"
            style={{ marginLeft: 6 }}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Write the entry here"
            placeholderTextColor="#aaa"
            value={entryText}
            onChangeText={setEntryText}
            multiline
          />

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadPhoto}>
              <Text style={styles.uploadBtnText}>Upload Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

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

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexGrow: 1,
  },
  entryBlock: {
    marginBottom: 24,
  },
  daysAgo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },
  entryText: {
    fontSize: 14,
    color: "#444",
    marginBottom: 10,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    fontSize: 14,
    marginTop: 30,
  },

  bottomArea: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#fff",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  addLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fafafa",
    maxHeight: 100,
  },
  actionButtons: {
    flexDirection: "column",
    gap: 6,
    alignItems: "center",
  },
  uploadBtn: {
    backgroundColor: "#f0f3ff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F6BFF",
  },
  submitBtn: {
    backgroundColor: "#4F6BFF",
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
});