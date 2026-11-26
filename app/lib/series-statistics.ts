"use client";

import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const STATISTICS_FIREBASE_APP_NAME = "mikoroku-series-statistics-widget-comment";
const STATISTICS_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
  authDomain: "widget-comment.firebaseapp.com",
  projectId: "widget-comment",
  storageBucket: "widget-comment.firebasestorage.app",
  messagingSenderId: "249700505242",
  appId: "1:249700505242:web:dab240af09caf30ad7f123",
};

const DATABASE_NAME = "widget-comment-series-statistics";
const DATABASE_VERSION = 1;
const STORE_NAME = "seriesStatistics";
export const SERIES_STATISTICS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type SeriesStatistics = {
  slug: string;
  views: number;
  bookmarks: number;
  notifications: number;
  syncedAt: number;
  pendingViews?: number;
  localUpdatedAt?: number;
  lastSyncAttemptAt?: number;
  syncRetryAfter?: number;
};

function statisticsFirestore() {
  const app = getApps().find((candidate) =>
    candidate.name === STATISTICS_FIREBASE_APP_NAME,
  ) ?? initializeApp(STATISTICS_FIREBASE_CONFIG, STATISTICS_FIREBASE_APP_NAME);
  return getFirestore(app);
}

export function getSeriesStatsRef(slug: string) {
  return doc(statisticsFirestore(), "seriesStats", encodeURIComponent(slug));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isSeriesStatistics(value: unknown, slug: string): value is SeriesStatistics {
  return isRecord(value) &&
    value.slug === slug &&
    isCount(value.views) &&
    isCount(value.bookmarks) &&
    isCount(value.notifications) &&
    typeof value.syncedAt === "number" &&
    Number.isFinite(value.syncedAt);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error || new Error("Could not open the series statistics cache."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "slug" });
      }
    };
  });
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not read the series statistics cache."));
  });
}

export async function getCachedSeriesStatistics(
  slug: string,
): Promise<SeriesStatistics | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const value: unknown = await readRequest(transaction.objectStore(STORE_NAME).get(slug));
    if (
      !isRecord(value) ||
      value.slug !== slug ||
      !isCount(value.views) ||
      !isCount(value.bookmarks) ||
      !isCount(value.notifications) ||
      typeof value.syncedAt !== "number" ||
      !Number.isFinite(value.syncedAt)
    ) return null;

    const data: SeriesStatistics = {
      slug,
      views: value.views,
      bookmarks: value.bookmarks,
      notifications: value.notifications,
      syncedAt: value.syncedAt,
      pendingViews: isCount(value.pendingViews) ? value.pendingViews : 0,
      localUpdatedAt: isCount(value.localUpdatedAt) ? value.localUpdatedAt : 0,
      lastSyncAttemptAt: isCount(value.lastSyncAttemptAt)
        ? value.lastSyncAttemptAt
        : value.syncedAt,
      syncRetryAfter: isCount(value.syncRetryAfter) ? value.syncRetryAfter : 0,
    };
    return data;
  } finally {
    database.close();
  }
}

async function cacheSeriesStatistics(
  data: SeriesStatistics,
  preserveLocalAdjustmentsAfter = 0,
  syncedPendingViews = 0,
): Promise<SeriesStatistics> {
  let cached = data;
  try {
    const database = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(data.slug);
        request.onsuccess = () => {
          const previous: unknown = request.result;
          const previousPendingViews = isRecord(previous) && isCount(previous.pendingViews)
            ? previous.pendingViews
            : 0;
          const remainingPendingViews = Math.max(0, previousPendingViews - syncedPendingViews);
          if (
            isSeriesStatistics(previous, data.slug) &&
            isCount(previous.localUpdatedAt) &&
            previous.localUpdatedAt >= preserveLocalAdjustmentsAfter
          ) {
            cached = {
              ...data,
              bookmarks: previous.bookmarks,
              notifications: previous.notifications,
              localUpdatedAt: previous.localUpdatedAt,
            };
          }
          cached = {
            ...cached,
            views: data.views + remainingPendingViews,
            pendingViews: remainingPendingViews,
            lastSyncAttemptAt: data.lastSyncAttemptAt ?? data.syncedAt,
          };
          store.put(cached);
        };
        request.onerror = () => reject(request.error || new Error("Could not read the series statistics cache."));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Could not cache series statistics."));
        transaction.onabort = () => reject(transaction.error || new Error("Caching series statistics was aborted."));
      });
    } finally {
      database.close();
    }
  } catch (error) {
    console.warn("Series statistics could not be cached in IndexedDB.", error);
  }
  return cached;
}

export async function recordSeriesViewInCache(
  slug: string,
): Promise<SeriesStatistics> {
  const database = await openDatabase();
  try {
    return await new Promise<SeriesStatistics>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(slug);
      let updated: SeriesStatistics;

      request.onsuccess = () => {
        const previous: unknown = request.result;
        const validPrevious = isSeriesStatistics(previous, slug);
        const data: SeriesStatistics = validPrevious
          ? {
              slug,
              views: previous.views,
              bookmarks: previous.bookmarks,
              notifications: previous.notifications,
              syncedAt: previous.syncedAt,
              pendingViews: isCount(previous.pendingViews) ? previous.pendingViews : 0,
              localUpdatedAt: isCount(previous.localUpdatedAt) ? previous.localUpdatedAt : 0,
              lastSyncAttemptAt: isCount(previous.lastSyncAttemptAt)
                ? previous.lastSyncAttemptAt
                : previous.syncedAt,
              syncRetryAfter: isCount(previous.syncRetryAfter) ? previous.syncRetryAfter : 0,
            }
          : { slug, views: 0, bookmarks: 0, notifications: 0, syncedAt: 0, pendingViews: 0 };
        updated = {
          ...data,
          views: data.views + 1,
          pendingViews: (data.pendingViews ?? 0) + 1,
        };
        store.put(updated);
      };
      request.onerror = () => reject(request.error || new Error("Could not read the series statistics cache."));
      transaction.oncomplete = () => {
        resolve(updated);
      };
      transaction.onerror = () => reject(transaction.error || new Error("Could not record a series view."));
      transaction.onabort = () => reject(transaction.error || new Error("Recording a series view was aborted."));
    });
  } finally {
    database.close();
  }
}

export async function adjustCachedSeriesStatistic(
  slug: string,
  key: "bookmarks" | "notifications",
  delta: number,
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(slug);

      request.onsuccess = () => {
        const previous: unknown = request.result;
        const data: SeriesStatistics = isRecord(previous) &&
          isCount(previous.views) &&
          isCount(previous.bookmarks) &&
          isCount(previous.notifications) &&
          typeof previous.syncedAt === "number" &&
          Number.isFinite(previous.syncedAt)
          ? {
              slug,
              views: previous.views,
              bookmarks: previous.bookmarks,
              notifications: previous.notifications,
              syncedAt: previous.syncedAt,
              pendingViews: isCount(previous.pendingViews) ? previous.pendingViews : 0,
              localUpdatedAt: isCount(previous.localUpdatedAt) ? previous.localUpdatedAt : 0,
              lastSyncAttemptAt: isCount(previous.lastSyncAttemptAt)
                ? previous.lastSyncAttemptAt
                : previous.syncedAt,
              syncRetryAfter: isCount(previous.syncRetryAfter) ? previous.syncRetryAfter : 0,
            }
          : { slug, views: 0, bookmarks: 0, notifications: 0, syncedAt: 0, pendingViews: 0 };

        store.put({
          ...data,
          [key]: Math.max(0, data[key] + delta),
          localUpdatedAt: Math.max(Date.now(), data.localUpdatedAt ?? 0),
        });
      };
      request.onerror = () => reject(request.error || new Error("Could not update the local series statistics."));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not update the local series statistics."));
      transaction.onabort = () => reject(transaction.error || new Error("Updating the local series statistics was aborted."));
    });
  } finally {
    database.close();
  }
}

type StatisticsCounters = Pick<SeriesStatistics, "views" | "bookmarks" | "notifications">;

function readStatisticsCountersWithFallback(
  value: unknown,
  fallback: StatisticsCounters,
): StatisticsCounters {
  const record = isRecord(value) ? value : {};
  return {
    views: isCount(record.views) ? record.views : 0,
    bookmarks: isCount(record.bookmarks) ? record.bookmarks : fallback.bookmarks,
    notifications: isCount(record.notifications) ? record.notifications : fallback.notifications,
  };
}

async function syncPendingSeriesViews(
  slug: string,
  pendingViews: number,
  fallback: StatisticsCounters,
): Promise<StatisticsCounters> {
  const statisticsRef = getSeriesStatsRef(slug);
  return runTransaction(statisticsRef.firestore, async (transaction) => {
    const stored = await transaction.get(statisticsRef);
    const counters = readStatisticsCountersWithFallback(
      stored.exists() ? stored.data() : undefined,
      fallback,
    );
    const updated = { ...counters, views: counters.views + pendingViews };
    if (pendingViews > 0 || !stored.exists()) {
      transaction.set(statisticsRef, updated, { merge: true });
    }
    return updated;
  });
}

async function claimStatisticsSync(
  slug: string,
): Promise<{ data: SeriesStatistics; shouldSync: boolean }> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(slug);
      let result: { data: SeriesStatistics; shouldSync: boolean };
      request.onsuccess = () => {
        const previous: unknown = request.result;
        if (
          !isRecord(previous) ||
          previous.slug !== slug ||
          !isCount(previous.views) ||
          !isCount(previous.bookmarks) ||
          !isCount(previous.notifications) ||
          typeof previous.syncedAt !== "number" ||
          !Number.isFinite(previous.syncedAt)
        ) {
          reject(new Error("Series statistics must be cached before synchronization."));
          return;
        }
        const data: SeriesStatistics = {
          slug,
          views: previous.views,
          bookmarks: previous.bookmarks,
          notifications: previous.notifications,
          syncedAt: previous.syncedAt,
          pendingViews: isCount(previous.pendingViews) ? previous.pendingViews : 0,
          localUpdatedAt: isCount(previous.localUpdatedAt) ? previous.localUpdatedAt : 0,
          lastSyncAttemptAt: isCount(previous.lastSyncAttemptAt)
            ? previous.lastSyncAttemptAt
            : previous.syncedAt,
          syncRetryAfter: isCount(previous.syncRetryAfter) ? previous.syncRetryAfter : 0,
        };
        const age = Date.now() - (data.lastSyncAttemptAt ?? data.syncedAt);
        const hasPendingViews = (data.pendingViews ?? 0) > 0;
        const shouldSync = age < 0 ||
          age >= SERIES_STATISTICS_CACHE_TTL_MS ||
          (hasPendingViews && Date.now() >= (data.syncRetryAfter ?? 0));
        if (shouldSync) {
          data.lastSyncAttemptAt = Date.now();
          data.syncRetryAfter = 0;
          store.put(data);
        }
        result = { data, shouldSync };
      };
      request.onerror = () => reject(request.error || new Error("Could not claim statistics synchronization."));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error("Could not claim statistics synchronization."));
      transaction.onabort = () => reject(transaction.error || new Error("Statistics synchronization claim was aborted."));
    });
  } finally {
    database.close();
  }
}

async function loadSeriesStatisticsDocument(
  slug: string,
  fallback: StatisticsCounters,
): Promise<StatisticsCounters> {
  const statisticsRef = getSeriesStatsRef(slug);
  const snapshot = await getDoc(statisticsRef);
  const counters = readStatisticsCountersWithFallback(
    snapshot.exists() ? snapshot.data() : undefined,
    fallback,
  );
  if (!snapshot.exists()) {
    await setDoc(statisticsRef, counters, { merge: true });
  }
  return counters;
}

export async function syncSeriesStatisticsForVisit(
  slug: string,
): Promise<SeriesStatistics> {
  const claim = await claimStatisticsSync(slug);
  if (!claim.shouldSync) return claim.data;
  const syncStartedAt = claim.data.lastSyncAttemptAt ?? Date.now();
  const pendingViews = claim.data.pendingViews ?? 0;
  try {
    const counters = pendingViews > 0
      ? await syncPendingSeriesViews(slug, pendingViews, claim.data)
      : await loadSeriesStatisticsDocument(slug, claim.data);
    const updated: SeriesStatistics = {
      slug,
      ...counters,
      syncedAt: Date.now(),
      lastSyncAttemptAt: syncStartedAt,
      syncRetryAfter: 0,
    };
    return cacheSeriesStatistics(updated, syncStartedAt, pendingViews);
  } catch (error) {
    const errorCode = error && typeof error === "object" && "code" in error
      ? error.code
      : "";
    const now = Date.now();
    const fallback: SeriesStatistics = {
      ...claim.data,
      views: Math.max(0, claim.data.views - pendingViews),
      syncedAt: now,
      lastSyncAttemptAt: syncStartedAt,
      syncRetryAfter: now + SERIES_STATISTICS_CACHE_TTL_MS,
    };
    if (errorCode === "permission-denied" || errorCode === "not-found") {
      console.warn(`Series statistics are unavailable for "${slug}"; cached counts will be used.`);
      return cacheSeriesStatistics(fallback, syncStartedAt, 0);
    }
    await cacheSeriesStatistics(fallback, syncStartedAt, 0);
    console.error(`Series statistics could not be synchronized for "${slug}".`, error);
    throw error;
  }
}
