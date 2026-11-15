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
import type { Firestore } from "firebase/firestore";
import { ensureLocalStorageHeadroom, pruneStoredChapterCaches } from "./chapter-cache";
import {
  fetchMangaMetadataPayload,
  MANGA_METADATA_UPDATED_EVENT,
  type MangaMetadataPayload,
} from "./manga-metadata";
import { firebaseConfig } from "../../lib/firebase-config";

const FIREBASE_APP_NAME = "mikoroku-catalog";
type FirebaseClient = { app: FirebaseApp; db: Database; firestore: Firestore };
let initializedClient: FirebaseClient | undefined;
export type FirestoreMangaMetadata = Record<string, unknown> & {
  slug: string;
  __catalogDebugSources?: string[];
};
type CachedMangaMetadata = {
  exportedAtMs: number;
  cursor: number;
  records: FirestoreMangaMetadata[];
  tombstones: Record<string, number>;
};
const MANGA_METADATA_CACHE_KEY = "mikoroku_firestore_metadata_v1";
const MANGA_METADATA_MEMORY_TTL = 5 * 60 * 1000;
const MANGA_METADATA_CURSOR_OVERLAP = 60 * 1000;
let mangaCatalogData: FirestoreMangaMetadata[] | undefined;
let mangaCatalogLoadedAt = 0;
let mangaCatalogPromise: Promise<FirestoreMangaMetadata[]> | undefined;
let mangaCatalogGeneration = 0;
let persistentCacheEnabled = false;

function invalidateMangaCatalogCache(): void {
  mangaCatalogGeneration += 1;
  mangaCatalogData = undefined;
  mangaCatalogLoadedAt = 0;
  mangaCatalogPromise = undefined;
  try {
    localStorage.removeItem(MANGA_METADATA_CACHE_KEY);
  } catch (error) {
    console.warn("Cached manga metadata could not be invalidated.", error);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener(MANGA_METADATA_UPDATED_EVENT, invalidateMangaCatalogCache);
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMangaMetadata(
  value: Record<string, unknown>,
  fallbackSlug?: string,
): FirestoreMangaMetadata | null {
  const nestedMetadata = isRecord(value.metadata) ? value.metadata : {};
  const data = { ...nestedMetadata, ...value };
  const slug = typeof data.slug === "string" && data.slug
    ? data.slug
    : fallbackSlug || (typeof data.id === "string" ? data.id : "");
  return slug ? { ...data, slug } : null;
}

function metadataChangeTime(record: FirestoreMangaMetadata): number {
  const values = [record.metadataUpdatedAt, record.updatedAt];
  return values.reduce<number>((latest, value) => {
    const timestamp = typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : isRecord(value) && typeof value.seconds === "number"
          ? value.seconds * 1000
          : 0;
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);
}

function readCachedMangaMetadata(): CachedMangaMetadata | null {
  try {
    const raw = localStorage.getItem(MANGA_METADATA_CACHE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      typeof value.exportedAtMs !== "number" ||
      typeof value.cursor !== "number" ||
      !Array.isArray(value.records) ||
      !isRecord(value.tombstones)
    ) {
      return null;
    }
    const records = value.records
      .filter(isRecord)
      .map((record) => normalizeMangaMetadata(record))
      .filter((record): record is FirestoreMangaMetadata => record !== null);
    const tombstones = Object.fromEntries(
      Object.entries(value.tombstones).filter(
        ([slug, timestamp]) =>
          Boolean(slug) &&
          typeof timestamp === "number" &&
          Number.isFinite(timestamp),
      ),
    ) as Record<string, number>;
    return { exportedAtMs: value.exportedAtMs, cursor: value.cursor, records, tombstones };
  } catch (error) {
    console.warn("Cached manga metadata is invalid and will be ignored.", error);
    localStorage.removeItem(MANGA_METADATA_CACHE_KEY);
    return null;
  }
}

export function getCachedFirestoreMangaCatalog(): FirestoreMangaMetadata[] {
  if (mangaCatalogData) return mangaCatalogData;
  if (typeof window === "undefined") return [];
  return readCachedMangaMetadata()?.records ?? [];
}

export function loadFirestoreMangaCatalog(
  { force = false, payload }: { force?: boolean; payload?: MangaMetadataPayload } = {},
): Promise<FirestoreMangaMetadata[]> {
  if (
    !force &&
    mangaCatalogData &&
    Date.now() - mangaCatalogLoadedAt < MANGA_METADATA_MEMORY_TTL
  ) {
    return Promise.resolve(mangaCatalogData);
  }
  if (!mangaCatalogPromise) {
    const requestGeneration = mangaCatalogGeneration;
    const request = (async () => {
      const catalog = payload ?? await fetchMangaMetadataPayload({ force });
      const bySlug = new Map<string, FirestoreMangaMetadata>();
      const tombstones: Record<string, number> = {};
      for (const value of catalog.manga) {
        const record = normalizeMangaMetadata(value);
        if (record) {
          bySlug.set(record.slug, {
            ...record,
            __catalogDebugSources: record.__catalogDebugSources?.length
              ? record.__catalogDebugSources
              : ["Catalog baseline"],
          });
        }
      }

      const cached = readCachedMangaMetadata();
      let cursor = catalog.exportedAtMs;
      if (cached?.exportedAtMs === catalog.exportedAtMs) {
        cursor = Math.max(cursor, cached.cursor);
        for (const record of cached.records) {
          const sources = new Set(record.__catalogDebugSources || []);
          sources.delete("metadata.json");
          if (!catalog.firestoreDeltasIncluded) sources.add("Catalog baseline");
          bySlug.set(record.slug, {
            ...bySlug.get(record.slug),
            ...record,
            __catalogDebugSources: [...sources],
          });
        }
        Object.assign(tombstones, cached.tombstones);
      }
      for (const [slug, deletedAt] of Object.entries(tombstones)) {
        const record = bySlug.get(slug);
        if (!record || metadataChangeTime(record) <= deletedAt) bySlug.delete(slug);
      }

      if (catalog.firestoreDeltasIncluded !== true) {
        try {
          const { firestore } = initializeFirebaseClient();
          const mangaCollection = collection(firestore, "manga");
          const snapshots = await Promise.all([
            getDocsFromServer(query(mangaCollection, where("updatedAt", ">", cursor))),
            getDocsFromServer(query(mangaCollection, where("metadataUpdatedAt", ">", cursor))),
          ]);
          const changedDocuments = new Map(
            snapshots.flatMap((snapshot) =>
              snapshot.docs.map((document) => [document.id, document] as const),
            ),
          );
          changedDocuments.forEach((document) => {
            const documentData = document.data();
            if (
              documentData.isCatalogTombstone === true &&
              typeof documentData.deletedSlug === "string"
            ) {
              const deletedAt = metadataChangeTime({
                ...documentData,
                slug: documentData.deletedSlug,
              });
              tombstones[documentData.deletedSlug] = Math.max(
                tombstones[documentData.deletedSlug] || 0,
                deletedAt,
              );
              const existing = bySlug.get(documentData.deletedSlug);
              if (!existing || metadataChangeTime(existing) <= deletedAt) {
                bySlug.delete(documentData.deletedSlug);
              }
              return;
            }
            const record = normalizeMangaMetadata(documentData, document.id);
            if (record) {
              const deletedAt = tombstones[record.slug] || 0;
              if (metadataChangeTime(record) > deletedAt) {
                tombstones[record.slug] = 0;
                const sources = new Set(
                  bySlug.get(record.slug)?.__catalogDebugSources || [],
                );
                sources.add("Firestore delta");
                bySlug.set(record.slug, {
                  ...bySlug.get(record.slug),
                  ...record,
                  firestore: true,
                  __catalogDebugSources: [...sources],
                });
              }
            }
          });
          cursor = Math.max(
            cursor,
            Date.now() - MANGA_METADATA_CURSOR_OVERLAP,
          );
        } catch (error) {
          console.warn(
            "Firestore metadata changes could not be loaded; using the Firestore catalog and cached changes.",
            error,
          );
        }
      }

      const records = [...bySlug.values()];
      if (requestGeneration === mangaCatalogGeneration) {
        try {
          localStorage.setItem(
            MANGA_METADATA_CACHE_KEY,
            JSON.stringify({
              exportedAtMs: catalog.exportedAtMs,
              cursor,
              records,
              tombstones,
            } satisfies CachedMangaMetadata),
          );
        } catch (error) {
          console.warn("Manga metadata cache could not be saved.", error);
        }
        mangaCatalogData = records;
        mangaCatalogLoadedAt = Date.now();
      }
      return records;
    })();
    mangaCatalogPromise = request;
    void request.finally(() => {
      if (mangaCatalogPromise === request) mangaCatalogPromise = undefined;
    }).catch(() => undefined);
  }
  return mangaCatalogPromise;
}

export async function clearFirestoreOfflineCache(): Promise<void> {
  if (!persistentCacheEnabled) return;
  const { firestore } = initializeFirebaseClient();
  await terminate(firestore);
  await clearIndexedDbPersistence(firestore);
}
