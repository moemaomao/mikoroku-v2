/**
 * Server-side helpers for series detail.
 * Goal: give the page enough data for first paint without extra client round-trips.
 *
 * Adapt the catalog / KV accessors to your existing helpers
 * (fetchMangaMetadataPayload, MIKOROKU_V2_CACHE, public/catalog/metadata.json, etc.).
 */

import catalog from "../public/catalog/metadata.json";
import chapterSummaryCatalog from "../public/catalog/chapter-summaries.json";
import { CacheKeys, kvGet } from "./kv-cache";

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
 * Load the published static archive. Blogger fills in newer chapters in the client.
 */
export async function getChapterSummaries(
  slug: string,
): Promise<{
  chapters: SeriesChapterSummary[];
  source: SeriesInitialData["chapterSource"];
  managed: boolean;
}> {
  const series = (chapterSummaryCatalog as {
    series?: Record<string, SeriesChapterSummary[]>;
  }).series;
  const cachedSummaries = await kvGet<unknown>(CacheKeys.chapterSummary(slug));
  const summaries = Array.isArray(cachedSummaries)
    ? cachedSummaries
    : Array.isArray(series?.[slug])
      ? series[slug]
      : [];
  const chapters = summaries
    .filter((chapter): chapter is SeriesChapterSummary =>
      !!chapter &&
      typeof chapter === "object" &&
      (typeof chapter.num === "string" || typeof chapter.num === "number"),
    )
    .filter((chapter) =>
      String(chapter.num).trim(),
    )
    .map((chapter, index) => ({
      ...chapter,
      id: chapter.source === "firestore"
        ? chapter.chapterId || String(chapter.num)
        : chapter.id || String(chapter.num),
      source: chapter.source === "blogger" || chapter.source === "blogger2"
        ? chapter.source
        : "firestore" as const,
      order: Number.isFinite(chapter.order) ? chapter.order : index,
    }));
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
