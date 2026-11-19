import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapView, { Marker } from "react-native-maps";
import { auth, db } from "../firebaseConfig";
import {
  cancelActivityReminder,
  requestReminderPermission,
  scheduleActivityReminder,
} from "../utils/reservationReminders";
import {
  formatTime,
  getTripItemById,
  upsertTripItem,
} from "../utils/tripStorage";

const BLUE = "#3F63F3";
const BG = "#DCE6FF";
const BORDER = "#B4C6FF";
const TEXT = "#1F2937";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const YEARS = [2025, 2026, 2027, 2028];

const CATEGORIES = [
  { key: "activity", label: "Activity" },
  { key: "transportation", label: "Transportation" },
  { key: "food", label: "Food" },
  { key: "hotel", label: "Hotel" },
];

const LOCATION_API_KEY = "252b650d2acb4397ab93916025da875e";

function createEmptyForm() {
  return {
    description: "",
    locationStreet: "",
    locationCity: "",
    locationState: "",
    locationZip: "",
    locationLatitude: 37.7749,
    locationLongitude: -122.4194,
    reservationNumber: "",
    reminderEnabled: false,
    reminderMinutes: 30,
    price: 50,
    monthIndex: 0,
    yearIndex: 1,
    selectedDay: 9,
    timeValue: new Date(2026, 0, 9, 12, 0),
    attachments: [],
  };
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildDateFromParts(year, monthIndex, day, baseTime = null) {
  const hours = baseTime ? baseTime.getHours() : 12;
  const minutes = baseTime ? baseTime.getMinutes() : 0;
  return new Date(year, monthIndex, day, hours, minutes, 0);
}

function toMonthKey(year, monthIndex) {
  return year * 100 + monthIndex;
}

function getValidDayRangeForMonth(year, monthIndex, tripStartDate, tripEndDate) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  let minDay = 1;
  let maxDay = daysInMonth;

  if (
    tripStartDate &&
    tripStartDate.getFullYear() === year &&
    tripStartDate.getMonth() === monthIndex
  ) {
    minDay = tripStartDate.getDate();
  }

  if (
    tripEndDate &&
    tripEndDate.getFullYear() === year &&
    tripEndDate.getMonth() === monthIndex
  ) {
    maxDay = tripEndDate.getDate();
  }

  return { minDay, maxDay };
}

export default function AddActivity() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const tripId = params.tripId ? String(params.tripId) : null;
  const sourceTripId = params.sourceTripId
    ? String(params.sourceTripId)
    : tripId;
  const sourceTripOwnerId = params.sourceTripOwnerId
    ? String(params.sourceTripOwnerId)
    : auth.currentUser?.uid || "";
  const editingId = params.editId ? String(params.editId) : null;
  const presetCategory = params.presetCategory ? String(params.presetCategory) : null;
  const initialTripTitle = params.title ? String(params.title) : "";

  const scrollRef = useRef(null);
  const fieldPositionsRef = useRef({});

  const [category, setCategory] = useState("activity");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [tripStartDate, setTripStartDate] = useState(null);
  const [tripEndDate, setTripEndDate] = useState(null);
  const [tripTitle, setTripTitle] = useState(initialTripTitle);

  const [tabForms, setTabForms] = useState({
    activity: createEmptyForm(),
    transportation: createEmptyForm(),
    food: createEmptyForm(),
    hotel: createEmptyForm(),
  });

  const [mapRegion, setMapRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  function registerFieldPosition(field, y) {
    fieldPositionsRef.current[field] = y;
  }

  function scrollToField(field) {
    const y = fieldPositionsRef.current[field];
    if (typeof y !== "number") return;

    setTimeout(() => {
      scrollRef.current?.scrollToPosition?.(0, Math.max(0, y - 140), true);
    }, 120);
  }

  useEffect(() => {
    if (presetCategory && !editingId) {
      setCategory(presetCategory);
    }
  }, [presetCategory, editingId]);

  useEffect(() => {
    async function loadTripRange() {
      if (!sourceTripId || !sourceTripOwnerId) return;

      try {
        const tripRef = doc(db, "users", sourceTripOwnerId, "trips", sourceTripId);
        const tripSnap = await getDoc(tripRef);

        if (!tripSnap.exists()) return;

        const tripData = tripSnap.data() || {};

        setTripTitle(
          tripData.title ||
          tripData.tripName ||
          tripData.name ||
          initialTripTitle ||
          ""
        );

        const rawStart = tripData.startDate?.toDate
          ? tripData.startDate.toDate()
          : tripData.startDate
            ? new Date(tripData.startDate)
            : null;

        const rawEnd = tripData.endDate?.toDate
          ? tripData.endDate.toDate()
          : tripData.endDate
            ? new Date(tripData.endDate)
            : null;

        if (rawStart && !Number.isNaN(rawStart.getTime())) {
          setTripStartDate(stripTime(rawStart));
        }

        if (rawEnd && !Number.isNaN(rawEnd.getTime())) {
          setTripEndDate(stripTime(rawEnd));
        }
      } catch (error) {
        console.log("Load trip range error:", error);
      }
    }

    loadTripRange();
  }, [sourceTripId, sourceTripOwnerId, initialTripTitle]);

  useEffect(() => {
    async function loadEditItem() {
      if (!editingId || !sourceTripId) return;

      try {
        setLoadingEditData(true);
        const item = await getTripItemById(
          sourceTripId,
          editingId,
          sourceTripOwnerId
        );

        if (item) {
          const mIndex = MONTHS.indexOf(item.month);
          const yIndex = YEARS.indexOf(item.year);

          const loc = item.location && typeof item.location === "object" ? item.location : {};

          const loadedForm = {
            description: item.description || "",
            locationStreet: loc.street || "",
            locationCity: loc.city || "",
            locationState: loc.state || "",
            locationZip: loc.zip || "",
            locationLatitude: loc.latitude || 37.7749,
            locationLongitude: loc.longitude || -122.4194,
            reservationNumber: item.reservationNumber || "",
            reminderEnabled: item.reminderEnabled === true,
            reminderMinutes: item.reminderMinutes ?? 30,
            price: item.price ?? 50,
            monthIndex: mIndex >= 0 ? mIndex : 0,
            yearIndex: yIndex >= 0 ? yIndex : 1,
            selectedDay: item.day || 9,
            timeValue: (() => {
              const d = new Date(2026, 0, 9, 12, 0);
              d.setHours(item.hour24 ?? 12);
              d.setMinutes(item.minute ?? 0);
              d.setSeconds(0);
              return d;
            })(),
            attachments: Array.isArray(item.attachments) ? item.attachments : [],
          };

          setCategory(item.category || "activity");
          setTabForms({
            activity: createEmptyForm(),
            transportation: createEmptyForm(),
            food: createEmptyForm(),
            hotel: createEmptyForm(),
            [item.category || "activity"]: loadedForm,
          });

          if (loc.latitude && loc.longitude) {
            setMapRegion((prev) => ({
              ...prev,
              latitude: loc.latitude,
              longitude: loc.longitude,
            }));
          }
        }
      } catch (error) {
        console.log("Load edit item error:", error);
        Alert.alert("Error", error.message || "Could not load item.");
      } finally {
        setLoadingEditData(false);
      }
    }

    loadEditItem();
  }, [editingId, sourceTripId, sourceTripOwnerId]);

  const currentForm = tabForms[category];
  const currentMonth = MONTHS[currentForm.monthIndex];
  const currentYear = YEARS[currentForm.yearIndex];

  const allowedMonthKeys = useMemo(() => {
    if (!tripStartDate || !tripEndDate) return null;

    const keys = [];
    let year = tripStartDate.getFullYear();
    let month = tripStartDate.getMonth();

    while (
      year < tripEndDate.getFullYear() ||
      (year === tripEndDate.getFullYear() && month <= tripEndDate.getMonth())
    ) {
      keys.push(toMonthKey(year, month));

      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }

    return keys;
  }, [tripStartDate, tripEndDate]);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentForm.monthIndex + 1, 0).getDate();
  }, [currentYear, currentForm.monthIndex]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(currentYear, currentForm.monthIndex, 1).getDay();
  }, [currentYear, currentForm.monthIndex]);

  const calendarCells = useMemo(() => {
    const cells = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push({ type: "empty", key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = stripTime(new Date(currentYear, currentForm.monthIndex, day));
      const isInTripRange =
        (!tripStartDate || cellDate >= tripStartDate) &&
        (!tripEndDate || cellDate <= tripEndDate);

      cells.push({
        type: "day",
        key: `day-${day}`,
        value: day,
        disabled: !isInTripRange,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ type: "empty-end", key: `empty-end-${cells.length}` });
    }

    return cells;
  }, [
    firstDayOfMonth,
    daysInMonth,
    currentYear,
    currentForm.monthIndex,
    tripStartDate,
    tripEndDate,
  ]);

  const canGoPrevMonth = useMemo(() => {
    if (!allowedMonthKeys) {
      if (currentForm.monthIndex === 0) {
        return currentForm.yearIndex > 0;
      }
      return true;
    }

    const prevMonthIndex = currentForm.monthIndex === 0 ? 11 : currentForm.monthIndex - 1;
    const prevYearIndex = currentForm.monthIndex === 0
      ? currentForm.yearIndex - 1
      : currentForm.yearIndex;

    if (prevYearIndex < 0) return false;

    const prevYear = YEARS[prevYearIndex];
    return allowedMonthKeys.includes(toMonthKey(prevYear, prevMonthIndex));
  }, [allowedMonthKeys, currentForm.monthIndex, currentForm.yearIndex]);

  const canGoNextMonth = useMemo(() => {
    if (!allowedMonthKeys) {
      if (currentForm.monthIndex === 11) {
        return currentForm.yearIndex < YEARS.length - 1;
      }
      return true;
    }

    const nextMonthIndex = currentForm.monthIndex === 11 ? 0 : currentForm.monthIndex + 1;
    const nextYearIndex = currentForm.monthIndex === 11
      ? currentForm.yearIndex + 1
      : currentForm.yearIndex;

    if (nextYearIndex > YEARS.length - 1) return false;

    const nextYear = YEARS[nextYearIndex];
    return allowedMonthKeys.includes(toMonthKey(nextYear, nextMonthIndex));
  }, [allowedMonthKeys, currentForm.monthIndex, currentForm.yearIndex]);

  useEffect(() => {
    if (!tripStartDate || !tripEndDate) return;
    if (!YEARS.includes(tripStartDate.getFullYear()) || !YEARS.includes(tripEndDate.getFullYear())) return;

    setTabForms((prev) => {
      const next = { ...prev };

      for (const key of Object.keys(next)) {
        const form = next[key];
        const formDate = stripTime(
          buildDateFromParts(
            YEARS[form.yearIndex],
            form.monthIndex,
            form.selectedDay,
            form.timeValue
          )
        );

        if (formDate < tripStartDate || formDate > tripEndDate) {
          const replacementDate = tripStartDate;

          const newTime = new Date(form.timeValue);
          newTime.setFullYear(replacementDate.getFullYear());
          newTime.setMonth(replacementDate.getMonth());
          newTime.setDate(replacementDate.getDate());

          next[key] = {
            ...form,
            yearIndex: YEARS.indexOf(replacementDate.getFullYear()),
            monthIndex: replacementDate.getMonth(),
            selectedDay: replacementDate.getDate(),
            timeValue: newTime,
          };
        } else {
          const { minDay, maxDay } = getValidDayRangeForMonth(
            YEARS[form.yearIndex],
            form.monthIndex,
            tripStartDate,
            tripEndDate
          );

          let adjustedDay = form.selectedDay;
          if (adjustedDay < minDay) adjustedDay = minDay;
          if (adjustedDay > maxDay) adjustedDay = maxDay;

          if (adjustedDay !== form.selectedDay) {
            const newTime = new Date(form.timeValue);
            newTime.setDate(adjustedDay);

            next[key] = {
              ...form,
              selectedDay: adjustedDay,
              timeValue: newTime,
            };
          }
        }
      }

      return next;
    });
  }, [tripStartDate, tripEndDate]);

  function updateCurrentForm(updates) {
    setTabForms((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...updates,
      },
    }));
  }

  function resetAllForms() {
    const base = createEmptyForm();

    if (tripStartDate && YEARS.includes(tripStartDate.getFullYear())) {
      base.yearIndex = YEARS.indexOf(tripStartDate.getFullYear());
      base.monthIndex = tripStartDate.getMonth();
      base.selectedDay = tripStartDate.getDate();
      base.timeValue = new Date(
        tripStartDate.getFullYear(),
        tripStartDate.getMonth(),
        tripStartDate.getDate(),
        12,
        0,
        0
      );
    }

    setTabForms({
      activity: { ...base },
      transportation: { ...base },
      food: { ...base },
      hotel: { ...base },
    });
    setCategory("activity");
  }

  function goPrevMonth() {
    if (!canGoPrevMonth) return;

    if (currentForm.monthIndex === 0) {
      if (currentForm.yearIndex > 0) {
        const newYearIndex = currentForm.yearIndex - 1;
        const newMonthIndex = 11;
        const newYear = YEARS[newYearIndex];
        const { minDay, maxDay } = getValidDayRangeForMonth(
          newYear,
          newMonthIndex,
          tripStartDate,
          tripEndDate
        );

        const nextSelectedDay = Math.min(Math.max(currentForm.selectedDay, minDay), maxDay);
        const nextTime = new Date(currentForm.timeValue);
        nextTime.setFullYear(newYear);
        nextTime.setMonth(newMonthIndex);
        nextTime.setDate(nextSelectedDay);

        updateCurrentForm({
          monthIndex: newMonthIndex,
          yearIndex: newYearIndex,
          selectedDay: nextSelectedDay,
          timeValue: nextTime,
        });
      }
    } else {
      const newMonthIndex = currentForm.monthIndex - 1;
      const { minDay, maxDay } = getValidDayRangeForMonth(
        currentYear,
        newMonthIndex,
        tripStartDate,
        tripEndDate
      );

      const nextSelectedDay = Math.min(Math.max(currentForm.selectedDay, minDay), maxDay);
      const nextTime = new Date(currentForm.timeValue);
      nextTime.setMonth(newMonthIndex);
      nextTime.setDate(nextSelectedDay);

      updateCurrentForm({
        monthIndex: newMonthIndex,
        selectedDay: nextSelectedDay,
        timeValue: nextTime,
      });
    }
  }

  function goNextMonth() {
    if (!canGoNextMonth) return;

    if (currentForm.monthIndex === 11) {
      if (currentForm.yearIndex < YEARS.length - 1) {
        const newYearIndex = currentForm.yearIndex + 1;
        const newMonthIndex = 0;
        const newYear = YEARS[newYearIndex];
        const { minDay, maxDay } = getValidDayRangeForMonth(
          newYear,
          newMonthIndex,
          tripStartDate,
          tripEndDate
        );

        const nextSelectedDay = Math.min(Math.max(currentForm.selectedDay, minDay), maxDay);
        const nextTime = new Date(currentForm.timeValue);
        nextTime.setFullYear(newYear);
        nextTime.setMonth(newMonthIndex);
        nextTime.setDate(nextSelectedDay);

        updateCurrentForm({
          monthIndex: newMonthIndex,
          yearIndex: newYearIndex,
          selectedDay: nextSelectedDay,
          timeValue: nextTime,
        });
      }
    } else {
      const newMonthIndex = currentForm.monthIndex + 1;
      const { minDay, maxDay } = getValidDayRangeForMonth(
        currentYear,
        newMonthIndex,
        tripStartDate,
        tripEndDate
      );

      const nextSelectedDay = Math.min(Math.max(currentForm.selectedDay, minDay), maxDay);
      const nextTime = new Date(currentForm.timeValue);
      nextTime.setMonth(newMonthIndex);
      nextTime.setDate(nextSelectedDay);

      updateCurrentForm({
        monthIndex: newMonthIndex,
        selectedDay: nextSelectedDay,
        timeValue: nextTime,
      });
    }
  }

  async function pickFromLibrary() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        allowsMultipleSelection: true,
      });

      if (result.canceled) return;

      const newItems = result.assets.map((asset) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: "image",
        uri: asset.uri,
        name: asset.fileName || "Photo",
        mimeType: asset.mimeType || "image/jpeg",
      }));

      updateCurrentForm({
        attachments: [...currentForm.attachments, ...newItems],
      });
    } catch (error) {
      console.log("pickFromLibrary error:", error);
      Alert.alert("Error", "Could not add photo.");
    }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Please allow camera access.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const newItems = result.assets.map((asset) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: "image",
        uri: asset.uri,
        name: asset.fileName || "Camera Photo",
        mimeType: asset.mimeType || "image/jpeg",
      }));

      updateCurrentForm({
        attachments: [...currentForm.attachments, ...newItems],
      });
    } catch (error) {
      console.log("takePhoto error:", error);
      Alert.alert("Error", "Could not take photo.");
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      const newDoc = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: "document",
        uri: file.uri,
        name: file.name || "Document",
        mimeType: file.mimeType || "",
      };

      updateCurrentForm({
        attachments: [...currentForm.attachments, newDoc],
      });
    } catch (error) {
      console.log("pickDocument error:", error);
      Alert.alert("Error", "Could not add document.");
    }
  }

  function onCameraPress() {
    Alert.alert("Add Attachment", "Choose what you want to add.", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Upload Photo", onPress: pickFromLibrary },
      { text: "Upload Document", onPress: pickDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function removeAttachment(id) {
    updateCurrentForm({
      attachments: currentForm.attachments.filter((item) => item.id !== id),
    });
  }

  function isFilled(form) {
    return (
      form.description.trim() ||
      form.locationStreet.trim() ||
      form.locationCity.trim() ||
      form.reservationNumber.trim() ||
      form.attachments.length > 0
    );
  }

  function buildItemFromForm(categoryKey, form, existingId = null) {
    const month = MONTHS[form.monthIndex];
    const year = YEARS[form.yearIndex];

    return {
      ...(existingId ? { id: existingId } : {}),
      category: categoryKey,
      description: form.description.trim(),
      location: {
        street: form.locationStreet,
        city: form.locationCity,
        state: form.locationState,
        zip: form.locationZip,
        latitude: form.locationLatitude,
        longitude: form.locationLongitude,
      },
      reservationNumber: form.reservationNumber.trim(),
      reminderEnabled: form.reminderEnabled === true,
      reminderMinutes: form.reminderMinutes ?? 30,
      price: form.price,
      month,
      year,
      day: form.selectedDay,
      dateLabel: `${month} ${form.selectedDay}, ${year}`,
      hour24: form.timeValue.getHours(),
      minute: form.timeValue.getMinutes(),
      timeLabel: formatTime(form.timeValue),
      attachments: form.attachments,
    };
  }

  // The itinerary stores local date/time fields. This converts them to a
  // Date in the device's current timezone. Destination timezone support
  // should be added for trips across time zones.
  function getActivityDate(form) {
    return new Date(
      YEARS[form.yearIndex],
      form.monthIndex,
      form.selectedDay,
      form.timeValue.getHours(),
      form.timeValue.getMinutes(),
      0
    );
  }

async function updateDeviceReminder(item, form) {
  const userId = auth.currentUser?.uid;

  if (!userId || !item.id) {
    throw new Error(
      "Missing user or activity ID for reminder."
    );
  }

  const location = [
    form.locationStreet,
    form.locationCity,
  ]
    .filter(Boolean)
    .join(", ");

  // Step 1: Remove old reminders for this activity
  await cancelActivityReminder(
    sourceTripId,
    item.id,
    userId
  );

  // Step 2: If reminders are disabled, stop here
  if (!form.reminderEnabled) {
    console.log("Reminder disabled:", item.description);
    return;
  }

  // Step 3: Schedule the new reminder
  const notificationId = await scheduleActivityReminder({
    tripId: sourceTripId,
    activityId: item.id,
    userId,
    title: item.description,
    location,
    activityDate: getActivityDate(form),
    minutesBefore: Number(form.reminderMinutes),
  });

  // Step 4: Verify the notification still exists
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  const exists = scheduled.some(
    (notification) =>
      notification.identifier === notificationId
  );

  console.log("REMINDER VERIFICATION:", {
    activity: item.description,
    notificationId,
    exists,
    totalScheduled: scheduled.length,
  });

  if (!exists) {
    throw new Error(
      "The reminder was created but is no longer scheduled."
    );
  }

  return notificationId;
}


  async function onAddAllItems() {
    if (savingItems) return;
    if (!tripId || !sourceTripId || !sourceTripOwnerId) {
      Alert.alert("Error", "Missing trip information.");
      return;
    }

    const entries = editingId
      ? [[category, currentForm]]
      : Object.entries(tabForms).filter(([, form]) => isFilled(form));

    if (!entries.length) {
      Alert.alert("Nothing to save", "Fill in at least one tab first.");
      return;
    }
    if (entries.some(([, form]) => !form.description.trim())) {
      Alert.alert("Missing description", "Every activity needs a description.");
      return;
    }

    for (const [, form] of entries) {
      if (!form.reminderEnabled) continue;
      const reminderAt = getActivityDate(form).getTime() -
        Number(form.reminderMinutes) * 60000;
      if (!Number.isFinite(reminderAt) || reminderAt <= Date.now()) {
        Alert.alert(
          "Invalid reminder time",
          `The reminder for "${form.description}" would occur in the past. Choose a later date or shorter reminder.`
        );
        return;
      }
    }

    if (entries.some(([, form]) => form.reminderEnabled)) {
      try {
        const allowed = await requestReminderPermission();
        if (!allowed) {
          Alert.alert(
            "Notifications disabled",
            "Allow notifications in your phone settings to enable reminders."
          );
          return;
        }
      } catch (error) {
        Alert.alert("Notifications unavailable", error.message);
        return;
      }
    }

    setSavingItems(true);
    let savedCount = 0;
    const reminderFailures = [];

    try {
      for (const [categoryKey, form] of entries) {
        // Use a Firestore-generated ID so notification and activity identities match.
        // upsertTripItem must preserve item.id; verify this in utils/tripStorage.
        const itemId = editingId || doc(collection(
          db, "users", sourceTripOwnerId, "trips", sourceTripId, "items"
        )).id;
        const item = buildItemFromForm(categoryKey, form, itemId);

        await upsertTripItem(sourceTripId, item, sourceTripOwnerId);
        savedCount += 1;


try {
  await updateDeviceReminder(item, form);

  console.log("REMINDER SUCCESS:", {
    activity: item.description,
    enabled: form.reminderEnabled,
    minutesBefore: form.reminderMinutes,
    date: getActivityDate(form).toString(),
  });

} catch (error) {
  console.log("REMINDER FAILED:", error);

  Alert.alert(
    "Reminder Failed",
    error?.message || String(error)
  );

  reminderFailures.push(item.description);
}
      }


      const navigateBack = () => router.replace({
        pathname: "/tripitinerary",
        params: { tripId, sourceTripId, sourceTripOwnerId, title: tripTitle },
      });

      resetAllForms();
      if (reminderFailures.length) {
        Alert.alert(
          "Activities saved",
          `${savedCount} item(s) saved, but reminders could not be updated for: ${reminderFailures.join(", ")}. Edit those activities to retry.`,
          [{ text: "OK", onPress: navigateBack }]
        );
      } else {
        navigateBack();
      }
    } catch (error) {
      console.log("Save activity error:", error);
      Alert.alert(
        "Save error",
        `${savedCount} item(s) saved before an error occurred. ${error.message || "Please try again."}`
      );
    } finally {
      setSavingItems(false);
    }
  }

  function updateLocationOnMap(lat, lng) {
    updateCurrentForm({ locationLatitude: lat, locationLongitude: lng });
    setMapRegion((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  }

  async function geocodeCurrentAddress() {
    const address = `${currentForm.locationStreet} ${currentForm.locationCity} ${currentForm.locationState} ${currentForm.locationZip}`.trim();
    if (!address) return;
    const res = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${LOCATION_API_KEY}`);
    const data = await res.json();
    const loc = data.results?.[0]?.geometry;
    if (loc) updateLocationOnMap(loc.lat, loc.lng);
  }

  async function reverseGeocodeMapPress(lat, lng) {
    const res = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${LOCATION_API_KEY}`);
    const data = await res.json();
    const components = data.results?.[0]?.components;
    if (!components) return;
    updateCurrentForm({
      locationStreet: components.road || "",
      locationCity: components.city || components.town || components.village || "",
      locationState: components.state || "",
      locationZip: components.postcode || "",
    });
    updateLocationOnMap(lat, lng);
  }

  if (loadingEditData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filledTabCount = Object.values(tabForms).filter(isFilled).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAwareScrollView
        innerRef={(ref) => {
          scrollRef.current = ref;
        }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        enableOnAndroid
        extraScrollHeight={140}
        extraHeight={160}
        enableAutomaticScroll
      >
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/maintrip",
                params: {
                  tripId,
                  sourceTripId,
                  sourceTripOwnerId,
                  title: tripTitle,
                },
              })
            }
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={24} color={TEXT} />
          </Pressable>

          <Text style={styles.headerTitle}>
            {editingId ? "Edit Item" : "Add Items"}
          </Text>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/tripitinerary",
                params: {
                  tripId,
                  sourceTripId,
                  sourceTripOwnerId,
                  title: tripTitle,
                },
              })
            }
            style={styles.iconButton}
          >
            <Ionicons name="grid-outline" size={22} color={TEXT} />
          </Pressable>
        </View>

        {!editingId && (
          <View style={styles.draftBanner}>
            <Text style={styles.draftBannerText}>
              {filledTabCount} tab{filledTabCount === 1 ? "" : "s"} ready to save
            </Text>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map((item) => {
            const active = item.key === category;
            return (
              <Pressable
                key={item.key}
                style={[styles.categoryPill, active && styles.categoryPillActive]}
                onPress={() => setCategory(item.key)}
              >
                <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View
          onLayout={(event) =>
            registerFieldPosition("description", event.nativeEvent.layout.y)
          }
        >
          <Text style={styles.label}>
            {category === "hotel" ? "Hotel / Reservation" : "Description"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={
              category === "transportation"
                ? "Flight, train, Uber, etc."
                : category === "food"
                  ? "Restaurant, snack stop, etc."
                  : category === "hotel"
                    ? "Hotel name or reservation"
                    : "Write a description here"
            }
            placeholderTextColor="#B8B8B8"
            value={currentForm.description}
            onChangeText={(text) => updateCurrentForm({ description: text })}
            onFocus={() => setTimeout(() => scrollToField("description"), 120)}
          />
        </View>

        <View
          onLayout={(event) =>
            registerFieldPosition("location", event.nativeEvent.layout.y)
          }
        >
          <Text style={styles.label}>
            {category === "hotel" ? "Location / Address" : "Location"}
          </Text>

          {[
            { label: "Street", key: "locationStreet" },
            { label: "City", key: "locationCity" },
            { label: "State", key: "locationState" },
            { label: "ZIP", key: "locationZip" },
          ].map((field, index) => (
            <TextInput
              key={field.key}
              style={styles.input}
              placeholder={field.label}
              placeholderTextColor="#B8B8B8"
              value={currentForm[field.key]}
              onChangeText={(text) => updateCurrentForm({ [field.key]: text })}
              keyboardType={field.key === "locationZip" ? "numeric" : "default"}
              onFocus={() => setTimeout(() => scrollToField("location"), 120)}
              returnKeyType={index === 3 ? "done" : "next"}
            />
          ))}

          <Pressable style={styles.showOnMapBtn} onPress={geocodeCurrentAddress}>
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={styles.showOnMapBtnText}>Show on Map</Text>
          </Pressable>

          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              region={{
                ...mapRegion,
                latitude: currentForm.locationLatitude,
                longitude: currentForm.locationLongitude,
              }}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                reverseGeocodeMapPress(latitude, longitude);
              }}
            >
              <Marker
                coordinate={{
                  latitude: currentForm.locationLatitude,
                  longitude: currentForm.locationLongitude,
                }}
              />
            </MapView>
          </View>
        </View>

        <View
          onLayout={(event) =>
            registerFieldPosition("reservationNumber", event.nativeEvent.layout.y)
          }
        >
          <Text style={styles.label}>Reservation Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#B8B8B8"
            value={currentForm.reservationNumber}
            onChangeText={(text) => updateCurrentForm({ reservationNumber: text })}
            onFocus={() => setTimeout(() => scrollToField("reservationNumber"), 120)}
          />
        </View>

        <View
          onLayout={(event) =>
            registerFieldPosition("time", event.nativeEvent.layout.y)
          }
        >
          <Text style={styles.label}>Time</Text>
          <Pressable style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.timeButtonText}>{formatTime(currentForm.timeValue)}</Text>
            <Ionicons name="time-outline" size={20} color={TEXT} />
          </Pressable>

          {showTimePicker && (
            <DateTimePicker
              value={currentForm.timeValue}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={(event, selectedDate) => {
                setShowTimePicker(false);
                if (selectedDate) {
                  const next = new Date(currentForm.timeValue);
                  next.setHours(selectedDate.getHours());
                  next.setMinutes(selectedDate.getMinutes());
                  updateCurrentForm({ timeValue: next });
                }
              }}
            />
          )}
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIcon}>
              <Ionicons name="notifications-outline" size={22} color={BLUE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>Reservation Reminder</Text>
              <Text style={styles.reminderSubtitle}>
                Get notified before this activity
              </Text>
            </View>
            <Switch
              value={currentForm.reminderEnabled}
              onValueChange={(value) => updateCurrentForm({ reminderEnabled: value })}
              trackColor={{ false: "#CBD5E1", true: "#AFC1FF" }}
              thumbColor={currentForm.reminderEnabled ? BLUE : "#F4F4F5"}
            />
          </View>
          {currentForm.reminderEnabled && (
            <>
              <View style={styles.reminderDivider} />
              <Text style={styles.reminderLabel}>Remind me before</Text>
              <View style={styles.reminderOptions}>
                {[
                  { label: "15 min", value: 15 },
                  { label: "30 min", value: 30 },
                  { label: "1 hour", value: 60 },
                  { label: "2 hours", value: 120 },
                  { label: "1 day", value: 1440 },
                ].map((option) => {
                  const selected = currentForm.reminderMinutes === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.reminderOption,
                        selected && styles.reminderOptionSelected,
                      ]}
                      onPress={() => updateCurrentForm({ reminderMinutes: option.value })}
                    >
                      <Text style={[
                        styles.reminderOptionText,
                        selected && styles.reminderOptionTextSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.reminderNote}>
                <Ionicons name="information-circle-outline" size={18} color={BLUE} />
                <Text style={styles.reminderNoteText}>
                  CarryOn will schedule a notification on this phone before the activity.
                </Text>
              </View>
            </>
          )}
        </View>

        <View
          onLayout={(event) =>
            registerFieldPosition("price", event.nativeEvent.layout.y)
          }
        >
          <View style={styles.priceHeader}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceValue}>${currentForm.price}</Text>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.sliderWrap}>
              <Slider
                style={{ width: "100%", height: 40 }}
                minimumValue={0}
                maximumValue={1000}
                step={1}
                value={currentForm.price}
                minimumTrackTintColor={BLUE}
                maximumTrackTintColor="#D5D5D5"
                thumbTintColor={BLUE}
                onValueChange={(value) => updateCurrentForm({ price: value })}
              />
            </View>

            <Pressable style={styles.cameraButton} onPress={onCameraPress}>
              <Ionicons name="camera-outline" size={28} color={BLUE} />
            </Pressable>
          </View>
        </View>

        {currentForm.attachments.length > 0 && (
          <View
            onLayout={(event) =>
              registerFieldPosition("attachments", event.nativeEvent.layout.y)
            }
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentsRow}>
              {currentForm.attachments.map((item) => (
                <View key={item.id} style={styles.attachmentCard}>
                  {item.type === "image" ? (
                    <Image source={{ uri: item.uri }} style={styles.attachmentImage} />
                  ) : (
                    <View style={styles.docPreview}>
                      <Ionicons name="document-text-outline" size={28} color={BLUE} />
                    </View>
                  )}

                  <Text numberOfLines={1} style={styles.attachmentName}>
                    {typeof item.name === "string" ? item.name : "Attachment"}
                  </Text>

                  <Pressable
                    style={styles.removeAttachmentButton}
                    onPress={() => removeAttachment(item.id)}
                  >
                    <Ionicons name="close-circle" size={20} color="#D9534F" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View
          style={styles.calendarCard}
          onLayout={(event) =>
            registerFieldPosition("calendar", event.nativeEvent.layout.y)
          }
        >
          <View style={styles.calendarTopRow}>
            <Pressable
              onPress={goPrevMonth}
              style={[styles.arrowButton, !canGoPrevMonth && styles.arrowButtonDisabled]}
              disabled={!canGoPrevMonth}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={canGoPrevMonth ? TEXT : "#9CA3AF"}
              />
            </Pressable>

            <View style={styles.dropdownRow}>
              <View style={styles.fakeDropdownMonth}>
                <Text style={styles.dropdownText}>{currentMonth}</Text>
              </View>

              <View style={styles.fakeDropdownYear}>
                <Text style={styles.dropdownText}>{currentYear}</Text>
              </View>
            </View>

            <Pressable
              onPress={goNextMonth}
              style={[styles.arrowButton, !canGoNextMonth && styles.arrowButtonDisabled]}
              disabled={!canGoNextMonth}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={canGoNextMonth ? TEXT : "#9CA3AF"}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <Text key={day} style={styles.weekText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarCells.map((cell) => {
              if (cell.type !== "day") {
                return <View key={cell.key} style={styles.dayCell} />;
              }

              const selected = cell.value === currentForm.selectedDay;
              const disabled = cell.disabled;

              return (
                <Pressable
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    selected && styles.selectedDayCell,
                    disabled && styles.disabledDayCell,
                  ]}
                  disabled={disabled}
                  onPress={() => {
                    const nextTime = new Date(currentForm.timeValue);
                    nextTime.setFullYear(currentYear);
                    nextTime.setMonth(currentForm.monthIndex);
                    nextTime.setDate(cell.value);

                    updateCurrentForm({
                      selectedDay: cell.value,
                      timeValue: nextTime,
                    });
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected && styles.selectedDayText,
                      disabled && styles.disabledDayText,
                    ]}
                  >
                    {cell.value}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tripStartDate && tripEndDate ? (
            <Text style={styles.tripRangeText}>
              Select a date between{" "}
              {MONTHS[tripStartDate.getMonth()]} {tripStartDate.getDate()} and{" "}
              {MONTHS[tripEndDate.getMonth()]} {tripEndDate.getDate()}, {tripEndDate.getFullYear()}
            </Text>
          ) : null}
        </View>

        {/* Temporary diagnostic: verifies local notifications on this phone. */}
        <Pressable
          style={{ backgroundColor: "#2563EB", padding: 15, borderRadius: 12, marginBottom: 12 }}
          onPress={async () => {
            try {
              const Notifications = await import("expo-notifications");
              const permission = await requestReminderPermission();
              if (!permission) {
                Alert.alert("Notifications disabled", "Allow notifications for Expo Go in your phone settings.");
                return;
              }
              if (typeof Notifications.scheduleNotificationAsync !== "function") {
                throw new Error("scheduleNotificationAsync is unavailable in this Expo runtime");
              }
              const id = await Notifications.scheduleNotificationAsync({
                content: {
                  title: "CarryOn Test ✈️",
                  body: "Your phone notifications are working!",
                  sound: "default",
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                  seconds: 10,
                  ...(Platform.OS === "android" ? { channelId: "carryon-reservations" } : {}),
                },
              });
              console.log("CarryOn test notification scheduled:", id);
              Alert.alert("Test scheduled", "Lock your phone and wait 10 seconds.");
            } catch (error) {
              console.error("CarryOn test notification error:", error);
              Alert.alert("Notification test failed", String(error?.message || error));
            }
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
            TEST NOTIFICATION (10 SECONDS)
          </Text>
        </Pressable>

        <Pressable
          style={[styles.createButton, savingItems && { opacity: 0.6 }]}
          onPress={onAddAllItems}
          disabled={savingItems}
        >
          <Text style={styles.createButtonText}>
            {savingItems ? "SAVING..." : editingId ? "UPDATE!" : "ADD ALL ITEMS"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  reminderCard: {
    backgroundColor: "#EEF2FF", borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 16, padding: 16, marginBottom: 18,
  },
  reminderHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  reminderIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: BG,
    alignItems: "center", justifyContent: "center",
  },
  reminderTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  reminderSubtitle: { color: "#6B7280", fontSize: 12, marginTop: 4 },
  reminderDivider: { height: 1, backgroundColor: "#C9D7FF", marginVertical: 16 },
  reminderLabel: { fontSize: 14, fontWeight: "600", color: TEXT, marginBottom: 12 },
  reminderOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reminderOption: {
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10,
  },
  reminderOptionSelected: { backgroundColor: BLUE, borderColor: BLUE },
  reminderOptionText: { color: BLUE, fontSize: 13, fontWeight: "600" },
  reminderOptionTextSelected: { color: "#FFFFFF" },
  reminderNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: BG, padding: 12, borderRadius: 10, marginTop: 14,
  },
  reminderNoteText: { flex: 1, color: "#53617D", fontSize: 12, lineHeight: 18 },

  safeArea: {
    flex: 1,
    backgroundColor: "#DCE6FF"
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 220,
    flexGrow: 1,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },

  loadingText: {
    fontSize: 16,
    color: "#1F2937"
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 18
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C9D7FF",
    borderWidth: 1,
    borderColor: "#B4C6FF",
  },

  headerTitle: {
    fontSize: 18,
    color: "#3F63F3",
    fontWeight: "700"
  },

  draftBanner: {
    backgroundColor: "#C9D7FF",
    borderColor: "#B4C6FF",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12
  },

  draftBannerText: {
    color: "#3F63F3",
    fontSize: 14,
    fontWeight: "600"
  },

  categoryRow: {
    paddingBottom: 12,
    gap: 8
  },

  categoryPill: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 20,
    backgroundColor: "#D4DEFF",
    borderWidth: 1,
    borderColor: "#B4C6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },

  categoryPillActive: {
    backgroundColor: "#5A75F5",
    borderColor: "#5A75F5"
  },

  categoryPillText: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600"
  },

  categoryPillTextActive: {
    color: "#fff"
  },

  label: {
    fontSize: 15,
    color: "#111827",
    marginBottom: 10,
    fontWeight: "600"
  },

  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: "#9FB2FF",
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1F2937",
    marginBottom: 14
  },

  showOnMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },

  showOnMapBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  mapWrap: {
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },

  map: { flex: 1 },

  timeButton: {
    height: 52,
    borderWidth: 1.5,
    borderColor: "#9FB2FF",
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },

  timeButtonText: {
    fontSize: 15,
    color: "#1F2937"
  },

  priceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 8
  },

  priceLabel: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "600"
  },

  priceValue: {
    fontSize: 14,
    color: "#4B5563"
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14
  },

  sliderWrap: {
    flex: 1,
    marginRight: 14
  },

  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#5A75F5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF"
  },

  attachmentsRow: {
    paddingBottom: 14,
    gap: 10
  },

  attachmentCard: {
    width: 110,
    backgroundColor: "#D4DEFF",
    borderWidth: 1,
    borderColor: "#B4C6FF",
    borderRadius: 12,
    padding: 8,
    marginRight: 10,
    position: "relative"
  },

  attachmentImage: {
    width: "100%",
    height: 68,
    borderRadius: 8,
    backgroundColor: "#C2D0FF",
    marginBottom: 6
  },

  docPreview: {
    width: "100%",
    height: 68,
    borderRadius: 8,
    backgroundColor: "#C2D0FF",
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center"
  },

  attachmentName: {
    fontSize: 12,
    color: "#1F2937"
  },

  removeAttachmentButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#DCE6FF",
    borderRadius: 999
  },

  calendarCard: {
    backgroundColor: "#D4DEFF",
    borderWidth: 1,
    borderColor: "#B4C6FF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16
  },

  calendarTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14
  },

  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C9D7FF",
  },

  arrowButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },

  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },

  fakeDropdownMonth: {
    minWidth: 70,
    height: 34,
    borderWidth: 1,
    borderColor: "#B4C6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C9D7FF"
  },

  fakeDropdownYear: {
    minWidth: 86,
    height: 34,
    borderWidth: 1,
    borderColor: "#B4C6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C9D7FF"
  },

  dropdownText: {
    fontSize: 14,
    color: "#1F2937"
  },

  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4
  },

  weekText: {
    width: "14.28%",
    textAlign: "center",
    color: "#6B7280",
    fontSize: 12
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },

  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginBottom: 4
  },

  selectedDayCell: {
    backgroundColor: "#5A75F5"
  },

  disabledDayCell: {
    backgroundColor: "#E5E7EB",
    opacity: 0.65,
  },

  dayText: {
    fontSize: 16,
    color: "#2B2B2B"
  },

  selectedDayText: {
    color: "#fff",
    fontWeight: "600"
  },

  disabledDayText: {
    color: "#9CA3AF",
  },

  tripRangeText: {
    marginTop: 10,
    textAlign: "center",
    color: "#4B5563",
    fontSize: 12,
    lineHeight: 18,
  },

  createButton: {
    marginTop: 16,
    backgroundColor: "#5A75F5",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },

  createButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
});