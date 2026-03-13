import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebaseConfig";

export default function JournalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const tripId = params.tripId ? String(params.tripId) : null;

  const [entryText, setEntryText] = useState("");
  const [entries, setEntries] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user || !tripId) {
      setEntries([]);
      return;
    }

    const journalsRef = collection(db, "users", user.uid, "journals");
    const q = query(
      journalsRef,
      where("tripId", "==", tripId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const journalEntries = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            text: data.text || "",
            images: Array.isArray(data.images) ? data.images : [],
            createdAt: data.createdAt || null,
            daysAgo: getRelativeTime(data.createdAt),
          };
        });

        setEntries(journalEntries);
      },
      (error) => {
        console.log("Journal load error:", error);
        console.log("Journal load error code:", error?.code);
        console.log("Journal load error message:", error?.message);

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

  async function uriToBlob(uri) {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  }

  async function uploadPhotoAsync(uri, userId, tripId) {
  const blob = await uriToBlob(uri);

  const fileName = `journal_${Date.now()}.jpg`;
  const storageRef = ref(storage, `users/${userId}/journals/${tripId}/${fileName}`);

  await uploadBytes(storageRef, blob);

  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
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

    if (!entryText.trim() && selectedPhotos.length === 0) return;
    if (submitting) return;

    try {
      setSubmitting(true);

      const imageUrls = await Promise.all(
        selectedPhotos.map((photo) => uploadPhotoAsync(photo.uri, user.uid, tripId))
      );

      await addDoc(collection(db, "users", user.uid, "journals"), {
        tripId,
        text: entryText.trim(),
        images: imageUrls,
        createdAt: serverTimestamp(),
      });

      setEntryText("");
      setSelectedPhotos([]);
    } catch (error) {
      console.log("Journal submit error object:", error);
      console.log("Journal submit error code:", error?.code);
      console.log("Journal submit error message:", error?.message);

      Alert.alert(
        "Upload failed",
        error?.message || "Could not save journal entry."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    if (result.canceled) return;

    const newItems = result.assets.map((asset) => ({
      id: `${Date.now()}-${Math.random()}`,
      uri: asset.uri,
      name: asset.fileName || "Photo",
    }));

    setSelectedPhotos((prev) => [...prev, ...newItems]);
  }

  async function takePhoto() {
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

    const newItems = result.assets.map((asset) => ({
      id: `${Date.now()}-${Math.random()}`,
      uri: asset.uri,
      name: asset.fileName || "Camera Photo",
    }));

    setSelectedPhotos((prev) => [...prev, ...newItems]);
  }

  function handleUploadPhoto() {
    Alert.alert("Add Photo", "Choose what you want to do.", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Upload Photo", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function removePhoto(id) {
    setSelectedPhotos((prev) => prev.filter((item) => item.id !== id));
  }

  const renderEntry = ({ item }) => (
    <View style={styles.entryBlock}>
      <Text style={styles.daysAgo}>{item.daysAgo}</Text>

      {item.text ? <Text style={styles.entryText}>{item.text}</Text> : null}

      {Array.isArray(item.images) && item.images.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.entryImagesRow}
        >
          {item.images.map((img, index) => (
            <Image
              key={`${item.id}-${index}`}
              source={{ uri: img }}
              style={styles.entryImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      ) : null}
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

        {selectedPhotos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attachmentsRow}
          >
            {selectedPhotos.map((item) => (
              <View key={item.id} style={styles.attachmentCard}>
                <Image source={{ uri: item.uri }} style={styles.attachmentImage} />

                <Pressable
                  style={styles.removeAttachmentButton}
                  onPress={() => removePhoto(item.id)}
                >
                  <Ionicons name="close-circle" size={20} color="#D9534F" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

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
  entryImagesRow: {
    paddingRight: 8,
  },
  entryImage: {
    width: 220,
    height: 180,
    borderRadius: 12,
    marginRight: 10,
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

  attachmentsRow: {
    paddingBottom: 12,
    paddingTop: 4,
  },
  attachmentCard: {
    width: 110,
    height: 90,
    borderRadius: 12,
    marginRight: 10,
    position: "relative",
    overflow: "visible",
  },
  attachmentImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  removeAttachmentButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 999,
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