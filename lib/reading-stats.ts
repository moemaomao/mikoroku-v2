import { loadFollowerCount } from "./user-following";
import { loadUserStatsProfile } from "./user-stats-cache";
import { mergeReadingProgressFromHistory } from "./reading-history";
import {
  addCachedChapterReadMark,
  getCachedChapterReadMarks,
  saveCachedChapterReadMarks,
} from "./chapter-read-marks-cache";

type StatsUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

type StatsDocumentSnapshot = {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
};

type StatsQueryDocument = {
  id: string;
  data: () => Record<string, unknown>;
  ref?: { parent: { parent: { id: string } | null } };
};

type StatsQuerySnapshot = {
  docs?: unknown[];
  forEach: (callback: (document: StatsQueryDocument) => void) => void;
};

type StatsQuery = {
  where?: (field: string, operator: string, value: unknown) => StatsQuery;
  limit?: (count: number) => StatsQuery;
  get: () => Promise<StatsQuerySnapshot>;
};

type StatsDocumentReference = {
  collection: (name: string) => StatsCollection;
  get: (options?: { source?: "default" | "server" | "cache" }) => Promise<StatsDocumentSnapshot>;
  set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
  onSnapshot?: (
    onNext: (snapshot: StatsDocumentSnapshot) => void,
    onError?: (error: unknown) => void,
  ) => () => void;
};

type StatsCollection = {
  doc: (id: string) => StatsDocumentReference;
  limit: (count: number) => StatsQuery;
};

type StatsTransaction = {
  get: (reference: StatsDocumentReference) => Promise<StatsDocumentSnapshot>;
  set: (
    reference: StatsDocumentReference,
    data: Record<string, unknown>,
    options?: { merge?: boolean },
  ) => StatsTransaction;
};

type StatsWriteBatch = {
  set: (
    reference: StatsDocumentReference,
    data: Record<string, unknown>,
    options?: { merge?: boolean },
  ) => void;
  commit: () => Promise<void>;
};

type StatsFirestore = {
  collection: (name: string) => StatsCollection;
  batch: () => StatsWriteBatch;
  collectionGroup?: (name: string) => StatsQuery;
  runTransaction?: <T>(
    updateFunction: (transaction: StatsTransaction) => Promise<T>,
  ) => Promise<T>;
};

type StatsFirebase = {
  auth?: () => { currentUser: StatsUser | null };
  firestore?: (() => StatsFirestore) & {
    FieldValue?: {
      increment?: (value: number) => unknown;
      arrayUnion?: (...values: unknown[]) => unknown;
    };
  };
};

type StatsWindow = Window & {
  currentUser?: StatsUser | null;
  firebase?: StatsFirebase;
};

export type ReaderStatsInput = {
  slug: string;
  title: string;
  cover: string;
  kind: "manga" | "novel";
  chapter: string;
  chapterTitle: string;
  chapterProgress: number;
  chapterPosition: number;
  chapterCount: number;
  source?: string;
};

export type ReadingProgressItem = {
  slug: string;
  title: string;
  cover: string;
  kind: "manga" | "novel";
  chapter: string;
  chapterTitle: string;
  chapterProgress: number;
  seriesProgress: number;
  chapterPosition: number;
  chapterCount: number;
  source: string;
  updatedAt: number;
};

export type ReadingActivityDay = {
  date: string;
  chapters: number;
};

export type CommentHistoryItem = {
  id: string;
  text: string;
  hasImage: boolean;
  imageUrl: string;
  createdAt: number;
  isReply: boolean;
  linkTitle: string;
  threadUrl: string;
};

export type PublicReadingStats = {
  profile: Record<string, unknown>;
  progress: ReadingProgressItem[];
  activity: ReadingActivityDay[];
  totalChaptersRead: number;
  bookmarksCount: number | null;
  followersCount: number | null;
  commentHistory: CommentHistoryItem[];
  commentHistoryError: string;
  commentHistoryLimitReached: boolean;
};

export type LiveReadingStats = Pick<PublicReadingStats, "profile" | "activity" | "totalChaptersRead">;

export const COMMENT_HISTORY_LIMIT = 20;
const LOCAL_BOOKMARK_FRESHNESS_KEY = "mikoroku:bookmarks:updatedAt";
const LOCAL_BOOKMARK_FRESHNESS_MS = 1000 * 60 * 30;
export const LOCAL_CHAPTER_TOTAL_PREFIX = "mikoroku:reading-stats:chapters:";
const LOCAL_CHAPTER_ACTIVITY_SUFFIX = ":activity";
const LOCAL_READING_PROGRESS_PREFIX = "mikoroku:reading-stats:progress:";
const LOCAL_READING_PROGRESS_LIMIT = 200;
const LOCAL_READER_STATS_QUEUE_PREFIX = "mikoroku:reading-stats:pending:";
const READER_STATS_FLUSH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const CHAPTER_READ_MARKS_CACHE_TTL_MS = READER_STATS_FLUSH_INTERVAL_MS;
const CHAPTER_READ_MARKS_REFRESH_RETRY_MS = READER_STATS_FLUSH_INTERVAL_MS;
const CHAPTER_READ_MARKS_COLLECTION = "chapterReadMarks";
const MAX_CHAPTER_READ_MARK_SERIES_PER_BATCH = 450;
const LOCAL_READ_MARK_SYNC_PREFIX = "mikoroku:reading-stats:read-mark-sync:";
const pendingReadMarkSyncs = new Map<string, Promise<void>>();
type PendingReaderStatsQueue = {
  progress: Record<string, Record<string, unknown>>;
  activityCounts: Record<string, number>;
  readMarks: Record<string, string[]>;
  lifetimeChapterTotal?: number;
  syncAfter?: number;
};
const pendingReaderStatsQueues = new Map<string, PendingReaderStatsQueue>();
const pendingReaderStatsFlushTimers = new Map<string, number>();
const pendingReaderStatsFlushDeadlines = new Map<string, number>();
const pendingReaderStatsFlushes = new Map<string, Promise<void>>();
const pendingReaderStatsRetryAttempts = new Map<string, number>();
const pendingChapterReadMarksLoads = new Map<string, Promise<Set<string>>>();
const pendingReaderStatsCallbacks = new Map<
  string,
  Map<string, (uid: string, activityDate: string) => void>
>();

function getStatsWindow(): StatsWindow {
  return window as StatsWindow;
}

function getFirestore(): StatsFirestore | null {
  const firebase = getStatsWindow().firebase;
  if (typeof firebase?.firestore !== "function") return null;
  return firebase.firestore();
}

async function waitForFirestore(): Promise<StatsFirestore> {
  const existing = getFirestore();
  if (existing) return existing;

  await new Promise<void>((resolve, reject) => {
    let timeout = 0;
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("firebaseCompatReady", onReady);
    };
    const onReady = () => {
      if (!getFirestore()) return;
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

  const firestore = getFirestore();
  if (!firestore) throw new Error("Firebase Firestore is unavailable after initialization.");
  return firestore;
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function safeDocumentId(value: string): string {
  return encodeURIComponent(value);
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getLastSevenUtcDates(now = new Date()): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return utcDateKey(date);
  });
}

export function getLocalReadMarksCount(): number {
  let count = 0;
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith("read_")) continue;
      try {
        const marks: unknown = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(marks)) {
          count += new Set(marks.map((mark) => String(mark).trim()).filter(Boolean)).size;
        }
      } catch (error) {
        console.warn(`Local read marks for "${key}" are invalid and were ignored.`, error);
      }
    }
  } catch (error) {
    console.warn("Local read marks could not be counted.", error);
  }
  return count;
}

export function getLocalBookmarkCount(): number | null {
  try {
    const raw = localStorage.getItem("mangaBookmarks");
    if (raw === null) return null;
    const bookmarks: unknown = JSON.parse(raw);
    if (!Array.isArray(bookmarks)) return null;
    const titles = new Set<string>();
    for (const bookmark of bookmarks) {
      const title = typeof bookmark === "string"
        ? bookmark.trim()
        : stringValue(asRecord(bookmark).title).trim();
      if (title) titles.add(title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
    }
    return titles.size;
  } catch (error) {
    console.warn("Local bookmarks could not be counted.", error);
    return null;
  }
}

export function markLocalBookmarksUpdated(): void {
  try {
    localStorage.setItem(LOCAL_BOOKMARK_FRESHNESS_KEY, String(Date.now()));
  } catch (error) {
    console.warn("Local bookmark freshness could not be saved.", error);
  }
}

export function hasFreshLocalBookmarks(): boolean {
  try {
    const savedAt = Number(localStorage.getItem(LOCAL_BOOKMARK_FRESHNESS_KEY));
    const age = Date.now() - savedAt;
    return Number.isFinite(savedAt) && savedAt > 0 && age >= 0 && age < LOCAL_BOOKMARK_FRESHNESS_MS;
  } catch (error) {
    console.warn("Local bookmark freshness could not be checked.", error);
    return false;
  }
}

export function getLocalChapterTotalStorageKey(uid: string): string {
  return `${LOCAL_CHAPTER_TOTAL_PREFIX}${uid}`;
}

export function getLocalReadingActivityStorageKey(uid: string): string {
  return `${getLocalChapterTotalStorageKey(uid)}${LOCAL_CHAPTER_ACTIVITY_SUFFIX}`;
}

export function getLocalReadingProgressStorageKey(uid: string): string {
  return `${LOCAL_READING_PROGRESS_PREFIX}${uid}`;
}

function readLocalReadingProgress(uid: string): ReadingProgressItem[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(getLocalReadingProgressStorageKey(uid)) || "{}",
    );
    return Object.values(asRecord(stored))
      .map(parseProgressItem)
      .filter((item): item is ReadingProgressItem => item !== null);
  } catch (error) {
    console.warn("Local reading progress could not be read.", error);
    return [];
  }
}

function writeLocalReadingProgress(
  uid: string,
  item: ReadingProgressItem,
  preserveNewer = false,
): void {
  try {
    const progress = new Map(readLocalReadingProgress(uid).map((current) => [current.slug, current]));
    const currentItem = progress.get(item.slug);
    if (preserveNewer && currentItem && currentItem.updatedAt > item.updatedAt) return;
    progress.set(item.slug, item);
    const retained = [...progress.values()]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, LOCAL_READING_PROGRESS_LIMIT);
    localStorage.setItem(
      getLocalReadingProgressStorageKey(uid),
      JSON.stringify(Object.fromEntries(retained.map((entry) => [encodeURIComponent(entry.slug), entry]))),
    );
    window.dispatchEvent(new Event("mikoroku:reading-stats-local-updated"));
  } catch (error) {
    console.warn("Local reading progress could not be saved.", error);
  }
}

export function mergeLocalReadingProgress(
  uid: string,
  progress: ReadingProgressItem[],
): ReadingProgressItem[] {
  const merged = new Map(progress.map((item) => [item.slug, item]));
  for (const localItem of readLocalReadingProgress(uid)) {
    const currentItem = merged.get(localItem.slug);
    if (!currentItem || localItem.updatedAt > currentItem.updatedAt) {
      merged.set(localItem.slug, localItem);
    }
  }
  return [...merged.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}

function readLegacyChapterReadMarks(title: string): string[] {
  if (!title) return [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(`read_${title}`) || "[]");
    return Array.isArray(stored)
      ? [...new Set(stored.map(String).filter(Boolean))]
      : [];
  } catch (error) {
    console.warn("Legacy chapter read marks could not be read.", error);
    return [];
  }
}

function syncLegacyChapterReadMarks(title: string, chapters: Iterable<string>): void {
  if (!title) return;
  const existing = readLegacyChapterReadMarks(title);
  const merged = [...new Set([...existing, ...chapters])];
  if (merged.length === existing.length) return;
  try {
    localStorage.setItem(`read_${title}`, JSON.stringify(merged));
    window.dispatchEvent(new Event("mikoroku:chapter-read"));
  } catch (error) {
    console.warn("Legacy chapter read marks could not be updated.", error);
  }
}

function enqueueChapterReadMarks(uid: string, slug: string, chapters: string[]): void {
  const newChapters = [...new Set(chapters.filter(Boolean))];
  if (!newChapters.length) return;

  const queue = readPendingReaderStatsQueue(uid);
  queue.readMarks[slug] = [...new Set([
    ...(queue.readMarks[slug] || []),
    ...newChapters,
  ])];
  pendingReaderStatsQueues.set(uid, queue);
  writePendingReaderStatsQueue(uid, queue);
  schedulePendingReaderStatsFlushIfNeeded(uid);
}

function schedulePendingReaderStatsFlushIfNeeded(uid: string): void {
  const queue = readPendingReaderStatsQueue(uid);
  if (
    Object.keys(queue.progress).length ||
    Object.keys(queue.activityCounts).length ||
    Object.keys(queue.readMarks).length
  ) {
    const delay = typeof queue.syncAfter === "number"
      ? Math.max(0, queue.syncAfter - Date.now())
      : READER_STATS_FLUSH_INTERVAL_MS;
    schedulePendingReaderStatsFlush(uid, delay);
  }
}

function readChapterMarkList(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.map((chapter) => typeof chapter === "string" ? chapter : "").filter(Boolean))]
    : [];
}

async function loadChapterReadMarks(
  uid: string,
  slug: string,
  title: string,
): Promise<Set<string>> {
  const seriesKey = `${uid}:${slug}`;
  const pending = pendingChapterReadMarksLoads.get(seriesKey);
  if (pending) return pending;

  const request = (async () => {
    const cached = await getCachedChapterReadMarks(uid, slug);
    const chapters = new Set(cached?.chapters || []);
    let fetchedAt = cached?.fetchedAt || 0;
    let checkedAt = cached?.checkedAt || 0;
    let remoteChapters: Set<string> | null = null;
    const now = Date.now();
    const cacheExpired = !cached || now - fetchedAt >= CHAPTER_READ_MARKS_CACHE_TTL_MS;
    const retryReady = !checkedAt || now - checkedAt >= CHAPTER_READ_MARKS_REFRESH_RETRY_MS;
    if (cacheExpired && retryReady) {
      try {
        const firestore = await waitForFirestore();
        const reference = firestore
          .collection("userStats")
          .doc(uid)
          .collection(CHAPTER_READ_MARKS_COLLECTION)
          .doc(safeDocumentId(slug));
        const snapshot = await reference.get({ source: "server" });
        remoteChapters = new Set(readChapterMarkList(snapshot.data()?.chapters));
        remoteChapters.forEach((chapter) => chapters.add(chapter));
        fetchedAt = Date.now();
        checkedAt = fetchedAt;
      } catch (error) {
        checkedAt = Date.now();
        console.warn(`Chapter read marks for ${slug} could not be refreshed from Firestore.`, error);
      }
    }

    const legacyMarks = readLegacyChapterReadMarks(title);
    const unsyncedLegacyMarks = legacyMarks.filter((chapter) => !chapters.has(chapter));
    unsyncedLegacyMarks.forEach((chapter) => chapters.add(chapter));
    const unsyncedCachedMarks = remoteChapters
      ? (cached?.chapters || []).filter((chapter) => !remoteChapters?.has(chapter))
      : [];
    enqueueChapterReadMarks(uid, slug, [...unsyncedLegacyMarks, ...unsyncedCachedMarks]);

    const cachedResult = await saveCachedChapterReadMarks(
      uid,
      slug,
      [...chapters],
      remoteChapters ? fetchedAt : undefined,
      checkedAt || undefined,
    );
    const result = new Set(cachedResult.chapters);
    syncLegacyChapterReadMarks(title, result);
    schedulePendingReaderStatsFlushIfNeeded(uid);
    return result;
  })();
  pendingChapterReadMarksLoads.set(seriesKey, request);
  try {
    return await request;
  } finally {
    if (pendingChapterReadMarksLoads.get(seriesKey) === request) {
      pendingChapterReadMarksLoads.delete(seriesKey);
    }
  }
}

async function markChapterReadOnce(uid: string, input: ReaderStatsInput): Promise<boolean> {
  if (!input.chapter) return false;
  const chapters = await loadChapterReadMarks(uid, input.slug, input.title);
  if (chapters.has(input.chapter)) return false;

  const result = await addCachedChapterReadMark(uid, input.slug, input.chapter);
  if (!result.added) return false;
  enqueueChapterReadMarks(uid, input.slug, [input.chapter]);
  syncLegacyChapterReadMarks(input.title, result.cache.chapters);
  return true;
}

function recordLocalReadingProgress(uid: string, input: ReaderStatsInput): void {
  const previousItem = readLocalReadingProgress(uid).find((item) => item.slug === input.slug);
  const chapterProgress = clampPercentage(input.chapterProgress);
  const seriesProgress = input.chapterCount > 0 && input.chapterPosition > 0
    ? clampPercentage(((input.chapterPosition - 1 + chapterProgress / 100) / input.chapterCount) * 100)
    : chapterProgress;
  writeLocalReadingProgress(uid, {
    slug: input.slug,
    title: input.title,
    cover: input.cover,
    kind: input.kind,
    chapter: input.chapter,
    chapterTitle: input.chapterTitle,
    chapterProgress,
    seriesProgress,
    chapterPosition: input.chapterPosition,
    chapterCount: input.chapterCount,
    source: input.source || "",
    updatedAt: Math.max(Date.now(), (previousItem?.updatedAt || 0) + 1),
  });
}

export async function ensureSeriesTracked(
  uid: string,
  input: Pick<ReaderStatsInput, "slug" | "title" | "cover" | "kind" | "chapterCount">,
): Promise<void> {
  await loadChapterReadMarks(uid, input.slug, input.title);
  const previousItem = readLocalReadingProgress(uid).find((item) => item.slug === input.slug);
  const trackedItem: ReadingProgressItem = previousItem
    ? previousItem.chapterPosition === 0 && input.chapterCount > previousItem.chapterCount
      ? {
        ...previousItem,
        title: input.title,
        cover: input.cover,
        chapterCount: input.chapterCount,
      }
      : previousItem
    : {
      ...input,
      chapter: "",
      chapterTitle: "Not started",
      chapterProgress: 0,
      seriesProgress: 0,
      chapterPosition: 0,
      source: "",
      updatedAt: Date.now(),
    };
  if (previousItem && trackedItem === previousItem && previousItem.updatedAt > 0) return;
  if (!previousItem || trackedItem !== previousItem) {
    writeLocalReadingProgress(uid, trackedItem);
  }
  const queue = readPendingReaderStatsQueue(uid);
  const progressKey = safeDocumentId(input.slug);
  if (!queue.progress[progressKey]) {
    queue.progress[progressKey] = {
      ...trackedItem,
      updatedAt: new Date(trackedItem.updatedAt || Date.now()).toISOString(),
    };
  }
  pendingReaderStatsQueues.set(uid, queue);
  writePendingReaderStatsQueue(uid, queue);
  schedulePendingReaderStatsFlushIfNeeded(uid);
  window.dispatchEvent(new Event("mikoroku:reading-stats-local-updated"));
  window.dispatchEvent(new Event("mikoroku:reading-stats-updated"));
}

function readLocalReadingActivity(uid: string): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(getLocalReadingActivityStorageKey(uid)) || "{}");
    const activity = asRecord(parsed);
    const baseline = asRecord(activity.baseline);
    const pending = asRecord(activity.pending);
    const source = Object.keys(baseline).length || Object.keys(pending).length ? baseline : activity;
    return Object.fromEntries(
      Object.entries(source)
        .filter(([date, count]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof count === "number" && Number.isFinite(count))
        .map(([date, count]) => [date, Math.max(0, Math.floor(count as number))]),
    );
  } catch (error) {
    console.warn("Local reading activity could not be read.", error);
    return {};
  }
}

type LocalReadingActivity = {
  baseline: Record<string, number>;
  pending: Record<string, number>;
};

function readLocalReadingActivityState(uid: string): LocalReadingActivity {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(getLocalReadingActivityStorageKey(uid)) || "{}");
    const data = asRecord(parsed);
    if (!data.baseline && !data.pending) {
      return { baseline: readLocalReadingActivity(uid), pending: {} };
    }
    const normalize = (value: unknown) => Object.fromEntries(
      Object.entries(asRecord(value))
        .filter(([date, count]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof count === "number" && Number.isFinite(count))
        .map(([date, count]) => [date, Math.max(0, Math.floor(count as number))]),
    );
    return {
      baseline: normalize(data.baseline),
      pending: normalize(data.pending),
    };
  } catch (error) {
    console.warn("Local reading activity could not be read.", error);
    return { baseline: {}, pending: {} };
  }
}

function writeLocalReadingActivity(uid: string, activity: LocalReadingActivity): void {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const cutoffDate = utcDateKey(cutoff);
  const recent = {
    baseline: Object.fromEntries(Object.entries(activity.baseline).filter(([date]) => date >= cutoffDate)),
    pending: Object.fromEntries(Object.entries(activity.pending).filter(([date]) => date >= cutoffDate)),
  };
  try {
    localStorage.setItem(getLocalReadingActivityStorageKey(uid), JSON.stringify(recent));
  } catch (error) {
    console.warn("Local reading activity could not be saved.", error);
  }
}

export function mergeLocalReadingActivity(
  uid: string,
  activity: ReadingActivityDay[],
): ReadingActivityDay[] {
  const localActivity = readLocalReadingActivityState(uid);
  return activity.map((day) => ({
    ...day,
    chapters: Math.max(
      day.chapters,
      (localActivity.baseline[day.date] || 0) + (localActivity.pending[day.date] || 0),
    ),
  }));
}

export function setLocalReadingActivityBaseline(
  uid: string,
  activity: ReadingActivityDay[],
): void {
  const localActivity = readLocalReadingActivityState(uid);
  activity.forEach((day) => {
    localActivity.baseline[day.date] = Math.max(localActivity.baseline[day.date] || 0, day.chapters);
  });
  writeLocalReadingActivity(uid, localActivity);
}

export function acknowledgeLocalReadingActivity(uid: string, date: string): void {
  const activity = readLocalReadingActivityState(uid);
  const pending = activity.pending[date] || 0;
  if (!pending) return;
  activity.pending[date] = pending - 1;
  activity.baseline[date] = (activity.baseline[date] || 0) + 1;
  writeLocalReadingActivity(uid, activity);
  window.dispatchEvent(new Event("mikoroku:reading-stats-local-updated"));
}

export function getLocalChapterTotal(uid: string): number {
  try {
    const stored = Number(localStorage.getItem(getLocalChapterTotalStorageKey(uid)));
    return Number.isFinite(stored) && stored >= 0 ? Math.floor(stored) : 0;
  } catch (error) {
    console.warn("Local chapter total could not be read.", error);
    return 0;
  }
}

export function setLocalChapterTotal(uid: string, total: number): void {
  if (!Number.isFinite(total) || total < 0) return;
  const next = Math.max(getLocalChapterTotal(uid), Math.floor(total));
  try {
    localStorage.setItem(getLocalChapterTotalStorageKey(uid), String(next));
    window.dispatchEvent(new Event("mikoroku:reading-stats-local-updated"));
  } catch (error) {
    console.warn("Local chapter total could not be saved.", error);
  }
}

export function recordLocalChapterRead(
  uid: string,
  recordChapterActivity: boolean,
  activityDate = utcDateKey(new Date()),
): number {
  const previous = getLocalChapterTotal(uid);
  const localReadMarks = getLocalReadMarksCount();
  const next = Math.max(previous + (recordChapterActivity ? 1 : 0), localReadMarks);
  try {
    localStorage.setItem(getLocalChapterTotalStorageKey(uid), String(next));
  } catch (error) {
    console.warn("Local chapter total could not be saved.", error);
  }
  if (recordChapterActivity) {
    const activity = readLocalReadingActivityState(uid);
    activity.pending[activityDate] = (activity.pending[activityDate] || 0) + 1;
    writeLocalReadingActivity(uid, activity);
    window.dispatchEvent(new Event("mikoroku:reading-stats-local-updated"));
  }
  return next;
}

function readPendingReaderStatsQueue(uid: string): PendingReaderStatsQueue {
  const cached = pendingReaderStatsQueues.get(uid);
  if (cached) return cached;

  let queue: PendingReaderStatsQueue = { progress: {}, activityCounts: {}, readMarks: {} };
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(`${LOCAL_READER_STATS_QUEUE_PREFIX}${uid}`) || "{}",
    );
    const data = asRecord(stored);
    queue = {
      progress: Object.fromEntries(
        Object.entries(asRecord(data.progress)).filter(([, item]) =>
          Boolean(item) &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          typeof (item as Record<string, unknown>).slug === "string" &&
          typeof (item as Record<string, unknown>).updatedAt === "string",
        ),
      ) as PendingReaderStatsQueue["progress"],
      activityCounts: Object.fromEntries(
        Object.entries(asRecord(data.activityCounts))
          .filter(([, count]) =>
            typeof count === "number" &&
            Number.isSafeInteger(count) &&
            count > 0,
          ),
      ) as Record<string, number>,
      readMarks: Object.fromEntries(
        Object.entries(asRecord(data.readMarks))
          .map(([slug, chapters]) => [slug, readChapterMarkList(chapters)] as const)
          .filter(([, chapters]) => chapters.length > 0),
      ),
      lifetimeChapterTotal: Number.isSafeInteger(data.lifetimeChapterTotal) &&
        Number(data.lifetimeChapterTotal) > 0
        ? Number(data.lifetimeChapterTotal)
        : undefined,
      syncAfter: Number.isFinite(data.syncAfter) && Number(data.syncAfter) > 0
        ? Number(data.syncAfter)
        : undefined,
    };
  } catch (error) {
    console.warn("Pending reading stats could not be read.", error);
  }
  if (hasPendingReaderStats(queue) && !queue.syncAfter) {
    queue.syncAfter = Date.now();
  }
  pendingReaderStatsQueues.set(uid, queue);
  return queue;
}

function writePendingReaderStatsQueue(uid: string, queue: PendingReaderStatsQueue): void {
  const hasProgress = Object.keys(queue.progress).length > 0;
  const hasActivity = Object.keys(queue.activityCounts).length > 0;
  const hasReadMarks = Object.keys(queue.readMarks).length > 0;
  const hasLifetimeTotal = Number.isSafeInteger(queue.lifetimeChapterTotal) &&
    Number(queue.lifetimeChapterTotal) > 0;
  try {
    const key = `${LOCAL_READER_STATS_QUEUE_PREFIX}${uid}`;
    if (!hasProgress && !hasActivity && !hasReadMarks && !hasLifetimeTotal) {
      localStorage.removeItem(key);
    } else {
      if (!Number.isFinite(queue.syncAfter) || !queue.syncAfter) {
        queue.syncAfter = Date.now() + READER_STATS_FLUSH_INTERVAL_MS;
      }
      localStorage.setItem(key, JSON.stringify(queue));
    }
  } catch (error) {
    console.warn("Pending reading stats could not be saved.", error);
  }
}

function hasPendingReaderStats(queue: PendingReaderStatsQueue): boolean {
  return Boolean(
    Object.keys(queue.progress).length ||
    Object.keys(queue.activityCounts).length ||
    Object.keys(queue.readMarks).length ||
    (Number.isSafeInteger(queue.lifetimeChapterTotal) && Number(queue.lifetimeChapterTotal) > 0),
  );
}

function schedulePendingReaderStatsFlush(
  uid: string,
  delay = READER_STATS_FLUSH_INTERVAL_MS,
): void {
  const deadline = Date.now() + delay;
  const existingTimer = pendingReaderStatsFlushTimers.get(uid);
  const existingDeadline = pendingReaderStatsFlushDeadlines.get(uid);
  if (existingTimer !== undefined && existingDeadline !== undefined) {
    if (existingDeadline <= deadline) return;
    window.clearTimeout(existingTimer);
  }
  const timer = window.setTimeout(() => {
    pendingReaderStatsFlushTimers.delete(uid);
    pendingReaderStatsFlushDeadlines.delete(uid);
    void flushPendingReaderStats(uid);
  }, delay);
  pendingReaderStatsFlushTimers.set(uid, timer);
  pendingReaderStatsFlushDeadlines.set(uid, deadline);
}

async function flushPendingReaderStats(uid: string): Promise<void> {
  const existing = pendingReaderStatsFlushes.get(uid);
  if (existing) return existing;

  const queue = readPendingReaderStatsQueue(uid);
  if (!hasPendingReaderStats(queue)) return;

  const remainingDelay = (queue.syncAfter || 0) - Date.now();
  if (remainingDelay > 0) {
    schedulePendingReaderStatsFlush(uid, remainingDelay);
    return;
  }

  const sdk = getStatsWindow().firebase;
  const user = sdk?.auth?.().currentUser || getStatsWindow().currentUser;
  if (user?.uid !== uid || !navigator.onLine) {
    schedulePendingReaderStatsFlush(uid);
    return;
  }

  const queuedProgress = { ...queue.progress };
  const queuedActivityCounts = { ...queue.activityCounts };
  const queuedReadMarks = Object.fromEntries(
    Object.entries(queue.readMarks).slice(0, MAX_CHAPTER_READ_MARK_SERIES_PER_BATCH),
  );
  const queuedLifetimeChapterTotal = queue.lifetimeChapterTotal;
  const timer = pendingReaderStatsFlushTimers.get(uid);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    pendingReaderStatsFlushTimers.delete(uid);
    pendingReaderStatsFlushDeadlines.delete(uid);
  }

  const request = (async () => {
    try {
      const firestore = await waitForFirestore();
      const activeSdk = getStatsWindow().firebase;
      const activeUser = activeSdk?.auth?.().currentUser || getStatsWindow().currentUser;
      if (activeUser?.uid !== uid) return;

      const increment = activeSdk?.firestore?.FieldValue?.increment;
      const arrayUnion = activeSdk?.firestore?.FieldValue?.arrayUnion;
      const activityTotal = Object.values(queuedActivityCounts)
        .reduce((total, count) => total + count, 0);
      if (activityTotal && typeof increment !== "function") {
        throw new Error("Firestore atomic increment is unavailable.");
      }
      if (Object.keys(queuedReadMarks).length && typeof arrayUnion !== "function") {
        throw new Error("Firestore array union is unavailable for chapter read marks.");
      }
      const incrementValue = (count: number): unknown => {
        if (typeof increment !== "function") {
          throw new Error("Firestore atomic increment is unavailable.");
        }
        return increment(count);
      };

      const batch = firestore.batch();
      const userReference = firestore.collection("userStats").doc(uid);
      const readingStats: Record<string, unknown> = {};
      if (Object.keys(queuedProgress).length) readingStats.progress = queuedProgress;
      if (activityTotal) {
        readingStats.activity = Object.fromEntries(
          Object.entries(queuedActivityCounts).map(([date, count]) => [
            date,
            { chapters: incrementValue(count) },
          ]),
        );
        readingStats.totalChaptersRead = incrementValue(activityTotal);
      }
      const readMarkEntries = Object.entries(queuedReadMarks)
        .filter(([, chapters]) => chapters.length > 0);
      if (readMarkEntries.length) {
        if (typeof arrayUnion !== "function") {
          throw new Error("Firestore array union is unavailable for chapter read marks.");
        }
      }
      if (Object.keys(readingStats).length) {
        batch.set(userReference, { readingStats }, { merge: true });
      }
      readMarkEntries.forEach(([slug, chapters]) => {
        if (typeof arrayUnion !== "function") return;
        const markReference = userReference
          .collection(CHAPTER_READ_MARKS_COLLECTION)
          .doc(safeDocumentId(slug));
        batch.set(markReference, {
          slug,
          chapters: arrayUnion(...chapters),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });
      await batch.commit();
      await Promise.all(Object.entries(queuedReadMarks).map(([slug, chapters]) =>
        saveCachedChapterReadMarks(uid, slug, chapters, Date.now()),
      ));

      const currentQueue = readPendingReaderStatsQueue(uid);
      Object.entries(queuedProgress).forEach(([key, sent]) => {
        if (currentQueue.progress[key]?.updatedAt === sent.updatedAt) {
          delete currentQueue.progress[key];
        }
      });
      Object.entries(queuedActivityCounts).forEach(([date, sentCount]) => {
        const remaining = (currentQueue.activityCounts[date] || 0) - sentCount;
        if (remaining > 0) currentQueue.activityCounts[date] = remaining;
        else delete currentQueue.activityCounts[date];
      });
      Object.entries(queuedReadMarks).forEach(([slug, sentChapters]) => {
        const remaining = (currentQueue.readMarks[slug] || [])
          .filter((chapter) => !sentChapters.includes(chapter));
        if (remaining.length) currentQueue.readMarks[slug] = remaining;
        else delete currentQueue.readMarks[slug];
      });
      if (hasPendingReaderStats(currentQueue) && !queuedLifetimeChapterTotal) {
        currentQueue.syncAfter = Date.now() + READER_STATS_FLUSH_INTERVAL_MS;
      } else if (!hasPendingReaderStats(currentQueue)) {
        delete currentQueue.syncAfter;
      }
      writePendingReaderStatsQueue(uid, currentQueue);

      if (queuedLifetimeChapterTotal) {
        await syncLifetimeChapterCountToFirestore(uid, queuedLifetimeChapterTotal);
        const latestQueue = readPendingReaderStatsQueue(uid);
        if (latestQueue.lifetimeChapterTotal === queuedLifetimeChapterTotal) {
          delete latestQueue.lifetimeChapterTotal;
          try {
            localStorage.setItem(
              `${LOCAL_READ_MARK_SYNC_PREFIX}${uid}`,
              JSON.stringify({ syncedCount: queuedLifetimeChapterTotal }),
            );
          } catch (error) {
            console.warn("Local chapter read sync state could not be saved.", error);
          }
          if (hasPendingReaderStats(latestQueue)) {
            latestQueue.syncAfter = Date.now() + READER_STATS_FLUSH_INTERVAL_MS;
          } else {
            delete latestQueue.syncAfter;
          }
          pendingReaderStatsQueues.set(uid, latestQueue);
          writePendingReaderStatsQueue(uid, latestQueue);
        }
      }

      const callbacks = pendingReaderStatsCallbacks.get(uid);
      Object.entries(queuedActivityCounts).forEach(([date, count]) => {
        const callback = callbacks?.get(date);
        for (let index = 0; index < count; index += 1) {
          try {
            if (callback) callback(uid, date);
            else acknowledgeLocalReadingActivity(uid, date);
          } catch (error) {
            console.warn("A synchronized chapter activity could not be acknowledged locally.", error);
          }
        }
        callbacks?.delete(date);
      });
      if (callbacks && callbacks.size === 0) pendingReaderStatsCallbacks.delete(uid);

      pendingReaderStatsRetryAttempts.delete(uid);
      window.dispatchEvent(new Event("mikoroku:reading-stats-updated"));
      if (hasPendingReaderStats(currentQueue)) schedulePendingReaderStatsFlushIfNeeded(uid);
    } catch (error) {
      console.error("Reading stats remain queued locally and will retry synchronization.", error);
      const attempts = (pendingReaderStatsRetryAttempts.get(uid) || 0) + 1;
      pendingReaderStatsRetryAttempts.set(uid, attempts);
      schedulePendingReaderStatsFlush(
        uid,
        Math.min(60_000 * (2 ** (attempts - 1)), 15 * 60 * 1000),
      );
    }
  })();
  pendingReaderStatsFlushes.set(uid, request);
  try {
    await request;
  } finally {
    if (pendingReaderStatsFlushes.get(uid) === request) {
      pendingReaderStatsFlushes.delete(uid);
    }
  }
}

function flushCurrentUserReaderStats(): void {
  const sdk = getStatsWindow().firebase;
  const user = sdk?.auth?.().currentUser || getStatsWindow().currentUser;
  if (user?.uid) schedulePendingReaderStatsFlushIfNeeded(user.uid);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushCurrentUserReaderStats);
  window.addEventListener("online", flushCurrentUserReaderStats);
  window.addEventListener("firebaseCompatReady", flushCurrentUserReaderStats);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushCurrentUserReaderStats();
  });
}

export async function saveReaderStats(
  input: ReaderStatsInput,
  recordChapterActivity: boolean,
  onOptimisticUpdate?: (uid: string, activityDate: string, recordChapterActivity: boolean) => void,
  onSynced?: (uid: string, activityDate: string) => void,
): Promise<boolean> {
  const sdk = getStatsWindow().firebase;
  const user = getStatsWindow().currentUser || sdk?.auth?.().currentUser;
  if (!user?.uid) {
    syncLegacyChapterReadMarks(input.title, [input.chapter]);
    return false;
  }
  const activityDate = utcDateKey(new Date());
  recordLocalReadingProgress(user.uid, input);
  onOptimisticUpdate?.(user.uid, activityDate, recordChapterActivity);

  const localProgress = readLocalReadingProgress(user.uid)
    .find((item) => item.slug === input.slug);
  const chapterProgress = clampPercentage(input.chapterProgress);
  const seriesProgress = input.chapterCount > 0 && input.chapterPosition > 0
    ? clampPercentage(((input.chapterPosition - 1 + chapterProgress / 100) / input.chapterCount) * 100)
    : chapterProgress;
  const queue = readPendingReaderStatsQueue(user.uid);
  queue.progress[safeDocumentId(input.slug)] = {
    slug: input.slug,
    title: input.title,
    cover: input.cover,
    kind: input.kind,
    chapter: input.chapter,
    chapterTitle: input.chapterTitle,
    chapterProgress,
    seriesProgress,
    chapterPosition: input.chapterPosition,
    chapterCount: input.chapterCount,
    source: input.source || "",
    updatedAt: new Date(localProgress?.updatedAt || Date.now()).toISOString(),
  };

  if (recordChapterActivity) {
    queue.activityCounts[activityDate] = (queue.activityCounts[activityDate] || 0) + 1;
    if (onSynced) {
      const callbacks = pendingReaderStatsCallbacks.get(user.uid) || new Map();
      callbacks.set(activityDate, onSynced);
      pendingReaderStatsCallbacks.set(user.uid, callbacks);
    }
  }

  pendingReaderStatsQueues.set(user.uid, queue);
  writePendingReaderStatsQueue(user.uid, queue);
  schedulePendingReaderStatsFlushIfNeeded(user.uid);
  if (recordChapterActivity) {
    try {
      await markChapterReadOnce(user.uid, input);
    } catch (error) {
      console.warn("The chapter read mark could not be saved; reading stats will still be recorded.", error);
    }
  }
  window.dispatchEvent(new Event("mikoroku:reading-stats-updated"));
  return true;
}

async function syncLifetimeChapterCountToFirestore(uid: string, minimum: number): Promise<void> {
  const firestore = await waitForFirestore();
  if (!firestore.runTransaction) {
    throw new Error("Firestore transactions are unavailable for chapter count synchronization.");
  }
  const firebase = getStatsWindow().firebase;
  const reference = firestore.collection("userStats").doc(uid);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const user = firebase?.auth?.().currentUser || getStatsWindow().currentUser;
    if (user?.uid !== uid) {
      throw new Error("The signed-in account changed during chapter count synchronization.");
    }
    const currentTotal = numberValue(
      asRecord(snapshot.data()?.readingStats).totalChaptersRead,
    );
    if (currentTotal < minimum) {
      transaction.set(reference, {
        readingStats: { totalChaptersRead: minimum },
      }, { merge: true });
    }
  });
}

export async function preserveLifetimeChapterCount(uid: string, minimum: number): Promise<boolean> {
  if (!Number.isFinite(minimum) || minimum < 0) {
    throw new Error("A valid lifetime chapter count is required.");
  }
  const firebase = getStatsWindow().firebase;
  const user = firebase?.auth?.().currentUser || getStatsWindow().currentUser;
  if (!firebase || user?.uid !== uid) {
    throw new Error("Sign in as the profile owner to restore the chapter count.");
  }

  const queue = readPendingReaderStatsQueue(uid);
  const currentMinimum = queue.lifetimeChapterTotal || 0;
  if (currentMinimum >= minimum) return false;
  queue.lifetimeChapterTotal = Math.floor(minimum);
  pendingReaderStatsQueues.set(uid, queue);
  writePendingReaderStatsQueue(uid, queue);
  schedulePendingReaderStatsFlushIfNeeded(uid);
  return true;
}

export async function syncLocalReadMarksWithUser(uid: string): Promise<void> {
  if (!uid) throw new Error("A signed-in user is required to synchronize local read marks.");
  const firebase = getStatsWindow().firebase;
  const user = firebase?.auth?.().currentUser || getStatsWindow().currentUser;
  if (user?.uid !== uid) {
    throw new Error("The signed-in account changed during local read mark synchronization.");
  }

  const pending = pendingReadMarkSyncs.get(uid);
  if (pending) return pending;

  const request = (async () => {
    const localReadMarks = getLocalReadMarksCount();
    if (localReadMarks <= 0) return;

    const syncKey = `${LOCAL_READ_MARK_SYNC_PREFIX}${uid}`;
    let syncState: { syncedCount?: number; attemptedCount?: number; retryAfter?: number } = {};
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(syncKey) || "{}");
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        syncState = stored as typeof syncState;
      }
    } catch (error) {
      console.warn("Local chapter read sync state is invalid and will be ignored.", error);
    }

    if (localReadMarks <= (syncState.syncedCount || 0)) return;
    await preserveLifetimeChapterCount(uid, localReadMarks);
  })();
  pendingReadMarkSyncs.set(uid, request);
  try {
    await request;
  } finally {
    if (pendingReadMarkSyncs.get(uid) === request) {
      pendingReadMarkSyncs.delete(uid);
    }
  }
}

export async function subscribeToReadingStats(
  uid: string,
  onUpdate: (stats: LiveReadingStats) => void,
  onError: (error: unknown) => void,
): Promise<() => void> {
  const firestore = await waitForFirestore();
  const reference = firestore.collection("userStats").doc(uid);
  if (!reference.onSnapshot) {
    throw new Error("Firestore live updates are unavailable.");
  }

  return reference.onSnapshot((snapshot) => {
    const profile = snapshot.exists ? snapshot.data() || {} : {};
    const readingStats = asRecord(profile.readingStats);
    const activityByDate = asRecord(readingStats.activity);
    const activity = getLastSevenUtcDates().map((date) => ({
      date,
      chapters: numberValue(asRecord(activityByDate[date]).chapters),
    }));
    const activityTotal = Object.values(activityByDate).reduce<number>(
      (total, day) => total + numberValue(asRecord(day).chapters),
      0,
    );
    const historyTotal = Array.isArray(profile.readingHistory)
      ? profile.readingHistory.length
      : 0;
    onUpdate({
      profile,
      activity,
      totalChaptersRead: Math.max(
        numberValue(readingStats.totalChaptersRead),
        activityTotal,
        historyTotal,
      ),
    });
  }, onError);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function imageUrlValue(value: unknown): string {
  const imageUrl = stringValue(value);
  if (!imageUrl) return "";

  try {
    const url = new URL(imageUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? imageUrl : "";
  } catch {
    return "";
  }
}

function decodePathPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function timestampValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (!value || typeof value !== "object") return 0;

  const timestamp = value as {
    toMillis?: () => number;
    toDate?: () => Date;
    seconds?: number;
    nanoseconds?: number;
  };
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
  return typeof timestamp.seconds === "number"
    ? timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1_000_000
    : 0;
}

function normalizeCommentPageId(value: string): string {
  return value
    .replace(/^[\/]+|[\/]+$/g, "")
    .replace(/[\/]/g, "__")
    .replace(/\.html$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function getCommentPageIdFromUrl(value: string): string {
  try {
    const segments = new URL(value, window.location.origin).pathname.split("/").filter(Boolean);
    const kind = segments[0];
    const slug = decodePathPart(segments[1] || "");
    if ((kind === "manga" || kind === "novel") && segments[2]) {
      const chapter = decodePathPart(segments[2]);
      return normalizeCommentPageId(`${kind === "manga" ? "reader" : "novel"}_${slug}_${chapter}`);
    }
    if (kind === "series" && slug) return normalizeCommentPageId(`detail_${slug}`);
  } catch {
    return "";
  }
  return "";
}

function getCommentThreadUrlFromProfile(postId: string, profile: Record<string, unknown>): string {
  const candidates: string[] = [];
  if (Array.isArray(profile.readingHistory)) {
    profile.readingHistory.forEach((value) => {
      const url = stringValue(asRecord(value).url);
      if (url) candidates.push(url);
    });
  }
  const progressBySlug = asRecord(asRecord(profile.readingStats).progress);
  Object.values(progressBySlug).forEach((value) => {
    const entry = asRecord(value);
    const kind = entry.kind === "novel" ? "novel" : entry.kind === "manga" ? "manga" : "";
    const slug = stringValue(entry.slug);
    const chapter = stringValue(entry.chapter);
    if (kind && slug && chapter) {
      candidates.push(`/${kind}/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`);
    }
  });

  const matchingUrl = candidates.find((candidate) => getCommentPageIdFromUrl(candidate) === postId);
  if (!matchingUrl) return "";
  try {
    const url = new URL(matchingUrl, window.location.origin);
    url.hash = "comments-list";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function getCommentThreadUrl(postId: string, savedUrl: unknown, profile: Record<string, unknown>): string {
  const rawUrl = stringValue(savedUrl);
  if (rawUrl) {
    try {
      const url = new URL(rawUrl, window.location.origin);
      const hostname = url.hostname.toLowerCase();
      const allowedHost = hostname === window.location.hostname.toLowerCase()
        || hostname === "mikoroku.top"
        || hostname === "www.mikoroku.top";
      if ((url.protocol === "http:" || url.protocol === "https:") && allowedHost) {
        url.hash = "comments-list";
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      // Fall through to the saved reading history and post ID mapping.
    }
  }

  const historyUrl = getCommentThreadUrlFromProfile(postId, profile);
  if (historyUrl) return historyUrl;

  if (postId === "home") return "/#comments-list";
  let match = postId.match(/^reader_(.+)_([^_]+)$/);
  if (match) return `/manga/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}#comments-list`;
  match = postId.match(/^novel_(.+)_([^_]+)$/);
  if (match) return `/novel/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}#comments-list`;
  match = postId.match(/^detail_(.+)$/);
  if (match) return `/series/${encodeURIComponent(match[1])}#comments-list`;

  const legacyPath = postId
    .replace(/_html_m_1$/, "")
    .replace(/\/html\/m\/\d+$/, "")
    .replace(/\?m=\d+$/, "")
    .replace(/\/m\/\d+$/, "")
    .replace(/\/html$/, "")
    .replace(/_/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return legacyPath ? `/${legacyPath}#comments-list` : "";
}

function getCommentLinkTitle(postId: string, savedTitle: unknown, savedUrl: unknown, profile: Record<string, unknown>): string {
  const storedTitle = stringValue(savedTitle).trim().replace(/\s*\|\s*Mikoroku.*$/i, "").trim();
  if (storedTitle) {
    const separator = storedTitle.indexOf(" - ");
    if (separator > 0) {
      const chapterTitle = storedTitle.slice(0, separator).trim();
      const seriesTitle = storedTitle.slice(separator + 3).trim();
      if (/^(chapter|episode|ep\.?)\b/i.test(chapterTitle) && seriesTitle) {
        return `${seriesTitle} ${chapterTitle}`;
      }
    }
    return storedTitle;
  }

  const threadUrl = getCommentThreadUrl(postId, savedUrl, profile);
  let pathSegments: string[] = [];
  try {
    pathSegments = new URL(threadUrl, window.location.origin).pathname.split("/").filter(Boolean);
  } catch {
    pathSegments = [];
  }
  const routeKind = pathSegments[0];
  const slug = routeKind === "manga" || routeKind === "novel" || routeKind === "series"
    ? decodePathPart(pathSegments[1] || "")
    : "";
  const chapter = routeKind === "manga" || routeKind === "novel"
    ? decodePathPart(pathSegments[2] || "")
    : "";

  const historyEntries = Array.isArray(profile.readingHistory)
    ? profile.readingHistory.map(asRecord)
    : [];
  const historyMatch = historyEntries.find((entry) => {
    if (!threadUrl || !stringValue(entry.url)) return false;
    try {
      return new URL(stringValue(entry.url), window.location.origin).pathname
        === new URL(threadUrl, window.location.origin).pathname;
    } catch {
      return false;
    }
  });
  if (historyMatch) {
    const seriesTitle = stringValue(historyMatch.series) || stringValue(historyMatch.title);
    if (seriesTitle) {
      const chapterTitle = stringValue(historyMatch.chapter) || (chapter ? `Chapter ${chapter}` : "");
      return [seriesTitle, chapterTitle].filter(Boolean).join(" ");
    }
  }

  const progressBySlug = asRecord(asRecord(profile.readingStats).progress);
  const progressMatch = Object.values(progressBySlug)
    .map(asRecord)
    .find((entry) => decodePathPart(stringValue(entry.slug)) === slug);
  const seriesTitle = stringValue(progressMatch?.title);
  if (seriesTitle) {
    return [seriesTitle, chapter ? `Chapter ${chapter}` : ""].filter(Boolean).join(" ");
  }

  const readableSlug = slug
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return [readableSlug, chapter ? `Chapter ${chapter}` : ""].filter(Boolean).join(" ")
    || "Lihat halaman komentar";
}

function parseProgressItem(value: unknown): ReadingProgressItem | null {
  const data = asRecord(value);
  const kind = data.kind === "novel" ? "novel" : data.kind === "manga" ? "manga" : null;
  const slug = stringValue(data.slug);
  if (!kind || !slug) return null;
  return {
    slug,
    title: stringValue(data.title) || slug,
    cover: stringValue(data.cover),
    kind,
    chapter: stringValue(data.chapter),
    chapterTitle: stringValue(data.chapterTitle),
    chapterProgress: clampPercentage(numberValue(data.chapterProgress)),
    seriesProgress: clampPercentage(numberValue(data.seriesProgress)),
    chapterPosition: numberValue(data.chapterPosition),
    chapterCount: numberValue(data.chapterCount),
    source: stringValue(data.source),
    updatedAt: timestampValue(data.updatedAt),
  };
}

export async function loadPublicReadingStats(uid: string): Promise<PublicReadingStats> {
  const firestore = await waitForFirestore();
  const userReference = firestore.collection("userStats").doc(uid);
  const profilePromise = loadUserStatsProfile(uid, async () => {
    const snapshot = await userReference.get();
    return snapshot.exists ? snapshot.data() || {} : {};
  });
  const commentSnapshotPromise = (async () => {
    try {
      if (typeof firestore.collectionGroup !== "function") {
        throw new Error("Firestore collection-group queries are unavailable.");
      }
      const commentsQuery = firestore.collectionGroup("postComments");
      if (typeof commentsQuery.where !== "function") {
        throw new Error("Firestore comment filtering is unavailable.");
      }
      const filteredCommentsQuery = commentsQuery.where("uid", "==", uid);
      if (typeof filteredCommentsQuery.limit !== "function") {
        throw new Error("Firestore comment limits are unavailable.");
      }
      return {
        snapshot: await filteredCommentsQuery.limit(COMMENT_HISTORY_LIMIT).get(),
        error: "",
      };
    } catch (error) {
      console.warn("Comment history could not be loaded for this user.", error);
      return {
        snapshot: null,
        error: error instanceof Error ? error.message : "Comment history could not be loaded.",
      };
    }
  })();
  const bookmarksCountPromise = (async () => {
    try {
      const bookmarks = await firestore.collection("users").doc(uid).collection("bookmarks").limit(1000).get();
      let count = 0;
      bookmarks.forEach((document) => {
        if (document.data().seriesNotification !== true) count += 1;
      });
      return count;
    } catch (error) {
      console.warn("Bookmark count is not publicly available for this user.", error);
      return null;
    }
  })();
  const followersCountPromise = (async () => {
    try {
      return await loadFollowerCount(uid);
    } catch (error) {
      console.warn("Follower count is not publicly available for this user.", error);
      return null;
    }
  })();
  const [profile, commentSnapshotResult, bookmarksCount, followersCount] = await Promise.all([
    profilePromise,
    commentSnapshotPromise,
    bookmarksCountPromise,
    followersCountPromise,
  ]);
  const readingStats = asRecord(profile.readingStats);
  const progressBySlug = asRecord(readingStats.progress);
  const storedProgress = Object.values(progressBySlug)
    .map(parseProgressItem)
    .filter((item): item is ReadingProgressItem => item !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt);
  const progress = mergeReadingProgressFromHistory(storedProgress, profile.readingHistory);
  const activityByDate = asRecord(readingStats.activity);
  const activity = getLastSevenUtcDates().map((date) => ({
    date,
    chapters: numberValue(asRecord(activityByDate[date]).chapters),
  }));
  const activityTotal = Object.values(activityByDate).reduce<number>(
    (total, day) => total + numberValue(asRecord(day).chapters),
    0,
  );
  const historyTotal = Array.isArray(profile.readingHistory)
    ? profile.readingHistory.length
    : numberValue(profile.readingHistoryCount);
  const totalChaptersRead = Math.max(
    numberValue(readingStats.totalChaptersRead),
    activityTotal,
    historyTotal,
  );

  const commentHistory: CommentHistoryItem[] = [];
  let commentHistoryError = commentSnapshotResult.error;
  const commentHistoryLimitReached =
    commentSnapshotResult.snapshot?.docs?.length === COMMENT_HISTORY_LIMIT;
  if (commentSnapshotResult.snapshot) {
    try {
      commentSnapshotResult.snapshot.forEach((document) => {
        const data = document.data();
        if (stringValue(data.uid) !== uid) return;
        const postId = document.ref?.parent.parent?.id;
        if (!postId) return;
        const imageUrl = imageUrlValue(data.image);
        commentHistory.push({
          id: document.id,
          text: stringValue(data.text),
          hasImage: Boolean(data.image),
          imageUrl,
          createdAt: timestampValue(data.date),
          isReply: Boolean(data.parentId),
          linkTitle: getCommentLinkTitle(postId, data.postTitle, data.postUrl, profile),
          threadUrl: getCommentThreadUrl(postId, data.postUrl, profile),
        });
      });
      commentHistory.sort((left, right) => right.createdAt - left.createdAt);
    } catch (error) {
      console.warn("Comment history could not be loaded for this user.", error);
      commentHistoryError = error instanceof Error ? error.message : "Comment history could not be loaded.";
    }
  }

  return {
    profile,
    progress,
    activity,
    totalChaptersRead,
    bookmarksCount,
    followersCount,
    commentHistory,
    commentHistoryError,
    commentHistoryLimitReached,
  };
}
