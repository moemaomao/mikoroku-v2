"use client";

import { useEffect, useMemo, useState } from "react";
import SiteChrome from "../site-chrome";
import { CoverImage } from "../lib/cover-image";
import { getCachedFirestoreMangaCatalog, loadFirestoreMangaCatalog } from "../lib/firebase-client";
import { isNsfwMangaRecord } from "../lib/nsfw";
import { isNovelSeries } from "../../lib/reader-kind";
import "./catalog.css";

type Manga = {
  [key: string]: unknown;
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
  nsfw?: boolean;
};

export type CatalogKind = "manga" | "hentai" | "genre" | "novel";
type SortOrder = "latest" | "az" | "za";
type DateValue = string | number | { toMillis?: () => number; seconds?: number };

function titleOf(manga: Manga): string {
  return manga.title || manga.name || "Untitled";
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
      !(item as Manga).isDraft &&
      (typeof (item as Manga).title === "string" || typeof (item as Manga).name === "string"),
  );
}

function sortByLatest(list: Manga[]): Manga[] {
  return [...list].sort((a, b) => {
    const diff = updateTime(b) - updateTime(a);
    if (diff !== 0) return diff;
    return titleOf(a).localeCompare(titleOf(b), "id", { sensitivity: "base" });
  });
}

function readInstantCatalog(): Manga[] {
  if (typeof window === "undefined") return [];
  return sortByLatest(asMangaList(getCachedFirestoreMangaCatalog()));
}

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function normalizeCover(value?: string): string {
  if (!value || value === "-") return "";
  return /^https?:\/\//i.test(value) ? value : "";
}

function nestedCatalogMetadata(manga: Manga): Record<string, unknown> {
  const info = manga.info && typeof manga.info === "object" && !Array.isArray(manga.info)
    ? manga.info as Record<string, unknown>
    : {};
  const metadata = manga.metadata && typeof manga.metadata === "object" && !Array.isArray(manga.metadata)
    ? manga.metadata as Record<string, unknown>
    : {};
  return { ...info, ...metadata };
}

function mangaTags(manga: Manga): string[] {
  const metadata = nestedCatalogMetadata(manga);
  const values = [
    ...(Array.isArray(manga.genres) ? manga.genres : []),
    ...(Array.isArray(manga.tags) ? manga.tags : []),
    ...(Array.isArray(manga.labels) ? manga.labels : []),
    ...(Array.isArray(manga.category) ? manga.category : []),
    ...(Array.isArray(manga.genre) ? manga.genre : manga.genre ? [manga.genre] : []),
    ...(Array.isArray(metadata.genres) ? metadata.genres : []),
    ...(Array.isArray(metadata.tags) ? metadata.tags : []),
    ...(Array.isArray(metadata.labels) ? metadata.labels : []),
    ...(Array.isArray(metadata.category) ? metadata.category : []),
    ...(Array.isArray(metadata.genre) ? metadata.genre : metadata.genre ? [metadata.genre] : []),
    manga.type || "",
    metadata.type || "",
  ];
  return values.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
}

function isAdultCatalog(manga: Manga): boolean {
  return mangaTags(manga).some((tag) => {
    const normalizedTag = tag.replace(/[_-]+/g, " ");
    return normalizedTag === "cg" ||
      normalizedTag.includes("cg collection") ||
      ["hentai", "doujin", "smut", "adult"].some((term) => normalizedTag.includes(term));
  });
}

function genresOf(manga: Manga): string[] {
  const metadata = nestedCatalogMetadata(manga);
  const candidates = [
    ...(Array.isArray(manga.genres) ? manga.genres : []),
    ...(Array.isArray(manga.genre) ? manga.genre : manga.genre ? [manga.genre] : []),
    ...(Array.isArray(manga.tags) ? manga.tags : []),
    ...(Array.isArray(manga.labels) ? manga.labels : []),
    ...(Array.isArray(manga.category) ? manga.category : []),
    ...(Array.isArray(metadata.genres) ? metadata.genres : []),
    ...(Array.isArray(metadata.genre) ? metadata.genre : metadata.genre ? [metadata.genre] : []),
    ...(Array.isArray(metadata.tags) ? metadata.tags : []),
    ...(Array.isArray(metadata.labels) ? metadata.labels : []),
    ...(Array.isArray(metadata.category) ? metadata.category : []),
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(kind === "hentai" ? "hentaiSortMode" : kind === "genre" ? "genreListSort" : kind === "novel" ? "novelListSort" : "mangaListSortMode");
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

    let active = true;

    void loadFirestoreMangaCatalog()
      .then((data) => {
        if (!active) return;
        setAllManga(sortByLatest(asMangaList(data)));
        setLoading(false);
        setError("");
      })
      .catch((fetchError: unknown) => {
        if (!active) return;
        console.error("Catalog metadata failed to load.", fetchError);
        setLoading(false);
        if (!hadInstant) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load manga metadata.");
        } else {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to refresh catalog metadata.");
        }
      });

    return () => {
      active = false;
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
      if (kind === "hentai" && (!isAdultCatalog(manga) || isNovelSeries(manga))) return false;
      if (kind === "manga" && (isAdultCatalog(manga) || isNovelSeries(manga))) return false;
      if (kind === "novel" && !isNovelSeries(manga)) return false;
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
    const key = kind === "hentai" ? "hentaiSortMode" : kind === "genre" ? "genreListSort" : kind === "novel" ? "novelListSort" : "mangaListSortMode";
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
                const isNsfw =
                   kind === "hentai" ||
                   manga.nsfw === true ||
                   isNsfwMangaRecord(manga);
                return (
                  <a className="catalog-card" href={`/series/${encodeURIComponent(slug)}`} key={`${slug}:${titleValue}`}>
                    <span className="catalog-cover">
                      {cover ? <CoverImage src={cover} alt="" nsfw={isNsfw} onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }} /> : <span className="catalog-no-cover">No cover</span>}
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
