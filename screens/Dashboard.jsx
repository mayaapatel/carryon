// HomeScreen.jsx (Expo / React Native)
// Drop this in: screens/HomeScreen.jsx (or app/index.jsx if you're using Expo Router)

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const pastTrips = [
    {
      id: "hawaii",
      label: "Hawaii",
      img: "https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=600&q=70",
    },
    {
      id: "dc",
      label: "D.C.",
      img: "https://images.unsplash.com/photo-1542574271-7f3b92e6c3ad?auto=format&fit=crop&w=600&q=70",
    },
    {
      id: "california",
      label: "California",
      img: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=600&q=70",
    },
    {
      id: "peru",
      label: "Peru",
      img: "https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=600&q=70",
    },
  ];

  const onMainTripPress = () => {
    // TODO: navigate to trip details
    console.log("Main trip pressed");
  };

  const onPastTripsArrowPress = () => {
    // TODO: open Past Trips page / modal
    console.log("Past trips arrow pressed");
  };

  const onTripCirclePress = (trip) => {
    // TODO: open that trip
    console.log("Trip circle pressed:", trip.label);
  };

  const onCreateTripPress = () => {
    // TODO: navigate to create trip flow
    console.log("Create trip pressed");
  };

  const onBackPress = () => {
    // TODO: navigation.goBack()
    console.log("Back pressed");
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Settings/Status bar */}
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top row: back button (like your mock) */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={onBackPress}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>CARRY ON</Text>
          <Text style={styles.subtitle}>PLAN. PACK. GO.</Text>
        </View>

        {/* Main trip button card */}
        <TouchableOpacity
          onPress={onMainTripPress}
          style={styles.heroButton}
          activeOpacity={0.85}
        >
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1526481280695-3c687fd5432c?auto=format&fit=crop&w=1200&q=75",
            }}
            style={styles.heroImage}
            imageStyle={styles.heroImageRadius}
          >
            {/* Bottom-left overlay label */}
            <View style={styles.heroLabelWrap}>
              <Text style={styles.heroLabel}>Tokyo, Japan</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* Past Trips header + arrow button */}
        <View style={styles.pastHeader}>
          <Text style={styles.sectionTitle}>Past Trips</Text>

          <TouchableOpacity
            onPress={onPastTripsArrowPress}
            style={styles.pastArrowBtn}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-forward" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Trip circles row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.circlesRow}
        >
          {pastTrips.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => onTripCirclePress(t)}
              style={styles.tripCircleBtn}
              activeOpacity={0.8}
            >
              <View style={styles.circleShadowWrap}>
                <Image source={{ uri: t.img }} style={styles.tripCircleImg} />
              </View>
              <Text style={styles.tripCircleLabel} numberOfLines={1}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Create Trip button */}
        <TouchableOpacity
          onPress={onCreateTripPress}
          style={styles.createBtn}
          activeOpacity={0.9}
        >
          <Text style={styles.createBtnText}>CREATE TRIP!</Text>
        </TouchableOpacity>

        {/* bottom padding so it feels like iPhone spacing */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const BLUE = "#3F63F3";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  topRow: {
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  titleWrap: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  title: {
    fontSize: 40,
    letterSpacing: 2,
    color: BLUE,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    letterSpacing: 2,
    color: BLUE,
    fontWeight: "500",
  },

  heroButton: {
    width: "100%",
  },
  heroImage: {
    height: 185,
    width: "100%",
    justifyContent: "flex-end",
  },
  heroImageRadius: {
    borderRadius: 14,
  },
  heroLabelWrap: {
    padding: 10,
  },
  heroLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "rgba(17,24,39,0.75)",
    textShadowColor: "rgba(255,255,255,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  pastHeader: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  pastArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.15)",
  },

  circlesRow: {
    paddingTop: 14,
    paddingBottom: 8,
    gap: 14,
  },
  tripCircleBtn: {
    width: 78,
    alignItems: "center",
  },
  circleShadowWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tripCircleImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  tripCircleLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },

  createBtn: {
    marginTop: 18,
    width: "100%",
    height: 50,
    borderRadius: 8,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 1.2,
  },
});
