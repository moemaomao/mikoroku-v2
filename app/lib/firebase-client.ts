"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { get, getDatabase, ref } from "firebase/database";
import type { Database } from "firebase/database";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  limit,
  memoryLocalCache,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { pruneStoredChapterCaches } from "./chapter-cache";

const firebaseConfig = {
  apiKey: "AIzaSyAi8z8oGGNJSNe87UVWh3FagJZSy_uhuoI",
  authDomain: "mikoroku.firebaseapp.com",
  databaseURL: "https://mikoroku-default-rtdb.firebaseio.com",
  projectId: "mikoroku",
  storageBucket: "mikoroku.firebasestorage.app",
  messagingSenderId: "271920446600",
  appId: "1:271920446600:web:974b11c707ebc11a7bf33d",
};

type FirebaseClient = { app: FirebaseApp; db: Database; firestore: Firestore };
let initializedClient: FirebaseClient | undefined;

export function initializeFirebaseClient(): FirebaseClient {
  if (typeof window === "undefined") {
    throw new Error("Firebase client can only be initialized in a browser.");
  }
  if (initializedClient) return initializedClient;

  const app = getApps().some((registeredApp) => registeredApp.name === "[DEFAULT]")
    ? getApp()
    : initializeApp(firebaseConfig);
  const db = getDatabase(app);
  pruneStoredChapterCaches();
  let firestore;
  let persistentStorageAvailable = false;
  const storageProbeKey = `mikoroku-storage-probe-${Date.now()}`;
  try {
    localStorage.setItem(storageProbeKey, "x".repeat(1024));
    localStorage.removeItem(storageProbeKey);
    persistentStorageAvailable = true;
  } catch (error) {
    console.warn("Browser storage quota is full; Firestore will use an in-memory cache.", error);
    try {
      localStorage.removeItem(storageProbeKey);
    } catch (cleanupError) {
      console.warn("Temporary browser storage probe could not be removed.", cleanupError);
    }
  }

  try {
    firestore = initializeFirestore(app, persistentStorageAvailable
      ? {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        }
      : { localCache: memoryLocalCache() });
  } catch (error) {
    console.warn("Persistent Firestore cache could not be initialized; using the default cache.", error);
    firestore = getFirestore(app);
  }

  Object.assign(window, {
    firebaseApp: app,
    firestore,
    db: {
      ref: (path: string) => ({
        once: async () => {
          const snapshot = await get(ref(db, path));
          return {
            exists: () => snapshot.exists(),
            val: () => snapshot.val(),
          };
        },
      }),
    },
    fs: {
      getDocs,
      collection,
      doc,
      getDoc,
      onSnapshot,
      query,
      where,
      addDoc,
      serverTimestamp,
      orderBy,
      limit,
    },
  });

  initializedClient = { app, db, firestore };
  return initializedClient;
}
