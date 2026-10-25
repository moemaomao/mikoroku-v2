"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { imageProxyUrl } from "../../lib/image-proxy";

type CurrentManga = {
  slug: string;
  title: string;
  img?: string;
  cover?: string;
  genres?: string[];
  info?: Record<string, unknown>;
};

type Recommendation = {
  title: string;
  slug: string;
  img: string;
  cover: string;
  desc: string;
  altTitle: string;
  genres: string[];
  rating: unknown;
  status: string;
  type: string;
  author: string;
  artist: string;
  publication: string;
  serialization: string;
  demographic: string;
  series: string;
  characters: string;
  circle: string;
  group: string;
  femaleTags: unknown;
  maleTags: unknown;
  source: string;
  updatedAt: number;
  managedByAdmin: boolean;
  info: Record<string, unknown>;
};

const GITHUB_DATA_URL =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json";
const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
const CACHE_KEY = "mk_rec_sidebar_gh_fs_v3";
const VISIBILITY_KEY = "mk_rec_sidebar_hidden";
const CACHE_TTL = 25 * 60 * 1000;
const NO_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='170'%3E%3Crect width='120' height='170' fill='%231a1a1a'/%3E%3C/svg%3E";

function readVisibility(): boolean {
  try {
    return localStorage.getItem(VISIBILITY_KEY) !== "true";
  } catch (error) {
    console.warn("Preferensi tampilan rekomendasi tidak dapat dibaca.", error);
    return true;
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSlug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-");
}

function resolveCover(value: unknown): string {
  const cover = asString(value).trim().replace(/\.$/, "");
  if (!cover || cover === "-") return "";
  return /^https?:\/\//i.test(cover) ? cover : `${GITHUB_RAW_BASE}${cover.replace(/^\//, "")}`;
}

function thumbnailUrl(value: string): string {
  if (!value) return NO_COVER;
  if (value.includes("res.cloudinary.com")) {
    return value.replace("/upload/", "/upload/w_140,h_203,c_fill,q_auto,f_auto/");
  }
  if (
    value.includes("blogger.googleusercontent.com") ||
    value.includes("lh3.googleusercontent.com") ||
    /\/s\d+(-c)?\//.test(value)
  ) {
    return value.replace(/\/s\d+(-c)?\//, "/s140/");
  }
  return imageProxyUrl(value, "recommendation");
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item).trim()).filter(Boolean);
  return asString(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function getTimestamp(item: Record<string, unknown>): number {
  for (const key of [
    "updatedAt",
    "latestUpdate",
    "published",
    "updated",
    "createdAt",
    "timestamp",
    "lastUpdate",
    "date",
  ]) {
    const value = item[key];
    if (!value) continue;
    const timestamp = new Date(
      typeof value === "number" || typeof value === "string" ? value : asString(value),
    ).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
}

function normalizeRecommendation(
  item: Record<string, unknown>,
  fallbackSource: string,
): Recommendation | null {
  const title = asString(item.title || item.name).trim();
  if (!title) return null;

  const cover = resolveCover(item.img || item.cover || item.image);
  const genres = item.genres ?? item.genre;
  const info = item.info && typeof item.info === "object"
    ? item.info as Record<string, unknown>
    : item;

  return {
    title,
    slug: asString(item.slug, normalizeSlug(title)),
    img: cover,
    cover,
    desc: asString(item.desc || item.description || item.synopsis || item.sinopsis),
    altTitle: asString(item.altTitle || item.alternative || item.alt_title),
    genres: asStringList(genres),
    rating: item.rating ?? null,
    status: asString(item.status, "unknown").toLowerCase(),
    type: asString(item.type, "manga").toLowerCase(),
    author: asString(item.author || item.authors, "-"),
    artist: asString(item.artist || item.artists, "-"),
    publication: asString(item.publication || item.year, "-"),
    serialization: asString(item.serialization, "-"),
    demographic: asString(item.demographic, "-"),
    series: asString(item.series),
    characters: asString(item.characters),
    circle: asString(item.circle),
    group: asString(item.group),
    femaleTags: item.femaleTags || item.female_tags || [],
    maleTags: item.maleTags || item.male_tags || [],
    source: asString(item.source, fallbackSource),
    updatedAt: getTimestamp(item),
    managedByAdmin: Boolean(item.managedByAdmin),
    info,
  };
}

function readCache(): Recommendation[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached) as { time?: number; data?: unknown };
    if (!Array.isArray(parsed.data) || Date.now() - (parsed.time || 0) > CACHE_TTL) return [];
    return parsed.data.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const recommendation = normalizeRecommendation(item as Record<string, unknown>, "cache");
      return recommendation ? [recommendation] : [];
    });
  } catch (error) {
    console.warn("Cache rekomendasi manga tidak valid dan akan diabaikan.", error);
    return [];
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  return name === "AbortError";
}

function saveCache(items: Recommendation[]): void {
  if (!items.length) return;
  const compact = items.slice(0, 80).map((item) => ({
    title: item.title,
    slug: item.slug,
    img: item.img,
    cover: item.cover,
    desc: item.desc.slice(0, 160),
    genres: item.genres.slice(0, 12),
    status: item.status,
    type: item.type,
    rating: item.rating,
    source: item.source,
    updatedAt: item.updatedAt,
  }));
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: compact }));
  } catch {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("mk_rec") || key.startsWith("manga_cache"))
        .slice(0, 12)
        .forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch {
            /* ignore */
          }
        });
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ time: Date.now(), data: compact.slice(0, 40) }),
      );
    } catch {
    }
  }
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function recommendationPayload(item: Recommendation): Recommendation {
  return {
    ...item,
    img: item.img || item.cover,
    cover: item.cover || item.img,
    genres: Array.isArray(item.genres) ? item.genres : [],
    updatedAt: item.updatedAt || 0,
    info: item.info || item,
  };
}

export default function RecommendationSidebar({
  manga,
  onVisibilityChange,
}: {
  manga: CurrentManga;
  onVisibilityChange: (visible: boolean) => void;
}) {
  const [catalogue, setCatalogue] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(readVisibility);

  useEffect(() => {
    onVisibilityChange(visible);
  }, [onVisibilityChange, visible]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const items = new Map<string, Recommendation>();
    const publish = (persist = true) => {
      if (!active) return;
      const list = [...items.values()];
      setCatalogue(list);
      if (persist) saveCache(list);
    };
    const upsert = (recommendation: Recommendation | null) => {
      if (!recommendation) return;
      const key = normalizeKey(recommendation.title);
      if (!key) return;
      const previous = items.get(key);
      items.set(key, previous
        ? {
          ...previous,
          ...recommendation,
          img: recommendation.img || previous.img,
          cover: recommendation.cover || previous.cover,
          desc: recommendation.desc.length > previous.desc.length
            ? recommendation.desc
            : previous.desc,
          genres: recommendation.genres.length ? recommendation.genres : previous.genres,
          info: recommendation.info || previous.info,
        }
        : recommendation);
    };

    const cachedItems = readCache();
    cachedItems.forEach(upsert);
    if (cachedItems.length) publish(false);

    const addLocalManga = () => {
      Object.values(window.mangaData || {}).forEach((value) => {
        if (!value || typeof value !== "object") return;
        const item = value as Record<string, unknown>;
        upsert(normalizeRecommendation(item, asString(item.source, "local")));
      });
      publish();
    };

    let mangaDataTimeout: number | undefined;
    const handleMangaDataReady = () => {
      if (mangaDataTimeout !== undefined) window.clearTimeout(mangaDataTimeout);
      addLocalManga();
    };
    window.addEventListener("mangaDataReady", handleMangaDataReady);
    if (Object.keys(window.mangaData || {}).length) addLocalManga();
    else {
      mangaDataTimeout = window.setTimeout(() => {
        addLocalManga();
        window.removeEventListener("mangaDataReady", handleMangaDataReady);
      }, 3500);
    }

    const loadGithub = async () => {
      try {
        if (controller.signal.aborted || !active) return;
        const response = await fetch(`${GITHUB_DATA_URL}?t=${Date.now()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Dataset manga merespons HTTP ${response.status}.`);
        const data: unknown = await response.json();
        if (!active || controller.signal.aborted) return;
        if (!Array.isArray(data)) throw new Error("Dataset rekomendasi bukan berupa array.");
        data.forEach((value) => {
          if (value && typeof value === "object") {
            upsert(normalizeRecommendation(value as Record<string, unknown>, "github"));
          }
        });
        publish();
      } catch (error) {
        if (isAbortError(error) || !active) return;
        throw error;
      }
    };

    const loadFirestore = async () => {
      try {
        const deadline = Date.now() + 8000;
        while (
          active &&
          !controller.signal.aborted &&
          Date.now() < deadline &&
          (!window.firestore || !window.fs?.collection || !window.fs.getDocs)
        ) {
          await new Promise((resolve) => window.setTimeout(resolve, 100));
        }
        if (!active || controller.signal.aborted) return;
        if (!window.firestore || !window.fs?.collection || !window.fs.getDocs) {
          return;
        }
        const collection = window.fs.collection(window.firestore, "manga");
        const snapshot = await window.fs.getDocs(collection);
        if (!active || controller.signal.aborted) return;
        if (snapshot.empty) return;
        snapshot.forEach((document: { id: string; data: () => Record<string, unknown> }) => {
          const data = document.data();
          upsert(normalizeRecommendation({
            ...data,
            title: data.title || document.id,
            slug: data.slug || normalizeSlug(asString(data.title, document.id)) || document.id,
          }, "firestore"));
        });
        publish();
      } catch (error) {
        if (isAbortError(error) || !active) return;
        throw error;
      }
    };

    const reportFailure = (source: string) => (error: unknown) => {
      if (!active || isAbortError(error)) return;
      console.warn(`${source} rekomendasi manga gagal dimuat.`, error);
    };

    void Promise.allSettled([loadGithub(), loadFirestore()]).then((results) => {
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          reportFailure(index === 0 ? "Dataset GitHub" : "Firestore")(result.reason);
        }
      });
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      try {
        controller.abort();
      } catch {
        /* ignore */
      }
      if (mangaDataTimeout !== undefined) window.clearTimeout(mangaDataTimeout);
      window.removeEventListener("mangaDataReady", handleMangaDataReady);
    };
  }, []);

  const recommendations = useMemo(() => {
    const currentKey = normalizeKey(manga.title || manga.slug);
    const currentSlug = normalizeSlug(manga.slug || manga.title);
    const pool = catalogue.filter((item) =>
      normalizeKey(item.title) !== currentKey && normalizeSlug(item.slug || item.title) !== currentSlug,
    );
    const currentGenres = [
      ...(manga.genres || []),
      ...asStringList(manga.info?.genres),
    ].map((genre) => genre.toLowerCase().trim()).filter(Boolean);

    if (!currentGenres.length) return shuffle(pool).slice(0, 12);
    const scored = pool.map((item) => ({
      item,
      score: item.genres.filter((genre) => currentGenres.includes(genre.toLowerCase())).length,
    })).sort((left, right) => right.score - left.score);
    const matching = shuffle(scored.filter(({ score }) => score > 0).map(({ item }) => item));
    const remaining = shuffle(scored.filter(({ score }) => score === 0).map(({ item }) => item));
    return [...matching, ...remaining].slice(0, 12);
  }, [catalogue, manga.genres, manga.info, manga.slug, manga.title]);

  const toggleVisibility = () => {
    const nextVisible = !visible;
    setVisible(nextVisible);
    try {
      localStorage.setItem(VISIBILITY_KEY, String(!nextVisible));
    } catch (error) {
      console.warn("Preferensi tampilan rekomendasi tidak dapat disimpan.", error);
    }
    requestAnimationFrame(() => {
      document.getElementById(visible ? "rec-sidebar-show-button" : "rec-sidebar-hide-button")?.focus();
    });
  };

  return (
    <>
      <aside
        id="rec-sidebar-root"
        aria-label="Manga recommendations"
        className={`relative z-10 mx-auto mb-2 mt-6 w-[calc(100%-24px)] max-w-[720px] overflow-visible font-[Kodchasan,sans-serif] text-zinc-900 lg:absolute lg:right-5 lg:top-[30px] lg:mx-0 lg:mb-0 lg:mt-0 lg:w-[var(--sidebar-width,280px)] lg:max-w-none dark:text-white${visible ? "" : " hidden"}`}
      >
        <div className="overflow-hidden py-[14px] lg:flex lg:h-full lg:flex-col lg:py-0">
          <h2 className="mb-3 flex items-center justify-between gap-2 px-[14px] text-[15px] font-bold lg:px-0 lg:text-base">
            <span className="flex items-center gap-2">
              <svg className="shrink-0 text-violet-600 dark:text-violet-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Recommendations
            </span>
            <button
              id="rec-sidebar-hide-button"
              type="button"
              aria-label="Hide recommendations"
              title="Hide recommendations"
              aria-expanded="true"
              aria-controls="rec-sidebar-root"
              onClick={toggleVisibility}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-500/35 text-red-500 transition hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m18 6-12 12M6 6l12 12" />
              </svg>
            </button>
          </h2>
          <div
            id="rec-recommend-grid"
            className="flex max-h-[440px] flex-col gap-3 overflow-x-hidden overflow-y-auto px-[14px] pb-2 [scrollbar-width:thin] md:px-[18px] lg:min-h-0 lg:max-h-[65vh] lg:flex-1 lg:gap-2 lg:px-0"
            aria-busy={loading}
            aria-live="polite"
          >
            {loading && catalogue.length === 0 && (
              <div className="w-full px-3 py-5 text-center text-[13px] text-zinc-500 dark:text-zinc-400" role="status">
                <svg className="mx-auto mb-2 h-[22px] w-[22px] animate-spin text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                </svg>
                Loading...
              </div>
            )}
            {!loading && recommendations.length === 0 && (
              <p className="w-full px-3 py-5 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
                No recommendations available
              </p>
            )}
            {recommendations.map((item, index) => {
              const itemCover = item.img || item.cover || "";
              const itemThumb = thumbnailUrl(itemCover);
              return (
              <Link
                href={`/series/${encodeURIComponent(item.slug || normalizeSlug(item.title))}`}
                key={`${item.slug}-${item.title}`}
                title={item.title}
                onClick={() => {
                  try {
                    localStorage.setItem("currentManga", JSON.stringify(recommendationPayload(item)));
                  } catch (error) {
                    console.warn("Manga rekomendasi tidak dapat disimpan sebelum navigasi.", error);
                  }
                }}
                className={`relative flex h-[78px] min-h-[78px] w-full shrink-0 items-center gap-2.5 overflow-hidden rounded-xl border border-black/[0.06] p-1.5 text-inherit no-underline transition hover:border-violet-400/40 hover:brightness-[1.03] dark:border-white/[0.08]${index >= 5 ? " max-[767px]:hidden" : ""}`}
              >
                {itemCover ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-0"
                  >
                    <span
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url("${itemThumb}")` }}
                    />
                    <span className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/45 to-white/20 dark:from-black/75 dark:via-black/50 dark:to-black/25" />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-0 bg-black/[0.035] dark:bg-white/[0.06]"
                  />
                )}
                <span className="relative z-10 h-[66px] w-[46px] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-sm ring-1 ring-black/10 dark:ring-white/10">
                  <img
                    src={itemThumb}
                    loading="lazy"
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = NO_COVER;
                    }}
                    className="!block !h-full !w-full !max-w-none !object-cover"
                  />
                </span>
                <span className="relative z-10 line-clamp-2 min-w-0 flex-1 overflow-hidden pr-1 text-left text-[12px] font-semibold leading-[1.35] text-zinc-900 drop-shadow-sm dark:text-white">
                  {item.title}
                </span>
              </Link>
              );
            })}
          </div>
        </div>
      </aside>
      {!visible && (
        <button
          id="rec-sidebar-show-button"
          type="button"
          aria-label="Show recommendations"
          title="Show recommendations"
          aria-expanded="false"
          aria-controls="rec-sidebar-root"
          onClick={toggleVisibility}
          className="fixed right-0 top-1/2 z-[10000] flex h-11 w-9 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-black/10 bg-white text-zinc-900 shadow-[0_2px_10px_rgba(0,0,0,0.16)] hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-white/15 dark:bg-[#1a1a2e] dark:text-white dark:hover:bg-white/10"
        >
          <svg className="text-violet-600 dark:text-violet-400" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}
    </>
  );
}
