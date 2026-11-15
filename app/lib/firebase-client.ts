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
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { ensureLocalStorageHeadroom, pruneStoredChapterCaches } from "./chapter-cache";
import { firebaseConfig } from "../../lib/firebase-config";

const FIREBASE_APP_NAME = "mikoroku-catalog";
type FirebaseClient = { app: FirebaseApp; db: Database; firestore: Firestore };
let initializedClient: FirebaseClient | undefined;
type FirestoreMangaCatalogRecord = Record<string, unknown> & { slug: string };
const MANGA_CATALOG_MEMORY_TTL = 10 * 60 * 1000;
let mangaCatalogData: FirestoreMangaCatalogRecord[] | undefined;
let mangaCatalogLoadedAt = 0;
let mangaCatalogPromise: Promise<FirestoreMangaCatalogRecord[]> | undefined;
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

export function loadFirestoreMangaCatalog(): Promise<FirestoreMangaCatalogRecord[]> {
  if (mangaCatalogData && Date.now() - mangaCatalogLoadedAt < MANGA_CATALOG_MEMORY_TTL) {
    return Promise.resolve(mangaCatalogData);
  }
  if (!mangaCatalogPromise) {
    const request = (async () => {
      const records: FirestoreMangaCatalogRecord[] = [];
      const seenCursors = new Set<string>();
      let cursor = "";
      for (let page = 0; page < 40; page += 1) {
        const path = cursor
          ? `/api/catalog/firestore?cursor=${encodeURIComponent(cursor)}`
          : "/api/catalog/firestore";
        const response = await fetch(path, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`Firestore manga catalog returned HTTP ${response.status}.`);
        }
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          throw new Error("Firestore manga catalog response must be an object.");
        }
        const pageData = payload as {
          items?: unknown;
          nextPageToken?: unknown;
        };
        if (!Array.isArray(pageData.items)) {
          throw new Error("Firestore manga catalog page must contain an items array.");
        }
        records.push(
          ...pageData.items.filter(
            (record): record is FirestoreMangaCatalogRecord =>
              typeof record === "object" &&
              record !== null &&
              !Array.isArray(record) &&
              typeof record.slug === "string" &&
              record.slug.length > 0,
          ),
        );

        if (pageData.nextPageToken == null || pageData.nextPageToken === "") {
          cursor = "";
          break;
        }
        if (typeof pageData.nextPageToken !== "string" || seenCursors.has(pageData.nextPageToken)) {
          throw new Error("Firestore manga catalog returned an invalid pagination cursor.");
        }
        cursor = pageData.nextPageToken;
        seenCursors.add(cursor);
      }
      if (cursor) {
        throw new Error("Firestore manga catalog exceeded the 20,000-document safety limit.");
      }
      mangaCatalogData = records;
      mangaCatalogLoadedAt = Date.now();
      return records;
    })().catch((error: unknown) => {
      if (mangaCatalogData) {
        console.warn("Firestore manga catalog refresh failed; using its in-memory copy.", error);
        return mangaCatalogData;
      }
      throw error;
    });
    mangaCatalogPromise = request;
    void request.finally(() => {
      if (mangaCatalogPromise === request) mangaCatalogPromise = undefined;
    }).catch(() => undefined);
  }
  return mangaCatalogPromise;
}

export async function loadFirestoreMangaDetail(
  slug: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const response = await fetch(`/api/manga/${encodeURIComponent(slug)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Manga detail proxy returned HTTP ${response.status}.`);
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Manga detail proxy response must be an object.");
  }
  return data as Record<string, unknown>;
}

export async function clearFirestoreOfflineCache(): Promise<void> {
  if (!persistentCacheEnabled) return;
  const { firestore } = initializeFirebaseClient();
  await terminate(firestore);
  await clearIndexedDbPersistence(firestore);
}
