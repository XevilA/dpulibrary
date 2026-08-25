// src/firebase.ts — Firebase Configuration & Authentication
// Uses signInWithRedirect (not popup) for better mobile & browser compatibility

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDFGRMe1FGmOd9qlSkW7Uxpf2klyXmoNGs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dpuelibrary.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dpuelibrary",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dpuelibrary.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "396381797493",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:396381797493:web:de814ad9782e3e206c0c3c",
  measurementId: "G-E65HJMQPH3"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  // Removed hd: 'dpu.ac.th' — domain enforcement is done by backend after getting email
});

/**
 * Try popup first; if blocked (mobile/Safari), fall back to redirect
 */
export async function signInWithGoogleFirebase() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return {
      user: result.user,
      idToken,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };
  } catch (err: any) {
    // Popup blocked — fall back to redirect
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user'
    ) {
      await signInWithRedirect(auth, googleProvider);
      // Page will reload; result is handled in useFirebaseRedirectResult
      throw err;
    }
    throw err;
  }
}

/**
 * Call once on app mount to capture redirect result after signInWithRedirect
 */
export async function getFirebaseRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const idToken = await result.user.getIdToken();
    return {
      user: result.user,
      idToken,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };
  } catch {
    return null;
  }
}

export { signOut };
export default app;
