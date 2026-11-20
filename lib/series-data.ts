/**
 * Server-side helpers for series detail.
 * Goal: give the page enough data for first paint without extra client round-trips.
 *
 * Adapt the catalog / KV accessors to your existing helpers
 * (fetchMangaMetadataPayload, MIKOROKU_V2_CACHE, public/catalog/metadata.json, etc.).
 */

import catalog from "../public/catalog/metadata.json";

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

export type SeriesChapterSummary = {
  id?: string;
  num: string | number;
  title?: string;
  date?: string;
  source?: "blogger" | "blogger2" | "firestore";
  thumbnail?: string;
};

export type SeriesInitialData = {
  manga: SeriesManga | null;
  chapters: SeriesChapterSummary[];
  chapterSource: "blogger" | "blogger2" | "firestore" | "cache";
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
 * Lightweight chapter list for first paint.
 * Prefer reading from KV / shared chapter cache.
 * Falls back to empty array so the client can still fetch.
 *
 * IMPORTANT: do NOT call external Blogger with full=1 on the server
 * for every page view — that is what burns Workers quota.
 */
export async function getChapterSummaries(
  slug: string,
  title?: string,
): Promise<{ chapters: SeriesChapterSummary[]; source: SeriesInitialData["chapterSource"] }> {
  // --- Option A: read from your existing shared chapter cache (KV / memory) ---
  // Example (adapt to your real helper):
  //
  //   const cached = await readSharedChapterCache(slug);
  //   if (cached?.chapters?.length) {
  //     return {
  //       chapters: cached.chapters.map((c) => ({
  //         id: c.id,
  //         num: c.num,
  //         title: c.title,
  //         date: c.date || c.updatedAt,
  //         source: c.source,
  //         thumbnail: c.thumbnail,
  //       })),
  //       source: "cache",
  //     };
  //   }

  // --- Option B: optional cheap Worker API that only returns summaries ---
  // Keep timeout short. Never block the whole page for more than ~400ms.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 400);

    const params = new URLSearchParams({
      title: title || slug,
      source: "blogger",
      // summary-only endpoint if you have one; otherwise omit full=1
      // full: "0",
    });

    // Use absolute URL only when running on the edge with a known origin,
    // or call your internal cache helper instead of fetch.
    // const res = await fetch(`${origin}/api/blogger/chapters?${params}`, {
    //   signal: controller.signal,
    //   next: { revalidate: 600 },
    // });

    clearTimeout(timeout);
    // if (res?.ok) { ... map to SeriesChapterSummary[] ... }
  } catch {
    // swallow — client will fetch
  }

  return { chapters: [], source: "cache" };
}

/**
 * Single entry used by the Server Component page.
 */
export async function getSeriesInitialData(slug: string): Promise<SeriesInitialData> {
  const manga = getMangaFromCatalog(slug);
  const { chapters, source } = await getChapterSummaries(slug, manga?.title);

  return {
    manga,
    chapters,
    chapterSource: source,
    fromCache: Boolean(manga),
  };
}
