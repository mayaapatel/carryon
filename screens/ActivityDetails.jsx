import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  deleteTripItem,
  getTripItemById,
} from "../utils/tripStorage";

const BLUE = "#4967E8";
const BG = "#F7F7F7";
const TEXT = "#1F1F1F";

export default function ActivityDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = String(params.id || "");

  const [item, setItem] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  const loadItem = useCallback(async () => {
    if (!id) return;
    const data = await getTripItemById(id);
    setItem(data);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadItem();
    }, [loadItem])
  );

  async function onDelete() {
    Alert.alert("Delete item?", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTripItem(id);
          router.push("/tripitinerary");
        },
      },
    ]);
  }

  async function openDocument(uri) {
    try {
      await Linking.openURL(uri);
    } catch (error) {
      Alert.alert("Could not open file");
    }
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageAttachments = (item.attachments || []).filter((x) => x.type === "image");
  const docAttachments = (item.attachments || []).filter((x) => x.type === "document");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={TEXT} />
          </Pressable>

          <Text style={styles.title}>Details</Text>

          <View style={styles.headerButton} />
        </View>

        <View style={styles.card}>
          <Text style={styles.category}>{item.category?.toUpperCase()}</Text>
          <Text style={styles.mainTitle}>{item.description}</Text>

          {!!item.location && (
            <Text style={styles.detailText}>Location: {item.location}</Text>
          )}

          {!!item.dateLabel && (
            <Text style={styles.detailText}>Date: {item.dateLabel}</Text>
          )}

          {!!item.timeLabel && (
            <Text style={styles.detailText}>Time: {item.timeLabel}</Text>
          )}

          <Text style={styles.detailText}>Price: ${item.price ?? 0}</Text>

          {!!item.reservationNumber && (
            <Text style={styles.detailText}>
              Reservation #: {item.reservationNumber}
            </Text>
          )}
        </View>

        {imageAttachments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {imageAttachments.map((img) => (
                <Pressable
                  key={img.id}
                  onPress={() => setExpandedImage(img.uri)}
                  style={styles.imageWrap}
                >
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {docAttachments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents</Text>

            {docAttachments.map((doc) => (
              <Pressable
                key={doc.id}
                style={styles.docRow}
                onPress={() => openDocument(doc.uri)}
              >
                <Ionicons name="document-text-outline" size={22} color={BLUE} />
                <Text style={styles.docName}>{doc.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.editButton}
            onPress={() =>
              router.push({
                pathname: "/addactivity",
                params: { editId: item.id },
              })
            }
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={!!expandedImage} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalClose}
            onPress={() => setExpandedImage(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.expandedScroll}
          >
            {imageAttachments.map((img) => (
              <View key={img.id} style={styles.expandedImageWrap}>
                <Image source={{ uri: img.uri }} style={styles.expandedImage} />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontSize: 16,
    color: TEXT,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  headerButton: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ECECEC",
    marginBottom: 18,
  },

  category: {
    fontSize: 12,
    fontWeight: "700",
    color: BLUE,
    marginBottom: 8,
  },

  mainTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 10,
  },

  detailText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 10,
  },

  imageWrap: {
    marginRight: 10,
  },

  thumb: {
    width: 140,
    height: 140,
    borderRadius: 14,
    backgroundColor: "#EEE",
  },

  docRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECECEC",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },

  docName: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },

  editButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE,
  },

  editButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  deleteButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDECEC",
  },

  deleteButtonText: {
    color: "#D9534F",
    fontWeight: "700",
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
  },

  modalClose: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 20,
  },

  expandedScroll: {
    alignItems: "center",
  },

  expandedImageWrap: {
    width: 390,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  expandedImage: {
    width: "100%",
    height: 420,
    resizeMode: "contain",
  },
});