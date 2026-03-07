import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ paste your Firebase web config here (from Firebase Console → Project settings)
const firebaseConfig = {
  apiKey: "AIzaSyD8lmjaR9vLsigzW93gPWK_yo5W3DCSrIw",
  authDomain: "carryon-45f0c.firebaseapp.com",
  projectId: "carryon-45f0c",
  storageBucket: "carryon-45f0c.firebasestorage.app",
  messagingSenderId: "767950698337",
  appId: "1:767950698337:web:1a8b8c24154e6727b1f720"
};

// ✅ prevents “Firebase app already initialized” during fast refresh
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
