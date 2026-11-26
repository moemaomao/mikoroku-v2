"use client";

import { adjustCachedSeriesStatistic } from "./series-statistics";

export const SERIES_NOTIFICATIONS_UPDATED_EVENT = "mikoroku:series-notifications-updated";
export const SERIES_NOTIFICATIONS_STORAGE_KEY = "mikoroku_series_notifications_v1";

const FIRESTORE_MARKER = "seriesNotification";
const FIRESTORE_ID_PREFIX = "series-notification-";
const NOTIFICATION_MIGRATION_RETRY_MS = 12 * 60 * 60 * 1000;
const NOTIFICATION_MIGRATION_ATTEMPT_KEY = "mikoroku_series_notification_migration_attempt_v1";

export type SeriesNotificationSubscription = {
  slug: string;
  title: string;
  cover: string;
  subscribedVersion: string;
  lastSeenVersion: string;
  subscribedAt: number;
};

export type SeriesNotificationCatalogRecord = Record<string, unknown> & {
  slug: string;
};

export type SeriesNotificationUpdate = {
  subscription: SeriesNotificationSubscription;
  record: SeriesNotificationCatalogRecord;
  version: string;
  updatedAt: number;
  hasUpdate: boolean;
  unread: boolean;
};

type FirestoreSnapshot = {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
};

type FirestoreReference = {
  collection: (name: string) => FirestoreCollection;
  get: () => Promise<FirestoreSnapshot>;
  set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
  delete: () => Promise<void>;
};

type FirestoreTransaction = {
  get: (reference: FirestoreReference) => Promise<FirestoreSnapshot>;
  set: (reference: FirestoreReference, data: Record<string, unknown>, options?: { merge?: boolean }) => void;
  delete: (reference: FirestoreReference) => void;
};

type FirestoreCollection = {
  doc: (id: string) => FirestoreReference;
  where: (field: string, operator: string, value: unknown) => {
    get: () => Promise<{ docs: Array<{ id: string }> }>;
  };
};

type FirebaseCompat = NonNullable<Window["firebase"]>;

type NotificationWindow = Window & {
  currentUser?: { uid?: string } | null;
  firebase?: FirebaseCompat;
};

function browserWindow(): NotificationWindow {
  return window as NotificationWindow;
}

export function getSeriesNotificationUserId(): string | undefined {
  const currentWindow = browserWindow();
  return currentWindow.currentUser?.uid ||
    currentWindow.firebase?.auth?.().currentUser?.uid ||
    undefined;
}

function normalizeSlug(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase()
    .replace(/[^\p{L}\p{N}-]/gu, "-").replace(/-+/g, "-");
}

function normalizeSubscription(value: unknown): SeriesNotificationSubscription | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const slug = typeof record.slug === "string" ? normalizeSlug(record.slug) : "";
  if (!title || !slug || typeof record.lastSeenVersion !== "string") return null;
  return {
    slug,
    title,
    cover: typeof record.cover === "string" ? record.cover : "",
    subscribedVersion: typeof record.subscribedVersion === "string"
      ? record.subscribedVersion
      : record.lastSeenVersion,
    lastSeenVersion: record.lastSeenVersion,
    subscribedAt: typeof record.subscribedAt === "number" ? record.subscribedAt : 0,
  };
}

function readLocalSubscriptions(): SeriesNotificationSubscription[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SERIES_NOTIFICATIONS_STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored
      .map(normalizeSubscription)
      .filter((item): item is SeriesNotificationSubscription => item !== null);
  } catch (error) {
    console.warn("Preferensi notifikasi seri tidak dapat dibaca.", error);
    return [];
  }
}

function writeLocalSubscriptions(
  subscriptions: SeriesNotificationSubscription[],
  dispatch = true,
): void {
  localStorage.setItem(SERIES_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(subscriptions));
  if (dispatch) {
    window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
  }
}

function notificationCollection(uid: string): FirestoreCollection {
  const firestore = browserWindow().firebase?.firestore?.();
  if (!firestore) throw new Error("Firestore untuk notifikasi tidak tersedia.");
  return firestore.collection("users").doc(uid).collection("bookmarks");
}

function notificationFirestore() {
  const firestore = browserWindow().firebase?.firestore?.();
  if (!firestore) throw new Error("Firestore untuk notifikasi tidak tersedia.");
  return firestore;
}

function adjustCachedNotificationCount(slug: string, delta: number): void {
  void adjustCachedSeriesStatistic(slug, "notifications", delta).catch((error: unknown) => {
    console.warn("Cached series notification count could not be updated.", error);
  });
}

function notificationDocumentId(slug: string): string {
  return `${FIRESTORE_ID_PREFIX}${encodeURIComponent(normalizeSlug(slug))}`;
}

function claimNotificationMigration(uid: string): boolean {
  const key = `${NOTIFICATION_MIGRATION_ATTEMPT_KEY}:${uid}`;
  const now = Date.now();
  try {
    const lastAttempt = Number(localStorage.getItem(key)) || 0;
    if (now - lastAttempt < NOTIFICATION_MIGRATION_RETRY_MS) return false;
    localStorage.setItem(key, String(now));
    return true;
  } catch (error) {
    console.warn("Status percobaan sinkronisasi notifikasi tidak dapat disimpan.", error);
    return false;
  }
}

function deferNotificationMigration(uid: string): void {
  try {
    localStorage.setItem(
      `${NOTIFICATION_MIGRATION_ATTEMPT_KEY}:${uid}`,
      String(Date.now()),
    );
  } catch (error) {
    console.warn("Sinkronisasi notifikasi tidak dapat ditunda di perangkat ini.", error);
  }
}

function subscriptionFromFirestore(document: { id: string }): SeriesNotificationSubscription | null {
  const data = (document as { id: string; data: () => Record<string, unknown> }).data();
  if (data[FIRESTORE_MARKER] !== true) return null;
  return normalizeSubscription(data);
}

function subscriptionPayload(
  subscription: SeriesNotificationSubscription,
): Record<string, unknown> {
  return {
    [FIRESTORE_MARKER]: true,
    ...subscription,
    updatedAt: Date.now(),
  };
}

export function readSeriesNotificationSubscriptions(): SeriesNotificationSubscription[] {
  return readLocalSubscriptions();
}

export function saveLocalSeriesNotificationSubscription(
  subscription: SeriesNotificationSubscription,
): SeriesNotificationSubscription[] {
  const next = [
    subscription,
    ...readLocalSubscriptions().filter((item) => item.slug !== subscription.slug),
  ];
  writeLocalSubscriptions(next, false);
  return next;
}

export async function loadSeriesNotificationSubscriptions(
  uid = getSeriesNotificationUserId(),
): Promise<SeriesNotificationSubscription[]> {
  const localStorageValue = localStorage.getItem(SERIES_NOTIFICATIONS_STORAGE_KEY) || "[]";
  const local = readLocalSubscriptions();
  if (!uid) return local;

  const collection = notificationCollection(uid);
  const snapshot = await collection.where(FIRESTORE_MARKER, "==", true).get();
  const remote = snapshot.docs
    .map(subscriptionFromFirestore)
    .filter((item): item is SeriesNotificationSubscription => item !== null);
  const merged = new Map(remote.map((item) => [item.slug, item]));
  const missing = local.filter((item) => !merged.has(item.slug));
  for (const item of missing) merged.set(item.slug, item);
  if (missing.length && claimNotificationMigration(uid)) {
    try {
      for (const item of missing) {
        await persistNotificationSubscription(item, uid);
      }
    } catch (error) {
      console.warn("Preferensi notifikasi lokal belum dapat dimigrasikan ke Firestore.", error);
    }
  }

  if ((localStorage.getItem(SERIES_NOTIFICATIONS_STORAGE_KEY) || "[]") !== localStorageValue) {
    return readLocalSubscriptions();
  }

  const subscriptions = [...merged.values()].sort((left, right) =>
    right.subscribedAt - left.subscribedAt,
  );
  writeLocalSubscriptions(subscriptions, false);
  return subscriptions;
}

export async function saveSeriesNotificationSubscription(
  subscription: SeriesNotificationSubscription,
  uid = getSeriesNotificationUserId(),
): Promise<SeriesNotificationSubscription[]> {
  const next = saveLocalSeriesNotificationSubscription(subscription);
  try {
    if (uid) {
      await persistNotificationSubscription(subscription, uid);
    } else {
      adjustCachedNotificationCount(subscription.slug, 1);
    }
  } catch (error) {
    if (uid) deferNotificationMigration(uid);
    window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
    throw error;
  }
  window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
  return next;
}

async function persistNotificationSubscription(
  subscription: SeriesNotificationSubscription,
  uid: string,
): Promise<void> {
  const firebase = browserWindow().firebase;
  const fieldValue = firebase?.firestore?.FieldValue;
  if (!fieldValue) throw new Error("Firestore counters are unavailable.");
  const firestore = notificationFirestore();
  const reference = notificationCollection(uid)
    .doc(notificationDocumentId(subscription.slug));
  const statisticsReference = firestore.collection("seriesStats")
    .doc(encodeURIComponent(subscription.slug));
  const delta = await firestore.runTransaction(async (transaction) => {
    const [existingSubscription, existingStatistics] = await Promise.all([
      transaction.get(reference),
      transaction.get(statisticsReference),
    ]);
    const wasCounted = existingSubscription.exists &&
      existingSubscription.data()?.[FIRESTORE_MARKER] === true;
    const delta = wasCounted ? 0 : 1;
    const statistics = existingStatistics.exists ? existingStatistics.data() ?? {} : {};
    const count = (field: "views" | "bookmarks" | "notifications") => {
      const value = statistics[field];
      return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
        ? value
        : 0;
    };
    const currentNotifications = count("notifications");
    const nextNotifications = currentNotifications + delta;

    transaction.set(reference, subscriptionPayload(subscription), { merge: true });
    if (delta !== 0 || !existingStatistics.exists) {
      transaction.set(statisticsReference, {
        views: count("views"),
        bookmarks: count("bookmarks"),
        notifications: delta
          ? fieldValue.increment(delta)
          : nextNotifications,
      }, { merge: true });
    }
    return delta;
  });
  if (delta !== 0) {
    adjustCachedNotificationCount(subscription.slug, delta);
  }
}

export async function removeSeriesNotificationSubscription(
  slug: string,
  uid = getSeriesNotificationUserId(),
): Promise<SeriesNotificationSubscription[]> {
  const normalizedSlug = normalizeSlug(slug);
  const next = readLocalSubscriptions().filter((item) => item.slug !== normalizedSlug);
  writeLocalSubscriptions(next, false);
  try {
    if (uid) {
      await removeNotificationSubscription(normalizedSlug, uid);
    } else {
      adjustCachedNotificationCount(normalizedSlug, -1);
    }
  } catch (error) {
    window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
    throw error;
  }
  window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
  return next;
}

async function removeNotificationSubscription(slug: string, uid: string): Promise<void> {
  const firebase = browserWindow().firebase;
  const fieldValue = firebase?.firestore?.FieldValue;
  if (!fieldValue) throw new Error("Firestore counters are unavailable.");
  const firestore = notificationFirestore();
  const reference = notificationCollection(uid).doc(notificationDocumentId(slug));
  const statisticsReference = firestore.collection("seriesStats")
    .doc(encodeURIComponent(slug));
  const delta = await firestore.runTransaction(async (transaction) => {
    const [existingSubscription, existingStatistics] = await Promise.all([
      transaction.get(reference),
      transaction.get(statisticsReference),
    ]);
    const wasCounted = existingSubscription.exists &&
      existingSubscription.data()?.[FIRESTORE_MARKER] === true;
    const statistics = existingStatistics.exists ? existingStatistics.data() ?? {} : {};
    const count = (field: "views" | "bookmarks" | "notifications") => {
      const value = statistics[field];
      return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
        ? value
        : 0;
    };
    const currentNotifications = count("notifications");

    if (existingSubscription.exists) transaction.delete(reference);
    if (wasCounted || !existingStatistics.exists) {
      transaction.set(statisticsReference, {
        views: count("views"),
        bookmarks: count("bookmarks"),
        notifications: wasCounted && currentNotifications > 0
          ? fieldValue.increment(-1)
          : currentNotifications,
      }, { merge: true });
    }
    return wasCounted && currentNotifications > 0 ? -1 : 0;
  });
  if (delta !== 0) {
    adjustCachedNotificationCount(slug, delta);
  }
}

function timestampValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const timestamp = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.seconds === "number") {
      return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1_000_000;
    }
  }
  return 0;
}

export function seriesUpdateVersion(record: Record<string, unknown>): string {
  return JSON.stringify([
    timestampValue(record.metadataUpdatedAt),
    timestampValue(record.updatedAt),
    timestampValue(record.latestUpdate),
    timestampValue(record.lastChapterUpdated),
    String(record.lastChapter ?? ""),
    Number(record.chapterCount) || 0,
  ]);
}

export function seriesUpdateTimestamp(record: Record<string, unknown>): number {
  return Math.max(
    timestampValue(record.metadataUpdatedAt),
    timestampValue(record.updatedAt),
    timestampValue(record.latestUpdate),
    timestampValue(record.lastChapterUpdated),
  );
}

function normalizeMatch(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function findCatalogRecord(
  subscription: SeriesNotificationSubscription,
  records: SeriesNotificationCatalogRecord[],
): SeriesNotificationCatalogRecord | undefined {
  const bySlug = records.find((record) =>
    normalizeSlug(typeof record.slug === "string" ? record.slug : "") === subscription.slug,
  );
  if (bySlug) return bySlug;
  const title = normalizeMatch(subscription.title);
  return records.find((record) =>
    typeof record.title === "string" && normalizeMatch(record.title) === title,
  );
}

export function getSeriesNotificationUpdates(
  subscriptions: SeriesNotificationSubscription[],
  records: SeriesNotificationCatalogRecord[],
): SeriesNotificationUpdate[] {
  return subscriptions.flatMap((subscription) => {
    const record = findCatalogRecord(subscription, records);
    if (!record) return [];
    const version = seriesUpdateVersion(record);
    return [{
      subscription,
      record,
      version,
      updatedAt: seriesUpdateTimestamp(record),
      hasUpdate: version !== subscription.subscribedVersion,
      unread: version !== subscription.lastSeenVersion,
    }];
  }).sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function markSeriesNotificationUpdatesRead(
  subscriptions: SeriesNotificationSubscription[],
  records: SeriesNotificationCatalogRecord[],
  uid = getSeriesNotificationUserId(),
): Promise<SeriesNotificationSubscription[]> {
  const updates = getSeriesNotificationUpdates(subscriptions, records);
  const versions = new Map(updates.map((item) => [item.subscription.slug, item.version]));
  const next = subscriptions.map((item) => {
    const version = versions.get(item.slug);
    return version && version !== item.lastSeenVersion
      ? { ...item, lastSeenVersion: version }
      : item;
  });
  if (next.every((item, index) => item.lastSeenVersion === subscriptions[index]?.lastSeenVersion)) {
    return subscriptions;
  }

  writeLocalSubscriptions(next, false);
  try {
    if (uid) {
      const collection = notificationCollection(uid);
      const changed = next.filter((item, index) =>
        item.lastSeenVersion !== subscriptions[index]?.lastSeenVersion,
      );
      await Promise.all(changed.map((item) =>
        collection.doc(notificationDocumentId(item.slug)).set(subscriptionPayload(item), { merge: true }),
      ));
    }
  } catch (error) {
    window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
    throw error;
  }
  window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
  return next;
}
