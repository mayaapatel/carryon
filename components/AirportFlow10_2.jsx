import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";

const RAPID_API_KEY = process.env.EXPO_PUBLIC_AERODATABOX_KEY;
const RAPID_API_HOST = "aerodatabox.p.rapidapi.com";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
const show = (v, fallback = "—") =>
  v === undefined || v === null || v === "" ? fallback : String(v);

function Row({ label, value }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{show(value)}</Text>
    </View>
  );
}

function AirportCard({ title, data }) {
  if (!data) return null;
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <Row label="Airport" value={`${show(data.airport)} · ${show(data.city)}`} />
      <Row label="Scheduled" value={
        data.scheduledDate && data.scheduledTime
          ? `${data.scheduledDate} · ${data.scheduledTime}`
          : data.scheduledTime
      } />
      <Row label="Estimated" value={data.estimatedTime} />
      <Row label="Actual" value={data.actualTime} />
      <Row label="Terminal" value={data.terminal} />
      <Row label="Gate" value={data.gate || "Not published"} />
      {data.checkIn ? <Row label="Check-in" value={data.checkIn} /> : null}
      {data.baggage ? <Row label="Baggage" value={data.baggage} /> : null}
    </View>
  );
}

export default function AirportFlow() {
  const [number, setNumber] = useState("");
  const [flight, setFlight] = useState(null);
  const [fetchedAt, setFetchedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  async function lookup() {
    const n = number.trim().replace(/\s+/g, "").toUpperCase();
    if (!n) return setError("Enter a flight number first.");
    if (!RAPID_API_KEY) {
      return setError("Missing EXPO_PUBLIC_AERODATABOX_KEY in .env. Add it, then restart Expo.");
    }
    if (loading) return;

    const myRequest = ++requestId.current;
    setLoading(true);
    setError("");

    try {
      const date = today();
      const url = `https://${RAPID_API_HOST}/flights/number/${encodeURIComponent(n)}/${date}?withAircraftImage=false&withLocation=false`;
      console.log(`[AirportFlow] direct request ${myRequest}: ${n} ${date}`);

      const response = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": RAPID_API_KEY,
          "X-RapidAPI-Host": RAPID_API_HOST,
          Accept: "application/json",
        },
      });

      const raw = await response.text();
      let data;
      try { data = raw ? JSON.parse(raw) : null; }
      catch { throw new Error(`Flight API returned invalid JSON (HTTP ${response.status}).`); }

      if (!response.ok) {
        throw new Error(data?.message || data?.detail || data?.error || `Flight API returned HTTP ${response.status}.`);
      }

      const list = Array.isArray(data) ? data : [];
      const selected =
        list.find(x => String(x?.number || "").replace(/\s/g, "").toUpperCase() === n) ||
        list[0];

      if (!selected) throw new Error(`No ${n} flight found for ${date}.`);

      const clean = v => v == null ? "" : String(v).trim();
      const first = (...v) => v.find(x => x !== undefined && x !== null && String(x).trim() !== "") ?? "";
      const time = v => {
        const s = clean(v);
        const m = s.match(/(?:T|\s)(\d{2}:\d{2})|^(\d{1,2}:\d{2})/);
        return m ? (m[1] || m[2]) : s;
      };
      const datePart = v => clean(v).match(/(\d{4}-\d{2}-\d{2})/)?.[1] || "";
      const move = m => {
        m = m || {};
        const a = m.airport || {};
        const scheduled = first(m.scheduledTime?.local, m.scheduledTimeLocal, m.scheduledTime?.utc);
        const revised = first(m.revisedTime?.local, m.revisedTimeLocal, m.predictedTime?.local);
        const actual = first(m.actualTime?.local, m.actualTimeLocal);
        return {
          airport: first(a.iata, a.icao),
          airportName: first(a.name, a.shortName),
          city: first(a.municipalityName, a.municipality),
          scheduledTime: time(scheduled),
          scheduledDate: datePart(scheduled),
          estimatedTime: time(revised),
          actualTime: time(actual),
          terminal: first(m.terminal),
          gate: first(m.gate),
          checkIn: first(m.checkInDesk, m.checkIn),
          baggage: first(m.baggageBelt, m.baggageCarousel, m.baggage),
        };
      };

      if (myRequest !== requestId.current) return;

      setFlight({
        flightNumber: first(selected.number, n).replace(/\s/g, ""),
        airline: first(selected.airline?.name),
        airlineCode: first(selected.airline?.iata),
        status: first(selected.status, "Scheduled"),
        aircraft: first(selected.aircraft?.model, selected.aircraft?.type),
        aircraftRegistration: first(selected.aircraft?.reg, selected.aircraft?.registration),
        departure: move(selected.departure),
        arrival: move(selected.arrival),
      });
      setFetchedAt(new Date().toISOString());
      setError("");
    } catch (e) {
      console.log(`[AirportFlow] direct lookup error ${myRequest}:`, e);
      if (myRequest === requestId.current) setError(e?.message || "Unable to load this flight.");
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Airport & Flight Tracker</Text>
      <Text style={s.help}>Enter a flight number to load current flight information.</Text>

      <View style={s.search}>
        <TextInput
          style={s.input}
          value={number}
          onChangeText={setNumber}
          placeholder="e.g. AA3949"
          placeholderTextColor="#8A94A6"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={lookup}
        />
        <TouchableOpacity
          style={[s.button, loading && { opacity: 0.65 }]}
          onPress={lookup}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Ionicons name="search" size={19} color="#fff" />}
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={s.error}>
          <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {flight && (
        <View style={s.results}>
          <View style={s.hero}>
            <View>
              <Text style={s.flightNo}>{flight.flightNumber}</Text>
              <Text style={s.muted}>{show(flight.airline)}</Text>
            </View>
            <View style={s.pill}>
              <Text style={s.pillText}>{show(flight.status, "Unknown")}</Text>
            </View>
          </View>

          <View style={s.route}>
            <Text style={s.code}>{show(flight.departure?.airport)}</Text>
            <View style={s.routeLine} />
            <Ionicons name="airplane" size={20} color="#3F63F3" />
            <View style={s.routeLine} />
            <Text style={s.code}>{show(flight.arrival?.airport)}</Text>
          </View>

          <View style={s.card}>
            <Row label="Aircraft" value={flight.aircraft} />
            <Row label="Registration" value={flight.aircraftRegistration} />
          </View>

          <AirportCard title="Departure" data={flight.departure} />
          <AirportCard title="Arrival" data={flight.arrival} />

          {!!fetchedAt && (
            <Text style={s.updated}>
              Updated {new Date(fetchedAt).toLocaleString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:{paddingTop:4,paddingBottom:8},
  title:{fontSize:18,fontWeight:"800",color:"#1F2937"},
  help:{fontSize:13,color:"#6B7280",marginTop:4,marginBottom:13},
  search:{flexDirection:"row",gap:8},
  input:{flex:1,height:46,borderWidth:1,borderColor:"#B4C6FF",borderRadius:12,backgroundColor:"#EEF2FF",paddingHorizontal:13,color:"#1F2937",fontWeight:"600"},
  button:{width:48,height:46,borderRadius:12,backgroundColor:"#3F63F3",alignItems:"center",justifyContent:"center"},
  error:{marginTop:12,padding:11,borderRadius:12,backgroundColor:"#FEF3F2",flexDirection:"row",gap:7},
  errorText:{flex:1,color:"#B42318",fontSize:12},
  results:{marginTop:14,gap:10},
  hero:{padding:14,borderRadius:14,backgroundColor:"#EEF2FF",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  flightNo:{fontSize:22,fontWeight:"900",color:"#1F2937"},
  muted:{fontSize:12,color:"#6B7280",marginTop:2},
  pill:{backgroundColor:"#DCE6FF",paddingHorizontal:10,paddingVertical:6,borderRadius:999},
  pillText:{fontSize:12,fontWeight:"800",color:"#2E5BFF"},
  route:{padding:14,borderRadius:14,backgroundColor:"#EEF2FF",flexDirection:"row",alignItems:"center",gap:6},
  code:{fontSize:20,fontWeight:"900",color:"#1F2937"},
  routeLine:{flex:1,height:1,backgroundColor:"#B4C6FF"},
  card:{padding:14,borderRadius:14,backgroundColor:"#EEF2FF"},
  cardTitle:{fontSize:13,fontWeight:"800",color:"#3F63F3",marginBottom:5,textTransform:"uppercase"},
  row:{flexDirection:"row",justifyContent:"space-between",gap:10,paddingVertical:4},
  label:{fontSize:12,color:"#6B7280"},
  value:{flex:1,textAlign:"right",fontSize:12,fontWeight:"700",color:"#1F2937"},
  updated:{fontSize:10,color:"#8A94A6",textAlign:"right"},
});
