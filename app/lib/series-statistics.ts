"use client";

import {
  doc,
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
const PENDING_STATISTIC_DELTAS_KEY = "mikoroku_pending_series_statistic_deltas_v1";
export const SERIES_STATISTICS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const SERIES_STATISTICS_JSON_URL = "/series-statistics.json";

const VIEWS_API = "https://mikoroku-og.vercel.app/api/views";

export type SeriesStatistics = {
  slug: string;
  views: number;
  bookmarks: number;
  notifications: number;
  syncedAt: number;
  pendingViews?: number;
  localUpdatedAt?: number;
  sourceExportedAtMs?: number;
  viewsSource?: "api";
  lastSyncAttemptAt?: number;
  syncRetryAfter?: number;
};

function statisticsFirestore() {
  const app = getApps().find((candidate) =>
    candidate.name === STATISTICS_FIREBASE_APP_NAME,
  ) ?? initializeApp(STATISTICS_FIREBASE_CONFIG, STATISTICS_FIREBASE_APP_NAME);
  return getFirestore(app);
}

export function getSeriesStatisticsFirestore() {
  return statisticsFirestore();
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
      sourceExportedAtMs: isCount(value.sourceExportedAtMs) ? value.sourceExportedAtMs : 0,
      viewsSource: value.viewsSource === "api" ? "api" : undefined,
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
              sourceExportedAtMs: isCount(previous.sourceExportedAtMs)
                ? previous.sourceExportedAtMs
                : 0,
              viewsSource: previous.viewsSource === "api" ? "api" : undefined,
              lastSyncAttemptAt: isCount(previous.lastSyncAttemptAt)
                ? previous.lastSyncAttemptAt
                : previous.syncedAt,
              syncRetryAfter: isCount(previous.syncRetryAfter) ? previous.syncRetryAfter : 0,
            }
          : {
              slug,
              views: 0,
              bookmarks: 0,
              notifications: 0,
              syncedAt: 0,
              pendingViews: 0,
              sourceExportedAtMs: 0,
            };
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
): Promise<number> {
  const database = await openDatabase();
  try {
    let appliedDelta = 0;
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
              sourceExportedAtMs: isCount(previous.sourceExportedAtMs)
                ? previous.sourceExportedAtMs
                : 0,
              viewsSource: previous.viewsSource === "api" ? "api" : undefined,
              lastSyncAttemptAt: isCount(previous.lastSyncAttemptAt)
                ? previous.lastSyncAttemptAt
                : previous.syncedAt,
              syncRetryAfter: isCount(previous.syncRetryAfter) ? previous.syncRetryAfter : 0,
            }
          : {
              slug,
              views: 0,
              bookmarks: 0,
              notifications: 0,
              syncedAt: 0,
              pendingViews: 0,
              sourceExportedAtMs: 0,
            };

        const nextCount = Math.max(0, data[key] + delta);
        appliedDelta = nextCount - data[key];
        store.put({
          ...data,
          [key]: nextCount,
          localUpdatedAt: Math.max(Date.now(), data.localUpdatedAt ?? 0),
        });
      };
      request.onerror = () => reject(request.error || new Error("Could not update the local series statistics."));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not update the local series statistics."));
      transaction.onabort = () => reject(transaction.error || new Error("Updating the local series statistics was aborted."));
    });
    return appliedDelta;
  } finally {
    database.close();
  }
}

function statisticDeltaKey(
  slug: string,
  key: "bookmarks" | "notifications",
): string {
  return JSON.stringify([slug, key]);
}

function readPendingStatisticDeltas(): Record<string, number> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(PENDING_STATISTIC_DELTAS_KEY) || "{}");
    if (!isRecord(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored).filter((entry): entry is [string, number] =>
        isCount(entry[1]) || (typeof entry[1] === "number" &&
          Number.isSafeInteger(entry[1]) && entry[1] < 0),
      ),
    );
  } catch (error) {
    console.warn("Pending series statistic adjustments could not be read.", error);
    return {};
  }
}

function writePendingStatisticDeltas(deltas: Record<string, number>): void {
  if (Object.keys(deltas).length) {
    localStorage.setItem(PENDING_STATISTIC_DELTAS_KEY, JSON.stringify(deltas));
  } else {
    localStorage.removeItem(PENDING_STATISTIC_DELTAS_KEY);
  }
}

export async function recordPendingSeriesStatisticCount(
  slug: string,
  key: "bookmarks" | "notifications",
  delta: number,
): Promise<void> {
  if (!delta) return;
  const deltaKey = statisticDeltaKey(slug, key);
  const pending = readPendingStatisticDeltas();
  pending[deltaKey] = (pending[deltaKey] || 0) + delta;
  writePendingStatisticDeltas(pending);

  try {
    const appliedDelta = await adjustCachedSeriesStatistic(slug, key, delta);
    const latest = readPendingStatisticDeltas();
    const adjustedPendingDelta = (latest[deltaKey] || 0) + appliedDelta - delta;
    if (adjustedPendingDelta) latest[deltaKey] = adjustedPendingDelta;
    else delete latest[deltaKey];
    writePendingStatisticDeltas(latest);
  } catch (error) {
    const latest = readPendingStatisticDeltas();
    const restoredDelta = (latest[deltaKey] || 0) - delta;
    if (restoredDelta) latest[deltaKey] = restoredDelta;
    else delete latest[deltaKey];
    writePendingStatisticDeltas(latest);
    throw error;
  }
}

export async function reconcilePendingSeriesStatisticCount(
  slug: string,
  key: "bookmarks" | "notifications",
  actualDelta: number,
): Promise<void> {
  const deltaKey = statisticDeltaKey(slug, key);
  const pending = readPendingStatisticDeltas();
  const optimisticDelta = pending[deltaKey] || 0;
  const correction = actualDelta - optimisticDelta;
  try {
    if (correction) await adjustCachedSeriesStatistic(slug, key, correction);
    if (optimisticDelta) {
      delete pending[deltaKey];
      writePendingStatisticDeltas(pending);
    }
  } catch (error) {
    console.warn(`Cached series ${key} count could not be reconciled.`, error);
  }
}

type StatisticsCounters = Pick<SeriesStatistics, "bookmarks" | "notifications">;

type SeriesStatisticsCatalog = {
  exportedAtMs: number;
  series: Record<string, StatisticsCounters>;
};

let statisticsCatalogRequest: Promise<SeriesStatisticsCatalog> | null = null;

function parseStatisticsCatalog(value: unknown): SeriesStatisticsCatalog {
  if (!isRecord(value) || !isRecord(value.series)) {
    throw new Error("The series statistics JSON has an invalid format.");
  }
  const exportedAtFromIso = typeof value.exportedAt === "string"
    ? Date.parse(value.exportedAt)
    : Number.NaN;
  const exportedAtMs =
    typeof value.exportedAtMs === "number" &&
      Number.isFinite(value.exportedAtMs) &&
      value.exportedAtMs > 0
      ? value.exportedAtMs
      : Number.isFinite(exportedAtFromIso) && exportedAtFromIso >= 0
        ? exportedAtFromIso
        : value.exportedAtMs === 0
          ? 0
          : Number.NaN;
  if (!Number.isFinite(exportedAtMs)) {
    throw new Error("The series statistics JSON has an invalid export timestamp.");
  }

  const series: Record<string, StatisticsCounters> = {};
  for (const [slug, rawCounters] of Object.entries(value.series)) {
    if (!slug || !isRecord(rawCounters)) {
      throw new Error("The series statistics JSON contains an invalid series entry.");
    }
    if (
      !isCount(rawCounters.bookmarks) ||
      !isCount(rawCounters.notifications)
    ) {
      throw new Error('The series statistics JSON contains invalid counters for "' + slug + '".');
    }
    series[slug] = {
      bookmarks: rawCounters.bookmarks,
      notifications: rawCounters.notifications,
    };
  }

  return { exportedAtMs, series };
}

async function loadStatisticsCatalog(): Promise<SeriesStatisticsCatalog> {
  if (!statisticsCatalogRequest) {
    statisticsCatalogRequest = fetch(SERIES_STATISTICS_JSON_URL, { cache: "no-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load series statistics JSON (" + response.status + ").");
        }
        return parseStatisticsCatalog(await response.json());
      })
      .catch((error: unknown) => {
        statisticsCatalogRequest = null;
        throw error;
      });
  }
  const request = statisticsCatalogRequest;
  try {
    return await request;
  } finally {
    if (statisticsCatalogRequest === request) statisticsCatalogRequest = null;
  }
}

function statisticsForSlug(
  catalog: SeriesStatisticsCatalog,
  slug: string,
): StatisticsCounters {
  return catalog.series[slug] ?? { bookmarks: 0, notifications: 0 };
}

// Kirim view ke server Vercel (bukan Firestore lagi).
// Server yang dedupe: maksimal 1 view per pengunjung per series per 6 jam.
async function syncPendingSeriesViews(
  slug: string,
  pendingViews: number,
): Promise<void> {
  if (pendingViews <= 0) return;
  const response = await fetch(VIEWS_API, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ slug }),
  });
  if (!response.ok) {
    throw new Error("Could not record the series view (" + response.status + ").");
  }
  const data = await response.json() as unknown;
  if (
    !isRecord(data) ||
    data.ok !== true
  ) {
    throw new Error("The series view API returned an invalid response.");
  }
}

// Ambil tambahan view dari Redis. Mengembalikan null kalau gagal.
async function fetchExtraViews(slug: string): Promise<number | null> {
  try {
    const response = await fetch(VIEWS_API + "?slugs=" + encodeURIComponent(slug));
    if (!response.ok) return null;
    const data = (await response.json()) as Record<string, number>;
    const value = Number(data[slug] ?? 0);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

async function claimStatisticsSync(
  slug: string,
  catalogExportedAtMs: number,
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
          sourceExportedAtMs: isCount(previous.sourceExportedAtMs)
            ? previous.sourceExportedAtMs
            : 0,
          viewsSource: previous.viewsSource === "api" ? "api" : undefined,
          lastSyncAttemptAt: isCount(previous.lastSyncAttemptAt)
            ? previous.lastSyncAttemptAt
            : previous.syncedAt,
          syncRetryAfter: isCount(previous.syncRetryAfter) ? previous.syncRetryAfter : 0,
        };
        const age = Date.now() - (data.lastSyncAttemptAt ?? data.syncedAt);
        const hasNewJsonSnapshot = catalogExportedAtMs > (data.sourceExportedAtMs ?? 0);
        // Hormati syncRetryAfter supaya tidak retry terus saat gagal
        const retryBlocked = (data.syncRetryAfter ?? 0) > Date.now();
        const shouldSync =
          !retryBlocked &&
          (age < 0 ||
            age >= SERIES_STATISTICS_CACHE_TTL_MS ||
            hasNewJsonSnapshot ||
            data.viewsSource !== "api");
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

export async function syncSeriesStatisticsForVisit(
  slug: string,
): Promise<SeriesStatistics> {
  const catalog = await loadStatisticsCatalog();
  const claim = await claimStatisticsSync(slug, catalog.exportedAtMs);
  if (!claim.shouldSync) return claim.data;
  const syncStartedAt = claim.data.lastSyncAttemptAt ?? Date.now();
  const pendingViews = claim.data.pendingViews ?? 0;
  try {
    const jsonCounters = statisticsForSlug(catalog, slug);
    const useCachedCounters = catalog.exportedAtMs <= (claim.data.sourceExportedAtMs ?? 0);
    const baseline = useCachedCounters
      ? {
          bookmarks: claim.data.bookmarks,
          notifications: claim.data.notifications,
        }
      : {
          bookmarks: jsonCounters.bookmarks,
          notifications: jsonCounters.notifications,
        };

    await syncPendingSeriesViews(slug, pendingViews);
    const extraViews = await fetchExtraViews(slug);
    const fallbackViews = Math.max(0, claim.data.views - pendingViews);
    const views = extraViews === null
      ? fallbackViews
      : extraViews;

    const updated: SeriesStatistics = {
      slug,
      ...baseline,
      views,
      viewsSource: extraViews === null ? claim.data.viewsSource : "api",
      syncedAt: Date.now(),
      sourceExportedAtMs: catalog.exportedAtMs,
      lastSyncAttemptAt: syncStartedAt,
      syncRetryAfter: extraViews === null
        ? Date.now() + SERIES_STATISTICS_CACHE_TTL_MS
        : 0,
    };
    return cacheSeriesStatistics(updated, syncStartedAt, pendingViews);
  } catch (error) {
    const now = Date.now();
    const fallback: SeriesStatistics = {
      ...claim.data,
      syncedAt: now,
      sourceExportedAtMs: catalog.exportedAtMs,
      lastSyncAttemptAt: syncStartedAt,
      syncRetryAfter: now + SERIES_STATISTICS_CACHE_TTL_MS,
    };
    await cacheSeriesStatistics(fallback, syncStartedAt, 0);
    console.warn('Series statistics could not be synchronized for "' + slug + '".', error);
    return fallback;
  }
}
