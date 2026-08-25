// src/firebase.ts — Firebase Configuration & Authentication setup
// Handles official Google Sign-In popup with @dpu.ac.th hosted domain enforcement

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Official DPU Library Firebase project configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDFGRMe1FGmOd9qlSkW7Uxpf2klyXmoNGs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dpuelibrary.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dpuelibrary",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dpuelibrary.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "396381797493",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:396381797493:web:de814ad9782e3e206c0c3c",
  measurementId: "G-E65HJMQPH3"
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider with DPU Hosted Domain constraint
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'dpu.ac.th', // Enforce DPU institutional email @dpu.ac.th
  prompt: 'select_account',
});

/**
 * Sign in with Google Popup via Firebase Auth
 */
export async function signInWithGoogleFirebase() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    user,
    idToken,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export { signOut };
export default app;
