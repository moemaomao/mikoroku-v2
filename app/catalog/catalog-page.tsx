"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SiteChrome from "../site-chrome";
import { CoverImage } from "../lib/cover-image";
import "./catalog.css";

type Manga = {
  title?: string;
  name?: string;
  slug?: string;
  img?: string;
  cover?: string;
  type?: string;
  genre?: string | string[];
  genres?: string[];
  tags?: string[];
  labels?: string[];
  category?: string[];
  status?: string;
  updatedAt?: DateValue;
  latestUpdate?: DateValue;
  published?: string | number;
  updated?: string | number;
  createdAt?: string | number;
  timestamp?: string | number;
  lastUpdate?: string | number;
  date?: string | number;
  firestore?: boolean;
  source?: string;
  origin?: string;
  managedByAdmin?: boolean;
  isDraft?: boolean;
};

type CatalogKind = "manga" | "hentai" | "genre";
type SortOrder = "latest" | "az" | "za";
type DateValue = string | number | { toMillis?: () => number; seconds?: number };
type MangaDataWindow = Window & { mangaData?: Record<string, Manga> };

const datasetUrl = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json";
const githubRaw = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
const cacheKey = "mikoroku_catalog_v1";
const HOMEPAGE_LIGHT_CACHE = "mangaGithubLightCache";
const HOMEPAGE_FULL_CACHE = "mangaGithubCache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type SharedMangaCache = {
  list: Manga[] | null;
  promise: Promise<Manga[]> | null;
  loaded: boolean;
};

type CatalogWindow = Window & {
  mangaData?: Record<string, Manga>;
  githubMangaList?: Manga[];
  __mangaShared?: SharedMangaCache;
  loadSharedMangaList?: (refresh?: boolean) => Promise<Manga[]>;
};

function titleOf(manga: Manga): string {
  return manga.title || manga.name || "Untitled";
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function coerceTime(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 && value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "object") {
    const record = value as { toMillis?: () => number; seconds?: number };
    if (typeof record.toMillis === "function") {
      const ms = record.toMillis();
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof record.seconds === "number") return record.seconds * 1000;
  }
  if (typeof value === "string") {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 0) {
      return asNum < 1e12 ? asNum * 1000 : asNum;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function updateTime(manga: Manga): number {
  const values = [
    manga.updatedAt,
    manga.latestUpdate,
    manga.lastUpdate,
    manga.timestamp,
    manga.updated,
    manga.published,
    manga.createdAt,
    manga.date,
  ];
  let best = 0;
  for (const value of values) {
    const time = coerceTime(value);
    if (time > best) best = time;
  }
  return best;
}

function asMangaList(value: unknown): Manga[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Manga =>
      Boolean(item) &&
      typeof item === "object" &&
      (typeof (item as Manga).title === "string" || typeof (item as Manga).name === "string"),
  );
}

function readFsMetaMap(): Record<string, { updatedAt?: number; latestUpdate?: number; cover?: string; slug?: string; title?: string }> {
  try {
    const raw = JSON.parse(localStorage.getItem("mangaFsMetaCache") || "null") as {
      data?: Record<string, { updatedAt?: number; latestUpdate?: number; cover?: string; slug?: string; title?: string }>;
    } | null;
    return raw?.data && typeof raw.data === "object" ? raw.data : {};
  } catch {
    return {};
  }
}

function enrichWithFsMeta(list: Manga[]): Manga[] {
  const meta = readFsMetaMap();
  if (!Object.keys(meta).length) return list;

  const byTitle = new Map<string, (typeof meta)[string]>();
  for (const entry of Object.values(meta)) {
    if (entry?.title) byTitle.set(normalizedKey(entry.title), entry);
  }

  return list.map((manga) => {
    const slug = manga.slug || "";
    const hit = (slug && meta[slug]) || byTitle.get(normalizedKey(titleOf(manga))) || null;
    if (!hit) return manga;
    const updatedAt = coerceTime(hit.updatedAt) || coerceTime(hit.latestUpdate) || coerceTime(manga.updatedAt);
    const latestUpdate = coerceTime(hit.latestUpdate) || updatedAt || coerceTime(manga.latestUpdate);
    return {
      ...manga,
      slug: hit.slug || manga.slug,
      cover: hit.cover || manga.cover || manga.img,
      img: hit.cover || manga.img || manga.cover,
      updatedAt: updatedAt || manga.updatedAt,
      latestUpdate: latestUpdate || manga.latestUpdate,
      firestore: true,
      source: manga.source || "hybrid",
    };
  });
}

function sortByLatest(list: Manga[]): Manga[] {
  return [...list].sort((a, b) => {
    const diff = updateTime(b) - updateTime(a);
    if (diff !== 0) return diff;
    return titleOf(a).localeCompare(titleOf(b), "id", { sensitivity: "base" });
  });
}

function mergeCatalogData(primary: Manga[], additions: Manga[]): Manga[] {
  const merged = new Map<string, Manga>();
  for (const manga of primary) {
    const key = normalizedKey(titleOf(manga));
    if (key) merged.set(key, manga);
  }
  for (const manga of additions) {
    const key = normalizedKey(titleOf(manga));
    if (!key) continue;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, manga);
      continue;
    }
    const existingTime = updateTime(existing);
    const incomingTime = updateTime(manga);
    const newer = incomingTime >= existingTime ? manga : existing;
    const older = newer === manga ? existing : manga;
    merged.set(key, {
      ...older,
      ...newer,
      title: newer.title || newer.name || older.title || older.name,
      name: newer.name || older.name,
      slug: newer.slug || older.slug,
      img: newer.cover || newer.img || older.cover || older.img,
      cover: newer.cover || newer.img || older.cover || older.img,
      updatedAt: incomingTime >= existingTime ? (manga.updatedAt ?? existing.updatedAt) : (existing.updatedAt ?? manga.updatedAt),
      latestUpdate: incomingTime >= existingTime ? (manga.latestUpdate ?? existing.latestUpdate) : (existing.latestUpdate ?? manga.latestUpdate),
      lastUpdate: (manga as Manga).lastUpdate ?? (existing as Manga).lastUpdate,
      firestore: Boolean(existing.firestore || manga.firestore),
      managedByAdmin: Boolean(existing.managedByAdmin || manga.managedByAdmin),
      source: manga.source || existing.source,
      origin: manga.origin || existing.origin,
      genres: (Array.isArray(newer.genres) && newer.genres.length ? newer.genres : older.genres) || newer.genres || older.genres,
    });
  }
  return [...merged.values()];
}

function readInstantCatalog(): Manga[] {
  if (typeof window === "undefined") return [];
  const w = window as CatalogWindow;
  let list: Manga[] = [];

  if (w.__mangaShared?.list?.length) list = asMangaList(w.__mangaShared.list);
  else if (w.githubMangaList?.length) list = asMangaList(w.githubMangaList);
  else {
    try {
      const light = JSON.parse(localStorage.getItem(HOMEPAGE_LIGHT_CACHE) || "null") as {
        fullList?: unknown;
        list?: unknown;
      } | null;
      list = asMangaList(light?.fullList || light?.list);
    } catch { /* ignore */ }

    if (!list.length) {
      try {
        const full = JSON.parse(localStorage.getItem(HOMEPAGE_FULL_CACHE) || "null") as {
          data?: unknown;
        } | null;
        list = asMangaList(full?.data);
      } catch { /* ignore */ }
    }

    if (!list.length) {
      try {
        const cache = JSON.parse(localStorage.getItem(cacheKey) || "null") as {
          data?: unknown;
        } | null;
        list = asMangaList(cache?.data);
      } catch { /* ignore */ }
    }

    if (!list.length && w.mangaData && typeof w.mangaData === "object") {
      list = Object.values(w.mangaData).filter((m) => m && !m.isDraft) as Manga[];
    }
  }

  if (!list.length) return [];
  return sortByLatest(enrichWithFsMeta(list));
}

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function normalizeCover(value?: string): string {
  if (!value || value === "-") return "";
  return /^https?:\/\//i.test(value) ? value : githubRaw + value.replace(/^\/+/, "");
}

function mangaTags(manga: Manga): string[] {
  const values = [
    ...(Array.isArray(manga.genres) ? manga.genres : []),
    ...(Array.isArray(manga.tags) ? manga.tags : []),
    ...(Array.isArray(manga.labels) ? manga.labels : []),
    ...(Array.isArray(manga.category) ? manga.category : []),
    ...(Array.isArray(manga.genre) ? manga.genre : manga.genre ? [manga.genre] : []),
    manga.type || "",
  ];
  return values.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
}

function isAdultCatalog(manga: Manga): boolean {
  return mangaTags(manga).some((tag) =>
    ["hentai", "doujin", "smut", "adult"].some((term) => tag.includes(term)),
  );
}

function genresOf(manga: Manga): string[] {
  const candidates = [
    ...(Array.isArray(manga.genres) ? manga.genres : []),
    ...(Array.isArray(manga.genre) ? manga.genre : manga.genre ? [manga.genre] : []),
    ...(Array.isArray(manga.tags) ? manga.tags : []),
    ...(Array.isArray(manga.labels) ? manga.labels : []),
    ...(Array.isArray(manga.category) ? manga.category : []),
  ];
  const excluded = new Set(["ongoing", "completed", "hiatus", "dropped", "canceled", "manga", "manhwa", "manhua", "novel", "cg", "doujinshi", "up"]);
  return [...new Set(candidates.map((value) => String(value).trim()).filter((value) =>
    value && !excluded.has(value.toLowerCase()),
  ))];
}

export default function CatalogPage({ kind, title }: { kind: CatalogKind; title: string }) {
  const [allManga, setAllManga] = useState<Manga[]>(() =>
    typeof window !== "undefined" ? readInstantCatalog() : [],
  );
  const [loading, setLoading] = useState(() =>
    typeof window !== "undefined" ? readInstantCatalog().length === 0 : true,
  );
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("latest");
  const [activeGenre, setActiveGenre] = useState("all");
  const firestoreManga = useRef<Manga[]>([]);

  useEffect(() => {
    firestoreManga.current = [];
    try {
      const saved = localStorage.getItem(kind === "hentai" ? "hentaiSortMode" : kind === "genre" ? "genreListSort" : "mangaListSortMode");
      if (saved === "latest" || saved === "az" || saved === "za") setSort(saved);
      const params = new URLSearchParams(window.location.search);
      const genre = params.get("genre");
      if (genre) setActiveGenre(genre.toLowerCase());
    } catch {
      // ignore
    }

    const instant = readInstantCatalog();
    const hadInstant = instant.length > 0;
    if (hadInstant) {
      setAllManga(instant);
      setLoading(false);
    }

    const controller = new AbortController();
    const w = window as CatalogWindow;

    const applyFresh = (data: Manga[]) => {
      const enriched = enrichWithFsMeta(asMangaList(data));
      const merged = sortByLatest(
        mergeCatalogData(mergeCatalogData(enriched, firestoreManga.current), instant),
      );
      setAllManga(merged);
      setLoading(false);
      setError("");
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: merged }));
      } catch (cacheError) {
        console.warn("Catalog dataset could not be saved to cache.", cacheError);
      }
    };

    const sharedPromise =
      typeof w.loadSharedMangaList === "function"
        ? w.loadSharedMangaList(false).catch(() => null)
        : w.__mangaShared?.promise?.catch(() => null);

    const networkPromise = (sharedPromise || Promise.resolve(null)).then(async (sharedList) => {
      if (sharedList && Array.isArray(sharedList) && sharedList.length) {
        return asMangaList(sharedList);
      }
      const response = await fetch(datasetUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(`Manga dataset returned HTTP ${response.status}.`);
      const data = (await response.json()) as unknown;
      if (!Array.isArray(data)) throw new Error("Invalid manga dataset format.");
      return data as Manga[];
    });

    networkPromise
      .then((data) => {
        if (controller.signal.aborted) return;
        applyFresh(data);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Catalog dataset failed to load.", fetchError);
        setLoading(false);
        if (!hadInstant) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load manga dataset.");
        } else {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to refresh catalog.");
        }
      });

    return () => controller.abort();
  }, [kind]);

  useEffect(() => {
    if (kind !== "manga" && kind !== "hentai") return;
    let mounted = true;
    const addFirestoreManga = () => {
      const mangaData = (window as MangaDataWindow).mangaData;
      if (!mangaData) return;
      const firestoreItems = Object.values(mangaData).filter((manga) =>
        manga && !manga.isDraft &&
        (manga.firestore === true || manga.source === "firestore"),
      );
      if (!firestoreItems.length) return;

      firestoreManga.current = mergeCatalogData(firestoreManga.current, firestoreItems);
      if (mounted) {
        setAllManga((current) => mergeCatalogData(current, firestoreManga.current));
      }
    };

    window.addEventListener("mangaDataReady", addFirestoreManga);
    const fallbackTimer = window.setTimeout(addFirestoreManga, 2000);
    return () => {
      mounted = false;
      window.removeEventListener("mangaDataReady", addFirestoreManga);
      window.clearTimeout(fallbackTimer);
    };
  }, [kind]);

  const genreCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const manga of allManga) {
      for (const genre of genresOf(manga)) {
        const key = genre.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "id"));
  }, [allManga]);

  const visibleManga = useMemo(() => {
    let list = allManga.filter((manga) => {
      if (kind === "hentai" && !isAdultCatalog(manga)) return false;
      if (kind === "manga" && isAdultCatalog(manga)) return false;
      if (kind === "genre" && activeGenre !== "all" &&
        !genresOf(manga).some((genre) => genre.toLowerCase() === activeGenre)) return false;
      return titleOf(manga).toLowerCase().includes(query.trim().toLowerCase());
    });
    list = [...list].sort((a, b) => {
      if (sort === "az") return titleOf(a).localeCompare(titleOf(b), "id", { sensitivity: "base" });
      if (sort === "za") return titleOf(b).localeCompare(titleOf(a), "id", { sensitivity: "base" });
      return updateTime(b) - updateTime(a);
    });
    return list;
  }, [activeGenre, allManga, kind, query, sort]);

  function changeSort(value: SortOrder) {
    setSort(value);
    const key = kind === "hentai" ? "hentaiSortMode" : kind === "genre" ? "genreListSort" : "mangaListSortMode";
    localStorage.setItem(key, value);
  }

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="catalog-page">
        <section className="catalog-content" aria-labelledby="catalog-title">
          <h1 id="catalog-title">{title}</h1>
          {kind === "genre" && (
            <>
              <p className="catalog-subtitle">Pick a genre to browse titles.</p>
              <div className="catalog-genres" aria-label="Filter by genre">
                <button type="button" className={activeGenre === "all" ? "active" : ""} onClick={() => setActiveGenre("all")}>
                  All
                </button>
                {genreCounts.map(([genre, count]) => (
                  <button type="button" key={genre} className={activeGenre === genre ? "active" : ""}
                    onClick={() => setActiveGenre(genre)}>
                    {genre} <span>{count}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <span className="sr-only">Search titles</span>
              <svg className="catalog-search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.2 4.2" />
              </svg>
              <input type="search" placeholder="Search titles..." value={query} onChange={(event) => setQuery(event.target.value)} />
              {query && (
                <button className="catalog-search-clear" type="button" onClick={() => setQuery("")} aria-label="Clear search">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                    <path d="m5 5 10 10M15 5 5 15" />
                  </svg>
                </button>
              )}
            </label>
            <div className="catalog-sort" role="group" aria-label="Sort catalog">
              <button
                type="button"
                className={`catalog-sort-btn${sort === "latest" ? " is-active" : ""}`}
                onClick={() => changeSort("latest")}
              >
                Latest
              </button>
              <button
                type="button"
                className={`catalog-sort-btn${sort === "az" ? " is-active" : ""}`}
                onClick={() => changeSort("az")}
              >
                A–Z
              </button>
              <button
                type="button"
                className={`catalog-sort-btn${sort === "za" ? " is-active" : ""}`}
                onClick={() => changeSort("za")}
              >
                Z–A
              </button>
            </div>
          </div>
          <p className="catalog-count" aria-live="polite" role="status">
            {loading ? "Loading catalog..." : `${visibleManga.length} titles`}
          </p>
          {error && allManga.length > 0 && <p className="catalog-stale" role="status">Could not refresh catalog; showing cached data.</p>}
          {error && allManga.length === 0 ? (
            <div className="catalog-message" role="alert">
              <p>Catalog data could not be loaded.</p><small>{error}</small>
              <button type="button" onClick={() => window.location.reload()}>Try again</button>
            </div>
          ) : visibleManga.length ? (
            <div className="catalog-grid">
              {visibleManga.map((manga) => {
                const titleValue = titleOf(manga);
                const slug = manga.slug || slugify(titleValue);
                const cover = normalizeCover(manga.img || manga.cover);
                return (
                  <a className="catalog-card" href={`/series/${encodeURIComponent(slug)}`} key={`${slug}:${titleValue}`}>
                    <span className="catalog-cover">
                      {cover ? <CoverImage src={cover} alt="" onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }} /> : <span className="catalog-no-cover">No cover</span>}
                    </span>
                    <span className="catalog-card-title">{titleValue}</span>
                  </a>
                );
              })}
            </div>
          ) : (
            !loading && <div className="catalog-message">{query ? "No matching titles." : kind === "genre" && activeGenre === "all" ? "Select a genre to show manga." : "No titles available."}</div>
          )}
        </section>
      </main>
      <SiteChrome showChrome={false} />
    </>
  );
}
