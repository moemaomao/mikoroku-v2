"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { get, getDatabase, ref } from "firebase/database";
import type { Database } from "firebase/database";
import {
  addDoc,
  collection,
  clearIndexedDbPersistence,
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
  terminate,
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

  let app: FirebaseApp;
  try {
    const apps = getApps();
    app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
  } catch {
    app = initializeApp(firebaseConfig);
  }

  const db = getDatabase(app);
  pruneStoredChapterCaches();

  let firestore: Firestore;
  try {
    let persistentStorageAvailable = false;
    try {
      const key = `mikoroku-storage-probe-${Date.now()}`;
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      persistentStorageAvailable = true;
    } catch {
      persistentStorageAvailable = false;
    }

    firestore = initializeFirestore(
      app,
      persistentStorageAvailable
        ? {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          }
        : { localCache: memoryLocalCache() },
    );
  } catch {
    try {
      firestore = getFirestore(app);
    } catch (error) {
      console.error("[Firebase] firestore init failed", error);
      throw error;
    }
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

export async function clearFirestoreOfflineCache(): Promise<void> {
  const { firestore } = initializeFirebaseClient();
  await terminate(firestore);
  await clearIndexedDbPersistence(firestore);
}
