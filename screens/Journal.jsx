// screens/Journal.jsx
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * Matches the mock:
 * - Top bar with back + centered "Journal"
 * - Middle feed (text + images) is scrollable
 * - Bottom fixed composer: "Add Journal Entry" + upload icon + input + send icon
 *
 * Put in: carryon/screens/Journal.jsx
 * Images expected in: carryon/assets/images/
 * - journal-fuji.jpg
 * - journal-sunset.jpg (or any 2nd image)
 */

export default function Journal() {
  // Mock entries (swap to real data later)
  const entries = useMemo(
    () => [
      {
        id: "e1",
        daysAgo: "3 Days Ago",
        text: "Today's view of Mount Fuji",
        image: require("../assets/images/past-peru.jpg"),
      },
      {
        id: "e2",
        daysAgo: "5 Days Ago",
        text: "I visited to Byodo-In Temple...it was amazing.",
        image: require("../assets/images/past-dc.jpg"),
      },
    ],
    []
  );

  const [draft, setDraft] = useState("");

  const onBack = () => {
    // if using expo-router later: router.back()
    console.log("Back");
  };

  const onAttach = () => console.log("Attach photo");
  const onSend = () => {
    console.log("Send entry:", draft);
    setDraft("");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* Top bar */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Journal</Text>

          {/* spacer */}
          <View style={{ width: 36 }} />
        </View>

        {/* ✅ Scrollable middle content */}
        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          {entries.map((e) => (
            <View key={e.id} style={styles.entry}>
              <Text style={styles.daysAgo}>{e.daysAgo}</Text>
              <Text style={styles.entryText}>{e.text}</Text>

              <View style={styles.imageCard}>
                <Image source={e.image} style={styles.entryImage} />
              </View>
            </View>
          ))}

          {/* spacer so last entry isn't hidden behind composer */}
          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Bottom composer (fixed) */}
        <View style={styles.composer}>
          <View style={styles.composerHeader}>
            <Text style={styles.composerTitle}>Add Journal Entry</Text>
            <TouchableOpacity onPress={onAttach} style={styles.attachBtn} activeOpacity={0.8}>
              <Ionicons name="cloud-upload-outline" size={22} color="#2E5BFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write the entry here"
              placeholderTextColor="rgba(17,24,39,0.35)"
              style={styles.input}
              multiline
            />

            <TouchableOpacity onPress={onSend} style={styles.sendBtn} activeOpacity={0.85}>
              <Ionicons name="arrow-up" size={20} color="#2E5BFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BLUE = "#2E5BFF";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },

  topRow: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  feed: { flex: 1 },
  feedContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 0,
  },

  entry: { marginBottom: 18 },
  daysAgo: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  entryText: {
    fontSize: 12,
    color: "rgba(17,24,39,0.7)",
    marginBottom: 10,
  },

  imageCard: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
    backgroundColor: "#f3f4f6",
  },
  entryImage: {
    width: "100%",
    height: 210,
    resizeMode: "cover",
  },

  composer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(17,24,39,0.10)",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 10,
    backgroundColor: "#fff",
  },

  composerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 10,
  },
  composerTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111827",
  },
  attachBtn: {
    position: "absolute",
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 86,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#fff",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,91,255,0.35)",
    backgroundColor: "rgba(46,91,255,0.06)",
  },
});
