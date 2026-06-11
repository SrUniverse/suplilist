import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, signOut, sendPasswordResetEmail, confirmPasswordReset } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey) {
  throw new Error('[Firebase] Missing VITE_FIREBASE_API_KEY. Authentication cannot be initialized.');
}

let resolvedAuth;
try {
  const app = initializeApp(firebaseConfig);
  resolvedAuth = getAuth(app);
} catch (error) {
  console.error('[Firebase] Auth indisponível:', error?.code || error);
  throw error;
}

export const auth = resolvedAuth;

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset
};
