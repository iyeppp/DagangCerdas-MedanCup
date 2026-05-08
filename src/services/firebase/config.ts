// DagangCerdas — Firebase Configuration
// Konfigurasi Firebase project untuk Auth & Firestore

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
// @ts-ignore - getReactNativePersistence exists in react-native environment
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config — ISI DENGAN DATA DARI FIREBASE CONSOLE
// Langkah: https://console.firebase.google.com → Buat project → Project Settings → Web App
const firebaseConfig = {
  apiKey: 'AIzaSyA3851BKAxR1ty1HAkSQsh9H2mqMy-Sz3A',
  authDomain: 'medancup-4616a.firebaseapp.com',
  projectId: 'medancup-4616a',
  storageBucket: 'medancup-4616a.firebasestorage.app',
  messagingSenderId: '282364094592',
  appId: '1:282364094592:web:fcde53f932f6014bc51e65',
  measurementId: 'G-B3PKJ6E2G5',
};

// Initialize Firebase (singleton pattern)
let app: ReturnType<typeof initializeApp>;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with AsyncStorage persistence
let auth: ReturnType<typeof getAuth>;
try {
  console.log('[Firebase] Initializing Auth...');
  const persistence = (getReactNativePersistence as any)(AsyncStorage);
  auth = initializeAuth(app, { persistence });
  console.log('[Firebase] Auth initialized with persistence');
} catch (e) {
  console.log('[Firebase] Auth already initialized or error:', e);
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
export const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';
