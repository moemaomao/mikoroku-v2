"use client";

import { getApps, initializeApp } from "firebase/app";
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
  getDocsFromServer,
} from "firebase/firestore";
import type { Firestore, QuerySnapshot, DocumentData } from "firebase/firestore";
import { ensureLocalStorageHeadroom, pruneStoredChapterCaches } from "./chapter-cache";

const firebaseConfig = {
  apiKey: "AIzaSyAi8z8oGGNJSNe87UVWh3FagJZSy_uhuoI",
  authDomain: "mikoroku.firebaseapp.com",
  databaseURL: "https://mikoroku-default-rtdb.firebaseio.com",
  projectId: "mikoroku",
  storageBucket: "mikoroku.firebasestorage.app",
  messagingSenderId: "271920446600",
  appId: "1:271920446600:web:974b11c707ebc11a7bf33d",
};

const FIREBASE_APP_NAME = "mikoroku-catalog";
type FirebaseClient = { app: FirebaseApp; db: Database; firestore: Firestore };
let initializedClient: FirebaseClient | undefined;
let mangaCatalogPromise: Promise<QuerySnapshot<DocumentData>> | undefined;
let persistentCacheEnabled = false;

export function initializeFirebaseClient(): FirebaseClient {
  if (typeof window === "undefined") {
    throw new Error("Firebase client can only be initialized in a browser.");
  }

  if (initializedClient) return initializedClient;

  const app = getApps().find((candidate) => candidate.name === FIREBASE_APP_NAME) ??
    initializeApp(firebaseConfig, FIREBASE_APP_NAME);

  const db = getDatabase(app);
  pruneStoredChapterCaches();

  let firestore: Firestore;
  try {
    const persistentStorageAvailable = ensureLocalStorageHeadroom();
    persistentCacheEnabled = persistentStorageAvailable;

    firestore = initializeFirestore(
      app,
      persistentStorageAvailable
        ? {
            localCache: persistentLocalCache({
              cacheSizeBytes: 20 * 1024 * 1024,
              tabManager: persistentMultipleTabManager(),
            }),
          }
        : { localCache: memoryLocalCache() },
    );
  } catch {
    persistentCacheEnabled = false;
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

export function loadFirestoreMangaCatalog(): Promise<QuerySnapshot<DocumentData>> {
  const { firestore } = initializeFirebaseClient();
  if (!mangaCatalogPromise) {
    const request = getDocsFromServer(collection(firestore, "manga"));
    mangaCatalogPromise = request.catch((error: unknown) => {
      mangaCatalogPromise = undefined;
      throw error;
    });
  }
  return mangaCatalogPromise;
}

export async function clearFirestoreOfflineCache(): Promise<void> {
  if (!persistentCacheEnabled) return;
  const { firestore } = initializeFirebaseClient();
  await terminate(firestore);
  await clearIndexedDbPersistence(firestore);
}
