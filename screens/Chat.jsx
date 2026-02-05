import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

function initialsFrom(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0][0] || "?").toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Chat() {
  // ✅ starts with ONE fake group chat so it’s not blank
  const [chats, setChats] = useState([
    {
      id: "tokyo-trip-2026",
      type: "gc",
      title: "Tokyo Trip 2026",
      members: ["Ava Chen", "Noah Kim", "Hailey Park", "You"],
      updatedAt: "9:41 AM",
      lastMessage: "I think I am most excited to eat their sushi.",
    },
  ]);

  const router = useRouter();

  const [activeChatId, setActiveChatId] = useState(null);

  // messages stored by chatId
  const [messagesByChat, setMessagesByChat] = useState({
  "tokyo-trip-2026": [
    { id: "m1", fromMe: false, sender: "Ava Chen", text: "Oh?" },
    { id: "m2", fromMe: false, sender: "Noah Kim", text: "Cool" },
    { id: "m3", fromMe: false, sender: "Hailey Park", text: "Who’s Excited?" },
    {
      id: "m4",
      fromMe: true,
      sender: "You",
      text:
        "I am! This trip is going to be once in a lifetime. I am so excited to see Mount Fuji, the cherry blossoms, and go Tokyo Drifting.",
    },
    { id: "m5", fromMe: true, sender: "You", text: "Wahoo!" },
    { id: "m6", fromMe: false, sender: "Ava Chen", text: "Omg" },
    { id: "m7", fromMe: false, sender: "Noah Kim", text: "Those all sound fun!" },
    { id: "m8", fromMe: false, sender: "Hailey Park", text: "I think I am most excited to eat their sushi." },
  ],
});


  // UI mode inside SAME file:
  // "list" | "create" | "room"
  const [mode, setMode] = useState("list");

  // Create group state
  const [groupName, setGroupName] = useState("Tokyo Trip 2026");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState([]);

  // Room message input
  const [text, setText] = useState("");

  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return chats.find((c) => c.id === activeChatId) || null;
  }, [activeChatId, chats]);

  const roomMessages = useMemo(() => {
    if (!activeChatId) return [];
    return messagesByChat[activeChatId] || [];
  }, [activeChatId, messagesByChat]);

  const avatarTop3 = useMemo(() => {
    const list =
      mode === "create"
        ? members
        : activeChat?.members || [];
    return list.slice(0, 3);
  }, [mode, members, activeChat]);

  const avatarExtra = useMemo(() => {
    const list =
      mode === "create"
        ? members
        : activeChat?.members || [];
    return Math.max(0, list.length - 3);
  }, [mode, members, activeChat]);

  function openChat(chatId) {
    setActiveChatId(chatId);
    setMode("room");
    setText("");
  }

  function goBackToList() {
    setMode("list");
    setActiveChatId(null);
  }

  function goToCreate() {
    setMode("create");
    setGroupName("Tokyo Trip 2026");
    setMembers([]);
    setMemberInput("");
  }

  function addMember() {
    const v = memberInput.trim();
    if (!v) return;
    if (members.includes(v)) return;
    setMembers((prev) => [...prev, v]);
    setMemberInput("");
  }

  function createGroup() {
    const id = "gc_" + Date.now().toString();
    const title = groupName.trim() || "New Group";
    const memberList = members.length ? members : ["You"];

    const newChat = {
      id,
      type: "gc",
      title,
      members: memberList,
      updatedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      lastMessage: "",
    };

    setChats((prev) => [newChat, ...prev]);
    setMessagesByChat((prev) => ({
      ...prev,
      [id]: [],
    }));

    // jump straight into the new chat room
    setActiveChatId(id);
    setMode("room");
  }

  function send() {
    const v = text.trim();
    if (!v || !activeChatId) return;

    const msg = { id: Date.now().toString(), fromMe: true, sender: "You", text: v };


    setMessagesByChat((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), msg],
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              lastMessage: v,
              updatedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            }
          : c
      )
    );

    setText("");

    
  }

  const onBack = () => {
    // If using expo-router later: router.back()
    router.back()
  };

  // ===========================
  // RENDER: LIST
  // ===========================
  if (mode === "list") {
    return (
      <View style={styles.screen}>
        <View style={styles.topRow}>

        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.h1}>Chat</Text>

          <Pressable onPress={goToCreate} style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.newBtnText}>+ New Group</Text>
          </Pressable>
        </View>

        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openChat(item.id)}
              style={({ pressed }) => [styles.chatRow, pressed && { opacity: 0.92 }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {!!item.lastMessage && (
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                )}
              </View>
              <Text style={styles.time}>{item.updatedAt}</Text>
            </Pressable>
          )}
        />
      </View>
    );
  }

  // ===========================
  // Shared TOP BAR (like screenshot)
  // ===========================
  const TopBar = (
    <>
      <View style={{ height: 40 }} />
      <View style={styles.topBar}>
        <Pressable
          onPress={mode === "room" ? goBackToList : () => setMode("list")}
          style={styles.backBtn}
        >
          <Text style={styles.backTxt}>‹</Text>
        </Pressable>

        <View style={styles.avatarRow}>
          {avatarTop3.map((name, idx) => (
            <View key={name + idx} style={[styles.avatar, { marginLeft: idx === 0 ? 0 : -8 }]}>
              <Text style={styles.avatarTxt}>{initialsFrom(name)}</Text>
            </View>
          ))}
          {avatarExtra > 0 && (
            <View style={[styles.avatar, styles.avatarExtra, { marginLeft: avatarTop3.length === 0 ? 0 : -8 }]}>
              <Text style={styles.avatarExtraTxt}>+{avatarExtra}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={memberInput}
          onChangeText={setMemberInput}
          placeholder="Search users to add"
          placeholderTextColor="rgba(15,23,42,0.45)"
          style={styles.search}
          returnKeyType="done"
          onSubmitEditing={addMember}
        />
        <Pressable onPress={addMember} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.addBtnTxt}>+</Text>
        </Pressable>
      </View>
    </>
  );

  // ===========================
  // RENDER: CREATE
  // ===========================
  if (mode === "create") {
    return (
      <View style={styles.screenPlain}>
        {TopBar}

        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={styles.sectionLabel}>Group name</Text>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name"
            placeholderTextColor="rgba(15,23,42,0.45)"
            style={styles.groupName}
          />

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Members</Text>
          {members.length === 0 ? (
            <Text style={styles.helper}>Type a name/email above and tap + to add people.</Text>
          ) : (
            <View style={styles.chips}>
              {members.map((m) => (
                <View key={m} style={styles.chip}>
                  <Text style={styles.chipTxt}>{m}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable onPress={createGroup} style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.92 }]}>
            <Text style={styles.createBtnTxt}>Create Group Chat</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ===========================
  // RENDER: ROOM (chat UI like screenshot)
  // ===========================
  return (
    <KeyboardAvoidingView
      style={styles.screenPlain}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {TopBar}

      <View style={styles.chatHeader}>
        <Text style={styles.roomTitle}>{activeChat?.title || "Chat"}</Text>
        <Text style={styles.roomTime}>
          {new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })},{" "}
          {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </Text>
      </View>

      <FlatList
        data={roomMessages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
        renderItem={({ item }) => (
            <View style={{ marginBottom: 10, alignSelf: item.fromMe ? "flex-end" : "flex-start" }}>
                <View style={[styles.bubble, item.fromMe ? styles.mine : styles.theirs]}>
                <Text style={[styles.msg, item.fromMe ? styles.msgMine : styles.msgTheirs]}>
                    {item.text}
                </Text>
                </View>

                {/* Name under message */}
                <Text style={[styles.senderName, item.fromMe ? styles.senderMe : styles.senderThem]}>
                {item.sender}
                </Text>
            </View>
            )}

      />

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor="rgba(15,23,42,0.45)"
          style={styles.input}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable onPress={send} style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.92 }]}>
          <Text style={styles.sendTxt}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // List page
  screen: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 18 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  h1: { fontSize: 26, fontWeight: "700", color: "#0f172a" },

  newBtn: { backgroundColor: "rgba(15,23,42,0.06)", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  newBtnText: { fontWeight: "800", color: "#0f172a", fontSize: 13 },

  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.04)",
  },
  chatTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  preview: { fontSize: 14, color: "rgba(15,23,42,0.6)", marginTop: 2 },
  time: { fontSize: 12, color: "rgba(15,23,42,0.5)", marginLeft: 10 },

  // Modal-ish screens
  screenPlain: { flex: 1, backgroundColor: "#fff" },

  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 10 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backTxt: { fontSize: 28, color: "#0f172a", marginTop: -4 },

  avatarRow: { flexDirection: "row", alignItems: "center", marginLeft: 6 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarTxt: { fontSize: 12, fontWeight: "800", color: "rgba(15,23,42,0.75)" },
  avatarExtra: { backgroundColor: "rgba(15,23,42,0.10)" },
  avatarExtraTxt: { fontSize: 12, fontWeight: "800", color: "rgba(15,23,42,0.65)" },

  searchWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 },
  search: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.06)",
    paddingHorizontal: 14,
    color: "#0f172a",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnTxt: { fontSize: 22, fontWeight: "900", color: "#0f172a", marginTop: -2 },

  chatHeader: { alignItems: "center", paddingTop: 18, paddingBottom: 10 },
  roomTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  roomTime: { marginTop: 6, fontSize: 12, color: "rgba(15,23,42,0.5)" },

  bubble: { maxWidth: "78%", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, marginBottom: 10 },
  mine: { alignSelf: "flex-end", backgroundColor: "#2563eb", borderTopRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: "rgba(15,23,42,0.08)", borderTopLeftRadius: 6 },
  msg: { fontSize: 14, lineHeight: 18 },
  msgMine: { color: "#fff" },
  msgTheirs: { color: "rgba(15,23,42,0.88)" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.06)",
    paddingHorizontal: 14,
    color: "#0f172a",
  },
  sendBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: "#2563eb" },
  sendTxt: { color: "#fff", fontWeight: "800" },

  sectionLabel: { fontSize: 13, fontWeight: "800", color: "rgba(15,23,42,0.75)", marginBottom: 8 },
  groupName: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.06)",
    paddingHorizontal: 14,
    color: "#0f172a",
  },
  helper: { color: "rgba(15,23,42,0.55)", fontSize: 13 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(15,23,42,0.06)" },
  chipTxt: { color: "rgba(15,23,42,0.75)", fontWeight: "700", fontSize: 13 },

  createBtn: {
    marginTop: 20,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnTxt: { color: "#fff", fontWeight: "900" },
  senderName: {
  marginTop: 4,
  fontSize: 12,
  color: "rgba(15,23,42,0.55)",
},
senderMe: {
  textAlign: "right",
},
senderThem: {
  textAlign: "left",
},

});
