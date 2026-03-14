import AsyncStorage from "@react-native-async-storage/async-storage";

function getTripKey(tripId) {
  return `trip_items_${tripId}`;
}

function createItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatTime(date) {
  if (!date) return "";

  const hours = date.getHours();
  const minutes = date.getMinutes();

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinute = String(minutes).padStart(2, "0");

  return `${displayHour}:${displayMinute} ${suffix}`;
}

export async function getTripItems(tripId) {
  try {
    const key = getTripKey(String(tripId));
    const data = await AsyncStorage.getItem(key);

    if (!data) return [];

    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.log("getTripItems error:", error);
    return [];
  }
}

export async function getTripItemById(tripId, itemId) {
  try {
    const items = await getTripItems(tripId);
    return items.find((item) => String(item.id) === String(itemId)) || null;
  } catch (error) {
    console.log("getTripItemById error:", error);
    return null;
  }
}

export async function saveTripItems(tripId, items) {
  try {
    const key = getTripKey(String(tripId));
    await AsyncStorage.setItem(key, JSON.stringify(items));
    return items;
  } catch (error) {
    console.log("saveTripItems error:", error);
    throw error;
  }
}

export async function upsertTripItem(tripId, item) {
  try {
    const items = await getTripItems(tripId);

    const safeItem = {
      ...item,
      id: item?.id ? String(item.id) : createItemId(),
    };

    const index = items.findIndex(
      (existingItem) => String(existingItem.id) === String(safeItem.id)
    );

    let nextItems;

    if (index >= 0) {
      nextItems = [...items];
      nextItems[index] = safeItem;
    } else {
      nextItems = [...items, safeItem];
    }

    await saveTripItems(tripId, nextItems);
    return safeItem;
  } catch (error) {
    console.log("upsertTripItem error:", error);
    throw error;
  }
}

export async function deleteTripItem(tripId, itemId) {
  try {
    const items = await getTripItems(tripId);

    const filteredItems = items.filter(
      (item) => String(item.id) !== String(itemId)
    );

    await saveTripItems(tripId, filteredItems);
  } catch (error) {
    console.log("deleteTripItem error:", error);
    throw error;
  }
}

export async function uploadTripAttachment(tripId, itemId, attachment) {
  return {
    ...attachment,
    downloadURL: attachment?.downloadURL || attachment?.uri || "",
  };
}