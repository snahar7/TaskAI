import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBmtrCysYltZr_9wESwyu1EJ4f-1yayQA0",
  authDomain: "trak-1c51e.firebaseapp.com",
  projectId: "trak-1c51e",
  storageBucket: "trak-1c51e.firebasestorage.app",
  messagingSenderId: "474964346924",
  appId: "1:474964346924:web:1ac39d8960761931392989",
  measurementId: "G-1FTRYNJ0DM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Initialize Analytics only in browser environment
let analytics: any = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };