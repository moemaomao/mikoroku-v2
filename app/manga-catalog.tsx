"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadFirestoreMangaCatalog } from "./lib/firebase-client";
import {
  getHomepageMangaSection,
  getHomepageMangaType,
  splitHomepageMangaSections,
} from "./lib/homepage-manga-sections";
import {
  cardClass,
  cardCoverClass,
  cardImageClass,
  cardOverlayClass,
  cardTitleClass,
  bottomBadgeBarClass,
  catalogGridClass,
  chapterBadgeClass,
  commissionBadgeClass,
  commissionCoverGradientClass,
  homepageLoadMoreClass,
  homepageSectionHeadingClass,
  skeletonListCardClass,
  skeletonListContentClass,
  skeletonListCoverClass,
  statusBadgeClass,
  statusBadgeColors,
  typeBadgeClass,
  typeBadgeColors,
  upBadgeClass,
} from "./lib/homepage-classes";
import {
  getSeriesCoverPreference,
  getSeriesCoverPreferenceUpdatedAt,
} from "./lib/series-cover-preferences";
import { imageProxyUrl } from "../lib/image-proxy";
import { CoverImage } from "./lib/cover-image";
import { setLocalStorageCacheItem } from "./lib/local-storage-cache";
import {
  getLatestChapterUpdateTimestamp,
  refreshGlobalAppearance,
} from "./lib/global-appearance";
import { latestChapterFromRecord } from "../lib/latest-chapter";
import { readCachedMangaMetadataPayload } from "./lib/manga-metadata";

type MangaItem = Record<string, unknown> & {
  title: string;
  slug?: string;
  img?: string;
  cover?: string;
  desc?: string;
  status?: string;
  type?: string;
  commissionEnabled?: boolean;
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
  lastChapterUpdated: number;
  chapterCount: number;
  managedByAdmin: boolean;
  source: string;
  origin: string;
  githubSlug: string;
  isDraft: boolean;
  status: string;
  type: string;
  commissionEnabled: boolean;
  nsfw?: boolean;
  cover: string;
  coverUpdatedAt: number;
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

function seriesHref(slug: string): string | null {
  const safeSlug = slug.trim();
  if (!safeSlug || safeSlug === "." || safeSlug === ".." || /[\\/]/.test(safeSlug)) {
    return null;
  }
  return `/series/${encodeURIComponent(safeSlug)}`;
}

const MANGA_CACHE_KEY = "mangaMetadataCache_v2";
const MANGA_LIGHT_CACHE_KEY = "mangaMetadataLightCache_v2";
const STALE_OK_DURATION = 24 * 60 * 60 * 1000;
const HERO_CACHE_DURATION = 30 * 60 * 1000;
const PAGE_SIZE = 24;

const homeCatalogMemory: {
  items: MangaItem[];
  metadata: Record<string, FirestoreMeta>;
  hero: MangaItem[];
  entrancePlayed: boolean;
} = {
  items: [],
  metadata: {},
  hero: [],
  entrancePlayed: false,
};

const cardClassStatic = cardClass.replace("animate-fade-in-up", "").replace(/  +/g, " ").trim();

function normalize(value: unknown): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function listSignature(list: MangaItem[]): string {
  return list.map((item) => `${normalize(item.title)}:${item.slug || ""}`).join("|");
}

function resolveCover(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim() === "-") return "";
  const cover = value.replace(/\.$/, "").trim();
  if (/^https?:\/\//i.test(cover)) return cover;
  if (/^\/\//.test(cover)) return `${window.location.protocol}${cover}`;
  return "";
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
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 1e8) return 0;
    return value < 1e11 ? value * 1000 : value;
  }
  if (typeof value === "object" && value) {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    if (numeric < 1e8) return 0;
    return numeric < 1e11 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  setLocalStorageCacheItem(key, JSON.stringify(value));
}

function rememberItems(list: MangaItem[]) {
  if (list.length) {
    homeCatalogMemory.items = list;
    if (typeof window !== "undefined") window.githubMangaList = list;
  }
}

function rememberMetadata(meta: Record<string, FirestoreMeta>) {
  if (meta && Object.keys(meta).length) {
    homeCatalogMemory.metadata = meta;
    if (typeof window !== "undefined") window.fsMangaMeta = meta;
  }
}

function rememberHero(list: MangaItem[]) {
  if (list.length) homeCatalogMemory.hero = list;
}

function readCachedItems(): MangaItem[] {
  if (homeCatalogMemory.items.length) return homeCatalogMemory.items;
  if (typeof window === "undefined") return [];
  if (Array.isArray(window.githubMangaList) && window.githubMangaList.length) {
    rememberItems(window.githubMangaList as MangaItem[]);
    return homeCatalogMemory.items;
  }
  const shared = window.__mangaShared;
  if (shared?.list?.length) {
    rememberItems(shared.list as MangaItem[]);
    return homeCatalogMemory.items;
  }
  const light = safeGet<{ time?: number; fullList?: MangaItem[] }>(MANGA_LIGHT_CACHE_KEY, {});
  if (Array.isArray(light.fullList) && light.fullList.length) {
    rememberItems(light.fullList);
    return homeCatalogMemory.items;
  }
  const full = safeGet<{ data?: MangaItem[] }>(MANGA_CACHE_KEY, {});
  if (Array.isArray(full.data) && full.data.length) {
    rememberItems(full.data);
    return homeCatalogMemory.items;
  }
  return [];
}

async function readIndexedDbItems(): Promise<MangaItem[]> {
  try {
    const payload = await readCachedMangaMetadataPayload();
    if (!payload?.manga?.length) return [];
    return payload.manga
      .filter((item) => typeof item.title === "string" && item.title.trim())
      .map((item) => {
        const title = String(item.title);
        const slug = typeof item.slug === "string" && item.slug
          ? item.slug
          : slugify(title);
        return {
          ...item,
          title,
          slug,
          img: resolveCover(item.cover || item.img),
          cover: resolveCover(item.cover || item.img),
        } as MangaItem;
      });
  } catch (error) {
    console.warn("IndexedDB homepage catalog could not be read.", error);
    return [];
  }
}

function readMangaDataList(): MangaItem[] {
  const mangaBySlug = new Map<string, MangaItem>();
  for (const value of Object.values(window.mangaData || {})) {
    if (!value || typeof value !== "object") continue;
    const manga = value as Record<string, unknown>;
    if (
      manga.isDraft === true ||
      typeof manga.slug !== "string" ||
      typeof manga.title !== "string" ||
      !manga.title.trim()
    ) {
      continue;
    }
    mangaBySlug.set(manga.slug, manga as MangaItem);
  }
  return [...mangaBySlug.values()];
}

function readCachedMetadata(): Record<string, FirestoreMeta> {
  if (Object.keys(homeCatalogMemory.metadata).length) return homeCatalogMemory.metadata;
  if (typeof window === "undefined") return {};
  if (window.fsMangaMeta && typeof window.fsMangaMeta === "object" && Object.keys(window.fsMangaMeta).length) {
    rememberMetadata(window.fsMangaMeta as Record<string, FirestoreMeta>);
    return homeCatalogMemory.metadata;
  }
  const fsCached = safeGet<Cache<Record<string, FirestoreMeta>>>("mangaFsMetaCache", {});
  if (fsCached.data && typeof fsCached.data === "object") {
    rememberMetadata(fsCached.data);
    return homeCatalogMemory.metadata;
  }
  return {};
}

function readHeroCache(): MangaItem[] {
  const cached = safeGet<Cache<MangaItem[]>>("mk_hero_v2", {});
  return cached.data && Date.now() - (cached.time || 0) < HERO_CACHE_DURATION ? cached.data : [];
}

function readCachedHero(): MangaItem[] {
  if (homeCatalogMemory.hero.length) return homeCatalogMemory.hero;
  if (typeof window === "undefined") return [];
  try {
    const hero = readHeroCache();
    if (hero.length) rememberHero(hero);
    return homeCatalogMemory.hero;
  } catch {
    return [];
  }
}

function sharedListLoader(force = false): Promise<MangaItem[]> {
  const shared =
    window.__mangaShared ||
    (window.__mangaShared = { list: null, promise: null, loaded: false });
  window.loadSharedMangaList ||= (refresh = false) => sharedListLoader(refresh);
  if (shared.loaded && !force && shared.list) return Promise.resolve(shared.list);
  if (shared.promise && !force) return shared.promise;

  const promise = loadFirestoreMangaCatalog({ force })
    .then((records) => {
      shared.list = records
        .filter((item): item is typeof item & { title: string } =>
          item.isDraft !== true &&
          typeof item.title === "string" &&
          item.title.trim().length > 0,
        )
        .map((item) => ({
          ...item,
          img: typeof item.cover === "string"
            ? item.cover
            : typeof item.img === "string" ? item.img : "",
        }));
      shared.loaded = true;
      return shared.list;
    })
    .catch((error: unknown) => {
      console.warn("Shared manga list failed to load.", error);
      shared.promise = null;
      throw error;
    });
  shared.promise = promise;
  return promise;
}

function metadataFromData(slug: string, data: Record<string, unknown>): FirestoreMeta {
  const updatedAt = toMilliseconds(data.updatedAt) || toMilliseconds(data.latestUpdate);
  return {
    slug,
    title: String(data.title || slug),
    updatedAt,
    latestUpdate: toMilliseconds(data.latestUpdate) || updatedAt,
    lastChapter: data.lastChapter == null ? "" : String(data.lastChapter),
    lastChapterUpdated: toMilliseconds(data.lastChapterUpdated),
    chapterCount: typeof data.chapterCount === "number" ? data.chapterCount : 0,
    managedByAdmin: Boolean(data.managedByAdmin),
    source: String(data.source || ""),
    origin: String(data.origin || ""),
    githubSlug: String(data.githubSlug || ""),
    isDraft: Boolean(data.isDraft),
    status: String(data.status || ""),
    type: String(data.type || ""),
    commissionEnabled: data.commissionEnabled === true,
    nsfw: typeof data.nsfw === "boolean" ? data.nsfw : undefined,
    cover: String(data.cover || ""),
    coverUpdatedAt: toMilliseconds(data.coverUpdatedAt),
    rating: data.rating,
  };
}

async function loadFirestoreMetadata(): Promise<Record<string, FirestoreMeta>> {
  try {
    const metadata: Record<string, FirestoreMeta> = {};
    const records = await loadFirestoreMangaCatalog();
    records.forEach((record) => {
      const item = metadataFromData(record.slug, record);
      metadata[item.slug] = item;
      if (item.githubSlug) metadata[item.githubSlug] = item;
    });
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
  return (
    metadata[item.slug || ""] ||
    metadata[String(item.githubSlug || "")] ||
    Object.values(metadata).find((entry) => entry && !entry.isDraft && normalize(entry.title) === title)
  );
}

function displayedUpdateTimestamp(item: MangaItem, meta?: FirestoreMeta): number {
  return [
    meta?.updatedAt,
    item.updatedAt,
    item.latestUpdate,
  ].reduce<number>((latest, value) => Math.max(latest, toMilliseconds(value)), 0);
}

function isManaged(metadata?: FirestoreMeta): boolean {
  return Boolean(
    metadata &&
      (metadata.source === "firestore" ||
        metadata.source === "hybrid" ||
        metadata.origin === "github" ||
        metadata.managedByAdmin ||
        metadata.updatedAt > 0),
  );
}

function chapterNumber(item: MangaItem, metadata?: FirestoreMeta): number {
  const candidates = [
    latestChapterFromRecord({
      ...item,
      lastChapter: metadata?.lastChapter || item.lastChapter,
      lastChapterUpdated: metadata?.lastChapterUpdated || item.lastChapterUpdated,
    }),
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
  const seriesSlug = metadata?.slug || item.slug || slugify(item.title);
  const preference = getSeriesCoverPreference(seriesSlug);
  const preferenceUpdatedAt = getSeriesCoverPreferenceUpdatedAt(seriesSlug);
  const coverUpdatedAt = metadata?.coverUpdatedAt || 0;
  const cover = resolveCover(
    (preference && preferenceUpdatedAt >= coverUpdatedAt ? preference : "") ||
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
    commissionEnabled: metadata?.commissionEnabled === true,
    nsfw: metadata?.nsfw ?? item.nsfw,
    altTitle: item.altTitle || "",
    author: item.author || "-",
    artist: item.artist || "-",
    updatedAt: metadata?.updatedAt || 0,
    latestUpdate: metadata?.latestUpdate || item.latestUpdate,
    lastChapterUpdated: metadata?.lastChapterUpdated || item.lastChapterUpdated || "",
    lastChapter: chapter >= 0 ? chapter : "",
    managedByAdmin: Boolean(metadata?.managedByAdmin),
    info: item,
    firestore,
    source: firestore ? "firestore" : "github",
    coverUpdatedAt: metadata?.coverUpdatedAt || 0,
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

function thumbnail(value: unknown, version = 0): string {
  const cover = resolveCover(value);
  return cover ? imageProxyUrl(cover, "cover", version) : "";
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
    const firestore =
      raw.firestore === true || raw.source === "firestore" ||
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
      commissionEnabled: meta?.commissionEnabled === true,
      nsfw: meta?.nsfw ?? item.nsfw,
      rating: item.rating ?? meta?.rating ?? null,
      desc: item.desc || "",
      genres: Array.isArray(item.genres) ? item.genres : [],
      altTitle: item.altTitle || "",
      author: item.author || "-",
      artist: item.artist || "-",
      updatedAt: meta?.updatedAt || 0,
      latestUpdate: meta?.latestUpdate || item.latestUpdate,
      lastChapterUpdated: meta?.lastChapterUpdated || item.lastChapterUpdated || "",
      lastChapter: meta?.lastChapter || "",
      managedByAdmin: Boolean(meta?.managedByAdmin),
      source: meta?.source || "",
      origin: meta?.origin || "",
    };
  });
  safeSet(MANGA_LIGHT_CACHE_KEY, { time: Date.now(), list: lightList, fullList: items });
}

function MangaCard({
  item,
  metadata,
  priority,
  index,
  animate,
}: {
  item: MangaItem;
  metadata: Record<string, FirestoreMeta>;
  priority: boolean;
  index: number;
  animate: boolean;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const meta = getMetadata(item, metadata);
  const manga = mangaForMetadata(item, meta);
  const slug = String(manga.slug || item.slug || slugify(item.title));
  const href = seriesHref(slug);
  const cover = String(manga.img || "");
  const image = thumbnail(cover, meta?.updatedAt);
  const status = String(manga.status || "").toLowerCase();
  const type = String(manga.type || "manga").toLowerCase();
  const commissionEnabled = manga.commissionEnabled === true;
  const chapter = chapterNumber(item, meta);
  const updatedAt = displayedUpdateTimestamp(item, meta);
  manga.rating = meta?.rating ?? item.rating ?? "-";

  if (!href) return null;

  return (
    <a
      href={href}
      className={animate ? cardClass : cardClassStatic}
      data-slug={slug}
      onClick={() => {
        try {
          localStorage.setItem("currentManga", JSON.stringify(manga));
        } catch {
          setLocalStorageCacheItem("currentManga", JSON.stringify(manga));
        }
      }}
    >
      <div
        data-key={normalize(item.title)}
        data-slug={slug}
        style={
          animate
            ? { animationDelay: `${Math.min(index, 24) * 0.04}s` }
            : undefined
        }
      >
        <div className={cardCoverClass}>
          {(Boolean(item.isUp) || isRecentUpdate(updatedAt)) && (
            <div className={upBadgeClass}>UP</div>
          )}
          {chapter >= 0 && (
            <div className={chapterBadgeClass}>Ch. {chapter}</div>
          )}
          {commissionEnabled && (
            <div className={commissionBadgeClass}>COMMISSION</div>
          )}
          {(type || status) && (
            <div className={bottomBadgeBarClass}>
              {type ? (
                <div
                  className={`${typeBadgeClass} ${
                    typeBadgeColors[type.replace(/\s+/g, "-")] ||
                    typeBadgeColors.default
                  }`}
                >
                  {type.toUpperCase()}
                </div>
              ) : (
                <div className={`${typeBadgeClass} text-[#bdbdbd]`} />
              )}
              {status ? (
                <div
                  className={`${statusBadgeClass} ${
                    statusBadgeColors[status] || "text-[#bdbdbd]"
                  }`}
                >
                  {status.toUpperCase()}
                </div>
              ) : (
                <div className={`${statusBadgeClass} text-[#bdbdbd]`} />
              )}
            </div>
          )}
          {image && !coverFailed ? (
            <CoverImage
              className={cardImageClass}
              src={cover}
              alt={item.title}
              width="150"
              height="225"
              decoding="async"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              nsfw={manga.nsfw === true}
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-[#1a1a1a] p-2.5 text-center text-[11px] font-semibold text-[#888] dark:bg-[#111]">
              Cover Not Found
            </div>
          )}
          {commissionEnabled && (
            <div className={commissionCoverGradientClass} />
          )}
          <div
            className={cardOverlayClass}
            style={
              commissionEnabled ? { paddingBottom: "3rem" } : undefined
            }
          >
            <div className={cardTitleClass}>{item.title}</div>
          </div>
        </div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className={`${cardClassStatic} skeleton-card overflow-hidden rounded-lg ${skeletonListCardClass}`}>
      <div className={`${cardCoverClass} skeleton-thumb animate-pulse bg-gradient-to-r from-[#1a1a1a] via-[#242424] to-[#1a1a1a] ${skeletonListCoverClass}`} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[50px] flex-col items-center justify-end gap-2 px-2 pb-7 list-mode:hidden md:flex">
        <div className="h-3 w-3/4 animate-pulse rounded bg-white/20" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[22px] items-stretch rounded-b-[10px] list-mode:hidden md:flex">
        <div className="h-full flex-1 animate-pulse bg-white/[0.06]" />
        <div className="h-full flex-1 animate-pulse bg-white/[0.04]" />
      </div>
      <div className={`hidden flex-1 flex-col justify-center gap-2 p-3 ${skeletonListContentClass}`}>
        <div className="h-3 w-3/4 animate-pulse rounded bg-[#2a2a2a]" />
        <div className="h-4 w-full animate-pulse rounded bg-[#222]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-[#222]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#222]" />
      </div>
    </div>
  );
}

function GithubMangaCatalog({ children }: { children?: ReactNode }) {
  const [heroContainer, setHeroContainer] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<MangaItem[]>([]);
  const [metadata, setMetadata] = useState<Record<string, FirestoreMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [heroItems, setHeroItems] = useState<MangaItem[]>([]);
  const [heroPage, setHeroPage] = useState(0);
  const [heroVisibleCount, setHeroVisibleCount] = useState(3);
  const [playEntrance, setPlayEntrance] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [chapterUpdateRevision, setChapterUpdateRevision] = useState(0);

  const itemsRef = useRef(items);
  const metadataRef = useRef(metadata);
  const listSigRef = useRef("");
  const chapterUpdateTimestampsRef = useRef(new Map<string, number>());
  const refreshRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  itemsRef.current = items;
  metadataRef.current = metadata;

  useEffect(() => {
    setHasMounted(true);
    const cached = readCachedItems();
    const cachedMeta = readCachedMetadata();
    const cachedHero = readCachedHero();
    if (cachedMeta && Object.keys(cachedMeta).length) setMetadata(cachedMeta);
    if (cached.length) {
      listSigRef.current = listSignature(cached);
      setItems(cached);
      setLoading(false);
      if (!homeCatalogMemory.entrancePlayed) setPlayEntrance(true);
    }
    if (cachedHero.length) setHeroItems(cachedHero);
    if (!cached.length) {
      void readIndexedDbItems().then((indexedItems) => {
        if (!indexedItems.length) return;
        listSigRef.current = listSignature(indexedItems);
        rememberItems(indexedItems);
        setItems(indexedItems);
        setLoading(false);
        if (!homeCatalogMemory.entrancePlayed) setPlayEntrance(true);
      });
    }
    const refreshChapterTimestamps = () => {
      chapterUpdateTimestampsRef.current.clear();
      setChapterUpdateRevision((revision) => revision + 1);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "chapterSourceMode" || event.key?.startsWith("chapters_")) {
        refreshChapterTimestamps();
      }
    };
    window.addEventListener("pageshow", refreshChapterTimestamps);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("pageshow", refreshChapterTimestamps);
      window.removeEventListener("storage", handleStorage);
      chapterUpdateTimestampsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!playEntrance || items.length === 0) return;
    const timer = window.setTimeout(() => {
      homeCatalogMemory.entrancePlayed = true;
      setPlayEntrance(false);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [playEntrance, items.length]);

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
    setError(false);

    const light = safeGet<{ time?: number; fullList?: MangaItem[] }>(MANGA_LIGHT_CACHE_KEY, {});
    const age = Date.now() - (light.time || 0);
    let renderedCache = false;
    const bootstrap = readCachedItems();
    const bootMeta = readCachedMetadata();

    if (!force && bootstrap.length) {
      if (Object.keys(bootMeta).length) {
        window.fsMangaMeta = bootMeta;
        setMetadata(bootMeta);
      }
      listSigRef.current = listSignature(bootstrap);
      rememberItems(bootstrap);
      setItems(bootstrap);
      renderedCache = true;
      setLoading(false);
    } else if (!force && Array.isArray(light.fullList) && light.fullList.length && age <= STALE_OK_DURATION) {
      const fsCached = safeGet<Cache<Record<string, FirestoreMeta>>>("mangaFsMetaCache", {});
      if (fsCached.data) {
        window.fsMangaMeta = fsCached.data;
        setMetadata(fsCached.data);
      }
      listSigRef.current = listSignature(light.fullList);
      rememberItems(light.fullList);
      setItems(light.fullList);
      renderedCache = true;
      setLoading(false);
    } else if (!renderedCache && itemsRef.current.length === 0) {
      setLoading(true);
    }

    try {
      const metadataPromise = loadFirestoreMetadata();
      const [list, freshMetadata] = await Promise.all([
        (async () => {
          const fresh = await (window.loadSharedMangaList || sharedListLoader)(force);
          safeSet(MANGA_CACHE_KEY, { time: Date.now(), data: fresh });
          return fresh;
        })(),
        metadataPromise,
      ]);
      const nextList = list || [];
      const nextMeta = freshMetadata || {};
      rememberMetadata(nextMeta);
      setMetadata(nextMeta);

      const sig = listSignature(nextList);
      if (sig !== listSigRef.current || itemsRef.current.length !== nextList.length) {
        listSigRef.current = sig;
        rememberItems(nextList);
        setItems(nextList);
      } else {
        rememberItems(nextList);
        itemsRef.current = nextList;
      }

      cacheLightList(nextList, nextMeta);
      const heroPool = mergeHeroItems(nextList, nextMeta);
      saveHeroCache(heroPool);
      rememberHero(heroPool.slice(0, Math.max(9, 3)));
      updateHero(nextList, nextMeta);
      window.dispatchEvent(new Event("mangaDataReady"));
    } catch (loadError) {
      console.error("GitHub manga catalog could not be loaded.", loadError);
      if (!renderedCache && itemsRef.current.length === 0) setError(true);
      setItems((current) => current);
    } finally {
      setLoading(false);
    }
  }, [updateHero]);
  refreshRef.current = refresh;

  useEffect(() => {
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
    const handleMangaDataReady = () => {
      const cachedList = readMangaDataList();
      if (cachedList.length) {
        listSigRef.current = listSignature(cachedList);
        rememberItems(cachedList);
        setItems(cachedList);
        setLoading(false);
      }

      const cachedMetadata = window.fsMangaMeta || metadataRef.current;
      if (cachedMetadata && Object.keys(cachedMetadata).length) {
        rememberMetadata(cachedMetadata);
        setMetadata(cachedMetadata);
      }
      updateHero(cachedList.length ? cachedList : window.githubMangaList || itemsRef.current, cachedMetadata);
    };
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

  useEffect(() => {
    if (visibleCount <= PAGE_SIZE) return;
    const frame = window.requestAnimationFrame(() => refreshGlobalAppearance());
    return () => window.cancelAnimationFrame(frame);
  }, [visibleCount]);

  const sortedItems = useMemo(() => {
    let sourceMode = "";
    if (typeof window !== "undefined") {
      try {
        sourceMode = window.localStorage.getItem("chapterSourceMode") || "";
      } catch (error) {
        console.warn("Chapter source preference could not be read for homepage sorting.", error);
      }
    }
    const timeOf = (item: MangaItem) => {
      const meta = getMetadata(item, metadata);
      const slug = meta?.slug || item.slug || slugify(item.title);
      const chapter = chapterNumber(item, meta);
      const fallbackChapter = chapter >= 0 ? String(chapter) : "";
      const cacheKey = `${slug}:${fallbackChapter}:${sourceMode}`;
      if (typeof window !== "undefined" && !chapterUpdateTimestampsRef.current.has(cacheKey)) {
        chapterUpdateTimestampsRef.current.set(
          cacheKey,
          getLatestChapterUpdateTimestamp(slug, fallbackChapter),
        );
      }

      const cachedChapterUpdate = typeof window !== "undefined"
        ? chapterUpdateTimestampsRef.current.get(cacheKey) || 0
        : 0;
      if (cachedChapterUpdate > 0) return cachedChapterUpdate;

      for (const value of [
        meta?.lastChapterUpdated,
        item.lastChapterUpdated,
        meta?.latestUpdate,
        item.latestUpdate,
        meta?.updatedAt,
        item.updatedAt,
      ]) {
        const timestamp = toMilliseconds(value);
        if (timestamp > 0) return timestamp;
      }
      return 0;
    };
    return splitHomepageMangaSections(items).latest.sort((left, right) => {
      const diff = timeOf(right) - timeOf(left);
      if (diff !== 0) return diff;
      return normalize(left.title).localeCompare(normalize(right.title));
    });
  }, [items, metadata, chapterUpdateRevision]);

  const visibleItems = sortedItems.slice(0, visibleCount);
  const maxHeroPage = Math.max(0, Math.ceil(heroItems.length / heroVisibleCount) - 1);
  const hasMore = visibleCount < sortedItems.length;

  return (
    <>
      {children}
      <div id="githubManga" className={catalogGridClass}>
        {error ? (
          <p style={{ textAlign: "center", padding: 40, color: "#f66" }}>
            Gagal memuat manga<br />
            <button type="button" onClick={() => void refresh(true)} style={{ marginTop: 12, padding: "8px 16px", cursor: "pointer" }}>Coba Lagi</button>
          </p>
        ) : visibleItems.length > 0 ? (
          visibleItems.map((item, index) => {
            const meta = getMetadata(item, metadata);
            const stableKey = String(meta?.slug || item.slug || normalize(item.title));
            return (
              <MangaCard
                key={stableKey}
                item={item}
                metadata={metadata}
                priority={index < 12}
                index={index}
                animate={playEntrance}
              />
            );
          })
        ) : loading ? (
          Array.from({ length: PAGE_SIZE }, (_, index) => <SkeletonCard key={index} />)
        ) : null}
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

type MangaRecord = Record<string, unknown> & {
  slug: string;
  title: string;
  updatedAt?: number;
  info?: Record<string, unknown>;
};

const FIREBASE_POST_CACHE_KEY = "manga_cache_v5";
const FIREBASE_POST_CACHE_TIME = 60 * 60 * 1000;
const FIREBASE_POST_PAGE_SIZE = 12;
const staticCardClass = cardClass.replace("animate-fade-in-up", "").replace(/  +/g, " ").trim();

function CatalogSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={`${staticCardClass} skeleton-card overflow-hidden rounded-lg ${skeletonListCardClass}`}
    >
      <div
        className={`${cardCoverClass} skeleton-thumb animate-pulse bg-gradient-to-r from-[#1a1a1a] via-[#242424] to-[#1a1a1a] ${skeletonListCoverClass}`}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[50px] flex-col items-center justify-end gap-2 px-2 pb-7 list-mode:hidden md:flex">
        <div className="h-3 w-3/4 animate-pulse rounded bg-white/20" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[22px] items-stretch rounded-b-[10px] list-mode:hidden md:flex">
        <div className="h-full flex-1 animate-pulse bg-white/[0.06]" />
        <div className="h-full flex-1 animate-pulse bg-white/[0.04]" />
      </div>
      <div
        className={`hidden flex-1 flex-col justify-center gap-2 p-3 ${skeletonListContentClass}`}
      >
        <div className="h-3 w-3/4 animate-pulse rounded bg-[#2a2a2a]" />
        <div className="h-4 w-full animate-pulse rounded bg-[#222]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-[#222]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#222]" />
      </div>
    </div>
  );
}

function updatedAtMillis(record: MangaRecord): number {
  const updatedAt = value(record, "updatedAt", value(record, "latestUpdate", 0));
  if (typeof updatedAt === "number") {
    return updatedAt < 1e12 ? updatedAt * 1000 : updatedAt;
  }
  if (typeof updatedAt === "string") {
    const numeric = Number(updatedAt);
    if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = Date.parse(updatedAt);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (updatedAt && typeof updatedAt === "object") {
    const timestamp = updatedAt as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return 0;
}

function value(record: MangaRecord, key: string, fallback: unknown = ""): unknown {
  return record[key] ?? record.info?.[key] ?? fallback;
}

function seriesType(record: MangaRecord): string {
  return getHomepageMangaType(record);
}

function isNovel(record: MangaRecord): boolean {
  return getHomepageMangaSection(record) === "novel";
}

function readCache(): { data: Record<string, MangaRecord>; expired: boolean } | null {
  try {
    const raw = localStorage.getItem(FIREBASE_POST_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as {
      time?: number;
      data?: Record<string, MangaRecord>;
    };
    if (!cached.data || typeof cached.data !== "object") return null;
    return {
      data: cached.data,
      expired: Date.now() - (cached.time || 0) > FIREBASE_POST_CACHE_TIME,
    };
  } catch (error) {
    console.warn("Firestore manga cache is invalid and will be ignored.", error);
    localStorage.removeItem(FIREBASE_POST_CACHE_KEY);
    return null;
  }
}

function readSharedRecords(): MangaRecord[] {
  const shared = (window as Window & { githubMangaList?: unknown }).githubMangaList;
  if (!Array.isArray(shared)) return [];
  return shared.filter((record): record is MangaRecord =>
    Boolean(record) &&
    typeof record === "object" &&
    !Array.isArray(record) &&
    typeof record.slug === "string" &&
    typeof record.title === "string" &&
    record.title.trim().length > 0,
  );
}

function cacheRecords(records: Record<string, MangaRecord>) {
  const data = Object.fromEntries(
    Object.entries(records).map(([slug, record]) => {
      const lastChapter = latestChapterFromRecord(record);
      return [
        slug,
        {
          slug,
          title: value(record, "title"),
          altTitle: value(record, "altTitle"),
          cover: value(record, "cover") || value(record, "img"),
          img: value(record, "img") || value(record, "cover"),
          type: value(record, "type"),
          status: value(record, "status"),
          nsfw: value(record, "nsfw") === true,
          rating: value(record, "rating", null),
          genres: value(record, "genres", []),
          author: value(record, "author"),
          artist: value(record, "artist"),
          circle: value(record, "circle"),
          series: value(record, "series"),
          publication: value(record, "publication"),
          serialization: value(record, "serialization"),
          updatedAt: record.updatedAt || 0,
          lastChapter,
          lastChapterUpdated: record.lastChapterUpdated || lastChapter,
          chapter: record.chapter,
          chapterCount: record.chapterCount,
          origin: record.origin || "firestore",
          source: record.source || "firestore",
        },
      ];
    }),
  );
  setLocalStorageCacheItem(FIREBASE_POST_CACHE_KEY, JSON.stringify({ time: Date.now(), data }));
}

async function fetchRecords(): Promise<Record<string, MangaRecord>> {
  const records: Record<string, MangaRecord> = {};
  const metadata = await loadFirestoreMangaCatalog();
  metadata.forEach((data) => {
    if (data.isDraft === true) return;
    records[data.slug] = { ...data, slug: data.slug } as MangaRecord;
  });
  return records;
}

function CatalogCard({
  record,
  section,
}: {
  record: MangaRecord;
  section: "random" | "novel";
}) {
  const chapter = latestChapterFromRecord(record);
  const type = seriesType(record);
  const selectedCover = getSeriesCoverPreference(record.slug);
  const cover = String(
    selectedCover || value(record, "cover") || value(record, "img") || "",
  );
  const thumbnail = cover
    ? imageProxyUrl(cover, "postCatalog")
    : "https://via.placeholder.com/80x110?text=No+Image";
  const status = String(value(record, "status") || "");
  const commissionEnabled = value(record, "commissionEnabled") === true;
  const updatedAt = Number(record.updatedAt || 0);
  const href = seriesHref(record.slug);

  if (!href) return null;

  return (
    <a
      className={cardClass}
      data-slug={record.slug}
      data-section={section}
      href={href}
      onClick={() => {
        try {
          localStorage.setItem("currentManga", JSON.stringify(record));
        } catch {
          setLocalStorageCacheItem("currentManga", JSON.stringify(record));
        }
      }}
    >
      <div className={cardCoverClass}>
        {chapter !== null && (
          <div className={chapterBadgeClass}>Ch. {chapter}</div>
        )}
        {updatedAt > 0 && Date.now() - updatedAt < 86400000 && (
          <div className={upBadgeClass}>UP</div>
        )}
        {commissionEnabled && (
          <div className={commissionBadgeClass}>COMMISSION</div>
        )}
        {(type || status) && (
          <div className={bottomBadgeBarClass}>
            {type ? (
              <div
                className={`${typeBadgeClass} ${
                  typeBadgeColors[type.replace(/\s+/g, "-")] ||
                  typeBadgeColors.default
                }`}
              >
                {type.toUpperCase()}
              </div>
            ) : (
              <div className={`${typeBadgeClass} text-[#bdbdbd]`} />
            )}
            {status ? (
              <div
                className={`${statusBadgeClass} ${
                  statusBadgeColors[status.toLowerCase()] || "text-[#bdbdbd]"
                }`}
              >
                {status.toUpperCase()}
              </div>
            ) : (
              <div className={`${statusBadgeClass} text-[#bdbdbd]`} />
            )}
          </div>
        )}
        <CoverImage
          key={`${section}-${record.slug}-${thumbnail}`}
          className={cardImageClass}
          src={thumbnail}
          alt={record.title}
          loading="lazy"
          decoding="async"
          nsfw={value(record, "nsfw") === true}
          style={{ backgroundColor: "#1a1a1a" }}
          onError={(event) => {
            event.currentTarget.src =
              "https://via.placeholder.com/80x110?text=No+Image";
          }}
        />
        {commissionEnabled && <div className={commissionCoverGradientClass} />}
        <div
          className={cardOverlayClass}
          style={commissionEnabled ? { paddingBottom: "3rem" } : undefined}
        >
          <div className={cardTitleClass}>{record.title}</div>
        </div>
      </div>
    </a>
  );
}

function FirebasePostCatalog() {
  const [records, setRecords] = useState<MangaRecord[]>([]);
  const [randomManga, setRandomManga] = useState<MangaRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(FIREBASE_POST_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const applyRecords = useCallback((list: MangaRecord[]) => {
    const sections = splitHomepageMangaSections(
      list.filter((record) => typeof record.title === "string" && record.title.trim()),
    );
    setRecords([...sections.latest, ...sections.random, ...sections.novel]);
    setRandomManga(sections.random.sort((left, right) =>
      updatedAtMillis(right) - updatedAtMillis(left) ||
      left.slug.localeCompare(right.slug),
    ));
    setIsLoading(false);
    setLoadError("");
  }, []);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const fresh = await fetchRecords();
        if (signal?.aborted) return;
        cacheRecords(fresh);
        applyRecords(Object.values(fresh));
        setLoadError("");
      } catch (error) {
        if (signal?.aborted) return;
        console.error("Firestore catalog could not be loaded.", error);
        setLoadError("Katalog Firestore gagal dimuat.");
        setIsLoading(false);
      }
    },
    [applyRecords],
  );

  useEffect(() => {
    const syncSharedCatalog = () => {
      const shared = readSharedRecords();
      if (shared.length) applyRecords(shared);
    };

    const cache = readCache();
    if (cache) {
      applyRecords(
        Object.values(cache.data).filter((record) => record && record.title),
      );
    }
    syncSharedCatalog();
    window.addEventListener("mangaDataReady", syncSharedCatalog);
    const controller = new AbortController();
    void refresh(controller.signal);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("mangaDataReady", syncSharedCatalog);
    };
  }, [refresh, applyRecords]);

  const novels = records.filter(isNovel).sort(
    (left, right) =>
      updatedAtMillis(right) - updatedAtMillis(left) ||
      left.slug.localeCompare(right.slug),
  );
  const hasMoreManga = visibleCount < randomManga.length;
  const hasMoreNovel = visibleCount < novels.length;

  return (
    <>
      <h2 className={homepageSectionHeadingClass}>
        <span>Random Doujin dan sejenisnya</span>
      </h2>
      <div id="firebaseManga" className={catalogGridClass} aria-busy={isLoading && randomManga.length === 0}>
        {randomManga.length > 0 ? randomManga.slice(0, visibleCount).map((record) => (
          <CatalogCard
            key={`random-${record.slug}`}
            section="random"
            record={record}
          />
        )) : isLoading ? Array.from({ length: FIREBASE_POST_PAGE_SIZE }, (_, index) => (
          <CatalogSkeleton key={`random-skeleton-${index}`} />
        )) : null}
      </div>
      <button
        id="loadMoreFirebase"
        className={homepageLoadMoreClass}
        type="button"
        hidden={!hasMoreManga}
        disabled={!hasMoreManga}
        onClick={() => setVisibleCount((count) => count + FIREBASE_POST_PAGE_SIZE)}
      >
        Load more
      </button>
      <h2 className={homepageSectionHeadingClass}>
        <span>Latest Novel</span>
      </h2>
      <div id="firebaseNovel" className={catalogGridClass} aria-busy={isLoading && novels.length === 0}>
        {novels.length > 0 ? novels.slice(0, visibleCount).map((record) => (
          <CatalogCard
            key={`novel-${record.slug}`}
            section="novel"
            record={record}
          />
        )) : isLoading ? Array.from({ length: FIREBASE_POST_PAGE_SIZE }, (_, index) => (
          <CatalogSkeleton key={`novel-skeleton-${index}`} />
        )) : null}
      </div>
      {loadError && records.length === 0 && <p role="alert">{loadError}</p>}
    </>
  );
}

export default function MangaCatalog({ children }: { children?: ReactNode }) {
  return (
    <>
      <GithubMangaCatalog>{children}</GithubMangaCatalog>
      <FirebasePostCatalog />
    </>
  );
}
