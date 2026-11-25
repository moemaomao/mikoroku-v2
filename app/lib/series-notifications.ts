"use client";

export const SERIES_NOTIFICATIONS_UPDATED_EVENT = "mikoroku:series-notifications-updated";
export const SERIES_NOTIFICATIONS_STORAGE_KEY = "mikoroku_series_notifications_v1";

const FIRESTORE_MARKER = "seriesNotification";
const FIRESTORE_ID_PREFIX = "series-notification-";

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

type FirestoreReference = {
  collection: (name: string) => FirestoreCollection;
  set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
  delete: () => Promise<void>;
};

type FirestoreCollection = {
  doc: (id: string) => FirestoreReference;
  where: (field: string, operator: string, value: unknown) => {
    get: () => Promise<{ docs: Array<{ id: string }> }>;
  };
};

type FirebaseCompat = {
  auth?: () => { currentUser?: { uid?: string } | null };
  firestore?: () => { collection: (name: string) => FirestoreCollection };
};

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

function notificationDocumentId(slug: string): string {
  return `${FIRESTORE_ID_PREFIX}${encodeURIComponent(normalizeSlug(slug))}`;
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
  for (const item of local) {
    if (merged.has(item.slug)) continue;
    merged.set(item.slug, item);
    await collection.doc(notificationDocumentId(item.slug)).set(subscriptionPayload(item), { merge: true });
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
      await notificationCollection(uid)
        .doc(notificationDocumentId(subscription.slug))
        .set(subscriptionPayload(subscription), { merge: true });
    }
  } catch (error) {
    window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
    throw error;
  }
  window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
  return next;
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
      await notificationCollection(uid).doc(notificationDocumentId(normalizedSlug)).delete();
    }
  } catch (error) {
    window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
    throw error;
  }
  window.dispatchEvent(new Event(SERIES_NOTIFICATIONS_UPDATED_EVENT));
  return next;
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
