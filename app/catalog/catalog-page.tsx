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

function titleOf(manga: Manga): string {
  return manga.title || manga.name || "Untitled";
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
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
    merged.set(key, existing ? {
      ...existing,
      ...manga,
      title: manga.title || manga.name || existing.title || existing.name,
      img: manga.img || manga.cover || existing.img || existing.cover,
      cover: manga.cover || manga.img || existing.cover || existing.img,
    } : manga);
  }
  return [...merged.values()];
}

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function normalizeCover(value?: string): string {
  if (!value || value === "-") return "";
  return /^https?:\/\//i.test(value) ? value : githubRaw + value.replace(/^\/+/, "");
}

function updateTime(manga: Manga): number {
  const isManaged = manga.firestore === true || manga.managedByAdmin === true ||
    manga.source === "firestore" || manga.source === "hybrid" || manga.origin === "github";
  if (!isManaged) return 0;

  const values = [manga.updatedAt, manga.latestUpdate];
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const time = typeof value === "number"
      ? value
      : typeof value === "object"
        ? value.toMillis?.() ?? (value.seconds ? value.seconds * 1000 : 0)
        : Date.parse(value);
    if (Number.isFinite(time)) return time;
  }
  return 0;
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
  const [allManga, setAllManga] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
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

      const cache = JSON.parse(localStorage.getItem(cacheKey) || "null") as { time?: number; data?: Manga[] } | null;
      if (cache?.data && Date.now() - (cache.time || 0) < 30 * 60 * 1000) {
        setAllManga(cache.data);
        setLoading(false);
      }
    } catch (cacheError) {
      console.warn("Cache katalog tidak valid; memuat dataset baru.", cacheError);
    }

    const controller = new AbortController();
    fetch(datasetUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Dataset manga merespons HTTP ${response.status}.`);
        const data = await response.json() as unknown;
        if (!Array.isArray(data)) throw new Error("Format dataset manga tidak valid.");
        return data as Manga[];
      })
      .then((data) => {
        setAllManga(mergeCatalogData(data, firestoreManga.current));
        setLoading(false);
        setError("");
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data }));
        } catch (cacheError) {
          console.warn("Dataset manga tidak dapat disimpan ke cache.", cacheError);
        }
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Dataset katalog gagal dimuat.", fetchError);
        setLoading(false);
        setError(fetchError instanceof Error ? fetchError.message : "Dataset manga gagal dimuat.");
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
