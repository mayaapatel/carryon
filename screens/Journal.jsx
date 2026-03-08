import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    FlatList,
    Image,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Sample data — replace with real data from Firebase
const SAMPLE_ENTRIES = [
  {
    id: "1",
    daysAgo: "3 Days Ago",
    text: "Today's view of Mount Fuji",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Mount_Fuji_from_Hotel_Mt_Fuji_crop.jpg/1280px-Mount_Fuji_from_Hotel_Mt_Fuji_crop.jpg",
  },
  {
    id: "2",
    daysAgo: "5 Days Ago",
    text: "I visited to Byodo-In Temple.. it was amazing.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Byodo-In_Temple_reflected_in_pond.jpg/1280px-Byodo-In_Temple_reflected_in_pond.jpg",
  },
];

export default function JournalScreen() {
  const router = useRouter();
  const [entryText, setEntryText] = useState("");
  const [entries, setEntries] = useState(SAMPLE_ENTRIES);

  const handleSubmit = () => {
    if (!entryText.trim()) return;
    const newEntry = {
      id: Date.now().toString(),
      daysAgo: "Just Now",
      text: entryText.trim(),
      image: null,
    };
    setEntries([newEntry, ...entries]);
    setEntryText("");
  };

  const handleUploadPhoto = () => {
    router.push("/camera")
  };

  const renderEntry = ({ item }) => (
    <View style={styles.entryBlock}>
      <Text style={styles.daysAgo}>{item.daysAgo}</Text>
      {item.text ? <Text style={styles.entryText}>{item.text}</Text> : null}
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.entryImage} resizeMode="cover" />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.title}>Journal</Text>
        <View style={styles.iconButton} />
      </View>

      {/* Entries List */}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Input Area */}
      <View style={styles.bottomArea}>

        {/* Add Journal Entry row */}
        <View style={styles.addRow}>
          <Text style={styles.addLabel}>Add Journal Entry</Text>
          <Ionicons name="cloud-upload-outline" size={22} color="#4F6BFF" style={{ marginLeft: 6 }} />
        </View>

        {/* Text input + action buttons */}
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
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
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

  // Header
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

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  entryImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },

  // Bottom area
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
});