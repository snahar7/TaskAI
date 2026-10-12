import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, User, setPersistence, browserLocalPersistence } from "firebase/auth";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID, // optional (Analytics)
};

const REQUIRED_FIREBASE_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export const missingFirebaseVars: string[] = REQUIRED_FIREBASE_VARS.filter((name) => !env[name]);
export const firebaseConfigured = missingFirebaseVars.length === 0;
export const firebaseConfigError =
  `Firebase is not configured. Missing env vars: ${missingFirebaseVars.join(", ")}. ` +
  `Copy .env.example to .env and fill in your own Firebase web app config (see README: "Set up your own Firebase"), ` +
  `or run in demo mode (npm run demo).`;

// Firebase is only initialized when configured. In demo mode the app uses a
// local server-side login instead and never touches these exports.
const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = (app ? getFirestore(app) : null) as unknown as ReturnType<typeof getFirestore>;
export const auth = (app ? getAuth(app) : null) as unknown as ReturnType<typeof getAuth>;
export const googleProvider = new GoogleAuthProvider();

function requireFirebase() {
  if (!firebaseConfigured) throw new Error(firebaseConfigError);
}

if (app) {
  // Set Firebase Auth to persist sessions across browser restarts
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Failed to set Firebase persistence:', error);
  });
}

// Initialize Analytics only in browser environment
let analytics: any = null;
if (app && typeof window !== 'undefined' && firebaseConfig.measurementId) {
  analytics = getAnalytics(app);
}

export { analytics };

// Check if running in Replit environment (where popups are blocked)
const isReplit = () => {
  return typeof window !== 'undefined' && 
         (window.location.hostname.includes('replit.dev') || 
          window.location.hostname.includes('repl.co') ||
          window.location.hostname.includes('picard.replit.dev'));
};

// Auth helper functions
export const signInWithGoogle = async () => {
  requireFirebase();
  try {
    // Use redirect method in Replit environment to avoid popup blocking
    if (isReplit()) {
      console.log('🔐 Using redirect method for Replit environment');
      await signInWithRedirect(auth, googleProvider);
      // The redirect will happen and result will be handled by getRedirectResult
      return null;
    } else {
      console.log('🔐 Using popup method for standard environment');
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
};

// Handle redirect result (call this on app initialization)
export const handleRedirectResult = async () => {
  requireFirebase();
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('🔐 Redirect sign-in successful:', result.user.email);
      return result.user;
    }
    return null;
  } catch (error) {
    console.error("Redirect result error:", error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  requireFirebase();
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
  requireFirebase();
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
  requireFirebase();
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};