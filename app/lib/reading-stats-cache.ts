import type { PublicReadingStats, ReaderStatsInput } from "../../lib/reading-stats";

const DB_NAME = "mikoroku-v2";
const DB_VERSION = 1;
const STORE_STATS = "readingStats";
const STORE_MEDALS = "medalUnlocks";

export const READING_STATS_CACHE_TTL_MS = 1000 * 60 * 30;
type StatsCacheRecord = {
  uid: string;
  savedAt: number;
  data: PublicReadingStats;
};

type MedalCacheRecord = {
  key: "unlocked" | "unlocked-comments";
  chapters: number[];
  updatedAt: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCachedStatsData(value: unknown): value is PublicReadingStats {
  if (!isRecord(value) || !isRecord(value.profile)) return false;
  if (
    !Array.isArray(value.progress) ||
    !value.progress.every((item) =>
      isRecord(item) &&
      typeof item.slug === "string" &&
      typeof item.title === "string" &&
      typeof item.cover === "string" &&
      (item.kind === "manga" || item.kind === "novel") &&
      typeof item.chapter === "string" &&
      typeof item.chapterTitle === "string" &&
      isFiniteNumber(item.chapterProgress) &&
      isFiniteNumber(item.seriesProgress) &&
      isFiniteNumber(item.chapterPosition) &&
      isFiniteNumber(item.chapterCount) &&
      typeof item.source === "string" &&
      isFiniteNumber(item.updatedAt),
    )
  ) return false;
  if (
    !Array.isArray(value.activity) ||
    !value.activity.every((day) =>
      isRecord(day) &&
      typeof day.date === "string" &&
      isFiniteNumber(day.chapters),
    )
  ) return false;
  if (
    !isFiniteNumber(value.totalChaptersRead) ||
    !(value.bookmarksCount === null || isFiniteNumber(value.bookmarksCount)) ||
    !(value.followersCount === null || isFiniteNumber(value.followersCount)) ||
    typeof value.commentHistoryError !== "string" ||
    typeof value.commentHistoryLimitReached !== "boolean" ||
    !Array.isArray(value.commentHistory) ||
    !value.commentHistory.every((comment) =>
      isRecord(comment) &&
      typeof comment.id === "string" &&
      typeof comment.text === "string" &&
      typeof comment.hasImage === "boolean" &&
      typeof comment.imageUrl === "string" &&
      isFiniteNumber(comment.createdAt) &&
      typeof comment.isReply === "boolean" &&
      typeof comment.linkTitle === "string" &&
      typeof comment.threadUrl === "string",
    )
  ) return false;

  return true;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_STATS)) {
        db.createObjectStore(STORE_STATS, { keyPath: "uid" });
      }
      if (!db.objectStoreNames.contains(STORE_MEDALS)) {
        db.createObjectStore(STORE_MEDALS, { keyPath: "key" });
      }
    };
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

/* ───────────────────────────── Reading stats cache ───────────────────────────── */

export async function getCachedReadingStats(
  uid: string,
): Promise<{ data: PublicReadingStats; savedAt: number; stale: boolean } | null> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_STATS, "readonly");
      const store = tx.objectStore(STORE_STATS);
      const record: unknown = await idbRequest(store.get(uid));
      if (
        !isRecord(record) ||
        record.uid !== uid ||
        !isFiniteNumber(record.savedAt) ||
        !isCachedStatsData(record.data)
      ) return null;
      const age = Date.now() - record.savedAt;
      return {
        data: record.data,
        savedAt: record.savedAt,
        stale: age < 0 || age >= READING_STATS_CACHE_TTL_MS,
      };
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function setCachedReadingStats(
  uid: string,
  data: PublicReadingStats,
  refreshAge = true,
): Promise<void> {
  try {
    const previous = refreshAge ? null : await getCachedReadingStats(uid);
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_STATS, "readwrite");
      const store = tx.objectStore(STORE_STATS);
      const record: StatsCacheRecord = {
        uid,
        savedAt: previous?.savedAt || Date.now(),
        data,
      };
      await idbRequest(store.put(record));
    } finally {
      db.close();
    }
  } catch {
    // non-fatal
  }
}

export async function updateCachedReaderStats(
  uid: string,
  input: ReaderStatsInput,
  recordChapterActivity: boolean,
): Promise<number | null> {
  const cached = await getCachedReadingStats(uid);
  if (!cached) return null;

  const now = new Date();
  const updatedAt = now.toISOString();
  const seriesProgress = input.chapterCount > 0 && input.chapterPosition > 0
    ? Math.max(0, Math.min(100, ((input.chapterPosition - 1 + input.chapterProgress / 100) / input.chapterCount) * 100))
    : input.chapterProgress;
  const progressItem = {
    slug: input.slug,
    title: input.title,
    cover: input.cover,
    kind: input.kind,
    chapter: input.chapter,
    chapterTitle: input.chapterTitle,
    chapterProgress: input.chapterProgress,
    seriesProgress,
    chapterPosition: input.chapterPosition,
    chapterCount: input.chapterCount,
    source: input.source || "",
    updatedAt: Date.parse(updatedAt),
  };
  const profile = cached.data.profile;
  const readingStats = profile.readingStats && typeof profile.readingStats === "object"
    ? profile.readingStats as Record<string, unknown>
    : {};
  const progress = readingStats.progress && typeof readingStats.progress === "object"
    ? readingStats.progress as Record<string, unknown>
    : {};
  const nextReadingStats = {
    ...readingStats,
    progress: { ...progress, [encodeURIComponent(input.slug)]: progressItem },
    ...(recordChapterActivity ? {
      totalChaptersRead: cached.data.totalChaptersRead + 1,
    } : {}),
  };
  const nextData: PublicReadingStats = {
    ...cached.data,
    profile: { ...profile, readingStats: nextReadingStats },
    progress: [
      progressItem,
      ...cached.data.progress.filter((item) => item.slug !== input.slug),
    ].sort((left, right) => right.updatedAt - left.updatedAt),
    totalChaptersRead: cached.data.totalChaptersRead + (recordChapterActivity ? 1 : 0),
  };

  await setCachedReadingStats(uid, nextData, false);
  return nextData.totalChaptersRead;
}

export async function setCachedBookmarkCount(uid: string, count: number): Promise<void> {
  if (!Number.isFinite(count) || count < 0) return;
  const cached = await getCachedReadingStats(uid);
  if (!cached) return;
  await setCachedReadingStats(uid, {
    ...cached.data,
    bookmarksCount: Math.floor(count),
  }, false);
}

export async function clearCachedReadingStats(uid?: string): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_STATS, "readwrite");
      const store = tx.objectStore(STORE_STATS);
      if (uid) await idbRequest(store.delete(uid));
      else await idbRequest(store.clear());
    } finally {
      db.close();
    }
  } catch {
    // non-fatal
  }
}

/* ───────────────────────────── Medal unlock cache ───────────────────────────── */

const LOCAL_STORAGE_MEDAL_KEY = "mikoroku:unlocked-medals";
const LOCAL_STORAGE_COMMENT_MEDAL_KEY = "mikoroku:unlocked-comment-medals";

async function getUnlockedMilestones(key: MedalCacheRecord["key"], localStorageKey: string): Promise<number[]> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_MEDALS, "readonly");
      const record = (await idbRequest(tx.objectStore(STORE_MEDALS).get(key))) as MedalCacheRecord | undefined;
      if (record && Array.isArray(record.chapters)) {
        return record.chapters.filter((n) => typeof n === "number" && Number.isFinite(n));
      }
    } finally {
      db.close();
    }
  } catch {
  }
  try {
    const raw = localStorage.getItem(localStorageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
      : [];
  } catch {
    return [];
  }
}

async function setUnlockedMilestones(
  key: MedalCacheRecord["key"],
  localStorageKey: string,
  milestones: number[],
): Promise<void> {
  const unique = [...new Set(milestones)].sort((a, b) => a - b);
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_MEDALS, "readwrite");
      await idbRequest(tx.objectStore(STORE_MEDALS).put({
        key,
        chapters: unique,
        updatedAt: Date.now(),
      } satisfies MedalCacheRecord));
      return;
    } finally {
      db.close();
    }
  } catch {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(unique));
    } catch {
      // ignore
    }
  }
}

export async function getUnlockedMedals(): Promise<number[]> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_MEDALS, "readonly");
      const store = tx.objectStore(STORE_MEDALS);
      const record = (await idbRequest(store.get("unlocked"))) as MedalCacheRecord | undefined;
      if (record && Array.isArray(record.chapters)) {
        return record.chapters.filter((n) => typeof n === "number" && Number.isFinite(n));
      }
    } finally {
      db.close();
    }
  } catch {
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MEDAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const chapters = Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
      : [];
    if (chapters.length) {
      await setUnlockedMedals(chapters);
      localStorage.removeItem(LOCAL_STORAGE_MEDAL_KEY);
    }
    return chapters;
  } catch {
    return [];
  }
}

export function getUnlockedCommentMedals(): Promise<number[]> {
  return getUnlockedMilestones("unlocked-comments", LOCAL_STORAGE_COMMENT_MEDAL_KEY);
}

export function setUnlockedCommentMedals(comments: number[]): Promise<void> {
  return setUnlockedMilestones("unlocked-comments", LOCAL_STORAGE_COMMENT_MEDAL_KEY, comments);
}

export async function setUnlockedMedals(chapters: number[]): Promise<void> {
  const unique = [...new Set(chapters)].sort((a, b) => a - b);
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_MEDALS, "readwrite");
      const store = tx.objectStore(STORE_MEDALS);
      const record: MedalCacheRecord = {
        key: "unlocked",
        chapters: unique,
        updatedAt: Date.now(),
      };
      await idbRequest(store.put(record));
    } finally {
      db.close();
    }
  } catch {
    try {
      localStorage.setItem(LOCAL_STORAGE_MEDAL_KEY, JSON.stringify(unique));
    } catch {
      // ignore
    }
  }
}

export async function clearUnlockedMedals(): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_MEDALS, "readwrite");
      await idbRequest(tx.objectStore(STORE_MEDALS).delete("unlocked"));
    } finally {
      db.close();
    }
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LOCAL_STORAGE_MEDAL_KEY);
  } catch {
    // ignore
  }
}
