
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL = "carryon-reservations";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});


export async function requestReminderPermission() {
  try {
    console.log(
      "Notifications module:",
      typeof Notifications.getPermissionsAsync
    );

    console.log(
      "Notification channel:",
      typeof Notifications.setNotificationChannelAsync
    );

    if (
      typeof Notifications.getPermissionsAsync !== "function" ||
      typeof Notifications.requestPermissionsAsync !== "function"
    ) {
      throw new Error(
        "Expo notifications is not available in this app runtime."
      );
    }

    if (Platform.OS === "android") {
      if (
        typeof Notifications.setNotificationChannelAsync ===
        "function"
      ) {
        await Notifications.setNotificationChannelAsync(
          CHANNEL_ID,
          {
            name: "CarryOn Reservation Reminders",
            importance:
              Notifications.AndroidImportance.HIGH,
            sound: "default",
          }
        );
      }
    }

    let permission =
      await Notifications.getPermissionsAsync();

    if (!permission.granted) {
      permission =
        await Notifications.requestPermissionsAsync();
    }

    return (
      permission.granted ||
      permission.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.log(
      "CARRYON NOTIFICATION ERROR:",
      error
    );
    throw error;
  }
}


export async function cancelActivityReminder(
  tripId,
  activityId,
  userId
) {
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduled) {
    const data = notification.content.data || {};

    if (
      data.type === "carryon-reservation" &&
      data.tripId === tripId &&
      data.activityId === activityId &&
      data.userId === userId
    ) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier
      );
    }
  }
}

export async function scheduleActivityReminder({
  tripId,
  activityId,
  userId,
  title,
  location,
  activityDate,
  minutesBefore,
}) {
  const reminderTime =
    activityDate.getTime() - minutesBefore * 60000;

  if (reminderTime <= Date.now()) {
    throw new Error(
      "The reminder time has already passed. Choose a later activity or a shorter reminder."
    );
  }

  const allowed = await requestReminderPermission();

  if (!allowed) {
    throw new Error(
      "Notification permission was not granted."
    );
  }

  const label =
    minutesBefore === 1440
      ? "1 day"
      : minutesBefore >= 60
      ? `${minutesBefore / 60} hour(s)`
      : `${minutesBefore} minutes`;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "CarryOn Reminder ✈️",
      body: `${title} starts in ${label}${
        location ? ` · ${location}` : ""
      }`,
      sound: "default",
      data: {
        type: "carryon-reservation",
        tripId,
        activityId,
        userId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderTime),
      ...(Platform.OS === "android"
        ? { channelId: CHANNEL }
        : {}),
    },
  });
}
