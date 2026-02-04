// // screens/MainTrip.jsx
// import { Ionicons } from "@expo/vector-icons";
// import { useMemo, useState } from "react";
// import {
//     Image,
//     Modal,
//     Platform,
//     Pressable,
//     SafeAreaView,
//     ScrollView,
//     StatusBar,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
// } from "react-native";

// /**
//  * UI-only screen to match the mock:
//  * - Top bar: back + centered title + chat icon
//  * - "Your trip so far:" label
//  * - 2x2 photo grid
//  * - Tooltip bubble (Shibuya Crossing + date) on first photo
//  * - 4 big blue buttons
//  *
//  * Put in: carryon/screens/MainTrip.jsx
//  *
//  * Images expected in: carryon/assets/images/
//  * - trip1.jpg, trip2.jpg, trip3.jpg, trip4.jpg
//  */

// export default function MainTrip() {
//   const BLUE = "#3F63F3";

//   // Replace with your real trip name later
//   const tripTitle = "Tokyo, Japan";

//   // Local images (swap filenames to yours)
//   const photos = useMemo(
//     () => [
//       { id: "p1", img: require("../assets/images/past-california.jpg"), label: "Shibuya Crossing", date: "12/26/2025" },
//       { id: "p2", img: require("../assets/images/past-dc.jpg") },
//       { id: "p3", img: require("../assets/images/past-hawaii.jpg") },
//       { id: "p4", img: require("../assets/images/past-peru.jpg") },
//     ],
//     []
//   );

//   // Optional: tap any photo to preview (simple modal)
//   const [preview, setPreview] = useState(null);

//   const onBack = () => {
//     // if using expo-router later: router.back()
//     console.log("Back");
//   };

//   const onChat = () => console.log("Chat pressed");
//   const onBeforeYouGo = () => console.log("Before you go");
//   const onAddActivity = () => console.log("Add activity");
//   const onJournal = () => console.log("Journal");
//   const onWallet = () => console.log("Wallet");

//   return (
//     <SafeAreaView style={styles.safe}>
//       <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

//       <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
//         {/* Top bar */}
//         <View style={styles.topRow}>
//           <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.75}>
//             <Ionicons name="chevron-back" size={24} color="#111827" />
//           </TouchableOpacity>

//           <Text style={styles.topTitle}>{tripTitle}</Text>

//           <TouchableOpacity onPress={onChat} style={styles.iconBtn} activeOpacity={0.75}>
//             <Ionicons name="chatbubble-outline" size={22} color={BLUE} />
//           </TouchableOpacity>
//         </View>

//         {/* Subheading */}
//         <View style={styles.subWrap}>
//           <Text style={styles.subTitle}>Your trip so far:</Text>
//         </View>

//         {/* Photo grid */}
//         <View style={styles.gridWrap}>
//           {/* Tooltip bubble positioned above first photo */}
//           <View style={styles.tooltipWrap}>
//             <View style={styles.tooltip}>
//               <Text style={styles.tooltipTitle}>{photos[0].label}</Text>
//               <Text style={styles.tooltipDate}>{photos[0].date}</Text>
//             </View>
//             <View style={styles.tooltipArrow} />
//           </View>

//           <View style={styles.grid}>
//             {photos.map((p, idx) => (
//               <TouchableOpacity
//                 key={p.id}
//                 activeOpacity={0.9}
//                 style={[styles.gridCell, idx % 2 === 0 ? styles.cellLeft : styles.cellRight]}
//                 onPress={() => setPreview(p)}
//               >
//                 <Image source={p.img} style={styles.gridImg} />
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         {/* Buttons */}
//         <View style={styles.btnStack}>
//           <PrimaryButton label="BEFORE YOU GO" onPress={onBeforeYouGo} />
//           <PrimaryButton label="ADD ACTIVITY" onPress={onAddActivity} />
//           <PrimaryButton label="JOURNAL" onPress={onJournal} />
//           <PrimaryButton label="WALLET" onPress={onWallet} />
//         </View>

//         <View style={{ height: 20 }} />
//       </ScrollView>

//       {/* Preview Modal (optional) */}
//       <Modal visible={!!preview} transparent animationType="fade">
//         <Pressable style={styles.modalBackdrop} onPress={() => setPreview(null)}>
//           <Pressable style={styles.previewCard} onPress={() => {}}>
//             <Image source={preview?.img} style={styles.previewImg} />
//             <TouchableOpacity style={styles.closeBtn} onPress={() => setPreview(null)}>
//               <Ionicons name="close" size={18} color="#111827" />
//             </TouchableOpacity>
//           </Pressable>
//         </Pressable>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// function PrimaryButton({ label, onPress }) {
//   return (
//     <TouchableOpacity onPress={onPress} style={styles.primaryBtn} activeOpacity={0.9}>
//       <Text style={styles.primaryText}>{label}</Text>
//     </TouchableOpacity>
//   );
// }

// const BLUE = "#3F63F3";

// const styles = StyleSheet.create({
//   safe: { flex: 1, backgroundColor: "#fff" },
//   scroll: { paddingHorizontal: 18, paddingBottom: 10 },

//   topRow: {
//     paddingTop: Platform.OS === "android" ? 10 : 4,
//     paddingBottom: 10,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   iconBtn: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   topTitle: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: "#111827",
//   },

//   subWrap: {
//     alignItems: "center",
//     marginTop: 4,
//     marginBottom: 12,
//   },
//   subTitle: {
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#111827",
//   },

//   gridWrap: {
//     marginTop: 4,
//     position: "relative",
//   },

//   tooltipWrap: {
//     position: "absolute",
//     left: 12,
//     top: -20,
//     zIndex: 10,
//   },
//   tooltip: {
//     backgroundColor: "#ffffff",
//     borderRadius: 6,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderWidth: 1,
//     borderColor: "rgba(17,24,39,0.15)",
//     shadowColor: "#000",
//     shadowOpacity: 0.12,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 4 },
//     elevation: 4,
//     alignItems: "center",
//   },
//   tooltipTitle: {
//     fontSize: 12,
//     fontWeight: "800",
//     color: "#111827",
//   },
//   tooltipDate: {
//     marginTop: 2,
//     fontSize: 11,
//     color: "rgba(17,24,39,0.65)",
//     fontWeight: "600",
//   },
//   tooltipArrow: {
//     alignSelf: "center",
//     width: 0,
//     height: 0,
//     borderLeftWidth: 7,
//     borderRightWidth: 7,
//     borderTopWidth: 9,
//     borderLeftColor: "transparent",
//     borderRightColor: "transparent",
//     borderTopColor: "#ffffff",
//     marginTop: -1,
//     // subtle border under arrow
//     shadowColor: "#000",
//     shadowOpacity: 0.06,
//     shadowRadius: 4,
//     shadowOffset: { width: 0, height: 2 },
//   },

//   grid: {
//     borderRadius: 12,
//     overflow: "hidden",
//     borderWidth: 1,
//     borderColor: "rgba(17,24,39,0.08)",
//     backgroundColor: "#fff",
//     flexDirection: "row",
//     flexWrap: "wrap",
//   },
//   gridCell: {
//     width: "50%",
//     height: 95,
//     backgroundColor: "#e5e7eb",
//   },
//   cellLeft: {
//     borderRightWidth: 1,
//     borderRightColor: "rgba(17,24,39,0.08)",
//   },
//   cellRight: {},
//   gridImg: {
//     width: "100%",
//     height: "100%",
//     resizeMode: "cover",
//   },

//   btnStack: {
//     marginTop: 18,
//     gap: 12,
//   },
//   primaryBtn: {
//     width: "100%",
//     height: 46,
//     borderRadius: 8,
//     backgroundColor: BLUE,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   primaryText: {
//     color: "#fff",
//     fontWeight: "800",
//     letterSpacing: 1.1,
//     fontSize: 13,
//   },

//   // Preview modal
//   modalBackdrop: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.4)",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 18,
//   },
//   previewCard: {
//     width: "100%",
//     maxWidth: 420,
//     borderRadius: 14,
//     overflow: "hidden",
//     backgroundColor: "#fff",
//     position: "relative",
//   },
//   previewImg: {
//     width: "100%",
//     height: 320,
//     resizeMode: "cover",
//   },
//   closeBtn: {
//     position: "absolute",
//     top: 10,
//     right: 10,
//     width: 34,
//     height: 34,
//     borderRadius: 17,
//     backgroundColor: "rgba(255,255,255,0.85)",
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 1,
//     borderColor: "rgba(17,24,39,0.12)",
//   },
// });
