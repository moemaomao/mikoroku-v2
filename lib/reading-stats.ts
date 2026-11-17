import { loadFollowerCount } from "./user-following";
import { loadUserStatsProfile } from "./user-stats-cache";

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

type StatsFirestore = {
  collection: (name: string) => StatsCollection;
  collectionGroup?: (name: string) => StatsQuery;
  runTransaction?: <T>(
    updateFunction: (transaction: StatsTransaction) => Promise<T>,
  ) => Promise<T>;
};

type StatsFirebase = {
  auth?: () => { currentUser: StatsUser | null };
  firestore?: (() => StatsFirestore) & {
    FieldValue?: { increment?: (value: number) => unknown };
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

export async function saveReaderStats(
  input: ReaderStatsInput,
  recordChapterActivity: boolean,
  onOptimisticUpdate?: (uid: string, activityDate: string) => void,
  onSynced?: (uid: string, activityDate: string) => void,
): Promise<boolean> {
  const sdk = getStatsWindow().firebase;
  const user = getStatsWindow().currentUser || sdk?.auth?.().currentUser;
  if (!user?.uid) return false;
  const activityDate = utcDateKey(new Date());
  onOptimisticUpdate?.(user.uid, activityDate);
  if (!sdk) return false;

  const now = new Date().toISOString();
  const chapterProgress = clampPercentage(input.chapterProgress);
  const seriesProgress = input.chapterCount > 0 && input.chapterPosition > 0
    ? clampPercentage(((input.chapterPosition - 1 + chapterProgress / 100) / input.chapterCount) * 100)
    : chapterProgress;
  const readingStats: Record<string, unknown> = {
    progress: {
      [safeDocumentId(input.slug)]: {
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
        updatedAt: now,
      },
    },
  };

  if (recordChapterActivity) {
    const increment = sdk.firestore?.FieldValue?.increment;
    if (typeof increment !== "function") {
      throw new Error("Firestore atomic increment is unavailable.");
    }
    readingStats.activity = {
      [activityDate]: { chapters: increment(1) },
    };
    readingStats.totalChaptersRead = increment(1);
  }

  const firestore = await waitForFirestore();
  const userReference = firestore.collection("userStats").doc(user.uid);
  void userReference.set({ readingStats }, { merge: true }).then(() => {
    if (recordChapterActivity) onSynced?.(user.uid, activityDate);
  }, (error: unknown) => {
    console.error("Reading stats are queued locally but could not be synchronized yet.", error);
  });

  if (recordChapterActivity) window.dispatchEvent(new Event("mikoroku:reading-stats-updated"));
  return true;
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

  const firestore = await waitForFirestore();
  if (!firestore.runTransaction) {
    throw new Error("Firestore transactions are unavailable.");
  }
  const reference = firestore.collection("userStats").doc(uid);
  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const activeUser = firebase.auth?.().currentUser || getStatsWindow().currentUser;
    if (activeUser?.uid !== uid) {
      throw new Error("The signed-in account changed during chapter count recovery.");
    }
    const profile = snapshot.exists ? snapshot.data() || {} : {};
    const readingStats = asRecord(profile.readingStats);
    if (numberValue(readingStats.totalChaptersRead) >= minimum) return false;
    transaction.set(
      reference,
      { readingStats: { totalChaptersRead: minimum } },
      { merge: true },
    );
    return true;
  });
}

export async function syncLocalReadMarksWithUser(uid: string): Promise<void> {
  if (!uid) throw new Error("A signed-in user is required to synchronize local read marks.");
  const firebase = getStatsWindow().firebase;
  const user = firebase?.auth?.().currentUser || getStatsWindow().currentUser;
  if (user?.uid !== uid) {
    throw new Error("The signed-in account changed during local read mark synchronization.");
  }

  const localReadMarks = getLocalReadMarksCount();
  if (localReadMarks > 0) {
    await preserveLifetimeChapterCount(uid, localReadMarks);
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
      bookmarks.forEach(() => { count += 1; });
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
  const progress = Object.values(progressBySlug)
    .map(parseProgressItem)
    .filter((item): item is ReadingProgressItem => item !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt);
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
