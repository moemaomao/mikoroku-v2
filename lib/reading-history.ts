export type ReadingHistoryEntry = {
  series?: string;
  title?: string;
  chapter?: string;
  cover?: string;
  slug?: string;
  url: string;
  time: number;
  progress?: number;
  updatedAt?: number;
  kind?: "manga" | "novel";
  chapterPosition?: number;
  chapterCount?: number;
  source?: string;
};

type HistoryUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

type HistoryDocumentSnapshot = {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
};

type HistoryDocumentReference = {
  get: () => Promise<HistoryDocumentSnapshot>;
  set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
};

type HistoryCollection = {
  doc: (id: string) => HistoryDocumentReference;
};

type HistoryFirestore = {
  collection: (name: string) => HistoryCollection;
};

type HistoryFirebase = {
  auth?: () => { currentUser: HistoryUser | null };
  firestore?: () => HistoryFirestore;
};

type HistoryWindow = Window & {
  currentUser?: HistoryUser | null;
  firebase?: HistoryFirebase;
};

type HistoryTombstone = {
  url: string;
  deletedAt: number;
};

type RemoteHistoryState = {
  entries: ReadingHistoryEntry[];
  deleted: HistoryTombstone[];
  clearedAt: number;
};

type HistoryOperation =
  | { type: "upsert"; url: string }
  | { type: "delete"; url: string }
  | { type: "clear" }
  | { type: "sync" };

const HISTORY_KEY = "readingHistory";
const HISTORY_LIMIT = 50;
const HISTORY_DATABASE = "mikoroku-reading-history";
const HISTORY_STORE = "entries";
const HISTORY_SYNC_COLLECTION = "userStats";
const HISTORY_SYNC_ERROR_EVENT = "mikoroku:reading-history-sync-error";
const HISTORY_SYNCED_EVENT = "mikoroku:reading-history-synced";
const HISTORY_PROGRESS_SYNC_DELAY = 4000;
const ACCOUNT_CHANGED_DURING_SYNC_ERROR =
  "The signed-in account changed during history synchronization.";

let pendingSyncTimer: number | null = null;
let pendingSyncUid = "";

function historyWindow(): HistoryWindow {
  return window as HistoryWindow;
}

function currentUser(): HistoryUser | null {
  const firebase = historyWindow().firebase;
  if (typeof firebase?.auth === "function") return firebase.auth().currentUser;
  return historyWindow().currentUser || null;
}

function currentFirestore(): HistoryFirestore | null {
  const firestore = historyWindow().firebase?.firestore;
  return typeof firestore === "function" ? firestore() : null;
}

async function waitForFirestore(): Promise<HistoryFirestore> {
  const existing = currentFirestore();
  if (existing) return existing;

  await new Promise<void>((resolve, reject) => {
    let timeout = 0;
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("firebaseCompatReady", onReady);
    };
    const onReady = () => {
      if (!currentFirestore()) return;
      cleanup();
      resolve();
    };
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Firebase Firestore initialization timed out."));
    }, 15000);

    window.addEventListener("firebaseCompatReady", onReady);
    onReady();
  });

  const firestore = currentFirestore();
  if (!firestore) throw new Error("Firebase Firestore is unavailable after initialization.");
  return firestore;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeHistoryUrl(value: unknown): string {
  const rawUrl = stringValue(value).trim();
  if (!rawUrl) return "";
  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) return rawUrl;

  try {
    const url = new URL(rawUrl, window.location.origin);
    const hostname = url.hostname.toLowerCase();
    const currentHostname = window.location.hostname.toLowerCase();
    const knownSite = hostname === "mikoroku.top" || hostname === "www.mikoroku.top";
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      (!knownSite && hostname !== currentHostname)
    ) {
      return "";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function normalizeHistory(value: unknown): ReadingHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): ReadingHistoryEntry | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const data = entry as Record<string, unknown>;
      const url = normalizeHistoryUrl(data.url);
      if (!url) return null;
      const time = numberValue(data.time);
      const kind: ReadingHistoryEntry["kind"] =
        data.kind === "manga" || data.kind === "novel" ? data.kind : undefined;
      return {
        series: stringValue(data.series),
        title: stringValue(data.title),
        chapter: stringValue(data.chapter),
        cover: stringValue(data.cover),
        slug: stringValue(data.slug),
        url,
        time,
        progress: Math.max(0, Math.min(100, numberValue(data.progress))),
        updatedAt: numberValue(data.updatedAt) || time,
        ...(kind ? { kind } : {}),
        chapterPosition: Math.max(0, numberValue(data.chapterPosition)),
        chapterCount: Math.max(0, numberValue(data.chapterCount)),
        source: stringValue(data.source),
      };
    })
    .filter((entry): entry is ReadingHistoryEntry => entry !== null)
    .sort((left, right) => right.time - left.time)
    .slice(0, HISTORY_LIMIT);
}

function entryUpdatedAt(entry: ReadingHistoryEntry): number {
  return entry.updatedAt || entry.time;
}

function readLegacyHistory(): ReadingHistoryEntry[] {
  try {
    return normalizeHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
  } catch (error) {
    console.warn("Reading history in localStorage is invalid and will be ignored.", error);
    return [];
  }
}

function openHistoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HISTORY_STORE)) {
        request.result.createObjectStore(HISTORY_STORE, { keyPath: "url" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open reading history storage."));
    request.onblocked = () => reject(new Error("Reading history storage is blocked by another browser tab."));
  });
}

async function readIndexedDbHistory(): Promise<ReadingHistoryEntry[]> {
  if (!("indexedDB" in window)) return [];
  const database = await openHistoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(HISTORY_STORE, "readonly");
    const request = transaction.objectStore(HISTORY_STORE).getAll();
    let entries: ReadingHistoryEntry[] = [];
    request.onsuccess = () => {
      entries = normalizeHistory(request.result);
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(entries);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Could not read reading history."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Reading history read was aborted."));
    };
  });
}

async function writeIndexedDbHistory(entries: ReadingHistoryEntry[]): Promise<void> {
  if (!("indexedDB" in window)) return;
  const database = await openHistoryDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(HISTORY_STORE, "readwrite");
    const store = transaction.objectStore(HISTORY_STORE);
    store.clear();
    normalizeHistory(entries).forEach((entry) => store.put(entry));
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not write reading history."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Reading history write was aborted."));
    };
  });
}

async function writeLocalHistory(entries: ReadingHistoryEntry[]): Promise<ReadingHistoryEntry[]> {
  const normalized = normalizeHistory(entries);
  await writeIndexedDbHistory(normalized);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized));
  return normalized;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeDeleted(value: unknown): HistoryTombstone[] {
  if (!Array.isArray(value)) return [];
  const deletedByUrl = new Map<string, number>();
  value.forEach((item) => {
    const tombstone = asRecord(item);
    const url = stringValue(tombstone.url);
    const deletedAt = numberValue(tombstone.deletedAt);
    if (url.startsWith("/") && !url.startsWith("//") && deletedAt > (deletedByUrl.get(url) || 0)) {
      deletedByUrl.set(url, deletedAt);
    }
  });
  return [...deletedByUrl].map(([url, deletedAt]) => ({ url, deletedAt }));
}

function normalizeRemoteState(value: unknown): RemoteHistoryState {
  const data = asRecord(value);
  return {
    entries: normalizeHistory(data.readingHistory),
    deleted: normalizeDeleted(data.readingHistoryDeleted),
    clearedAt: numberValue(data.readingHistoryClearedAt),
  };
}

function mergeDeleted(
  existing: HistoryTombstone[],
  url: string,
  deletedAt: number,
): HistoryTombstone[] {
  const deletedByUrl = new Map(existing.map((item) => [item.url, item.deletedAt]));
  deletedByUrl.set(url, Math.max(deletedByUrl.get(url) || 0, deletedAt));
  return [...deletedByUrl].map(([deletedUrl, timestamp]) => ({
    url: deletedUrl,
    deletedAt: timestamp,
  }));
}

function mergeHistoryEntries(
  localEntries: ReadingHistoryEntry[],
  remoteEntries: ReadingHistoryEntry[],
  deleted: HistoryTombstone[],
  clearedAt: number,
): ReadingHistoryEntry[] {
  const deletedAtByUrl = new Map(deleted.map((item) => [item.url, item.deletedAt]));
  const entriesByUrl = new Map<string, ReadingHistoryEntry>();

  [...remoteEntries, ...localEntries].forEach((entry) => {
    const updatedAt = entryUpdatedAt(entry);
    if (updatedAt <= clearedAt || updatedAt <= (deletedAtByUrl.get(entry.url) || 0)) return;

    const existing = entriesByUrl.get(entry.url);
    if (
      !existing ||
      updatedAt > entryUpdatedAt(existing) ||
      (updatedAt === entryUpdatedAt(existing) && (entry.progress || 0) > (existing.progress || 0))
    ) {
      entriesByUrl.set(entry.url, entry);
    }
  });

  return [...entriesByUrl.values()]
    .sort((left, right) => right.time - left.time)
    .slice(0, HISTORY_LIMIT);
}

function timestampValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (!value || typeof value !== "object") return 0;
  const timestamp = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  return typeof timestamp.seconds === "number"
    ? timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1_000_000
    : 0;
}

function decodePathPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function progressFromHistoryEntry(entry: ReadingHistoryEntry): { slug: string; value: Record<string, unknown> } | null {
  const segments = entry.url.split("?")[0].split("/").filter(Boolean);
  const pathKind = segments[0] === "novel" ? "novel" : segments[0] === "manga" ? "manga" : "";
  const kind = entry.kind || pathKind;
  const slug = entry.slug || decodePathPart(segments[1] || "");
  const chapter = decodePathPart(segments[2] || "");
  if (!slug || !kind) return null;

  const chapterProgress = Math.max(0, Math.min(100, numberValue(entry.progress)));
  const chapterPosition = numberValue(entry.chapterPosition);
  const chapterCount = numberValue(entry.chapterCount);
  const seriesProgress = chapterPosition > 0 && chapterCount > 0
    ? Math.max(0, Math.min(100, ((chapterPosition - 1 + chapterProgress / 100) / chapterCount) * 100))
    : 0;
  return {
    slug,
    value: {
      slug,
      title: entry.series || entry.title || slug,
      cover: entry.cover || "",
      kind,
      chapter,
      chapterTitle: entry.chapter || "",
      chapterProgress,
      seriesProgress,
      chapterPosition,
      chapterCount,
      source: entry.source || "",
      updatedAt: new Date(entryUpdatedAt(entry)).toISOString(),
    },
  };
}

function mergeReadingStats(
  existingValue: unknown,
  entries: ReadingHistoryEntry[],
): Record<string, unknown> {
  const readingStats = asRecord(existingValue);
  const progress = { ...asRecord(readingStats.progress) };
  const activity = { ...asRecord(readingStats.activity) };

  const latestBySlug = new Map<string, ReadingHistoryEntry>();
  entries.forEach((entry) => {
    const candidate = progressFromHistoryEntry(entry);
    if (!candidate) return;
    const existing = latestBySlug.get(candidate.slug);
    if (!existing || entryUpdatedAt(entry) > entryUpdatedAt(existing)) {
      latestBySlug.set(candidate.slug, entry);
    }
  });

  latestBySlug.forEach((entry, slug) => {
    const item = progressFromHistoryEntry(entry);
    if (!item) return;
    const key = encodeURIComponent(slug);
    const currentItem = asRecord(progress[key]);
    if (timestampValue(currentItem.updatedAt) >= entryUpdatedAt(entry)) return;
    progress[key] = item.value;
  });

  const activityStart = new Date();
  activityStart.setUTCHours(0, 0, 0, 0);
  activityStart.setUTCDate(activityStart.getUTCDate() - 6);
  const activityEnd = new Date(activityStart);
  activityEnd.setUTCDate(activityEnd.getUTCDate() + 7);
  const activityByDate = new Map<string, number>();
  entries.forEach((entry) => {
    if (!entry.time || entry.time < activityStart.getTime() || entry.time >= activityEnd.getTime()) return;
    const date = new Date(entry.time).toISOString().slice(0, 10);
    activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
  });
  activityByDate.forEach((chapters, date) => {
    const existingDay = asRecord(activity[date]);
    activity[date] = {
      ...existingDay,
      chapters: Math.max(numberValue(existingDay.chapters), chapters),
    };
  });

  const activityTotal = Object.values(activity).reduce<number>(
    (total, day) => total + numberValue(asRecord(day).chapters),
    0,
  );
  const totalChaptersRead = Math.max(
    numberValue(readingStats.totalChaptersRead),
    activityTotal,
    entries.length,
  );

  return { ...readingStats, progress, activity, totalChaptersRead };
}

function emitSyncError(error: unknown): void {
  console.error("Reading history cloud sync failed; the IndexedDB copy is retained.", error);
  const message = error instanceof Error ? error.message : "Cloud synchronization failed.";
  window.dispatchEvent(new CustomEvent(HISTORY_SYNC_ERROR_EVENT, { detail: { message } }));
}

async function syncHistoryToCloud(
  uid: string,
  localEntries: ReadingHistoryEntry[],
  operation: HistoryOperation,
): Promise<ReadingHistoryEntry[]> {
  const firestore = await waitForFirestore();
  const user = currentUser();
  if (!user || user.uid !== uid) throw new Error(ACCOUNT_CHANGED_DURING_SYNC_ERROR);

  const normalizedLocalEntries = normalizeHistory(localEntries);
  const userReference = firestore.collection(HISTORY_SYNC_COLLECTION).doc(uid);
  const snapshot = await userReference.get();
  if (currentUser()?.uid !== uid) throw new Error(ACCOUNT_CHANGED_DURING_SYNC_ERROR);
  const profile = snapshot.exists ? snapshot.data() || {} : {};
  const remoteState = normalizeRemoteState(profile);
  let deleted = remoteState.deleted;
  let clearedAt = remoteState.clearedAt;

  if (operation.type === "delete") {
    deleted = mergeDeleted(deleted, operation.url, Date.now());
  } else if (operation.type === "clear") {
    clearedAt = Date.now();
  } else if (operation.type === "upsert") {
    deleted = deleted.filter((item) => item.url !== operation.url);
  }

  const entries = operation.type === "clear"
    ? []
    : mergeHistoryEntries(normalizedLocalEntries, remoteState.entries, deleted, clearedAt);
  const readingStats = mergeReadingStats(profile.readingStats, entries);
  const profileFields: Record<string, unknown> = {};
  if (!snapshot.exists) {
    const name = user.displayName || user.email?.split("@")[0] || "Reader";
    profileFields.displayName = name;
    profileFields.username = name;
    profileFields.avatar = user.photoURL || "";
    profileFields.createdAt = new Date().toISOString();
  }

  await userReference.set({
    ...profileFields,
    readingHistory: entries,
    readingHistoryDeleted: deleted,
    readingHistoryClearedAt: clearedAt,
    readingStats,
  }, { merge: true });

  await writeLocalHistory(entries);
  window.dispatchEvent(new Event("mikoroku:reading-history-updated"));
  window.dispatchEvent(new Event("mikoroku:reading-stats-updated"));
  window.dispatchEvent(new Event(HISTORY_SYNCED_EVENT));
  return entries;
}

function cancelPendingSync(): void {
  if (pendingSyncTimer !== null) window.clearTimeout(pendingSyncTimer);
  pendingSyncTimer = null;
  pendingSyncUid = "";
}

function scheduleProgressSync(): void {
  const user = currentUser();
  if (!user) return;
  if (pendingSyncTimer !== null) return;
  pendingSyncUid = user.uid;
  pendingSyncTimer = window.setTimeout(() => {
    const uid = pendingSyncUid;
    cancelPendingSync();
    if (!uid || currentUser()?.uid !== uid) return;
    void readReadingHistory()
      .then((entries) => syncHistoryToCloud(uid, entries, { type: "sync" }))
      .catch(emitSyncError);
  }, HISTORY_PROGRESS_SYNC_DELAY);
}

async function syncCurrentUser(
  entries: ReadingHistoryEntry[],
  operation: HistoryOperation,
): Promise<ReadingHistoryEntry[]> {
  const user = currentUser();
  if (!user) return writeLocalHistory(entries);
  try {
    return await syncHistoryToCloud(user.uid, entries, operation);
  } catch (error) {
    emitSyncError(error);
    throw error;
  }
}

export async function readReadingHistory(): Promise<ReadingHistoryEntry[]> {
  try {
    const indexedDbEntries = await readIndexedDbHistory();
    if (indexedDbEntries.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(indexedDbEntries));
      return indexedDbEntries;
    }

    const legacyEntries = readLegacyHistory();
    if (legacyEntries.length) {
      await writeIndexedDbHistory(legacyEntries);
      return legacyEntries;
    }
    return [];
  } catch (error) {
    console.error("Could not read reading history from IndexedDB; using localStorage.", error);
    return readLegacyHistory();
  }
}

export async function writeReadingHistory(entries: ReadingHistoryEntry[]): Promise<void> {
  const normalized = normalizeHistory(entries);
  await writeLocalHistory(normalized);
  if (currentUser()) {
    await syncCurrentUser(normalized, { type: "sync" });
  }
}

export async function syncReadingHistoryWithUser(uid: string): Promise<ReadingHistoryEntry[]> {
  if (!uid) throw new Error("A signed-in user is required to synchronize reading history.");
  cancelPendingSync();
  const localEntries = await readReadingHistory();
  try {
    return await syncHistoryToCloud(uid, localEntries, { type: "sync" });
  } catch (error) {
    if (error instanceof Error && error.message === ACCOUNT_CHANGED_DURING_SYNC_ERROR) {
      return localEntries;
    }
    emitSyncError(error);
    throw error;
  }
}

export async function upsertReadingHistoryEntry(entry: ReadingHistoryEntry): Promise<void> {
  const existing = await readReadingHistory();
  const previous = existing.find((item) => item.url === entry.url);
  const now = Date.now();
  const updatedEntry = {
    ...entry,
    time: entry.time || now,
    updatedAt: now,
    progress: entry.progress ?? previous?.progress ?? 0,
  };
  const updated = [
    updatedEntry,
    ...existing.filter((item) => item.url !== entry.url),
  ].slice(0, HISTORY_LIMIT);
  await writeLocalHistory(updated);
  if (currentUser()) {
    await syncCurrentUser(updated, { type: "upsert", url: entry.url });
  }
}

export async function updateReadingHistoryProgress(url: string, progress: number): Promise<void> {
  const existing = await readReadingHistory();
  if (!existing.some((entry) => entry.url === url)) return;
  await writeLocalHistory(existing.map((entry) =>
    entry.url === url
      ? {
          ...entry,
          progress: Math.max(0, Math.min(100, progress)),
          updatedAt: Date.now(),
        }
      : entry,
  ));
  scheduleProgressSync();
}

export async function deleteReadingHistoryEntry(url: string): Promise<void> {
  const existing = await readReadingHistory();
  const updated = existing.filter((entry) => entry.url !== url);
  if (currentUser()) {
    cancelPendingSync();
    await syncCurrentUser(updated, { type: "delete", url });
    return;
  }
  await writeLocalHistory(updated);
}

export async function clearReadingHistory(): Promise<void> {
  cancelPendingSync();
  if (currentUser()) {
    await syncCurrentUser([], { type: "clear" });
    return;
  }
  await writeLocalHistory([]);
}
