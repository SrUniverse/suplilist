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

// Auth não pode derrubar o app: sem config válida (ex.: dev sem .env),
// páginas públicas continuam funcionando em modo guest.
const guestAuth = {
  currentUser: null,
  authStateReady: () => Promise.resolve(),
  onAuthStateChanged: (cb) => {
    if (typeof cb === 'function') cb(null);
    return () => {};
  },
  signOut: () => Promise.resolve(),
};

let resolvedAuth;
try {
  const app = initializeApp(firebaseConfig);
  resolvedAuth = getAuth(app);
} catch (error) {
  console.warn('[Firebase] Auth indisponível — app em modo guest:', error?.code || error);
  resolvedAuth = guestAuth;
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
