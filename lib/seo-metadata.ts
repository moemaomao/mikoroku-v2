/**
 * SEO metadata helpers — optimized for Cloudflare Workers free plan (~10ms CPU).
 *
 * Rules:
 * - NEVER parse all-manga.json on the request path (CPU bomb).
 * - Prefer KV SEO cache.
 * - Firestore only with short timeout; failures are soft.
 * - Instant slug fallback if everything misses.
 */

const FIRESTORE_DOCUMENTS_URL =
  "https://firestore.googleapis.com/v1/projects/mikoroku/databases/(default)/documents";
const COVER_BASE =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
const SERIES_SEO_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days sticky
const DEFAULT_IMAGE =
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s1000/MIKOROKU.png";

export type SeriesSeoData = {
  title: string;
  description: string;
  image: string;
  updatedAt?: number;
};

export type SeriesSeoCache = {
  title: string;
  description: string;
  image: string;
  updatedAt?: number;
};

function decodeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if ("stringValue" in record) return record.stringValue;
  if ("integerValue" in record) return Number(record.integerValue);
  if ("doubleValue" in record) return Number(record.doubleValue);
  if ("booleanValue" in record) return record.booleanValue;
  if ("nullValue" in record) return null;
  if ("arrayValue" in record) {
    const array = record.arrayValue as { values?: unknown[] } | undefined;
    return (array?.values || []).map(decodeFirestoreValue);
  }
  if ("mapValue" in record) {
    const map = record.mapValue as { fields?: Record<string, unknown> } | undefined;
    return Object.fromEntries(
      Object.entries(map?.fields || {}).map(([key, item]) => [key, decodeFirestoreValue(item)]),
    );
  }
  return record;
}

function decodeFirestoreDocument(document: {
  fields?: Record<string, unknown>;
}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document.fields || {}).map(([key, value]) => [
      key,
      decodeFirestoreValue(value),
    ]),
  );
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeImageUrl(value: unknown): string | undefined {
  const image = asText(value);
  if (!image) return undefined;

  try {
    if (/^https?:\/\//i.test(image)) {
      return new URL(image).href;
    }

    if (image.startsWith("cover/") || image.startsWith("/cover/")) {
      const path = image.replace(/^\/+/, "");
      const parts = path.split("/");
      const encoded = parts
        .map((part, index) =>
          index === parts.length - 1 ? encodeURIComponent(part) : part,
        )
        .join("/");
      return new URL(encoded, COVER_BASE).href;
    }

    return new URL(image, "https://mikoroku.top").href;
  } catch {
    return undefined;
  }
}

function slugKey(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fallbackTitle(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function pickCover(value: Record<string, unknown> | null | undefined): string | undefined {
  if (!value) return undefined;

  const direct =
    safeImageUrl(value.cover) ||
    safeImageUrl(value.img) ||
    safeImageUrl(value.image) ||
    safeImageUrl(value.thumbnail) ||
    safeImageUrl(value.thumb);
  if (direct) return direct;

  const covers = value.covers;
  if (Array.isArray(covers)) {
    for (const item of covers) {
      const url = safeImageUrl(item);
      if (url) return url;
    }
  }

  const info = value.info;
  if (info && typeof info === "object") {
    const record = info as Record<string, unknown>;
    return (
      safeImageUrl(record.cover) ||
      safeImageUrl(record.img) ||
      safeImageUrl(record.image) ||
      safeImageUrl(record.thumbnail)
    );
  }

  return undefined;
}

function normalizeSeries(
  value: Record<string, unknown> | null | undefined,
  slug: string,
): SeriesSeoData {
  const title =
    asText(value?.title) || asText(value?.name) || fallbackTitle(slug);
  const description =
    asText(value?.desc) ||
    asText(value?.description) ||
    asText(value?.synopsis) ||
    asText(value?.sinopsis) ||
    `Baca manga ${title} di Mikoroku.`;

  const updatedAtRaw = value?.updatedAt ?? value?.latestUpdate;
  let updatedAt: number | undefined;
  if (typeof updatedAtRaw === "number" && Number.isFinite(updatedAtRaw)) {
    updatedAt = updatedAtRaw;
  } else if (typeof updatedAtRaw === "string") {
    const n = Number(updatedAtRaw);
    if (Number.isFinite(n)) updatedAt = n;
  }

  return {
    title,
    description: description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300),
    image: pickCover(value) || DEFAULT_IMAGE,
    updatedAt,
  };
}

export function seoCacheKey(slug: string): string {
  return `seo:series:${slug}`;
}

/** @deprecated */
export function coverOverrideKey(slug: string): string {
  return seoCacheKey(slug);
}

async function readSeoCache(slug: string): Promise<SeriesSeoCache | null> {
  try {
    const { kvGet } = await import("./kv-cache");
    const data = await kvGet<SeriesSeoCache & { cover?: string }>(seoCacheKey(slug));
    if (!data) return null;

    const image =
      (typeof data.image === "string" && data.image.startsWith("http") && data.image) ||
      (typeof data.cover === "string" && data.cover.startsWith("http") && data.cover) ||
      "";

    if (!image && !data.title) return null;

    const title =
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : "";

    const description =
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim().slice(0, 300)
        : title
          ? `Baca manga ${title} di Mikoroku.`
          : "";

    return {
      title: title || fallbackTitle(slug),
      description: description || `Baca manga ${title || fallbackTitle(slug)} di Mikoroku.`,
      image: image || DEFAULT_IMAGE,
      updatedAt:
        typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt)
          ? data.updatedAt
          : undefined,
    };
  } catch {
    return null;
  }
}

function mergeSeoCache(
  series: SeriesSeoData,
  cache: SeriesSeoCache | null,
): SeriesSeoData {
  if (!cache) return series;
  return {
    title: cache.title || series.title,
    description: cache.description || series.description,
    image: cache.image || series.image,
    updatedAt: cache.updatedAt ?? series.updatedAt ?? Date.now(),
  };
}

async function cacheResolvedSeries(
  slug: string,
  series: SeriesSeoData,
  cache: SeriesSeoCache | null,
): Promise<SeriesSeoData> {
  const resolved = mergeSeoCache(series, cache);
  if (cache?.image && cache.image !== DEFAULT_IMAGE) return resolved;
  if (resolved.image === DEFAULT_IMAGE && !resolved.title) return resolved;

  try {
    const { kvSet } = await import("./kv-cache");
    await kvSet(seoCacheKey(slug), resolved, SERIES_SEO_CACHE_TTL);
  } catch {
  }
  return resolved;
}

async function getFirestoreDocumentFast(
  path: string,
  timeoutMs = 1200,
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${FIRESTORE_DOCUMENTS_URL}/${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (response.status === 404) return null;
    if (!response.ok) return null;
    return decodeFirestoreDocument(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getSeriesSeoData(slug: string): Promise<SeriesSeoData> {
  const cache = await readSeoCache(slug);

  if (cache?.title && cache?.image && cache.image !== DEFAULT_IMAGE) {
    return {
      title: cache.title,
      description: cache.description,
      image: cache.image,
      updatedAt: cache.updatedAt,
    };
  }

  if (cache?.title) {
    return {
      title: cache.title,
      description: cache.description || `Baca manga ${cache.title} di Mikoroku.`,
      image: cache.image || DEFAULT_IMAGE,
      updatedAt: cache.updatedAt,
    };
  }

  const document = await getFirestoreDocumentFast(
    `manga/${encodeURIComponent(slug)}`,
    1200,
  );
  if (document) {
    return cacheResolvedSeries(slug, normalizeSeries(document, slug), cache);
  }

  return mergeSeoCache(normalizeSeries({ title: fallbackTitle(slug) }, slug), cache);
}

export async function getSeriesSeoDataForOg(slug: string): Promise<SeriesSeoData> {
  const cache = await readSeoCache(slug);

  if (cache?.title && cache?.image) {
    return {
      title: cache.title,
      description: cache.description,
      image: cache.image,
      updatedAt: cache.updatedAt,
    };
  }

  const document = await getFirestoreDocumentFast(
    `manga/${encodeURIComponent(slug)}`,
    800,
  );
  if (document) {
    return cacheResolvedSeries(slug, normalizeSeries(document, slug), cache);
  }

  if (cache?.image || cache?.title) {
    return {
      title: cache.title || fallbackTitle(slug),
      description: cache.description || `Baca manga di Mikoroku.`,
      image: cache.image || DEFAULT_IMAGE,
      updatedAt: cache.updatedAt ?? Date.now(),
    };
  }

  return normalizeSeries({ title: fallbackTitle(slug) }, slug);
}

export async function getChapterSeoTitle(
  slug: string,
  chapter: string,
): Promise<{ title: string; description: string; image: string; updatedAt?: number }> {
  const series = await getSeriesSeoData(slug);
  let chapterTitle = `Chapter ${chapter}`;
  let description = `Baca ${chapterTitle} ${series.title} di Mikoroku.`;

  return {
    title: `${chapterTitle} - ${series.title} - Mikoroku`,
    description: description.slice(0, 300),
    image: series.image,
    updatedAt: series.updatedAt,
  };
}

export function defaultSocialImage(): string {
  return DEFAULT_IMAGE;
}
