// screens/Auth.jsx
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";


/**
 * UI-only Auth screen to match the mock.
 * Put in: carryon/screens/Auth.jsx
 *
 * If you want it as a route:
 * app/auth.jsx ->
 *   import Auth from "../screens/Auth";
 *   export default Auth;
 */

export default function Auth() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const [username, setUsername] = useState("");
   
  const [password, setPassword] = useState("");

  const onSignUp = async () => {
  try {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
    console.log("Signed up!");
    // later: router.replace("/dashboard") or whatever
  } catch (e) {
    console.log("Sign up error:", e.message);
  }

  router.push("/dashboard")
};

const onLogIn = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    console.log("Logged in!");
  } catch (e) {
    console.log("Log in error:", e.message);
  }

  router.push("/dashboard")
};


  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Logo / Title */}
          <View style={styles.brandWrap}>
            <Text style={styles.brand}>CARRY ON</Text>
            <Text style={styles.tagline}>PLAN. PACK. GO.</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.h1}>Create an account</Text>
            <Text style={styles.sub}>Enter your email to sign up for this app</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="email@domain.com"
              placeholderTextColor="rgba(17,24,39,0.35)"
              style={styles.input}
            />

            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="rgba(17,24,39,0.35)"
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="rgba(17,24,39,0.35)"
              secureTextEntry
              style={styles.input}
            />

            

            <View style={styles.btnRow}>
              <TouchableOpacity onPress={onSignUp} style={styles.btn} activeOpacity={0.9}>
                <Text style={styles.btnText}>SIGN UP</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onLogIn} style={styles.btn} activeOpacity={0.9}>
                <Text style={styles.btnText}>LOG IN</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.legal}>
              By clicking continue, you agree to our{" "}
              <Text style={styles.link}>Terms of Service</Text>
              {"\n"}and{" "}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BLUE = "#3F63F3";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  flex: { flex: 1 },

  container: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  brandWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  brand: {
    fontSize: 40,
    letterSpacing: 2,
    color: BLUE,
    fontWeight: "600",
  },
  tagline: {
    marginTop: 6,
    fontSize: 12,
    letterSpacing: 2,
    color: BLUE,
    fontWeight: "500",
  },

  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
  },

  h1: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  sub: {
    marginTop: 6,
    marginBottom: 12,
    textAlign: "center",
    fontSize: 12,
    color: "rgba(17,24,39,0.6)",
  },

  input: {
    width: "100%",
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#fff",
    marginBottom: 10,
  },

  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    justifyContent: "center",
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 1,
    fontSize: 12,
  },

  legal: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 14,
    color: "rgba(17,24,39,0.55)",
  },
  link: {
    color: "rgba(17,24,39,0.8)",
    fontWeight: "700",
  },
});
