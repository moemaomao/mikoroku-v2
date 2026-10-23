const CHAPTER_CACHE_PREFIX = "chapters_";
const CHAPTER_CACHE_TTL = 30 * 60 * 1000;
const MAX_CACHED_CHAPTERS_PER_SERIES = 200;
const MAX_CHAPTER_CACHE_ENTRY_BYTES = 128 * 1024;
const MAX_TOTAL_CHAPTER_CACHE_BYTES = 1024 * 1024;

const cachedChapterFields = [
  "id",
  "num",
  "chapter",
  "title",
  "label",
  "postTitle",
  "thumbnail",
  "url",
  "source",
  "createdAt",
  "updatedAt",
  "date",
  "timestamp",
  "order",
  "isNovel",
] as const;

function compactChapterRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((record): record is Record<string, unknown> =>
      !!record && typeof record === "object" && !Array.isArray(record) && record.isDraft !== true,
    )
    .map((record) => Object.fromEntries(
      cachedChapterFields.flatMap((field) =>
        record[field] === undefined ? [] : [[field, record[field]]],
      ),
    ))
    .slice(0, MAX_CACHED_CHAPTERS_PER_SERIES);
}

export function compactChapterCache(records: unknown): Record<string, unknown>[] {
  return compactChapterRecords(records);
}

export function pruneStoredChapterCaches(): void {
  try {
    const keys = Object.keys(localStorage)
      .filter((key) => key.startsWith(CHAPTER_CACHE_PREFIX));
    const now = Date.now();
    const entries = keys.flatMap((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        const cached = parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed as { time?: unknown; data?: unknown }
          : null;
        const time = typeof cached?.time === "number" ? cached.time : 0;
        if (!cached || !Array.isArray(cached.data) || now - time >= CHAPTER_CACHE_TTL) return [];

        const data = compactChapterRecords(cached.data);
        const compacted = JSON.stringify({ time, data });
        const bytes = compacted.length * 2;
        if (!data.length || bytes > MAX_CHAPTER_CACHE_ENTRY_BYTES) return [];
        return [{ key, time, compacted, bytes }];
      } catch (error) {
        console.warn(`Stored chapter cache ${key} is invalid and will be removed.`, error);
        return [];
      }
    }).sort((left, right) => right.time - left.time);

    keys.forEach((key) => localStorage.removeItem(key));
    let retainedBytes = 0;
    for (const entry of entries) {
      if (retainedBytes + entry.bytes > MAX_TOTAL_CHAPTER_CACHE_BYTES) continue;
      try {
        localStorage.setItem(entry.key, entry.compacted);
        retainedBytes += entry.bytes;
      } catch (error) {
        console.warn("The browser quota prevented restoring a compacted chapter cache.", error);
        break;
      }
    }
  } catch (error) {
    console.warn("Stored chapter caches could not be compacted before Firestore initialization.", error);
  }
}
