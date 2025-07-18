import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, User, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBmtrCysYltZr_9wESwyu1EJ4f-1yayQA0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "trak-1c51e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "trak-1c51e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "trak-1c51e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "474964346924",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:474964346924:web:1ac39d8960761931392989",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1FTRYNJ0DM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Set Firebase Auth to persist sessions across browser restarts
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set Firebase persistence:', error);
});

// Initialize Analytics only in browser environment
let analytics: any = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };

// Auth helper functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    console.log("Attempting Firebase email signup for:", email);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Firebase signup successful:", result.user);
    return result.user;
  } catch (error: any) {
    console.error("Email sign-up error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists. Please use the sign in form instead.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use at least 8 characters.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email signup is not enabled. Please contact support or use Google sign-in.');
    } else {
      throw new Error(error.message || 'Failed to create account. Please try again.');
    }
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log("Attempting Firebase email signin for:", email);
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log("Firebase signin successful:", result.user);
    return result.user;
  } catch (error: any) {
    console.error("Email sign-in error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email. Please sign up first.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled. Please contact support.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    } else {
      throw new Error(error.message || 'Failed to sign in. Please try again.');
    }
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};