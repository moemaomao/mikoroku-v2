interface KVNamespace {
  get(
    key: string,
    type?: "text" | "json" | "arrayBuffer" | "stream",
  ): Promise<any>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { expirationTtl?: number; expiration?: number; metadata?: any },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

function getKv(): KVNamespace | null {
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const env = ctx?.env as Record<string, unknown> | undefined;
    if (env?.MIKOROKU_V2_CACHE) {
      return env.MIKOROKU_V2_CACHE as KVNamespace;
    }
    if (env?.MIKOROKU_CACHE) {
      return env.MIKOROKU_CACHE as KVNamespace;
    }
  } catch {
    // ignore
  }

  const g = globalThis as any;
  const env = g.env || g.__env__;
  return (
    (env?.MIKOROKU_V2_CACHE as KVNamespace) ||
    (env?.MIKOROKU_CACHE as KVNamespace) ||
    null
  );
}

export async function kvGet<T = unknown>(
  key: string,
  type: "json" | "text" = "json",
): Promise<T | null> {
  const kv = getKv();
  if (!kv) return null;
  try {
    if (type === "json") return (await kv.get(key, "json")) as T | null;
    return (await kv.get(key, "text")) as T | null;
  } catch {
    return null;
  }
}

export async function kvGetArrayBuffer(key: string): Promise<ArrayBuffer | null> {
  const kv = getKv();
  if (!kv) return null;
  try {
    return (await kv.get(key, "arrayBuffer")) as ArrayBuffer | null;
  } catch {
    return null;
  }
}

export async function kvSet(
  key: string,
  value: unknown,
  ttlSeconds = 3600,
): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  const body = typeof value === "string" ? value : JSON.stringify(value);
  await kv.put(key, body, { expirationTtl: Math.max(60, ttlSeconds) });
}

export async function kvSetArrayBuffer(
  key: string,
  value: ArrayBuffer,
  ttlSeconds = 86400,
): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  await kv.put(key, value, { expirationTtl: Math.max(60, ttlSeconds) });
}

export async function kvDelete(key: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  await kv.delete(key);
}

export async function withKvCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await kvGet<T>(key);
  if (cached !== null && cached !== undefined) return cached;

  const fresh = await fetcher();
  if (fresh !== null && fresh !== undefined) {
    await kvSet(key, fresh, ttlSeconds);
  }
  return fresh;
}

export const CacheKeys = {
  mangaList: (page = 1) => `manga:list:p${page}`,
  hentaiList: (page = 1) => `hentai:list:p${page}`,
  seriesDetail: (slug: string) => `series:${slug}`,
  chapterList: (slug: string) => `chapters:${slug}`,
  /** Blogger chapter list by source + title (see lib/blogger-chapters.ts). */
  bloggerChapters: (source: string, title: string) =>
    `blogger:chapters:${source}:${title.trim().toLowerCase().replace(/\s+/g, " ")}`,
  genreList: () => `genres:all`,
  home: () => `home:latest`,
  ogSeries: (slug: string) => `og:series:${slug}`,
  ogChapter: (slug: string, chapter: string) => `og:chapter:${slug}:${chapter}`,
} as const;
