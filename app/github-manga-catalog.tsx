"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { collection, doc, getDocFromServer, getDocsFromServer } from "firebase/firestore";
import { initializeFirebaseClient } from "./lib/firebase-client";
import {
  cardClass,
  cardCoverClass,
  cardImageClass,
  cardOverlayClass,
  cardTitleClass,
  catalogGridClass,
  chapterBadgeClass,
  homepageLoadMoreClass,
  skeletonListCardClass,
  skeletonListContentClass,
  skeletonListCoverClass,
  statusBadgeClass,
  statusBadgeColors,
  typeBadgeClass,
  typeBadgeColors,
  upBadgeClass,
} from "./lib/homepage-classes";
import { getSeriesCoverPreference } from "./lib/series-cover-preferences";

type MangaItem = Record<string, unknown> & {
  title: string;
  slug?: string;
  img?: string;
  cover?: string;
  desc?: string;
  status?: string;
  type?: string;
  genres?: string[];
  updatedAt?: number;
  lastChapter?: string | number;
  lastChapterUpdated?: string | number;
};

type FirestoreMeta = {
  slug: string;
  title: string;
  updatedAt: number;
  latestUpdate: number;
  lastChapter: string;
  lastChapterUpdated: string;
  chapterCount: number;
  managedByAdmin: boolean;
  source: string;
  origin: string;
  githubSlug: string;
  isDraft: boolean;
  status: string;
  type: string;
  cover: string;
  rating: unknown;
};

type Cache<T> = { time?: number; data?: T };
type SharedMangaCache = {
  list: MangaItem[] | null;
  promise: Promise<MangaItem[]> | null;
  loaded: boolean;
};

declare global {
  interface Window {
    __mangaShared?: SharedMangaCache;
    loadSharedMangaList?: (force?: boolean) => Promise<MangaItem[]>;
    mangaData?: Record<string, unknown>;
    chapterMap?: Record<string, unknown>;
    chapterDateMap?: Record<string, unknown>;
    githubMangaList?: MangaItem[];
    fsMangaMeta?: Record<string, FirestoreMeta>;
    mangaDataReady?: boolean;
    refreshGithubManga?: () => void;
  }
}

const GITHUB_RAW = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
const MANGA_LIST_URL = `${GITHUB_RAW}all-manga.json`;
const CACHE_DURATION = 60 * 60 * 1000;
const STALE_OK_DURATION = 24 * 60 * 60 * 1000;
const HERO_CACHE_DURATION = 30 * 60 * 1000;
const PAGE_SIZE = 24;

function normalize(value: unknown): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(value: unknown): string {
  return String(value || "").toLowerCase().trim().replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-");
}

function resolveCover(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim() === "-") return "";
  const cover = value.replace(/\.$/, "").trim();
  if (/^https?:\/\//i.test(cover)) return cover;
  if (/^\/\//.test(cover)) return `${window.location.protocol}${cover}`;
  return GITHUB_RAW + cover.replace(/^\//, "");
}

function getTimestamp(item: Record<string, unknown>): number {
  for (const value of [
    item.updatedAt, item.latestUpdate, item.published, item.updated,
    item.createdAt, item.timestamp, item.lastUpdate, item.date,
  ]) {
    if (!value) continue;
    const timestamp = new Date(value as string | number).getTime();
    if (timestamp) return timestamp;
  }
  return 0;
}

function toMilliseconds(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
  if (typeof value === "object" && value) {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    localStorage.removeItem("mangaGithubCache");
    localStorage.removeItem("mangaFsMetaCache");
    localStorage.removeItem("mangaGithubLightCache");
  }
}

function sharedListLoader(force = false): Promise<MangaItem[]> {
  const shared = window.__mangaShared || (window.__mangaShared = {
    list: null,
    promise: null,
    loaded: false,
  });
  window.loadSharedMangaList ||= (refresh = false) => sharedListLoader(refresh);
  if (shared.loaded && !force && shared.list) return Promise.resolve(shared.list);
  if (shared.promise && !force) return shared.promise;

  shared.promise = fetch(`${MANGA_LIST_URL}?t=${Date.now()}`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<unknown>;
    })
    .then((value) => {
      if (!Array.isArray(value)) throw new Error("Manga dataset response must be an array.");
      shared.list = value as MangaItem[];
      shared.loaded = true;
      return shared.list;
    })
    .catch((error: unknown) => {
      console.warn("Shared manga list failed to load.", error);
      shared.promise = null;
      throw error;
    });
  return shared.promise;
}

function metadataFromData(slug: string, data: Record<string, unknown>): FirestoreMeta {
  const updatedAt = toMilliseconds(data.updatedAt) || toMilliseconds(data.latestUpdate);
  return {
    slug,
    title: String(data.title || slug),
    updatedAt,
    latestUpdate: toMilliseconds(data.latestUpdate) || updatedAt,
    lastChapter: data.lastChapter == null ? "" : String(data.lastChapter),
    lastChapterUpdated: data.lastChapterUpdated == null ? "" : String(data.lastChapterUpdated),
    chapterCount: typeof data.chapterCount === "number" ? data.chapterCount : 0,
    managedByAdmin: Boolean(data.managedByAdmin),
    source: String(data.source || ""),
    origin: String(data.origin || ""),
    githubSlug: String(data.githubSlug || ""),
    isDraft: Boolean(data.isDraft),
    status: String(data.status || ""),
    type: String(data.type || ""),
    cover: String(data.cover || ""),
    rating: data.rating,
  };
}

async function loadFirestoreMetadata(): Promise<Record<string, FirestoreMeta>> {
  try {
    const { firestore } = initializeFirebaseClient();
    let metadata: Record<string, FirestoreMeta> = {};
    let usedSummary = false;
    try {
      const summary = await getDocFromServer(doc(firestore, "meta", "mangaSummary"));
      const entries = summary.exists() ? summary.data().list : null;
      if (Array.isArray(entries) && entries.length) {
        for (const entry of entries as Record<string, unknown>[]) {
          if (!entry || !entry.slug) continue;
          const item = metadataFromData(String(entry.slug), entry);
          metadata[item.slug] = item;
          if (item.githubSlug) metadata[item.githubSlug] = item;
        }
        usedSummary = true;
      }
    } catch (error) {
      console.warn("Manga summary document unavailable; reading manga metadata.", error);
    }

    if (!usedSummary || !Object.keys(metadata).length) {
      const snapshot = await getDocsFromServer(collection(firestore, "manga"));
      metadata = {};
      snapshot.forEach((document) => {
        const item = metadataFromData(document.id, document.data());
        metadata[item.slug] = item;
        if (item.githubSlug) metadata[item.githubSlug] = item;
      });
    }
    window.fsMangaMeta = metadata;
    safeSet("mangaFsMetaCache", { time: Date.now(), data: metadata });
    return metadata;
  } catch (error) {
    console.warn("Firestore manga metadata could not be loaded.", error);
    return window.fsMangaMeta || {};
  }
}

function getMetadata(item: MangaItem, metadata: Record<string, FirestoreMeta>): FirestoreMeta | undefined {
  const title = normalize(item.title);
  return metadata[item.slug || ""] ||
    metadata[String(item.githubSlug || "")] ||
    Object.values(metadata).find((entry) =>
      entry && !entry.isDraft && normalize(entry.title) === title,
    );
}

function isManaged(metadata?: FirestoreMeta): boolean {
  return Boolean(metadata && (
    metadata.source === "firestore" ||
    metadata.source === "hybrid" ||
    metadata.origin === "github" ||
    metadata.managedByAdmin ||
    metadata.updatedAt > 0
  ));
}

function chapterNumber(item: MangaItem, metadata?: FirestoreMeta): number {
  const candidates = [
    metadata?.lastChapter, metadata?.lastChapterUpdated,
    item.lastChapter, item.lastChapterUpdated, item.chapters, item.chapter,
    item.total_chapter, item.totalChapter,
  ];
  let maximum = -1;
  for (const value of candidates) {
    if (value == null || typeof value === "object" || value === "") continue;
    const match = String(value).match(/[\d.]+/);
    if (!match) continue;
    const parsed = Number.parseFloat(match[0]);
    if (Number.isFinite(parsed) && parsed >= 0) maximum = Math.max(maximum, parsed);
  }
  return maximum;
}

function mangaForMetadata(item: MangaItem, metadata?: FirestoreMeta): Record<string, unknown> {
  const cover = resolveCover(
    getSeriesCoverPreference(metadata?.slug || item.slug || slugify(item.title)) ||
    metadata?.cover || item.img || item.cover || "",
  );
  const chapter = chapterNumber(item, metadata);
  const titleKey = normalize(item.title);
  const firestore = isManaged(metadata);
  const manga: Record<string, unknown> = {
    ...item,
    slug: metadata?.slug || item.slug || slugify(item.title),
    title: item.title,
    img: cover,
    desc: item.desc || "",
    genres: Array.isArray(item.genres) ? item.genres : [],
    rating: metadata?.rating ?? item.rating ?? "-",
    status: String(metadata?.status || item.status || "").toLowerCase(),
    type: String(metadata?.type || item.type || "manga").toLowerCase(),
    altTitle: item.altTitle || "",
    author: item.author || "-",
    artist: item.artist || "-",
    updatedAt: metadata?.updatedAt || 0,
    lastChapter: chapter >= 0 ? chapter : "",
    managedByAdmin: Boolean(metadata?.managedByAdmin),
    info: item,
    firestore,
    source: firestore ? "firestore" : "github",
  };
  window.mangaData ||= {};
  window.mangaData[titleKey] = manga;
  return manga;
}

function makeHeroItem(item: MangaItem, source: string): MangaItem | null {
  const title = String(item.title || item.name || "");
  const key = normalize(title);
  const cover = resolveCover(item.img || item.cover || "");
  if (!title || !key || !cover) return null;
  const genres = Array.isArray(item.genres)
    ? item.genres.map(String)
    : typeof item.genre === "string"
      ? item.genre.split(/[,|/]/).map((genre) => genre.trim()).filter(Boolean)
      : [];
  return {
    ...item,
    title,
    slug: String(item.slug || slugify(title) || key),
    img: cover,
    cover,
    desc: String(item.desc || item.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    genres,
    timestamp: getTimestamp(item),
    source,
  };
}

function thumbnail(value: unknown, width: number, quality: number, version = 0): string {
  const cover = resolveCover(value);
  return cover
    ? `https://images.weserv.nl/?url=${encodeURIComponent(cover)}&w=${width}&q=${quality}&output=webp${version ? `&v=${version}` : ""}`
    : "";
}

function readHeroCache(): MangaItem[] {
  const cached = safeGet<Cache<MangaItem[]>>("mk_hero_v2", {});
  return cached.data && Date.now() - (cached.time || 0) < HERO_CACHE_DURATION ? cached.data : [];
}

function saveHeroCache(items: MangaItem[]): void {
  safeSet("mk_hero_v2", { time: Date.now(), data: items });
}

function mergeHeroItems(items: MangaItem[], metadata: Record<string, FirestoreMeta>): MangaItem[] {
  const merged = new Map<string, MangaItem>();
  for (const item of items) {
    const row = makeHeroItem(item, "github");
    if (row) merged.set(normalize(row.title), row);
  }
  for (const value of Object.values(window.mangaData || {})) {
    const raw = value as Record<string, unknown>;
    if (!raw || typeof raw.title !== "string") continue;
    const firestore = raw.firestore === true || raw.source === "firestore" ||
      raw.source === "hybrid" || raw.managedByAdmin === true || Number(raw.updatedAt) > 0;
    if (!firestore) continue;
    const row = makeHeroItem(raw as MangaItem, "firestore");
    if (row) {
      const key = normalize(row.title);
      merged.set(key, { ...(merged.get(key) || {}), ...row });
    }
  }
  for (const item of items) {
    const meta = getMetadata(item, metadata);
    if (!meta || meta.isDraft) continue;
    const key = normalize(item.title);
    const old = merged.get(key);
    if (old) {
      merged.set(key, {
        ...old,
        slug: meta.slug || old.slug,
        img: resolveCover(meta.cover) || old.img,
        updatedAt: meta.updatedAt || old.updatedAt,
        lastChapter: meta.lastChapter || old.lastChapter,
      });
    }
  }
  return [...merged.values()];
}

function isRecentUpdate(timestamp: number): boolean {
  return timestamp > 0 && Date.now() - timestamp <= 2 * 24 * 60 * 60 * 1000;
}

function cacheLightList(items: MangaItem[], metadata: Record<string, FirestoreMeta>): void {
  const lightList = items.map((item) => {
    const meta = getMetadata(item, metadata);
    return {
      title: item.title,
      slug: item.slug || "",
      githubSlug: item.githubSlug || "",
      img: item.img || item.cover || "",
      cover: item.cover || item.img || "",
      status: item.status || meta?.status || "",
      type: item.type || meta?.type || "manga",
      rating: item.rating ?? meta?.rating ?? null,
      desc: item.desc || "",
      genres: Array.isArray(item.genres) ? item.genres : [],
      altTitle: item.altTitle || "",
      author: item.author || "-",
      artist: item.artist || "-",
      updatedAt: meta?.updatedAt || 0,
      lastChapter: meta?.lastChapter || "",
      managedByAdmin: Boolean(meta?.managedByAdmin),
      source: meta?.source || "",
      origin: meta?.origin || "",
    };
  });
  safeSet("mangaGithubLightCache", { time: Date.now(), list: lightList, fullList: items });
}

function MangaCard({ item, metadata, priority, index }: {
  item: MangaItem;
  metadata: Record<string, FirestoreMeta>;
  priority: boolean;
  index: number;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const meta = getMetadata(item, metadata);
  const manga = mangaForMetadata(item, meta);
  const slug = String(manga.slug || item.slug || slugify(item.title));
  const cover = String(manga.img || "");
  const image = thumbnail(cover, 150, 60, meta?.updatedAt);
  const status = String(manga.status || "").toLowerCase();
  const type = String(manga.type || "manga").toLowerCase();
  const chapter = chapterNumber(item, meta);
  const updatedAt = Number(meta?.updatedAt || 0);
  const rating = meta?.rating ?? item.rating ?? "-";
  manga.rating = rating;

  return (
    <a
      href={`/series/${encodeURIComponent(slug)}`}
      className={cardClass}
      data-key={normalize(item.title)}
      data-slug={slug}
      onClick={() => {
        try {
          localStorage.setItem("currentManga", JSON.stringify(manga));
        } catch {}
      }}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className={cardCoverClass}>
        {status && <div className={`${statusBadgeClass} ${statusBadgeColors[status] || "bg-[#616161]"}`}>{status.toUpperCase()}</div>}
        {(Boolean(item.isUp) || (isRecentUpdate(updatedAt) && isManaged(meta))) && <div className={upBadgeClass}>UP</div>}
        {type && <div className={`${typeBadgeClass} ${typeBadgeColors[type.replace(/\s+/g, "-")] || typeBadgeColors.default}`}>{type.toUpperCase()}</div>}
        {chapter >= 0 && <div className={chapterBadgeClass}>Ch. {chapter}</div>}
        {image && !coverFailed
          ? <img className={cardImageClass} src={image} alt={item.title} width="150" height="225" decoding="async" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} onError={() => setCoverFailed(true)} />
          : <div className="flex aspect-[2/3] w-full items-center justify-center bg-[#1a1a1a] p-2.5 text-center text-[11px] font-semibold text-[#888] dark:bg-[#111]">Cover Not Found</div>}
        <div className={cardOverlayClass}><div className={cardTitleClass}>{item.title}</div></div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className={`${cardClass} skeleton-card overflow-hidden rounded-lg ${skeletonListCardClass}`}>
      <div className={`${cardCoverClass} skeleton-thumb animate-pulse bg-gradient-to-r from-[#eee] via-[#f5f5f5] to-[#eee] dark:from-[#2a2a2a] dark:via-[#333] dark:to-[#2a2a2a] ${skeletonListCoverClass}`} />
      <div className={`hidden flex-1 flex-col justify-center gap-2 p-3 ${skeletonListContentClass}`}>
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-300/70 dark:bg-slate-600/70" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/70" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/70" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/70" />
      </div>
    </div>
  );
}

export default function GithubMangaCatalog({ children }: { children?: ReactNode }) {
  const [heroContainer, setHeroContainer] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<MangaItem[]>([]);
  const [metadata, setMetadata] = useState<Record<string, FirestoreMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [heroItems, setHeroItems] = useState<MangaItem[]>([]);
  const [heroPage, setHeroPage] = useState(0);
  const [heroVisibleCount, setHeroVisibleCount] = useState(3);
  const itemsRef = useRef(items);
  const metadataRef = useRef(metadata);
  const refreshRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  itemsRef.current = items;
  metadataRef.current = metadata;

  const updateHero = useCallback((list: MangaItem[], meta: Record<string, FirestoreMeta>) => {
    const pool = mergeHeroItems(list, meta);
    const shuffled = pool.slice();
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    setHeroItems(shuffled.slice(0, Math.max(9, heroVisibleCount)));
    setHeroPage(0);
  }, [heroVisibleCount]);

  const refresh = useCallback(async (force = false) => {
    if (!document.getElementById("githubManga")) return;
    setLoading(true);
    setError(false);
    const light = safeGet<{ time?: number; fullList?: MangaItem[] }>("mangaGithubLightCache", {});
    const age = Date.now() - (light.time || 0);
    let renderedCache = false;
    if (!force && Array.isArray(light.fullList) && age <= STALE_OK_DURATION) {
      const fsCached = safeGet<Cache<Record<string, FirestoreMeta>>>("mangaFsMetaCache", {});
      if (fsCached.data) {
        window.fsMangaMeta = fsCached.data;
        setMetadata(fsCached.data);
      }
      setItems(light.fullList);
      window.githubMangaList = light.fullList;
      renderedCache = true;
      setLoading(false);
    } else if (!renderedCache) {
      setItems([]);
    }

    try {
      const metadataPromise = loadFirestoreMetadata();
      const [list, freshMetadata] = await Promise.all([
        (async () => {
          if (!force) {
            const cached = safeGet<Cache<MangaItem[]>>("mangaGithubCache", {});
            if (cached.data && Date.now() - (cached.time || 0) < CACHE_DURATION) return cached.data;
          }
          const fresh = await (window.loadSharedMangaList || sharedListLoader)(force);
          safeSet("mangaGithubCache", { time: Date.now(), data: fresh });
          return fresh;
        })(),
        metadataPromise,
      ]);
      window.githubMangaList = list || [];
      window.fsMangaMeta = freshMetadata;
      setMetadata(freshMetadata);
      setItems(list || []);
      cacheLightList(list || [], freshMetadata);
      saveHeroCache(mergeHeroItems(list || [], freshMetadata));
      updateHero(list || [], freshMetadata);
      window.dispatchEvent(new Event("mangaDataReady"));
    } catch (loadError) {
      console.error("GitHub manga catalog could not be loaded.", loadError);
      if (!renderedCache) setError(true);
      setItems((current) => current);
    } finally {
      setLoading(false);
    }
  }, [updateHero]);
  refreshRef.current = refresh;

  useEffect(() => {
    setHeroContainer(document.getElementById("home-hero-container"));
    window.mangaData ||= {};
    window.chapterMap ||= {};
    window.chapterDateMap ||= {};
    window.githubMangaList ||= [];
    window.fsMangaMeta ||= {};
    Object.assign(window.chapterMap, safeGet("chapterMap", {}));
    Object.assign(window.chapterDateMap, safeGet("chapterDateMap", {}));
    window.refreshGithubManga = () => { void refreshRef.current(true); };

    const cachedHero = readHeroCache();
    if (cachedHero.length) setHeroItems(cachedHero);
    void refreshRef.current();
    return () => {
      if (window.refreshGithubManga) delete window.refreshGithubManga;
    };
  }, []);

  useEffect(() => {
    const handleMangaDataReady = () => updateHero(
      window.githubMangaList || itemsRef.current,
      window.fsMangaMeta || metadataRef.current,
    );
    let tries = 0;
    let previousCount = -1;
    window.addEventListener("mangaDataReady", handleMangaDataReady);
    const metadataPoll = window.setInterval(() => {
      const values = Object.values(window.mangaData || {});
      const hasFirestoreManga = values.some((value) => {
        if (!value || typeof value !== "object") return false;
        const manga = value as Record<string, unknown>;
        return manga.firestore === true || manga.source === "firestore" ||
          manga.source === "hybrid" || manga.managedByAdmin === true || Number(manga.updatedAt) > 0;
      });
      if (values.length !== previousCount) {
        previousCount = values.length;
        handleMangaDataReady();
      }
      tries++;
      if (hasFirestoreManga || tries >= 40) window.clearInterval(metadataPoll);
    }, 400);
    const stopPolling = window.setTimeout(() => window.clearInterval(metadataPoll), 16000);
    return () => {
      window.removeEventListener("mangaDataReady", handleMangaDataReady);
      window.clearInterval(metadataPoll);
      window.clearTimeout(stopPolling);
    };
  }, [updateHero]);

  useEffect(() => {
    const updateResponsiveCount = () => {
      setHeroVisibleCount(window.innerWidth <= 767 ? 1 : window.innerWidth <= 1199 ? 2 : 3);
    };
    updateResponsiveCount();
    let resizeTimer = 0;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateResponsiveCount, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.clearTimeout(resizeTimer);
    };
  }, []);

  useEffect(() => {
    if (heroItems.length <= heroVisibleCount) return;
    const timer = window.setInterval(() => {
      setHeroPage((page) => (page + 1) % Math.ceil(heroItems.length / heroVisibleCount));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroItems.length, heroVisibleCount]);

  const sortedItems = useMemo(() => items.slice().sort((left, right) => {
    const leftMeta = getMetadata(left, metadata);
    const rightMeta = getMetadata(right, metadata);
    return (isManaged(rightMeta) ? rightMeta?.updatedAt || 0 : 0) -
      (isManaged(leftMeta) ? leftMeta?.updatedAt || 0 : 0);
  }), [items, metadata]);
  const visibleItems = sortedItems.slice(0, visibleCount);
  const maxHeroPage = Math.max(0, Math.ceil(heroItems.length / heroVisibleCount) - 1);
  const heroPageItems = heroItems.slice(heroPage * heroVisibleCount, (heroPage + 1) * heroVisibleCount);
  const hasMore = visibleCount < sortedItems.length;

  return (
    <>
      {heroContainer && createPortal(
        <div
          id="heroSection"
          className="relative mx-[10px] mb-6 block aspect-[21/6] h-auto max-h-[260px] min-h-[230px] w-[calc(100%-20px)] overflow-hidden rounded-[18px] bg-[#0d0d0d] shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)] [contain:layout_style_size] transition-[margin-left,width] duration-300 max-[767px]:mb-4 max-[767px]:min-h-[220px] max-[767px]:rounded-[14px] min-[769px]:[body.sidebar-open_&]:ml-[calc(var(--sidebar-width)+10px)] min-[769px]:[body.sidebar-open_&]:mr-[10px] min-[769px]:[body.sidebar-open_&]:w-[calc(100%-var(--sidebar-width)-20px)] min-[769px]:[body:not(.sidebar-open)_&]:mx-[10px] min-[769px]:[body:not(.sidebar-open)_&]:w-[calc(100%-20px)] [&_.hero-nav]:!bg-[var(--mikoroku-hero-nav)] [&_.hero-nav]:!text-white [&_.hero-dot]:!bg-[var(--mikoroku-hero-dot)] [&_.hero-dot.is-active]:!bg-[var(--mikoroku-hero-dot-active)]"
        >
        {heroItems.length > 0 && (
          <>
            <div className="flex h-full min-h-[inherit] w-full transition-transform duration-[650ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] [will-change:transform]" style={{ transform: `translateX(-${heroPage * 100}%)` }}>
              {heroItems.map((item, index) => {
                const image = thumbnail(item.img || item.cover, 150, 70, Number(item.updatedAt || 0));
                const manga = mangaForMetadata(item, getMetadata(item, metadata));
                return (
                  <a
                    className="group/hero relative box-border flex h-full min-h-[inherit] basis-1/3 min-w-1/3 shrink-0 overflow-hidden border-r border-white/[0.08] text-white no-underline last:border-r-0 max-[1199px]:min-[768px]:basis-1/2 max-[1199px]:min-[768px]:min-w-1/2 max-[767px]:min-h-[220px] max-[767px]:basis-full max-[767px]:min-w-full max-[767px]:border-r-0"
                    href={`/series/${encodeURIComponent(String(item.slug || slugify(item.title)))}`}
                    key={`${normalize(item.title)}-${index}`}
                    onClick={() => {
                      try {
                        localStorage.setItem("currentManga", JSON.stringify(manga));
                      } catch {}
                    }}
                  >
                    <div className="absolute inset-0 scale-[1.05] bg-cover bg-center transition-transform duration-500 group-hover/hero:scale-110" style={{ backgroundImage: `url("${image}")` }} />
                    <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_top,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.65)_35%,rgba(0,0,0,0.25)_60%,rgba(0,0,0,0.1)_100%)]" />
                    <div className="relative z-[2] flex h-full min-h-[inherit] items-center gap-[14px] p-[14px_18px] max-[767px]:min-h-[220px] max-[767px]:p-4">
                      <img className="h-[140px] w-24 shrink-0 rounded-[9px] object-cover shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.1)] transition-[transform,box-shadow] duration-300 group-hover/hero:scale-105 group-hover/hero:shadow-[0_12px_32px_rgba(0,0,0,0.65)] max-[767px]:h-[136px] max-[767px]:w-[92px] max-[767px]:rounded-lg" src={image} alt={item.title} width="108" height="158" loading={index < heroVisibleCount ? "eager" : "lazy"} decoding="async" fetchPriority={index < heroVisibleCount ? "high" : "auto"} />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h2 className="mb-1.5 line-clamp-2 break-words text-[16.5px] font-bold leading-[1.3] tracking-[-0.01em] [text-shadow:0_2px_12px_rgba(0,0,0,0.6)] max-[767px]:text-base">{item.title}</h2>
                        {item.desc && <p className="m-0 line-clamp-3 break-words text-xs leading-[1.4] opacity-[0.85] [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">{String(item.desc).slice(0, 140)}</p>}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
            {heroItems.length > heroVisibleCount && (
              <>
                <button type="button" className="absolute left-[10px] top-1/2 z-[15] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-xl leading-none text-white opacity-[0.85] backdrop-blur-[10px] transition-all duration-200 hover:scale-[1.08] hover:border-white/35 hover:bg-white/[0.18] hover:opacity-100 active:scale-[0.96] max-[767px]:left-2 max-[767px]:h-[34px] max-[767px]:w-[34px]" aria-label="Prev" onClick={() => setHeroPage((page) => page <= 0 ? maxHeroPage : page - 1)}>‹</button>
                <button type="button" className="absolute right-[10px] top-1/2 z-[15] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-xl leading-none text-white opacity-[0.85] backdrop-blur-[10px] transition-all duration-200 hover:scale-[1.08] hover:border-white/35 hover:bg-white/[0.18] hover:opacity-100 active:scale-[0.96] max-[767px]:right-2 max-[767px]:h-[34px] max-[767px]:w-[34px]" aria-label="Next" onClick={() => setHeroPage((page) => page >= maxHeroPage ? 0 : page + 1)}>›</button>
                <div className="absolute inset-x-0 bottom-[10px] z-[15] flex justify-center gap-[7px]">
                  {Array.from({ length: maxHeroPage + 1 }, (_, index) => (
                    <button type="button" key={index} className={`h-[7px] w-[7px] rounded-full border-0 bg-white/30 p-0 transition-all duration-300 hover:scale-[1.2] hover:bg-white/[0.55] ${index === heroPage ? "!w-5 !rounded-[10px] !bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]" : ""}`} aria-label={`Slide ${index + 1}`} onClick={() => setHeroPage(index)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        </div>,
        heroContainer,
      )}
      {children}
      <div id="githubManga" className={catalogGridClass}>
        {error
          ? <p style={{ textAlign: "center", padding: 40, color: "#f66" }}>Gagal memuat manga<br /><button type="button" onClick={() => void refresh(true)} style={{ marginTop: 12, padding: "8px 16px", cursor: "pointer" }}>Coba Lagi</button></p>
          : loading && visibleItems.length === 0
            ? Array.from({ length: PAGE_SIZE }, (_, index) => <SkeletonCard key={index} />)
            : visibleItems.map((item, index) => <MangaCard key={`${normalize(item.title)}-${index}`} item={item} metadata={metadata} priority={index < PAGE_SIZE} index={index} />)}
      </div>
      <button
        id="loadMoreGithub"
        className={homepageLoadMoreClass}
        type="button"
        onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        style={{ display: hasMore ? "" : "none" }}
        disabled={!hasMore}
      >
        Load more
      </button>
    </>
  );
}
