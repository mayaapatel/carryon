import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEY = "trip_items_v2";

export async function getTripItems() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.log("getTripItems error:", error);
    return [];
  }
}

export async function saveTripItems(items) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.log("saveTripItems error:", error);
  }
}

export async function upsertTripItem(item) {
  const items = await getTripItems();
  const exists = items.some((x) => x.id === item.id);

  const updated = exists
    ? items.map((x) => (x.id === item.id ? item : x))
    : [...items, item];

  await saveTripItems(updated);
  return updated;
}

export async function deleteTripItem(id) {
  const items = await getTripItems();
  const updated = items.filter((x) => x.id !== id);
  await saveTripItems(updated);
  return updated;
}

export async function getTripItemById(id) {
  const items = await getTripItems();
  return items.find((x) => x.id === id) || null;
}

export function formatTime(dateObj) {
  const hours24 = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const suffix = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  const mm = String(minutes).padStart(2, "0");
  return `${hours12}:${mm} ${suffix}`;
}

export function toSortableDate(item) {
  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const date = new Date(
    item.year,
    monthMap[item.month] ?? 0,
    item.day ?? 1,
    item.hour24 ?? 0,
    item.minute ?? 0,
    0,
    0
  );

  return date.getTime();
}