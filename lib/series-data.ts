/**
 * Server-side helpers for series detail.
 * Goal: give the page enough data for first paint without extra client round-trips.
 *
 * Adapt the catalog / KV accessors to your existing helpers
 * (fetchMangaMetadataPayload, MIKOROKU_V2_CACHE, public/catalog/metadata.json, etc.).
 */

import { CacheKeys, kvGet, kvSet } from "./kv-cache";
import catalog from "../public/catalog/metadata.json";

export type ChapterLink = {
  id?: string;
  chapterId?: string;
  num: string | number;
  title?: string;
  url?: string;
  slug?: string;
  date?: string;
  thumbnail?: string;
  source?: "blogger" | "blogger2" | "firestore";
  order?: number;
};

export type SeriesManga = {
  slug: string;
  title: string;
  img?: string;
  cover?: string;
  desc?: string;
  genres?: string[];
  status?: string;
  type?: string;
  rating?: number | string | null;
  altTitle?: string;
  author?: string;
  artist?: string;
  publication?: string;
  serialization?: string;
  demographic?: string | string[];
  series?: string;
  characters?: string | string[];
  group?: string;
  circle?: string;
  femaleTags?: string | string[];
  maleTags?: string | string[];
  nsfw?: boolean;
  updatedAt?: string | number;
  latestUpdate?: string | number;
  source?: string;
  [key: string]: unknown;
};

export type SeriesChapterSummary = ChapterLink;

export type SeriesInitialData = {
  manga: SeriesManga | null;
  chapters: SeriesChapterSummary[];
  chapterSource: "blogger" | "blogger2" | "firestore" | "cache";
  chaptersManaged: boolean;
  fromCache: boolean;
};

const CHAPTER_SUMMARY_TTL = 60 * 60 * 24 * 30;
const FIRESTORE_BASE =
  "https://firestore.googleapis.com/v1/projects/mikoroku/databases/(default)/documents";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Resolve manga record from the static catalog export.
 * In production you should prefer the KV-backed catalog
 * (`/api/catalog/metadata` or Worker cache) and only fall back here.
 */
export function getMangaFromCatalog(slug: string): SeriesManga | null {
  const list = (catalog as { manga?: Array<Record<string, unknown>> }).manga ?? [];
  const found = list.find((record) => {
    const recordSlug = asString(record.slug || record.id);
    return (
      recordSlug === slug ||
      normalizeSlug(asString(record.title)) === slug ||
      asString(record.id) === slug
    );
  });

  if (!found) return null;

  const metadata =
    found.metadata && typeof found.metadata === "object" && !Array.isArray(found.metadata)
      ? found.metadata as Record<string, unknown>
      : {};
  const cover = asString(
    found.img || found.cover || found.image || found.thumbnail || metadata.cover,
  );
  const publication = asString(
    found.publication || metadata.publication || found.year || metadata.year,
  );
  const serialization = asString(found.serialization || metadata.serialization);
  const series = asString(found.series || metadata.series);
  const characters = found.characters ?? metadata.characters;
  const group = asString(found.group || metadata.group);
  const circle = asString(found.circle || metadata.circle);
  const femaleTags = found.femaleTags ?? metadata.femaleTags;
  const maleTags = found.maleTags ?? metadata.maleTags;

  return {
    slug: asString(found.slug || found.id, slug),
    title: asString(found.title, slug),
    img: cover,
    cover,
    desc: asString(
      found.desc ||
        metadata.desc ||
        metadata.description ||
        found.description,
    ),
    genres: Array.isArray(found.genres)
      ? found.genres.map((g) => asString(g))
      : asString(found.genre)
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
    status: asString(found.status || metadata.status, "UNKNOWN"),
    type: asString(found.type || metadata.type, "Manga"),
    rating: (found.rating ?? metadata.rating) as number | string | null,
    altTitle: asString(found.altTitle || metadata.altTitle),
    author: asString(found.author || metadata.author, "-"),
    artist: asString(found.artist || metadata.artist, "-"),
    publication,
    serialization,
    demographic: (found.demographic ?? metadata.demographic) as string | string[] | undefined,
    series,
    characters: characters as string | string[] | undefined,
    group,
    circle,
    femaleTags: femaleTags as string | string[] | undefined,
    maleTags: maleTags as string | string[] | undefined,
    info: { publication, serialization, series, characters, group, circle },
    nsfw: Boolean(found.nsfw ?? metadata.nsfw),
    updatedAt: (found.updatedAt ?? found.latestUpdate) as string | number | undefined,
    latestUpdate: (found.latestUpdate ?? found.updatedAt) as string | number | undefined,
    source: asString(found.source),
  };
}

/**
 * Lightweight chapter list for first paint.
 * Read managed summaries from KV first, then the lightweight Firestore collection.
 *
 * IMPORTANT: do NOT call external Blogger with full=1 on the server
 * for every page view — that is what burns Workers quota.
 */
export async function getChapterSummaries(
  slug: string,
): Promise<{
  chapters: SeriesChapterSummary[];
  source: SeriesInitialData["chapterSource"];
  managed: boolean;
}> {
  const cacheKey = CacheKeys.chapterSummary(slug);
  try {
    const cached = await kvGet<SeriesChapterSummary[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      const chapters = cached.map((chapter) => ({
        ...chapter,
        id: chapter.source === "firestore"
          ? chapter.chapterId || String(chapter.num)
          : chapter.id,
      }));
      return {
        chapters,
        source: chapters.length ? "firestore" : "cache",
        managed: chapters.length > 0,
      };
    }
  } catch (error) {
    console.warn(`Chapter summary KV cache could not be read for ${slug}.`, error);
  }

  let chapters: SeriesChapterSummary[] = [];
  try {
    const response = await fetch(
      `${FIRESTORE_BASE}/manga/${encodeURIComponent(slug)}/chapterLinks?pageSize=1000`,
      { cache: "no-store" },
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`Firestore chapter summary returned HTTP ${response.status}.`);
    }
    if (response.ok) {
      const payload = await response.json() as {
        documents?: Array<{ name?: string; fields?: Record<string, unknown> }>;
      };
      chapters = (payload.documents || []).flatMap((document) => {
        const fields = document.fields || {};
        const read = (key: string): unknown => {
          const value = fields[key];
          if (!value || typeof value !== "object") return undefined;
          const field = value as Record<string, unknown>;
          if ("stringValue" in field) return field.stringValue;
          if ("integerValue" in field) return Number(field.integerValue);
          if ("doubleValue" in field) return Number(field.doubleValue);
          if ("timestampValue" in field) return field.timestampValue;
          return undefined;
        };
        const num = read("num");
        if (typeof num !== "string" && typeof num !== "number") return [];
        const source = read("source");
        const chapterId = read("chapterId");
        const chapter: SeriesChapterSummary = {
          id: source === "firestore"
            ? String(chapterId || num)
            : String(read("id") || document.name?.split("/").pop() || num),
          chapterId: typeof chapterId === "string" ? chapterId : undefined,
          num,
          title: typeof read("title") === "string" ? read("title") as string : undefined,
          url: typeof read("url") === "string" ? read("url") as string : undefined,
          slug: typeof read("slug") === "string" ? read("slug") as string : undefined,
          date: typeof read("date") === "string" ? read("date") as string : undefined,
          thumbnail: typeof read("thumbnail") === "string" ? read("thumbnail") as string : undefined,
          source: source === "blogger" || source === "blogger2" ? source : "firestore",
          order: Number(read("order") || 0),
        };
        return [chapter];
      }).sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
    }
  } catch (error) {
    console.warn(`Managed chapter summaries could not be loaded for ${slug}.`, error);
  }

  try {
    await kvSet(cacheKey, chapters, chapters.length ? CHAPTER_SUMMARY_TTL : 300);
  } catch (error) {
    console.warn(`Chapter summary KV cache could not be updated for ${slug}.`, error);
  }
  return {
    chapters,
    source: chapters.length ? "firestore" : "cache",
    managed: chapters.length > 0,
  };
}

/**
 * Single entry used by the Server Component page.
 */
export async function getSeriesInitialData(slug: string): Promise<SeriesInitialData> {
  const manga = getMangaFromCatalog(slug);
  const { chapters, source, managed } = await getChapterSummaries(slug);

  return {
    manga,
    chapters,
    chapterSource: source,
    chaptersManaged: managed,
    fromCache: Boolean(manga),
  };
}
