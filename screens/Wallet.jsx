import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Circle, Line, Svg } from "react-native-svg";

import {
    addDoc,
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 64;
const CHART_H = 180;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 16;
const PAD_B = 24;

// Currencies loaded dynamically from API — no hardcoded list needed

// ─── budget chart ────────────────────────────────────────────────────────────
function BudgetChart({ budget, spent, remaining }) {
  const plotW = CHART_W - PAD_L - PAD_R - 36;
  const plotH = CHART_H - PAD_T - PAD_B;
  const maxVal = Math.max(budget, spent, remaining, 1);

  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const niceMax = Math.ceil(maxVal / magnitude) * magnitude;

  const tickCount = 5;
  const tickStep = niceMax / (tickCount - 1);
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const val = Math.round(tickStep * i);
    return { val, y: PAD_T + plotH - (val / niceMax) * plotH, key: `tick-${i}` };
  });

  const toY = (v) => PAD_T + plotH - (v / niceMax) * plotH;

  // 3 bars: total budget, major expenses, remaining
  const barCount = budget > 0 ? (spent > 0 ? 3 : 1) : 0;
  const barW = Math.min(plotW * 0.22, 50);
  const gap = plotW * 0.06;
  const totalBarsW = barW * (barCount || 1) + gap * Math.max((barCount || 1) - 1, 0);
  const startX = PAD_L + 36 + (plotW - totalBarsW) / 2;

  const bars = [
    { val: budget, color: "#3F63F3", label: "Total", show: budget > 0 },
    { val: spent, color: "#f97316", label: "Pre-booked", show: spent > 0 },
    { val: remaining, color: "#22c55e", label: "Remaining", show: budget > 0 },
  ].filter((b) => b.show);

  const baseY = toY(0);

  return (
    <View style={cs.wrap}>
      <Text style={cs.title}>Budget Overview</Text>
      <View style={{ width: CHART_W, height: CHART_H }}>
        <Svg width={CHART_W} height={CHART_H} style={{ position: "absolute" }}>
          {/* grid lines */}
          {ticks.map((t) => (
            <Line key={t.key} x1={PAD_L + 36} y1={t.y} x2={CHART_W - PAD_R} y2={t.y} stroke="#f0f0f0" strokeWidth="1" />
          ))}

          {/* dynamic bars */}
          {bars.map((b, i) => {
            const cx = startX + i * (barW + gap) + barW / 2;
            return (
              <React.Fragment key={b.label}>
                <Line x1={cx} y1={toY(b.val)} x2={cx} y2={baseY} stroke={b.color} strokeWidth={barW} strokeOpacity="0.18" />
                <Circle cx={cx} cy={toY(b.val)} r="6" fill={b.color} />
                <Circle cx={cx} cy={toY(b.val)} r="3" fill="#fff" />
              </React.Fragment>
            );
          })}

          {/* baseline */}
          <Line x1={PAD_L + 36} y1={baseY} x2={CHART_W - PAD_R} y2={baseY} stroke="#ddd" strokeWidth="1.5" />
        </Svg>

        {/* y-axis labels — positioned as absolutely placed Text */}
        {ticks.map((t) => (
          <Text key={t.key} style={[cs.yLabel, { top: t.y - 7 }]}>
            {t.val >= 10000 ? `$${(t.val / 1000).toFixed(0)}k` : `$${t.val.toLocaleString()}`}
          </Text>
        ))}

        {/* x-axis labels */}
        {bars.map((b, i) => (
          <Text key={b.label} style={[cs.xLabel, { left: startX + i * (barW + gap), width: barW, top: baseY + 6 }]}>
            {b.label}
          </Text>
        ))}
      </View>

      {/* legend */}
      <View style={cs.legend}>
        {bars.map((b) => (
          <View key={b.label} style={cs.legendItem}>
            <View style={[cs.legendDot, { backgroundColor: b.color }]} />
            <Text style={cs.legendLabel}>{b.label} ${b.val.toLocaleString()}</Text>
          </View>
        ))}
        {budget === 0 && (
          <Text style={{ fontSize: 12, color: "#bbb", fontStyle: "italic" }}>Set a budget to see your overview</Text>
        )}
      </View>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams();

  const [budget, setBudget] = useState(0);
  const [tripDays, setTripDays] = useState(1);
  const [majorExpenses, setMajorExpenses] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState({ code: "JPY", label: "Japanese Yen" });
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseCost, setExpenseCost] = useState("");
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── fetch full currency list from API on mount ────────────────────────────
  useEffect(() => {
    async function fetchCurrencyList() {
      setCurrenciesLoading(true);
      try {
        const res = await fetch(
          "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json"
        );
        const data = await res.json();
        // data is { "aed": "UAE Dirham", "ars": "Argentine Peso", ... }
        const list = Object.entries(data)
          .filter(([code, label]) =>
            // only 3-letter codes, proper string labels, exclude crypto/tokens
            /^[a-z]{3}$/.test(code) &&
            typeof label === "string" &&
            label.length > 2 &&
            code !== "usd"
          )
          .map(([code, label]) => ({
            code: code.toUpperCase(),
            label,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setCurrencies(list);
      } catch {
        // fallback mirror
        try {
          const res2 = await fetch(
            "https://latest.currency-api.pages.dev/v1/currencies.json"
          );
          const data2 = await res2.json();
          const list2 = Object.entries(data2)
            .filter(([code, label]) =>
              /^[a-z]{3}$/.test(code) &&
              typeof label === "string" &&
              label.length > 2 &&
              code !== "usd"
            )
            .map(([code, label]) => ({
              code: code.toUpperCase(),
              label,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
          setCurrencies(list2);
        } catch {
          setCurrencies([]);
        }
      } finally {
        setCurrenciesLoading(false);
      }
    }
    fetchCurrencyList();
  }, []);

  // ── load trip budget + dates ──────────────────────────────────────────────
  useEffect(() => {
    if (!tripId) return;
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, "users", user.uid, "trips", String(tripId)))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setBudget(data.budget || 0);
        if (data.startDate && data.endDate) {
          const start = data.startDate.toDate();
          const end = data.endDate.toDate();
          const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
          setTripDays(days);
        }
      })
      .catch(console.error);
  }, [tripId]);

  // ── load major expenses (real-time) ──────────────────────────────────────
  useEffect(() => {
    if (!tripId) return;
    const user = auth.currentUser;
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "trips", String(tripId), "majorExpenses"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setMajorExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, console.error);
  }, [tripId]);

  // ── fetch exchange rate (fawazahmed0 — 200+ currencies, no key) ──────────
  useEffect(() => { fetchRate(selectedCurrency.code); }, [selectedCurrency]);

  async function fetchRate(toCurrency) {
    setRateLoading(true);
    setExchangeRate(null);
    try {
      const res = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json`
      );
      const data = await res.json();
      const rate = data?.usd?.[toCurrency.toLowerCase()];
      setExchangeRate(rate ?? null);
    } catch {
      // fallback mirror
      try {
        const res2 = await fetch(
          `https://latest.currency-api.pages.dev/v1/currencies/usd.json`
        );
        const data2 = await res2.json();
        setExchangeRate(data2?.usd?.[toCurrency.toLowerCase()] ?? null);
      } catch {
        setExchangeRate(null);
      }
    } finally {
      setRateLoading(false);
    }
  }

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const totalMajorSpent = majorExpenses.reduce((s, e) => s + (e.cost || 0), 0);
  const remainingBudget = Math.max(budget - totalMajorSpent, 0);
  const dailyBudget = remainingBudget > 0 && tripDays > 0 ? Math.round(remainingBudget / tripDays) : 0;
  const pctUsed = budget > 0 ? Math.min((totalMajorSpent / budget) * 100, 100) : 0;

  const formatRate = (rate) => {
    if (rate === null || rate === undefined) return "—";
    if (rate >= 1000) return rate.toFixed(0);
    if (rate >= 100) return rate.toFixed(1);
    if (rate >= 1) return rate.toFixed(3);
    return rate.toFixed(5);
  };

  async function handleAddExpense() {
    const user = auth.currentUser;
    if (!user || !tripId) return;
    if (!expenseName.trim()) { Alert.alert("Name required"); return; }
    const cost = parseFloat(expenseCost);
    if (isNaN(cost) || cost <= 0) { Alert.alert("Enter a valid cost"); return; }
    setSaving(true);
    try {
      await addDoc(
        collection(db, "users", user.uid, "trips", String(tripId), "majorExpenses"),
        { name: expenseName.trim(), cost, createdAt: serverTimestamp() }
      );
      setExpenseName(""); setExpenseCost(""); setShowAddExpense(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally { setSaving(false); }
  }

  const filteredCurrencies = currencies.filter(
    (c) =>
      c.label.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </Pressable>
        <Text style={s.headerTitle}>Wallet</Text>
        <View style={{ width: 36 }} />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── reminder cards ── */}
        <Text style={s.sectionLabel}>Reminders</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cardsRow}>

          {/* Budget card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Daily Budget</Text>
            <Text style={s.cardBig}>
              ${dailyBudget > 0 ? dailyBudget.toLocaleString() : "—"}
              <Text style={s.cardBigSub}>/day</Text>
            </Text>
            <Text style={s.cardSub}>
              ${remainingBudget.toLocaleString()} left after major expenses
            </Text>
            {budget > 0 && (
              <>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${pctUsed}%` }]} />
                </View>
                <Text style={s.cardSub}>{(100 - pctUsed).toFixed(0)}% of ${budget.toLocaleString()} remaining</Text>
              </>
            )}
          </View>

          {/* Exchange rate card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Exchange Rate</Text>
            <Text style={s.cardBig} numberOfLines={1}>
              {rateLoading ? "Loading..." : exchangeRate !== null
                ? `1 USD = ${formatRate(exchangeRate)}`
                : "Unavailable"}
            </Text>
            <Text style={s.cardSub} numberOfLines={1}>
              USD → {selectedCurrency.label}
            </Text>
            <TouchableOpacity style={s.changeCurrencyBtn} onPress={() => { setCurrencySearch(""); setShowCurrencyPicker(true); }}>
              <Text style={s.changeCurrencyText}>Change currency ›</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* ── chart ── */}
        <BudgetChart budget={budget} spent={totalMajorSpent} remaining={remainingBudget} />

        {/* ── major expenses ── */}
        <View style={s.majorHeader}>
          <Text style={s.majorTitle}>Major Expenses</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAddExpense(true)}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {majorExpenses.length === 0
          ? <Text style={s.emptyExpenses}>No major expenses yet. Tap + to add one.</Text>
          : majorExpenses.map((e) => (
            <View key={e.id} style={s.expenseRow}>
              <Text style={s.expenseName}>{e.name}</Text>
              <Text style={s.expenseCost}>${e.cost.toLocaleString()}</Text>
            </View>
          ))
        }

        <View style={{ height: 48 }} />
      </Animated.ScrollView>

      {/* ── currency picker modal ── */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowCurrencyPicker(false)} />
        <View style={[s.modalSheet, { maxHeight: "75%" }]}>
          <Text style={s.modalTitle}>Select Currency</Text>
          <View style={s.searchBox}>
            <Ionicons name="search" size={16} color="#aaa" />
            <TextInput
              style={s.searchInput}
              placeholder="Search currency or code..."
              placeholderTextColor="#aaa"
              value={currencySearch}
              onChangeText={setCurrencySearch}
              autoCorrect={false}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {currenciesLoading ? (
              <Text style={{ textAlign: "center", color: "#aaa", padding: 24 }}>Loading currencies...</Text>
            ) : filteredCurrencies.length === 0 ? (
              <Text style={{ textAlign: "center", color: "#aaa", padding: 24 }}>No results found</Text>
            ) : filteredCurrencies.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[s.currencyOption, selectedCurrency.code === c.code && s.currencyOptionActive]}
                onPress={() => { setSelectedCurrency(c); setShowCurrencyPicker(false); }}
              >
                <View>
                  <Text style={[s.currencyOptionText, selectedCurrency.code === c.code && s.currencyOptionTextActive]}>
                    {c.label}
                  </Text>
                  <Text style={s.currencyCode}>{c.code}</Text>
                </View>
                {selectedCurrency.code === c.code && <Ionicons name="checkmark" size={18} color="#3F63F3" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── add expense modal ── */}
      <Modal visible={showAddExpense} transparent animationType="slide" onRequestClose={() => setShowAddExpense(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={s.modalOverlay} onPress={() => setShowAddExpense(false)} />
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Add Major Expense</Text>
            <Text style={s.inputLabel}>Name</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. Hotel, Flights, Car Rental..."
              placeholderTextColor="#aaa"
              value={expenseName}
              onChangeText={setExpenseName}
            />
            <Text style={s.inputLabel}>Cost (USD $)</Text>
            <TextInput
              style={s.modalInput}
              placeholder="0.00"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={expenseCost}
              onChangeText={setExpenseCost}
            />
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAddExpense} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? "Saving..." : "Add Expense"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f9ff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: "#f8f9ff",
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.6 },

  cardsRow: { gap: 12, paddingBottom: 4, paddingRight: 4 },
  card: {
    width: 200, backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 12, fontWeight: "700", color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  cardBig: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 4 },
  cardBigSub: { fontSize: 14, fontWeight: "500", color: "#aaa" },
  cardSub: { fontSize: 12, color: "#aaa", marginTop: 4 },
  progressTrack: { height: 5, backgroundColor: "#eee", borderRadius: 3, marginTop: 8, overflow: "hidden" },
  progressFill: { height: 5, backgroundColor: "#3F63F3", borderRadius: 3 },
  changeCurrencyBtn: { marginTop: 10 },
  changeCurrencyText: { fontSize: 12, color: "#3F63F3", fontWeight: "700" },

  majorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 },
  majorTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#3F63F3", alignItems: "center", justifyContent: "center" },
  emptyExpenses: { fontSize: 13, color: "#bbb", fontStyle: "italic", marginBottom: 8 },
  expenseRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  expenseName: { fontSize: 15, color: "#222", fontWeight: "500", flex: 1 },
  expenseCost: { fontSize: 15, color: "#3F63F3", fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 16 },

  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#111" },

  currencyOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  currencyOptionActive: { backgroundColor: "#f0f4ff", borderRadius: 8, paddingHorizontal: 8 },
  currencyOptionText: { fontSize: 15, color: "#222", fontWeight: "500" },
  currencyOptionTextActive: { color: "#3F63F3", fontWeight: "700" },
  currencyCode: { fontSize: 12, color: "#aaa", marginTop: 2 },

  inputLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: "#111", backgroundColor: "#fafafa", marginBottom: 14 },
  saveBtn: { backgroundColor: "#3F63F3", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

const cs = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, paddingLeft: 40,
    marginTop: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 8 },
  yLabel: { position: "absolute", left: 4, fontSize: 10, color: "#bbb" },
  xLabel: { position: "absolute", fontSize: 10, color: "#888", textAlign: "center", fontWeight: "600" },
  legend: { flexDirection: "row", gap: 16, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: "#555", fontWeight: "500" },
});