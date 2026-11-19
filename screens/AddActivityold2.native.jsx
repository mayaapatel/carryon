<Pressable
  onPress={async () => {
    try {
      const Notifications = await import("expo-notifications");

      const permission =
        await Notifications.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Notifications are not allowed");
        return;
      }

      const id =
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "CarryOn Test ✈️",
            body: "Your notifications are working!",
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 10,
          },
        });

      console.log("Scheduled notification:", id);
      Alert.alert("Test scheduled", "Lock your phone now!");
    } catch (error) {
      Alert.alert("Notification error", String(error));
      console.error(error);
    }
  }}
  style={{
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 12,
    margin: 15,
  }}
>
  <Text style={{ color: "white", textAlign: "center" }}>
    Test Notification
  </Text>
</Pressable>