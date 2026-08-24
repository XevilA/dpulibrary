// src/firebase.ts — Firebase Configuration & Authentication setup
// Handles official Google Sign-In popup with @dpu.ac.th hosted domain enforcement

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Firebase configuration (Supports ENV or default DPU Library Firebase project)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDPU-Library-Mock-Production-ApiKey',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dpu-library-auth.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dpu-library-auth',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dpu-library-auth.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1038472918234',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1038472918234:web:9f8e7d6c5b4a3210',
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider with DPU Hosted Domain constraint
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'dpu.ac.th', // Restrict Google sign-in to @dpu.ac.th
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
