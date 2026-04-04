import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// ─── weather helpers ──────────────────────────────────────────────────────────
const WMO = {
  0: ["Clear sky", "sunny-outline"],
  1: ["Mainly clear", "partly-sunny-outline"],
  2: ["Partly cloudy", "partly-sunny-outline"],
  3: ["Overcast", "cloud-outline"],
  45: ["Foggy", "cloud-outline"],
  48: ["Icy fog", "cloud-outline"],
  51: ["Light drizzle", "rainy-outline"],
  61: ["Light rain", "rainy-outline"],
  63: ["Moderate rain", "rainy-outline"],
  65: ["Heavy rain", "rainy-outline"],
  71: ["Light snow", "snow-outline"],
  73: ["Moderate snow", "snow-outline"],
  75: ["Heavy snow", "snow-outline"],
  80: ["Rain showers", "rainy-outline"],
  85: ["Snow showers", "snow-outline"],
  95: ["Thunderstorm", "thunderstorm-outline"],
  99: ["Severe storm", "thunderstorm-outline"],
};
function wmo(code) {
  const keys = Object.keys(WMO).map(Number).sort((a, b) => b - a);
  const k = keys.find((k) => code >= k) ?? 0;
  return WMO[k] ?? ["Unknown", "help-outline"];
}

// ─── static checklist factory ─────────────────────────────────────────────────
let _id = 0;
function item(label) { return { id: String(++_id), label, checked: false }; }

function makeDocuments(countryName) {
  return [
    item(`Check visa requirements for ${countryName || "destination"}`),
    item("Ensure passport is valid for 6+ months beyond return date"),
    item("Apply for visa / eVisa if required"),
    item("Make 2 copies of passport, visa, and bookings"),
    item("Save embassy phone number in contacts"),
  ];
}

const ESSENTIALS = [
  item("Pack power adapter / voltage converter"),
  item("Download offline maps (Google Maps / Maps.me)"),
  item("Set up international roaming or buy local SIM"),
  item("Notify your bank of travel dates"),
  item("Pack travel-size toiletries"),
  item("Bring sufficient local currency / card"),
  item("Pack medication + doctor's letter if needed"),
  item("Emergency contacts written down offline"),
];

const RESERVATIONS = [
  item("Flights booked & confirmation saved"),
  item("Accommodation booked for all nights"),
  item("Airport transfers arranged"),
  item("Travel insurance purchased"),
  item("Tours / activities pre-booked"),
  item("Check-in online (24h before flight)"),
];

const HEALTH = [
  item("Check CDC destination health notices"),
  item("Visit travel clinic for vaccinations"),
  item("Purchase travel health insurance"),
  item("Research nearest hospitals at destination"),
  item("Pack first aid kit"),
  item("Know local emergency number"),
];

// ─── section config ───────────────────────────────────────────────────────────
const SECTION_KEYS = ["documents", "essentials", "reservations", "health", "weather", "flights"];
const SECTION_META = {
  documents:    { title: "DOCUMENTS & VISA",    icon: "document-text-outline" },
  essentials:   { title: "ESSENTIALS",           icon: "bag-outline"           },
  reservations: { title: "RESERVATIONS",         icon: "calendar-outline"      },
  health:       { title: "HEALTH & SAFETY",      icon: "medical-outline"       },
  weather:      { title: "WEATHER FORECAST",     icon: "partly-sunny-outline"  },
  flights:      { title: "FIND FLIGHTS",         icon: "airplane-outline"      },
};
const CHECKLIST_KEYS = ["documents", "essentials", "reservations", "health"];

// ─── main ─────────────────────────────────────────────────────────────────────
export default function BeforeYouTravel() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams();

  // destination search
  const [cityInput, setCityInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [destination, setDestination] = useState(null); // { city, country, lat, lon, countryCode, ... }
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // trip dates from firebase
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // data
  const [countryData, setCountryData] = useState(null);
  const [embassies, setEmbassies] = useState([]);
  const [embassyLoading, setEmbassyLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // UI
  const [openKey, setOpenKey] = useState("documents");
  const [checklists, setChecklists] = useState({
    documents: makeDocuments(""),
    essentials: ESSENTIALS,
    reservations: RESERVATIONS,
    health: HEALTH,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── load trip dates ───────────────────────────────────────────────────────
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !tripId) return;
    getDoc(doc(db, "users", user.uid, "trips", String(tripId))).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.startDate) setStartDate(d.startDate.toDate());
      if (d.endDate) setEndDate(d.endDate.toDate());
      // pre-fill from trip location
      if (d.location) {
        const parts = d.location.split(",").map((p) => p.trim());
        setCityInput(parts[0] || "");
        setCountryInput(parts[parts.length - 1] || "");
      }
    });
  }, [tripId]);

  // ── fade in ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  // ── SEARCH: Nominatim geocode → restcountries → Overpass embassy → weather ─
  async function handleSearch() {
    const city = cityInput.trim();
    const country = countryInput.trim();
    if (!city || !country) { setSearchError("Please enter both a city and a country."); return; }
    setSearchError("");
    setSearching(true);
    Keyboard.dismiss();

    try {
      // 1. Geocode city with Nominatim
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${city}, ${country}`)}&format=json&limit=1&addressdetails=1`,
        { headers: { "User-Agent": "CarryOnTravelApp/1.0" } }
      );
      const geoData = await geoRes.json();
      if (!geoData.length) { setSearchError("City not found. Try a different spelling."); setSearching(false); return; }
      const geo = geoData[0];
      const lat = parseFloat(geo.lat);
      const lon = parseFloat(geo.lon);
      const countryCode = geo.address?.country_code?.toUpperCase() || "";

      // 2. Country info from restcountries
      let cData = null;
      try {
        const cRes = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
        const cJson = await cRes.json();
        if (Array.isArray(cJson) && cJson.length > 0) {
          const c = cJson[0];
          cData = {
            name: c.name?.common || country,
            capital: c.capital?.[0] || "—",
            flag: c.flag || "",
            languages: Object.values(c.languages || {}).slice(0, 3).join(", ") || "—",
            callingCode: c.idd?.root ? `${c.idd.root}${(c.idd.suffixes || [])[0] || ""}` : "—",
            timezone: c.timezones?.[0] || "—",
            emergencyNote: "Dial 112 internationally or check local emergency number",
            currency: Object.values(c.currencies || {})[0]?.name || "—",
            currencySymbol: Object.values(c.currencies || {})[0]?.symbol || "",
          };
        }
      } catch (_) {}

      // 3. Find US embassies via Overpass API (amenity=embassy, country=US)
      setEmbassyLoading(true);
      let foundEmbassies = [];
      try {
        const delta = 2.5; // ~250km radius bounding box around city
        const bbox = `${lat - delta},${lon - delta},${lat + delta},${lon + delta}`;
        const overpassQuery = `[out:json][timeout:15];
(
  node["amenity"="embassy"]["country"="US"](${bbox});
  node["diplomatic"="embassy"]["country"="US"](${bbox});
  node["office"="diplomatic"]["country"="US"](${bbox});
);
out body;`;
        const ovRes = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: `data=${encodeURIComponent(overpassQuery)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        const ovData = await ovRes.json();
        foundEmbassies = (ovData.elements || [])
          .filter((e) => e.tags)
          .map((e) => ({
            name: e.tags.name || e.tags["name:en"] || "US Embassy",
            address: [
              e.tags["addr:housenumber"],
              e.tags["addr:street"],
              e.tags["addr:city"] || e.tags["addr:postcode"],
            ].filter(Boolean).join(" ") || "Address not listed in OpenStreetMap",
            phone: e.tags.phone || e.tags["contact:phone"] || null,
            website: e.tags.website || e.tags["contact:website"] || null,
            opening: e.tags.opening_hours || null,
          }));
      } catch (_) {}
      setEmbassies(foundEmbassies);
      setEmbassyLoading(false);

      // 4. Weather from Open-Meteo
      setWeatherLoading(true);
      try {
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`
        );
        const wData = await wRes.json();
        if (wData.daily) setWeather(wData.daily);
      } catch (_) { setWeather(null); }
      setWeatherLoading(false);

      // 5. Update checklist document items with country name
      setChecklists((prev) => ({
        ...prev,
        documents: makeDocuments(cData?.name || country),
      }));

      setDestination({ city, country: cData?.name || country, lat, lon, countryCode, countryData: cData });
      setCountryData(cData);

      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 100, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

    } catch (err) {
      setSearchError("Search failed. Please check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  // ── checklist helpers ─────────────────────────────────────────────────────
  function toggleItem(key, id) {
    setChecklists((prev) => ({
      ...prev,
      [key]: prev[key].map((i) => i.id === id ? { ...i, checked: !i.checked } : i),
    }));
  }

  function isSectionComplete(key) {
    const items = checklists[key];
    return items && items.length > 0 && items.every((i) => i.checked);
  }

  // ── progress ──────────────────────────────────────────────────────────────
  const { tasksDone, tasksTotal } = useMemo(() => {
    let done = 0, total = 0;
    CHECKLIST_KEYS.forEach((k) => {
      total += checklists[k].length;
      done += checklists[k].filter((i) => i.checked).length;
    });
    return { tasksDone: done, tasksTotal: total };
  }, [checklists]);

  // ── days until ────────────────────────────────────────────────────────────
  const daysUntil = useMemo(() => {
    if (!startDate) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const s = new Date(startDate); s.setHours(0, 0, 0, 0);
    return Math.max(Math.floor((s - now) / 86400000), 0);
  }, [startDate]);

  // ── Google Flights URL ────────────────────────────────────────────────────
  function openGoogleFlights() {
    const dest = destination?.city || countryInput || "";
    const from = startDate ? startDate.toISOString().slice(0, 10) : "";
    const to = endDate ? endDate.toISOString().slice(0, 10) : "";
    let url = `https://www.google.com/travel/flights?q=Flights+to+${encodeURIComponent(dest)}`;
    if (from) url += `&hl=en#flt=.${encodeURIComponent(dest)}.${from}*${encodeURIComponent(dest)}.${to}`;
    Linking.openURL(url);
  }

  // ─── section body renderer ────────────────────────────────────────────────
  function renderBody(key) {
    switch (key) {
      case "documents": return renderDocuments();
      case "weather":   return renderWeather();
      case "flights":   return renderFlights();
      default:          return renderChecklist(key);
    }
  }

  function renderChecklist(key) {
    return (
      <View style={st.clWrap}>
        {checklists[key].map((item) => (
          <TouchableOpacity key={item.id} style={st.clRow} onPress={() => toggleItem(key, item.id)} activeOpacity={0.7}>
            <View style={[st.cb, item.checked && st.cbDone]}>
              {item.checked && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={[st.clLabel, item.checked && st.clLabelDone]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderDocuments() {
    return (
      <View>
        {!destination && (
          <View style={st.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color="#2E5BFF" />
            <Text style={st.hintText}>Search a destination above to see country info and embassy details.</Text>
          </View>
        )}

        {countryData && (
          <View style={st.infoCard}>
            <Text style={st.infoCardTitle}>{countryData.flag} {countryData.name}</Text>
            {[
              ["Capital", countryData.capital],
              ["Language(s)", countryData.languages],
              ["Currency", `${countryData.currency} (${countryData.currencySymbol})`],
              ["Calling Code", countryData.callingCode],
              ["Timezone", countryData.timezone],
              ["Emergency", countryData.emergencyNote],
            ].map(([label, val]) => (
              <View key={label} style={st.infoRow}>
                <Text style={st.infoLabel}>{label}</Text>
                <Text style={st.infoVal} numberOfLines={2}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Embassy section */}
        <Text style={st.subheading}>🏛 US Embassies / Consulates</Text>
        {embassyLoading && <ActivityIndicator size="small" color="#2E5BFF" style={{ marginVertical: 8 }} />}
        {!embassyLoading && destination && embassies.length === 0 && (
          <View>
            <Text style={st.emptyText}>No US embassy found in OpenStreetMap near {destination.city}. Try the official directory:</Text>
            <TouchableOpacity style={st.linkBtn} onPress={() => Linking.openURL(`https://www.usembassy.gov`)}>
              <Ionicons name="globe-outline" size={14} color="#2E5BFF" />
              <Text style={st.linkBtnText}>usembassy.gov — Official US Embassy Directory</Text>
            </TouchableOpacity>
          </View>
        )}
        {embassies.map((e, i) => (
          <View key={i} style={st.embassyCard}>
            <Text style={st.embassyName}>{e.name}</Text>
            <View style={st.embassyRow}>
              <Ionicons name="location-outline" size={13} color="#666" />
              <Text style={st.embassyDetail}>{e.address}</Text>
            </View>
            {e.phone && (
              <TouchableOpacity style={st.embassyRow} onPress={() => Linking.openURL(`tel:${e.phone}`)}>
                <Ionicons name="call-outline" size={13} color="#2E5BFF" />
                <Text style={[st.embassyDetail, { color: "#2E5BFF" }]}>{e.phone}</Text>
              </TouchableOpacity>
            )}
            {e.opening && (
              <View style={st.embassyRow}>
                <Ionicons name="time-outline" size={13} color="#666" />
                <Text style={st.embassyDetail}>{e.opening}</Text>
              </View>
            )}
            {e.website && (
              <TouchableOpacity style={st.embassyRow} onPress={() => Linking.openURL(e.website)}>
                <Ionicons name="globe-outline" size={13} color="#2E5BFF" />
                <Text style={[st.embassyDetail, { color: "#2E5BFF" }]}>Visit website</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {destination && (
          <TouchableOpacity style={[st.linkBtn, { marginTop: 8 }]} onPress={() => Linking.openURL(`https://www.usembassy.gov`)}>
            <Ionicons name="globe-outline" size={14} color="#2E5BFF" />
            <Text style={st.linkBtnText}>Browse all US Embassies at usembassy.gov</Text>
          </TouchableOpacity>
        )}

        <Text style={[st.subheading, { marginTop: 16 }]}>📋 Document Checklist</Text>
        {renderChecklist("documents")}
      </View>
    );
  }

  function renderWeather() {
    if (!destination) return (
      <View style={st.hintBox}>
        <Ionicons name="information-circle-outline" size={16} color="#2E5BFF" />
        <Text style={st.hintText}>Search a destination above to load weather forecast.</Text>
      </View>
    );
    if (weatherLoading) return <ActivityIndicator size="small" color="#2E5BFF" style={{ marginVertical: 12 }} />;
    if (!weather) return <Text style={st.emptyText}>Weather data unavailable for this location.</Text>;

    return (
      <View>
        <Text style={st.weatherSubtitle}>7-day forecast · {destination.city}, {destination.country} · °F</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.weatherScroll}>
          {weather.time.map((date, i) => {
            const [desc, icon] = wmo(weather.weathercode[i]);
            return (
              <View key={date} style={st.weatherCard}>
                <Text style={st.weatherDate}>
                  {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Text>
                <Ionicons name={icon} size={26} color="#2E5BFF" style={{ marginVertical: 6 }} />
                <Text style={st.weatherDesc}>{desc}</Text>
                <Text style={st.weatherTemp}>
                  {Math.round(weather.temperature_2m_max[i])}° / {Math.round(weather.temperature_2m_min[i])}°
                </Text>
                {weather.precipitation_sum[i] > 0 && (
                  <Text style={st.weatherRain}>💧 {weather.precipitation_sum[i].toFixed(1)}mm</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
        {startDate && endDate && (
          <View style={[st.hintBox, { marginTop: 10 }]}>
            <Ionicons name="information-circle-outline" size={14} color="#888" />
            <Text style={[st.hintText, { color: "#888" }]}>
              Your trip is {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}. Forecast shown is for the next 7 days.
            </Text>
          </View>
        )}
      </View>
    );
  }

  function renderFlights() {
    const dest = destination?.city || (countryInput.trim() || null);
    const hasTrip = startDate && endDate;

    return (
      <View>
        <View style={st.hintBox}>
          <Ionicons name="information-circle-outline" size={15} color="#2E5BFF" />
          <Text style={st.hintText}>
            Flight booking APIs require commercial partnerships. We'll open Google Flights with your trip details pre-filled.
          </Text>
        </View>

        {dest ? (
          <View style={st.flightCard}>
            <View style={st.flightRow}>
              <Ionicons name="airplane-outline" size={16} color="#2E5BFF" />
              <Text style={st.flightLabel}>Destination</Text>
              <Text style={st.flightVal}>{dest}</Text>
            </View>
            {hasTrip && (
              <>
                <View style={st.flightRow}>
                  <Ionicons name="calendar-outline" size={16} color="#2E5BFF" />
                  <Text style={st.flightLabel}>Depart</Text>
                  <Text style={st.flightVal}>{startDate.toLocaleDateString()}</Text>
                </View>
                <View style={st.flightRow}>
                  <Ionicons name="calendar-outline" size={16} color="#2E5BFF" />
                  <Text style={st.flightLabel}>Return</Text>
                  <Text style={st.flightVal}>{endDate.toLocaleDateString()}</Text>
                </View>
              </>
            )}
          </View>
        ) : (
          <Text style={st.emptyText}>Search a destination above to pre-fill flight search.</Text>
        )}

        <TouchableOpacity style={st.flightBtn} onPress={openGoogleFlights}>
          <Ionicons name="airplane" size={18} color="#fff" />
          <Text style={st.flightBtnText}>Search Flights on Google Flights</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[st.flightBtn, { backgroundColor: "#00897B", marginTop: 10 }]}
          onPress={() => {
            const q = dest ? encodeURIComponent(`flights to ${dest}`) : "cheap flights";
            Linking.openURL(`https://www.kayak.com/flights/${dest?.toUpperCase() || ""}`);
          }}>
          <Ionicons name="airplane-outline" size={18} color="#fff" />
          <Text style={st.flightBtnText}>Also Search on Kayak</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* header */}
        <View style={st.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={st.topTitle}>Before You Travel</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* destination search bar */}
        <View style={st.searchCard}>
          <Text style={st.searchCardTitle}>Where are you going?</Text>
          <View style={st.searchRow}>
            <View style={[st.searchInput, { flex: 1.2 }]}>
              <Ionicons name="business-outline" size={14} color="#aaa" style={{ marginRight: 6 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: "#111" }}
                placeholder="City"
                placeholderTextColor="#aaa"
                value={cityInput}
                onChangeText={setCityInput}
                onSubmitEditing={handleSearch}
                returnKeyType="next"
              />
            </View>
            <View style={[st.searchInput, { flex: 1.4 }]}>
              <Ionicons name="globe-outline" size={14} color="#aaa" style={{ marginRight: 6 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: "#111" }}
                placeholder="Country"
                placeholderTextColor="#aaa"
                value={countryInput}
                onChangeText={setCountryInput}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>
          </View>
          {searchError ? <Text style={st.searchError}>{searchError}</Text> : null}
          <TouchableOpacity style={[st.searchBtn, searching && { opacity: 0.6 }]} onPress={handleSearch} disabled={searching}>
            {searching
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="search" size={15} color="#fff" /><Text style={st.searchBtnText}>Load Destination Info</Text></>
            }
          </TouchableOpacity>
          {destination && (
            <View style={st.destTag}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={st.destTagText}>Loaded: {destination.city}, {destination.country}</Text>
            </View>
          )}
        </View>

        {/* accordion sections */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={st.stack}>
            {SECTION_KEYS.map((key) => {
              const isOpen = openKey === key;
              const meta = SECTION_META[key];
              const isChecklist = CHECKLIST_KEYS.includes(key);
              const complete = isChecklist && isSectionComplete(key);

              return (
                <View key={key} style={[st.card, isOpen && st.cardOpen]}>
                  <TouchableOpacity
                    onPress={() => setOpenKey(isOpen ? "" : key)}
                    style={st.cardHeader}
                    activeOpacity={0.8}
                  >
                    <View style={st.cardHeaderLeft}>
                      {isChecklist ? (
                        <View style={[st.secCb, complete && st.secCbDone]}>
                          {complete && <Ionicons name="checkmark" size={10} color="#fff" />}
                        </View>
                      ) : (
                        <Ionicons name={meta.icon} size={16} color="#2E5BFF" />
                      )}
                      <Text style={st.cardTitle}>{meta.title}</Text>
                    </View>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="rgba(17,24,39,0.4)" />
                  </TouchableOpacity>

                  {isOpen && <View style={st.cardBody}>{renderBody(key)}</View>}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* bottom stats */}
        <View style={st.bottomArea}>
          <View style={st.statRow}>
            <View style={st.leftStat}>
              <View style={st.clockWrap}>
                <Ionicons name="time-outline" size={28} color="#2E5BFF" />
              </View>
              <View>
                <Text style={st.bigNumber}>{daysUntil ?? "—"}</Text>
                <Text style={st.smallLabel}>
                  {daysUntil === 0 ? "trip started!" : daysUntil === 1 ? "day until trip" : "days until trip"}
                </Text>
              </View>
            </View>
            <View style={st.rightStat}>
              <View style={st.progressTrack}>
                <View style={[st.progressFill, { width: `${Math.round((tasksDone / Math.max(tasksTotal, 1)) * 100)}%` }]} />
              </View>
              <View style={st.tasksRow}>
                <Text style={st.bigNumber}>{tasksDone}</Text>
                <Text style={st.slash}>/</Text>
                <Text style={st.bigNumber}>{tasksTotal}</Text>
              </View>
              <Text style={st.smallLabelCenter}>Tasks completed</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 18, paddingBottom: 14 },

  topRow: {
    paddingTop: Platform.OS === "android" ? 10 : 4,
    paddingBottom: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },

  // search card
  searchCard: {
    backgroundColor: "#f5f7ff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(46,91,255,0.15)",
  },
  searchCardTitle: { fontSize: 13, fontWeight: "700", color: "#2E5BFF", marginBottom: 10 },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  searchInput: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9,
    borderWidth: 1, borderColor: "rgba(17,24,39,0.12)",
  },
  searchError: { fontSize: 12, color: "#dc2626", marginBottom: 6 },
  searchBtn: {
    backgroundColor: "#2E5BFF", borderRadius: 9, paddingVertical: 11,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  destTag: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  destTagText: { fontSize: 12, color: "#22c55e", fontWeight: "600" },

  // accordion
  stack: { gap: 10 },
  card: {
    borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)", backgroundColor: "#fff", overflow: "hidden",
  },
  cardOpen: { borderColor: "#2E5BFF", borderWidth: 1.5 },
  cardHeader: {
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 11, letterSpacing: 1.1, color: "rgba(17,24,39,0.55)", fontWeight: "700" },
  secCb: {
    width: 17, height: 17, borderRadius: 9,
    borderWidth: 1.5, borderColor: "rgba(17,24,39,0.25)",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  secCbDone: { backgroundColor: "#2E5BFF", borderColor: "#2E5BFF" },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },

  // checklist
  clWrap: { gap: 10 },
  clRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cb: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: "rgba(17,24,39,0.22)",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff", flexShrink: 0,
  },
  cbDone: { backgroundColor: "#2E5BFF", borderColor: "#2E5BFF" },
  clLabel: { fontSize: 13, color: "rgba(17,24,39,0.8)", flex: 1, lineHeight: 18 },
  clLabelDone: { color: "rgba(17,24,39,0.3)", textDecorationLine: "line-through" },

  // hint box
  hintBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    backgroundColor: "#f0f4ff", borderRadius: 8, padding: 10, marginBottom: 10,
  },
  hintText: { flex: 1, fontSize: 12, color: "#2E5BFF", lineHeight: 17 },

  // country info
  infoCard: {
    backgroundColor: "#f8f9ff", borderRadius: 10, padding: 12,
    marginBottom: 14, gap: 6, borderWidth: 1, borderColor: "rgba(46,91,255,0.12)",
  },
  infoCardTitle: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  infoLabel: { fontSize: 11, color: "rgba(17,24,39,0.45)", fontWeight: "700", flex: 1 },
  infoVal: { fontSize: 12, color: "#222", fontWeight: "500", flex: 2, textAlign: "right" },

  subheading: { fontSize: 12, fontWeight: "700", color: "rgba(17,24,39,0.55)", letterSpacing: 0.8, marginBottom: 8 },
  emptyText: { fontSize: 12, color: "#aaa", fontStyle: "italic", marginBottom: 8, lineHeight: 17 },

  // embassy
  embassyCard: {
    borderWidth: 1, borderColor: "rgba(17,24,39,0.1)",
    borderRadius: 10, padding: 12, marginBottom: 8, gap: 5,
  },
  embassyName: { fontSize: 13, fontWeight: "700", color: "#111", marginBottom: 2 },
  embassyRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  embassyDetail: { fontSize: 12, color: "#444", flex: 1, lineHeight: 16 },

  // links
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  linkBtnText: { fontSize: 12, color: "#2E5BFF", fontWeight: "600", flex: 1 },

  // weather
  weatherSubtitle: { fontSize: 11, color: "rgba(17,24,39,0.45)", marginBottom: 10 },
  weatherScroll: { marginHorizontal: -14 },
  weatherCard: {
    width: 110, backgroundColor: "#f5f7ff", borderRadius: 12,
    padding: 10, marginLeft: 14, marginRight: 4, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(46,91,255,0.1)",
  },
  weatherDate: { fontSize: 10, fontWeight: "700", color: "rgba(17,24,39,0.45)", textAlign: "center" },
  weatherDesc: { fontSize: 10, color: "#555", textAlign: "center", marginBottom: 3 },
  weatherTemp: { fontSize: 13, fontWeight: "800", color: "#111" },
  weatherRain: { fontSize: 10, color: "#555", marginTop: 2 },

  // flights
  flightCard: {
    backgroundColor: "#f8f9ff", borderRadius: 10, padding: 12,
    marginBottom: 12, gap: 8, borderWidth: 1, borderColor: "rgba(46,91,255,0.12)",
  },
  flightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  flightLabel: { fontSize: 12, color: "rgba(17,24,39,0.5)", fontWeight: "600", width: 70 },
  flightVal: { fontSize: 13, color: "#111", fontWeight: "600", flex: 1 },
  flightBtn: {
    backgroundColor: "#2E5BFF", borderRadius: 10, paddingVertical: 13,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  flightBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // bottom stats
  bottomArea: {
    marginTop: 24, borderTopWidth: 1,
    borderTopColor: "rgba(17,24,39,0.08)", paddingTop: 18,
  },
  statRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 18 },
  leftStat: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  clockWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rightStat: { flex: 1, alignItems: "center" },
  progressTrack: {
    width: "90%", height: 8, borderRadius: 8,
    backgroundColor: "rgba(17,24,39,0.15)", overflow: "hidden", marginBottom: 10,
  },
  progressFill: { height: "100%", borderRadius: 8, backgroundColor: "#2E5BFF" },
  tasksRow: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginBottom: 2 },
  bigNumber: { fontSize: 38, fontWeight: "500", color: "#111827", lineHeight: 40 },
  slash: { fontSize: 28, color: "rgba(17,24,39,0.45)", paddingBottom: 4 },
  smallLabel: { marginTop: 4, fontSize: 12, color: "rgba(17,24,39,0.6)" },
  smallLabelCenter: { marginTop: 2, fontSize: 12, color: "rgba(17,24,39,0.6)", textAlign: "center" },
});