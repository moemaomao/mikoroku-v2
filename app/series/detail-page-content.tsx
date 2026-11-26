"use client";

import { createElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getApps, initializeApp } from "firebase/app";
import { addDoc, collection, doc, getDoc, getDocs, getDocsFromServer, getFirestore, serverTimestamp } from "firebase/firestore";
import CommunityWidgets from "../community-widgets";
import { BannerAdSlot } from "../advertisement-manager";
import { CoverImage, useCoverImageSource } from "../lib/cover-image";
import { chapterNumberFromRecord, normalizeChapterNumber } from "../../lib/chapter-number";
import {
  fetchBloggerFeed,
  type BloggerFeedEntry,
} from "../lib/blogger-feed-client";
import { imageProxyUrl } from "../../lib/image-proxy";
import { originalReaderImageUrl } from "../../lib/reader-image-url";
import { isNovelSeries } from "../../lib/reader-kind";
import { isNsfwMangaRecord, useNsfwVisibility } from "../lib/nsfw";
import { AUTH_USER_CHANGE_EVENT } from "../lib/admin-access";
import {
  SERIES_COVER_PREFERENCE_STORAGE_KEY,
  SERIES_COVER_PREFERENCE_UPDATED_AT_KEY,
} from "../lib/series-cover-preferences";
import RecommendationSidebar from "./recommendation-sidebar";
import ReaderServerNotice from "./reader-server-notice";
import SiteFooter from "../site-footer";
import SeriesLoadingContent from "./series-loading-content";
import GlobalAuth from "../global-auth";
import {
  getCachedFirestoreMangaCatalog,
  initializeFirebaseClient,
  loadFirestoreMangaCatalog,
} from "../lib/firebase-client";
import {
  getSeriesNotificationUserId,
  loadSeriesNotificationSubscriptions,
  readSeriesNotificationSubscriptions,
  removeSeriesNotificationSubscription,
  saveLocalSeriesNotificationSubscription,
  saveSeriesNotificationSubscription,
  seriesUpdateVersion,
  SERIES_NOTIFICATIONS_UPDATED_EVENT,
  SERIES_NOTIFICATIONS_STORAGE_KEY,
} from "../lib/series-notifications";
import {
  adjustCachedSeriesStatistic,
  getCachedSeriesStatistics,
  recordSeriesViewInCache,
  syncSeriesStatisticsForVisit,
  type SeriesStatistics,
} from "../lib/series-statistics";
import { setCachedBookmarkCount } from "../lib/reading-stats-cache";
import { setLocalStorageCacheItem } from "../lib/local-storage-cache";
import {
  ensureSeriesTracked,
  markLocalBookmarksUpdated,
} from "../../lib/reading-stats";
import {
  fetchMangaCatalogSourceMode,
  fetchMangaMetadataPayload,
  MANGA_METADATA_CACHE_UPDATED_EVENT,
  MANGA_METADATA_UPDATED_EVENT,
} from "../lib/manga-metadata";
import {
  compactChapterCache,
  mergeSharedChapterCache,
  readSharedChapterCache,
} from "../lib/chapter-cache";
import {
  GLOBAL_APPEARANCE_KEY,
  readGlobalAppearance,
} from "../lib/global-appearance";
import MangaDataProvider from "../manga-data-provider";
import UserModals from "../user-modals";

type Manga = {
  slug: string;
  title: string;
  img?: string;
  cover?: string;
  covers?: string[];
  coverNumbers?: Record<string, string>;
  nsfw?: boolean;
  coverUpdatedAt?: string | number;
  desc?: string;
  genres?: string[];
  rating?: number | string | null;
  status?: string;
  type?: string;
  altTitle?: string;
  author?: string;
  artist?: string;
  publication?: string;
  serialization?: string;
  demographic?: string | string[];
  series?: string;
  characters?: string | string[];
  circle?: string;
  group?: string;
  femaleTags?: string | string[];
  maleTags?: string | string[];
  updatedAt?: string | number;
  latestUpdate?: string | number;
  source?: string;
  info?: Record<string, unknown>;
  catalogSourceMode?: "effective" | "baseline";
};

type Chapter = {
  id?: string;
  num: string | number;
  title?: string;
  slug?: string;
  url?: string;
  thumbnail?: string;
  images?: string[];
  isNovel?: boolean;
  source: "blogger" | "blogger2" | "firestore";
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  timestamp?: string | number;
  order?: number;
};

type DetailState = "loading" | "ready" | "not-found" | "error";
type ChapterSource = Chapter["source"];

type SeriesBookmarkFirebase = NonNullable<Window["firebase"]>;

const COMMENT_COUNT_FIREBASE_APP_NAME = "mikoroku-series-comment-count";
const COMMENT_COUNT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
  authDomain: "widget-comment.firebaseapp.com",
  projectId: "widget-comment",
  storageBucket: "widget-comment.firebasestorage.app",
  messagingSenderId: "249700505242",
  appId: "1:249700505242:web:dab240af09caf30ad7f123",
};

function getCommentCountFirestore() {
  const app = getApps().find((candidate) => candidate.name === COMMENT_COUNT_FIREBASE_APP_NAME) ??
    initializeApp(COMMENT_COUNT_FIREBASE_CONFIG, COMMENT_COUNT_FIREBASE_APP_NAME);
  return getFirestore(app);
}

const genreAccentColors = [
  { accent: "#72d879", lightText: "#267a31" },
  { accent: "#82c8ff", lightText: "#236999" },
  { accent: "#c78cff", lightText: "#713aa0" },
  { accent: "#ff8585", lightText: "#a83b3b" },
  { accent: "#f3c96b", lightText: "#8a6710" },
  { accent: "#59d7cf", lightText: "#14786f" },
] as const;


declare global {
  interface Window {
    mangaData?: Record<string, unknown>;
    firestore?: unknown;
    fs?: {
      collection?: (...args: unknown[]) => unknown;
      doc?: (...args: unknown[]) => unknown;
      getDoc?: (reference: unknown) => Promise<{
        exists: () => boolean;
        data: () => Record<string, unknown>;
      }>;
      getDocs?: (reference: unknown) => Promise<{
        empty: boolean;
        forEach: (callback: (document: {
          id: string;
          data: () => Record<string, unknown>;
          updateTime?: { toDate?: () => Date; seconds?: number };
        }) => void) => void;
      }>;
      addDoc?: (reference: unknown, data: Record<string, unknown>) => Promise<unknown>;
      serverTimestamp?: () => unknown;
    };
  }
}

const FIRESTORE_BASE =
  "https://firestore.googleapis.com/v1/projects/mikoroku/databases/(default)/documents";

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizedSlug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-");
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item).trim()).filter(Boolean);
  return asString(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function firestoreDate(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toISOString();
  }
  return asString(value);
}

type SynopsisNode = {
  tag: string;
  children: Array<SynopsisNode | string>;
  href?: string;
};

function decodeSynopsisText(value: string): string {
  return value
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function parseSynopsis(value: string): Array<SynopsisNode | string> {
  const allowedTags = new Set(["p", "strong", "b", "em", "i", "u", "ol", "ul", "li", "br", "a", "h1", "h2", "h3", "blockquote"]);
  const root: SynopsisNode = { tag: "", children: [] };
  const stack = [root];
  const tokens = value.match(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+|</gi) || [];

  for (const token of tokens) {
    if (token.startsWith("<!--")) continue;
    const tagMatch = token.match(/^<\/?([a-z][\w-]*)\b([^>]*)>/i);
    if (!tagMatch) {
      stack[stack.length - 1].children.push(decodeSynopsisText(token));
      continue;
    }

    const tag = tagMatch[1].toLowerCase();
    if (!allowedTags.has(tag)) continue;
    if (token.startsWith("</")) {
      const matchingIndex = stack.findLastIndex((node) => node.tag === tag);
      if (matchingIndex > 0) stack.length = matchingIndex;
      continue;
    }

    const node: SynopsisNode = { tag, children: [] };
    if (tag === "a") {
      const href = tagMatch[2].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const candidate = decodeSynopsisText(href?.[1] || href?.[2] || href?.[3] || "").trim();
      if (/^(https?:|mailto:)/i.test(candidate)) node.href = candidate;
    }
    stack[stack.length - 1].children.push(node);
    if (tag !== "br" && !/\/\s*>$/.test(token)) stack.push(node);
  }
  return root.children;
}

function renderSynopsisNodes(nodes: Array<SynopsisNode | string>, keyPrefix = "synopsis"): ReactNode[] {
  return nodes.map((node, index) => {
    if (typeof node === "string") return node;
    const key = `${keyPrefix}-${index}`;
    const props = node.tag === "a" && node.href
      ? { key, href: node.href, target: "_blank", rel: "noopener noreferrer" }
      : { key };
    return createElement(node.tag, props, ...renderSynopsisNodes(node.children, key));
  });
}

function decodeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const field = value as Record<string, unknown>;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return Number(field.integerValue);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("booleanValue" in field) return field.booleanValue;
  if ("timestampValue" in field) return field.timestampValue;
  if ("nullValue" in field) return null;
  if ("arrayValue" in field) {
    const arrayValue = field.arrayValue as { values?: unknown[] } | undefined;
    return (arrayValue?.values || []).map(decodeFirestoreValue);
  }
  if ("mapValue" in field) {
    const mapValue = field.mapValue as { fields?: Record<string, unknown> } | undefined;
    return Object.fromEntries(
      Object.entries(mapValue?.fields || {}).map(([key, item]) => [key, decodeFirestoreValue(item)]),
    );
  }
  return field;
}

function decodeFirestoreDocument(document: {
  name?: string;
  fields?: Record<string, unknown>;
}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document.fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

function resolveCover(value: unknown): string {
  const cover = asString(value).trim().replace(/\.$/, "");
  if (!cover) return "";
  if (/^https?:\/\//i.test(cover)) return cover;
  return /^https?:\/\//i.test(cover) ? cover : "";
}

function normalizeManga(value: Record<string, unknown>, fallbackSlug: string): Manga {
  const rawTitle = asString(value.title, fallbackSlug);
  const slug = asString(value.slug, normalizedSlug(rawTitle) || fallbackSlug);
  const info = {
    ...(value.info && typeof value.info === "object" ? value.info as Record<string, unknown> : {}),
    ...(value.metadata && typeof value.metadata === "object" ? value.metadata as Record<string, unknown> : {}),
  };
  const cover = resolveCover(value.img || value.cover || value.image || value.thumbnail || value.thumb || info.cover || info.img);
  const genres = info.genres ?? info.genre ?? value.genres ?? value.genre;
  const coverNumbers = info.coverNumbers ?? value.coverNumbers;

  return {
    slug,
    title: rawTitle,
    img: cover,
    cover,
    covers: asStringList(info.covers ?? value.covers).map(resolveCover).filter(Boolean),
    nsfw: typeof info.nsfw === "boolean"
      ? info.nsfw
      : typeof value.nsfw === "boolean"
        ? value.nsfw
        : undefined,
    coverNumbers: coverNumbers && typeof coverNumbers === "object" && !Array.isArray(coverNumbers)
      ? Object.fromEntries(Object.entries(coverNumbers).map(([url, number]) => [url, asString(number)]))
      : {},
    desc: asString(info.desc || info.description || info.synopsis || info.sinopsis || value.desc || value.description || value.synopsis || value.sinopsis),
    genres: Array.isArray(genres) ? genres.map((genre) => asString(genre)) : asStringList(genres),
    rating: (info.rating ?? value.rating) as number | string | null | undefined,
    status: asString(info.status || value.status, "UNKNOWN"),
    type: asString(info.type || value.type, "Manga"),
    altTitle: asString(info.altTitle || value.altTitle),
    author: asString(info.author || value.author, "-"),
    artist: asString(info.artist || value.artist, "-"),
    publication: asString(info.publication || info.year || value.publication || value.year, "-"),
    serialization: asString(info.serialization || value.serialization, "-"),
    demographic: (info.demographic || value.demographic) as string | string[] | undefined,
    series: asString(info.series || value.series),
    characters: (info.characters || value.characters) as string | string[] | undefined,
    circle: asString(info.circle || value.circle),
    group: asString(info.group || value.group),
    femaleTags: (info.femaleTags || value.femaleTags) as string | string[] | undefined,
    maleTags: (info.maleTags || value.maleTags) as string | string[] | undefined,
    updatedAt: asString(info.updatedAt || info.latestUpdate || info.date || value.updatedAt || value.latestUpdate),
    latestUpdate: asString(info.latestUpdate || info.updatedAt || info.date || value.latestUpdate || value.updatedAt),
    source: asString(info.source || value.source),
    coverUpdatedAt: asString(info.coverUpdatedAt || value.coverUpdatedAt),
    info,
  };
}

function hasMetadataValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized !== "" && normalized !== "-" && normalized !== "unknown";
  }
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  return value !== null && value !== undefined;
}

function preferMetadata<T>(preferred: T | undefined, fallback: T | undefined): T | undefined {
  return hasMetadataValue(preferred) ? preferred : fallback;
}

const DETAIL_METADATA_FIELDS = [
  "publication",
  "serialization",
  "series",
  "characters",
  "group",
  "circle",
] as const;

function hasCachedDetailMetadata(manga: Manga): boolean {
  const info = manga.info || {};
  const hasInfoFields = DETAIL_METADATA_FIELDS.every((field) =>
    Object.prototype.hasOwnProperty.call(info, field),
  );
  return hasInfoFields || (
    Object.keys(info).length === 0 &&
    DETAIL_METADATA_FIELDS.every((field) =>
      Object.prototype.hasOwnProperty.call(manga, field),
    )
  );
}

function mergeCachedManga(cached: Manga, fallback: Manga): Manga {
  return {
    ...fallback,
    ...cached,
    publication: preferMetadata(cached.publication, fallback.publication),
    serialization: preferMetadata(cached.serialization, fallback.serialization),
    series: preferMetadata(cached.series, fallback.series),
    characters: preferMetadata(cached.characters, fallback.characters),
    group: preferMetadata(cached.group, fallback.group),
    circle: preferMetadata(cached.circle, fallback.circle),
    info: { ...fallback.info, ...cached.info },
  };
}

const SERIES_COVER_PREFERENCE_DB = "mikoroku-series-cover-preferences";
const SERIES_COVER_PREFERENCE_STORE = "selections";
type SeriesCoverPreference = { slug: string; url: string };

function openSeriesCoverPreferences(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SERIES_COVER_PREFERENCE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SERIES_COVER_PREFERENCE_STORE)) {
        request.result.createObjectStore(SERIES_COVER_PREFERENCE_STORE, { keyPath: "slug" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open series cover preferences."));
    request.onblocked = () => reject(new Error("Series cover preferences are blocked by another browser tab."));
  });
}

async function getSavedSeriesCoverUrl(slug: string): Promise<string | null> {
  const database = await openSeriesCoverPreferences();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SERIES_COVER_PREFERENCE_STORE, "readonly");
    const request = transaction.objectStore(SERIES_COVER_PREFERENCE_STORE).get(slug);
    request.onsuccess = () => {
      resolve((request.result as SeriesCoverPreference | undefined)?.url || null);
      database.close();
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("Could not read the selected series cover."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Reading the selected series cover was aborted."));
    };
  });
}

async function saveSeriesCoverUrl(slug: string, url: string): Promise<void> {
  const database = await openSeriesCoverPreferences();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SERIES_COVER_PREFERENCE_STORE, "readwrite");
    transaction.objectStore(SERIES_COVER_PREFERENCE_STORE).put({ slug, url } satisfies SeriesCoverPreference);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not save the selected series cover."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Saving the selected series cover was aborted."));
    };
  });
}

function getBloggerChapterNumber(title: string, url: string): string {
  const match = title.match(/(?:chapter|chapters|ch\.?|chap\.?|ep\.?|episode)\s*[:\-]?\s*(\d+(?:[.,．]\d+)?)/i)
    || title.match(/第\s*(\d+(?:[.,．]\d+)?)\s*[話话回]?/)
    || title.match(/#\s*(\d+(?:[.,．]\d+)?)/)
    || [...title.matchAll(/(\d+(?:[.,．]\d+)?)/g)].at(-1)
    || url.match(/(?:chapter|ch)[_-]?(\d+(?:[.-]\d+)?)/i);
  const raw = match?.[1]?.replace(/[,_．]/g, ".").replace(/-/g, ".");
  return raw ? normalizeChapterNumber(raw) || "?" : "?";
}

function parseBloggerEntries(data: { feed?: { entry?: BloggerFeedEntry[] } }, source: ChapterSource): Chapter[] {
  return (data.feed?.entry || []).map((entry) => {
    const title = entry.title?.$t || "";
    const url = entry.link?.find((link) => link.rel === "alternate")?.href || "";
    const html = entry.content?.$t || "";
    const images = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
    return {
      num: getBloggerChapterNumber(title, url),
      title,
      url,
      images,
      thumbnail: (images[2] || images[0] || "").replace(/\/s\d+/, "/s50"),
      createdAt: entry.updated?.$t || entry.published?.$t || "",
      source,
    };
  });
}

const SERIES_DETAIL_CACHE_DB = "mikoroku-series-detail-cache";
const SERIES_DETAIL_CACHE_STORE = "details";
const CHAPTER_CACHE_DURATION_MS = 30 * 60 * 1000;
const seriesDetailMemoryCache = new Map<string, Manga>();

type SeriesDetailCacheEntry = {
  slug: string;
  time: number;
  data: Manga;
};

function openSeriesDetailCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SERIES_DETAIL_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SERIES_DETAIL_CACHE_STORE)) {
        request.result.createObjectStore(SERIES_DETAIL_CACHE_STORE, { keyPath: "slug" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the series detail cache."));
    request.onblocked = () => reject(new Error("Series detail cache is blocked by another browser tab."));
  });
}

async function readIndexedDbManga(slug: string): Promise<Manga | null> {
  if (!("indexedDB" in window)) return null;
  const database = await openSeriesDetailCache();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SERIES_DETAIL_CACHE_STORE, "readonly");
    const request = transaction.objectStore(SERIES_DETAIL_CACHE_STORE).get(slug);
    let manga: Manga | null = null;
    request.onsuccess = () => {
      const entry = request.result as SeriesDetailCacheEntry | undefined;
      if (entry?.data) {
        manga = normalizeManga(entry.data, slug);
      }
    };
    request.onerror = () => transaction.abort();
    transaction.oncomplete = () => {
      database.close();
      resolve(manga);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Could not read the series detail cache."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Reading the series detail cache was aborted."));
    };
  });
}

async function writeIndexedDbManga(slug: string, manga: Manga): Promise<void> {
  if (!("indexedDB" in window)) {
    throw new Error("IndexedDB is unavailable in this browser.");
  }
  const database = await openSeriesDetailCache();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(SERIES_DETAIL_CACHE_STORE, "readwrite");
    transaction.objectStore(SERIES_DETAIL_CACHE_STORE).put({
      slug,
      time: Date.now(),
      data: manga,
    } satisfies SeriesDetailCacheEntry);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not write the series detail cache."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Writing the series detail cache was aborted."));
    };
  });
}

function getLegacyCachedManga(slug: string): Manga | null {
  try {
    const cached = localStorage.getItem(`detail_${slug}`);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { time?: number; data?: Record<string, unknown> };
    if (parsed.data) {
      return normalizeManga(parsed.data, slug);
    }
  } catch (error) {
    console.warn("Cache detail manga tidak valid dan akan diabaikan.", error);
    try {
      localStorage.removeItem(`detail_${slug}`);
    } catch (removeError) {
      console.warn("Cache detail manga yang tidak valid tidak dapat dihapus.", removeError);
    }
  }
  return null;
}

function getCurrentMangaForSlug(slug: string): Manga | null {
  const mangaData = typeof window !== "undefined" ? window.mangaData : undefined;
  for (const [key, value] of Object.entries(mangaData || {})) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    if (asString(record.slug, key) !== slug && key !== slug) continue;
    return normalizeManga(record, slug);
  }

  try {
    const current = JSON.parse(localStorage.getItem("currentManga") || "null") as
      | Record<string, unknown>
      | null;
    if (!current || asString(current.slug) !== slug) return null;
    return normalizeManga(current, slug);
  } catch (error) {
    console.warn("Data manga saat ini tidak valid dan akan diabaikan.", error);
    return null;
  }
}

async function getCachedManga(slug: string): Promise<Manga | null> {
  const memoryCached = seriesDetailMemoryCache.get(slug);
  if (memoryCached) return memoryCached;

  try {
    const cached = await readIndexedDbManga(slug);
    if (cached) {
      seriesDetailMemoryCache.set(slug, cached);
      return cached;
    }
  } catch (error) {
    console.warn(`IndexedDB detail manga gagal dibaca untuk ${slug}.`, error);
  }

  const legacyCached = getLegacyCachedManga(slug);
  if (!legacyCached) return null;
  seriesDetailMemoryCache.set(slug, legacyCached);
  try {
    await writeIndexedDbManga(slug, legacyCached);
    localStorage.removeItem(`detail_${slug}`);
  } catch (error) {
    console.warn(`Cache detail manga lama untuk ${slug} tidak dapat dipindahkan ke IndexedDB.`, error);
  }
  return legacyCached;
}

function cacheLegacyMangaDetail(slug: string, manga: Manga): void {
  const detailPrefix = "detail_";
  const cacheKey = `${detailPrefix}${slug}`;
  try {
    const existingKeys = Object.keys(localStorage)
      .filter((key) => key.startsWith(detailPrefix) && key !== cacheKey)
      .map((key) => {
        try {
          const cached = JSON.parse(localStorage.getItem(key) || "null") as { time?: number } | null;
          return { key, time: cached?.time || 0 };
        } catch {
          return { key, time: 0 };
        }
      })
      .sort((left, right) => left.time - right.time);
    while (existingKeys.length >= 8) {
      const oldest = existingKeys.shift();
      if (oldest) localStorage.removeItem(oldest.key);
    }
  } catch (error) {
    console.warn("Cache detail manga lama tidak dapat dibersihkan.", error);
  }

  try {
    setLocalStorageCacheItem("currentManga", JSON.stringify(manga));
  } catch (error) {
    console.warn("Detail manga dimuat, tetapi cache saat ini tidak dapat disimpan.", error);
  }

  try {
    setLocalStorageCacheItem(cacheKey, JSON.stringify({ time: Date.now(), data: manga }));
  } catch (error) {
    console.warn(`Detail manga ${slug} dimuat, tetapi cache-nya tidak dapat disimpan.`, error);
  }
}

async function cacheMangaDetail(slug: string, manga: Manga): Promise<void> {
  seriesDetailMemoryCache.set(slug, manga);
  try {
    await writeIndexedDbManga(slug, manga);
  } catch (error) {
    console.warn(`IndexedDB detail manga gagal disimpan untuk ${slug}; memakai cache localStorage.`, error);
    cacheLegacyMangaDetail(slug, manga);
    return;
  }

  try {
    setLocalStorageCacheItem("currentManga", JSON.stringify(manga));
  } catch (error) {
    console.warn("Detail manga dimuat, tetapi cache saat ini tidak dapat disimpan.", error);
  }
}

async function loadManga(
  slug: string,
  signal: AbortSignal,
  force = false,
  onAvailableManga?: (manga: Manga) => void,
): Promise<Manga | null> {
  const currentManga = getCurrentMangaForSlug(slug);
  const memoryCached = seriesDetailMemoryCache.get(slug);
  const firstAvailable = memoryCached || currentManga;
  if (!force && firstAvailable) onAvailableManga?.(firstAvailable);

  const cachedManga = await getCachedManga(slug);
  const immediatelyAvailable = cachedManga || currentManga;
  if (!force && immediatelyAvailable && immediatelyAvailable !== firstAvailable) {
    onAvailableManga?.(immediatelyAvailable);
  }

  const responses = await Promise.allSettled([
    fetchMangaMetadataPayload({ signal, force }).then((payload) => {
      const result = payload.manga.find((item) =>
        asString(item.slug) === slug ||
        normalizedSlug(asString(item.title)) === slug ||
        normalizedKey(asString(item.title)) === normalizedKey(slug),
      );
      return {
        manga: result ? normalizeManga(result, slug) : null,
        sourceMode: payload.catalogSourceMode === "baseline" ? "baseline" as const : "effective" as const,
      };
    }),
    loadFirestoreMangaCatalog({ force }),
    (async () => {
      const response = await fetch(
        `/api/manga/${encodeURIComponent(slug)}${force ? "?refresh=1" : ""}`,
        { signal, cache: force ? "no-store" : "default" },
      );
      if (!response.ok) return null;
      return normalizeManga(await response.json() as Record<string, unknown>, slug);
    })(),
  ]);

  const kvManga = responses[2].status === "fulfilled" ? responses[2].value : null;
  const catalogManga = responses[0].status === "fulfilled"
    ? responses[0].value.manga
    : kvManga;
  const catalogSourceMode = responses[0].status === "fulfilled"
    ? responses[0].value.sourceMode
    : undefined;
  const metadataRecords = responses[1].status === "fulfilled" ? responses[1].value : [];
  const metadataRecord = metadataRecords.find((record) => record.slug === slug);
  const metadataManga = metadataRecord
    ? normalizeManga(metadataRecord, slug)
    : null;
  let manga = catalogManga && metadataManga
    ? {
      ...catalogManga,
      desc: preferMetadata(metadataManga.desc, catalogManga.desc),
      genres: preferMetadata(metadataManga.genres, catalogManga.genres),
      rating: preferMetadata(metadataManga.rating, catalogManga.rating),
      status: preferMetadata(metadataManga.status, catalogManga.status),
      type: metadataManga.type === "Manga" ? catalogManga.type : metadataManga.type,
      altTitle: preferMetadata(metadataManga.altTitle, catalogManga.altTitle),
      author: preferMetadata(metadataManga.author, catalogManga.author),
      artist: preferMetadata(metadataManga.artist, catalogManga.artist),
      publication: preferMetadata(metadataManga.publication, catalogManga.publication),
      serialization: preferMetadata(metadataManga.serialization, catalogManga.serialization),
      demographic: preferMetadata(metadataManga.demographic, catalogManga.demographic),
      series: preferMetadata(metadataManga.series, catalogManga.series),
      characters: preferMetadata(metadataManga.characters, catalogManga.characters),
      circle: preferMetadata(metadataManga.circle, catalogManga.circle),
      group: preferMetadata(metadataManga.group, catalogManga.group),
      femaleTags: preferMetadata(metadataManga.femaleTags, catalogManga.femaleTags),
      maleTags: preferMetadata(metadataManga.maleTags, catalogManga.maleTags),
      covers: metadataManga.covers?.length
        ? metadataManga.covers
        : cachedManga?.covers?.length
          ? cachedManga.covers
          : catalogManga.covers,
      coverNumbers: Object.keys(metadataManga.coverNumbers || {}).length
        ? metadataManga.coverNumbers
        : cachedManga?.coverNumbers || catalogManga.coverNumbers,
      coverUpdatedAt: metadataManga.coverUpdatedAt || cachedManga?.coverUpdatedAt || catalogManga.coverUpdatedAt,
    }
    : metadataManga
      ? {
        ...metadataManga,
        covers: metadataManga.covers?.length ? metadataManga.covers : cachedManga?.covers,
        coverNumbers: Object.keys(metadataManga.coverNumbers || {}).length
          ? metadataManga.coverNumbers
          : cachedManga?.coverNumbers,
        coverUpdatedAt: metadataManga.coverUpdatedAt || cachedManga?.coverUpdatedAt,
      }
      : catalogManga
        ? {
          ...catalogManga,
          covers: catalogManga.covers?.length ? catalogManga.covers : cachedManga?.covers,
          coverNumbers: catalogManga.coverNumbers || cachedManga?.coverNumbers,
          coverUpdatedAt: catalogManga.coverUpdatedAt || cachedManga?.coverUpdatedAt,
        }
        : cachedManga || currentManga;
  if (manga && catalogSourceMode) manga.catalogSourceMode = catalogSourceMode;
  if (manga) {
    manga.nsfw = metadataManga?.nsfw ??
      catalogManga?.nsfw ??
      cachedManga?.nsfw ??
      currentManga?.nsfw ??
      isNsfwMangaRecord(manga);
  }
  for (const [index, result] of responses.entries()) {
    if (result.status === "rejected" && !signal.aborted) {
      console.warn(
        [
          "Manga metadata failed to load.",
          "Katalog metadata Firestore gagal dimuat.",
          "Detail manga dari cache KV gagal dimuat.",
        ][index],
        result.reason,
      );
    }
  }

  if (manga) {
    if (!force) onAvailableManga?.(manga);
    await cacheMangaDetail(slug, manga);
    return manga;
  }

  return immediatelyAvailable;
}

async function loadBloggerChapterSource(
  title: string,
  source: ChapterSource,
  signal: AbortSignal,
): Promise<Chapter[]> {
  if (source === "firestore") return [];

  const bloggerSource = source === "blogger2" ? "blogger2" : "blogger";
  const data = await fetchBloggerFeed(bloggerSource, title, signal, { maxResults: 500 });
  return parseBloggerEntries(data, bloggerSource).map((chapter, order) => {
    return {
      num: chapter.num,
      title: chapter.title,
      url: chapter.url,
      images: [],
      thumbnail: chapter.thumbnail || "",
      order,
      createdAt: chapter.createdAt || "",
      source: chapter.source === "blogger2" ? "blogger2" : "blogger",
    };
  });
}

async function loadBloggerChapterImages(
  title: string,
  source: "blogger" | "blogger2",
  chapterNum: string | number,
  signal?: AbortSignal,
): Promise<string[]> {
  const data = await fetchBloggerFeed(
    source,
    title,
    signal ?? new AbortController().signal,
    { maxResults: 500 },
  );
  const chapters = parseBloggerEntries(data, source);
  const want = String(chapterNum).trim().toLowerCase().replace(",", ".");
  const match = chapters.find((item) => {
    const raw = String(item.num).trim().toLowerCase().replace(",", ".");
    const n = Number.parseFloat(raw);
    const w = Number.parseFloat(want);
    if (Number.isFinite(n) && Number.isFinite(w)) return n === w;
    return raw === want;
  });
  return match?.images || [];
}

async function loadFirestoreChapterSource(
  slug: string,
  signal: AbortSignal,
  forceServer = false,
): Promise<Chapter[]> {
  if (signal.aborted) throw new DOMException("Permintaan Firestore dibatalkan.", "AbortError");
  const { firestore } = initializeFirebaseClient();
  const chapterLinksRef = collection(firestore, "manga", slug, "chapterLinks");
  const chapterLinksSnapshot = forceServer
    ? await getDocsFromServer(chapterLinksRef)
    : await getDocs(chapterLinksRef);
  if (signal.aborted) throw new DOMException("Permintaan Firestore dibatalkan.", "AbortError");
  const chapterLinks = chapterLinksSnapshot.docs.flatMap((document, index) => {
    const data = document.data();
    if (data.isDraft === true) return [];
    const num = data.num ?? data.chapterId ?? document.id;
    if ((typeof num !== "string" && typeof num !== "number") || !String(num).trim()) return [];
    const date = firestoreDate(data.date || data.createdAt || data.updatedAt);
    return [{
      id: asString(data.chapterId || data.id, document.id),
      num,
      title: asString(data.title, `Chapter ${num}`),
      url: asString(data.url),
      thumbnail: asString(data.thumbnail),
      images: [],
      createdAt: date,
      date,
      order: Number(data.order ?? index) || 0,
      source: "firestore" as const,
    }];
  });
  if (chapterLinks.length && !forceServer) return chapterLinks;

  const chaptersRef = collection(firestore, "manga", slug, "chapters");
  const chapterSnapshot = forceServer
    ? await getDocsFromServer(chaptersRef)
    : await getDocs(chaptersRef);
  if (signal.aborted) throw new DOMException("Permintaan Firestore dibatalkan.", "AbortError");
  const collectionChapters: Chapter[] = [];
  chapterSnapshot.forEach((document) => {
    const data = document.data();
    if (data.isDraft === true) return;
    const createdAt = firestoreDate(data.createdAt || data.updatedAt || data.date);
    const chapterImages = extractChapterImages(data.images || data.content || data.html);
    const chapterText = data.content || data.text || data.html;
    collectionChapters.push({
      id: document.id,
      num: chapterNumberFromRecord(data, document.id),
      title: asString(data.title, `Chapter ${document.id}`),
      thumbnail: chapterPreviewThumbnail(chapterImages, asString(data.thumbnail)),
      images: chapterImages.slice(0, 4),
      isNovel: isNovelSeries(data) ||
        (typeof chapterText === "string" && Boolean(chapterText.trim()) && !chapterImages.length),
      createdAt,
      updatedAt: firestoreDate(data.updatedAt),
      date: firestoreDate(data.date || data.createdAt || data.updatedAt || createdAt),
      timestamp: typeof data.timestamp === "string" || typeof data.timestamp === "number" ? data.timestamp : undefined,
      order: Number(data.order ?? document.id) || 0,
      source: "firestore",
    });
  });
  if (collectionChapters.length) {
    return forceServer
      ? mergeChapterSources(chapterLinks, collectionChapters)
      : collectionChapters;
  }
  if (chapterLinks.length) return chapterLinks;

  const mangaSnapshot = await getDoc(doc(firestore, "manga", slug));
  if (signal.aborted) throw new DOMException("Permintaan Firestore dibatalkan.", "AbortError");
  if (!mangaSnapshot.exists()) return [];
  const mangaData = mangaSnapshot.data();
  const chapterMap: Record<string, unknown> = {};
  for (const field of [mangaData.chapters, mangaData.chapter]) {
    if (field && typeof field === "object" && !Array.isArray(field)) {
      Object.assign(chapterMap, field);
    }
  }
  for (const [key, value] of Object.entries(mangaData)) {
    const match = key.match(/^chapters?[.\[](.+?)\]?$/i);
    if (match && value && typeof value === "object") chapterMap[match[1]] = value;
  }

  return Object.entries(chapterMap).flatMap(([id, value]) => {
    const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
    if (data.isDraft === true) return [];
    const createdAt = asString(data.createdAt || data.updatedAt || data.date);
    const chapterImages = extractChapterImages(data.images || data.content || data.html);
    const chapterText = data.content || data.text || data.html;
    return [{
      id,
      num: chapterNumberFromRecord(data, id),
      title: asString(data.title, `Chapter ${id}`),
      thumbnail: chapterPreviewThumbnail(chapterImages, asString(data.thumbnail)),
      images: chapterImages.slice(0, 4),
      isNovel: isNovelSeries(data) ||
        (typeof chapterText === "string" && Boolean(chapterText.trim()) && !chapterImages.length),
      createdAt,
      updatedAt: asString(data.updatedAt),
      date: asString(data.date || createdAt),
      timestamp: typeof data.timestamp === "string" || typeof data.timestamp === "number" ? data.timestamp : undefined,
      order: Number(data.order ?? id) || 0,
      source: "firestore" as const,
    }];
  });
}

const CHAPTER_UI_BATCH = 24;
const BLOGGER_LIST_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function chapterNumber(value: Chapter["num"]): number {
  return Number.parseFloat(String(value).replace(",", ".")) || 0;
}

function chapterKey(chapter: Chapter): string {
  return normalizeChapterNumber(chapter.num) ||
    String(chapter.num).trim().toLowerCase();
}

function mergeChapterSources(primary: Chapter[], supplemental: Chapter[]): Chapter[] {
  const merged: Chapter[] = [];
  const seen = new Set<string>();
  for (const chapter of [...primary, ...supplemental]) {
    const key = chapterKey(chapter);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(chapter);
  }
  return merged;
}

function mergeChapterFallback(
  source: ChapterSource,
  chapters: Chapter[],
  fallback: Chapter[],
): Chapter[] {
  return source === "firestore"
    ? mergeChapterSources(fallback, chapters)
    : mergeChapterSources(chapters, fallback);
}

function chapterHasPreviewImage(chapter: Chapter): boolean {
  return Boolean(
    (typeof chapter.thumbnail === "string" && chapter.thumbnail.length > 8) ||
    (Array.isArray(chapter.images) && chapter.images.some((src) => typeof src === "string" && src.length > 8)),
  );
}

function chaptersHaveThumbnails(list: Chapter[]): boolean {
  if (!list.length) return false;
  const sample = list.slice(0, Math.min(list.length, 24));
  const withThumb = sample.filter(chapterHasPreviewImage).length;
  return withThumb >= Math.ceil(sample.length * 0.4);
}

function chapterSourceCacheKey(slug: string, source: ChapterSource): string {
  return JSON.stringify([slug, source]);
}

function cachedChapterListForSource(
  cache: Map<string, Chapter[]>,
  slug: string,
  source: ChapterSource,
): Chapter[] | undefined {
  return cache.get(chapterSourceCacheKey(slug, source));
}

function cacheChapterList(
  slug: string,
  chapters: Chapter[],
  completeSources: ChapterSource[],
): void {
  const key = `chapters_${slug}`;
  const data = compactChapterCache(chapters);
  const value = JSON.stringify({ time: Date.now(), data, completeSources, chapterListVersion: 2 });

  setLocalStorageCacheItem(key, value);
}

function parseDateValue(value?: string | number): Date | null {
  if (!value) return null;
  const rawValue = String(value).trim();
  const numericValue = /^\d+(?:\.\d+)?$/.test(rawValue) ? Number(rawValue) : Number.NaN;
  const date = Number.isFinite(numericValue)
    ? new Date(numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | number): string {
  return parseDateValue(value)?.toLocaleDateString("id-ID") || "-";
}

function chapterThumbProxyUrl(source: string): string {
  const trimmed = source.trim();
  return imageProxyUrl(trimmed, "chapterThumbnail");
}

function chapterPreviewThumbnail(images: string[], fallback = ""): string {
  const clean = images.filter(
    (src) =>
      typeof src === "string" &&
      src.length > 8 &&
      /^https?:\/\//i.test(src) &&
      !/favicon|emoji|icon|spacer|pixel|1x1/i.test(src),
  );

  const raw = clean[2] || clean[1] || clean[0] || fallback || "";
  if (!raw) return "";
  return raw;
}

function extractChapterImages(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return asString(record.url || record.src);
      }
      return "";
    }).filter((url) => /^https?:\/\//i.test(url));
  }
  const input = asString(raw);
  const found = [...input.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
  if (found.length) return found;
  return input.match(/https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|gif|webp|bmp)(?:\?[^\s"'<>]*)?/gi) || [];
}

const detailPageClasses = `
  relative isolate z-[2] min-h-screen bg-transparent text-[#050000] dark:text-white
  [&_.content]:relative [&_.content]:z-[3]
  [&_img]:block [&_img]:h-auto [&_img]:max-w-full
  [&_.main]:flex [&_.main]:items-start [&_.main]:gap-[14px] [&_.main]:p-[18px_14px_14px]
  [&_.left-column]:flex [&_.left-column]:w-[95px] [&_.left-column]:shrink-0 [&_.left-column]:flex-col [&_.left-column]:items-center [&_.left-column]:gap-3
  [&_.cover]:h-[130px] [&_.cover]:w-[90px] [&_.cover]:overflow-hidden [&_.cover]:rounded-xl
  [&_.cover_img]:h-full [&_.cover_img]:w-full [&_.cover_img]:object-cover
  [&_.info]:min-w-0 [&_.info]:flex-1
  [&_.info_h1]:!mb-0 [&_.info_h1]:!max-w-full [&_.info_h1]:!break-words [&_.info_h1]:!text-left [&_.info_h1]:!text-sm [&_.info_h1]:!font-bold [&_.info_h1]:!leading-[1.25] [&_.info_h1]:!text-[#050000] [&_.info_h1]:![text-shadow:none] dark:[&_.info_h1]:!text-white
  [&_.alt-title]:mt-1 [&_.alt-title]:text-[11px] [&_.alt-title]:text-[#444] [&_.alt-title]:opacity-90 dark:[&_.alt-title]:text-[#ddd]
  [&_.title-divider]:my-[6px] [&_.title-divider]:h-px [&_.title-divider]:w-full [&_.title-divider]:rounded-sm [&_.title-divider]:bg-[rgba(0,0,0,0.1)] dark:[&_.title-divider]:bg-[rgba(255,255,255,0.35)]
  [&_.rating]:mt-1 [&_.rating]:flex [&_.rating]:items-center [&_.rating]:justify-center [&_.rating]:gap-px
  [&_.stars]:inline-flex [&_.stars]:items-center [&_.stars]:gap-0.5 [&_.stars]:text-[11px] [&_.stars]:tracking-[1px] [&_.stars]:text-[#ffd54a]
  [&_.stars_i]:leading-none [&_.rating-number]:mt-0 [&_.rating-number]:text-xs [&_.rating-number]:text-[#444] dark:[&_.rating-number]:text-[#ddd]
  [&_.latest-update]:!mb-3 [&_.latest-update]:text-[#019219] dark:[&_.latest-update]:text-[#30c430]
  [&_.bookmark-btn]:inline-flex [&_.bookmark-btn]:w-full [&_.bookmark-btn]:cursor-pointer [&_.bookmark-btn]:items-center [&_.bookmark-btn]:justify-center [&_.bookmark-btn]:gap-1.5 [&_.bookmark-btn]:rounded-lg [&_.bookmark-btn]:border [&_.bookmark-btn]:border-[rgba(0,0,0,0.15)] [&_.bookmark-btn]:bg-[rgba(80,78,78,0.04)] [&_.bookmark-btn]:px-[5px] [&_.bookmark-btn]:py-[3px] [&_.bookmark-btn]:text-[10px] [&_.bookmark-btn]:font-semibold [&_.bookmark-btn]:text-[#050000] [&_.bookmark-btn]:transition-all [&_.bookmark-btn]:duration-300 dark:[&_.bookmark-btn]:border-[rgba(255,255,255,0.18)] dark:[&_.bookmark-btn]:bg-[rgba(156,7,7,0.06)] dark:[&_.bookmark-btn]:text-white [&_.bookmark-btn:hover]:border-[rgba(0,0,0,0.1)] [&_.bookmark-btn:hover]:bg-[rgba(0,0,0,0.06)] dark:[&_.bookmark-btn:hover]:border-[rgba(255,255,255,0.08)] dark:[&_.bookmark-btn:hover]:bg-[rgba(0,0,0,0.35)] [&_.bookmark-btn.bookmarked]:border-[#ffcc00] [&_.bookmark-btn.bookmarked]:bg-[rgba(255,204,0,0.2)] [&_.bookmark-btn.bookmarked]:text-[#ffcc00] dark:[&_.bookmark-btn.bookmarked]:text-[#ffdb4d]
  [&_.status]:mb-[6px] [&_.status]:flex [&_.status]:items-center [&_.status]:gap-1.5 [&_.status]:font-semibold [&_.status]:text-[11px] [&_.status_span]:font-bold [&_.status.ongoing]:text-green-500 [&_.status.completed]:text-sky-300 [&_.status.hiatus]:text-yellow-400 [&_.status.dropped]:text-orange-500 [&_.status.canceled]:text-orange-600 [&_.status.unknown]:text-gray-400 lg:[&_.status]:text-sm
  [&_.detail-item]:mb-[5px] [&_.detail-item]:flex [&_.detail-item]:items-center [&_.detail-item]:gap-[3px] [&_.detail-item]:text-[11px] [&_.detail-item]:text-[#050000] dark:[&_.detail-item]:text-white [&_.detail-item_i]:w-5 [&_.detail-item_i]:text-center [&_.detail-item_i]:text-[#444] dark:[&_.detail-item_i]:text-[#ddd]
  [&_.genres]:grid [&_.genres]:grid-cols-4 [&_.genres]:gap-2 [&_.genres]:rounded-[14px] [&_.genres]:px-[14px] [&_.genres]:py-[15px]
  [&_.genre]:block [&_.genre]:overflow-hidden [&_.genre]:truncate [&_.genre]:whitespace-nowrap [&_.genre]:rounded-lg [&_.genre]:border [&_.genre]:border-[rgba(0,0,0,0.1)] [&_.genre]:bg-[rgba(0,0,0,0.06)] [&_.genre]:px-2 [&_.genre]:py-[6px] [&_.genre]:text-center [&_.genre]:text-[11px] [&_.genre]:text-[var(--genre-light-text)] [&_.genre]:no-underline [&_.genre]:transition-[background,border-color,transform] [&_.genre]:duration-200 dark:[&_.genre]:border-[rgba(255,255,255,0.08)] dark:[&_.genre]:bg-[rgba(0,0,0,0.35)] dark:[&_.genre]:text-[var(--genre-accent)] [&_.genre:hover]:-translate-y-px [&_.genre:hover]:bg-[rgba(80,78,78,0.04)]
  [&_.detail-extra-tags]:mx-3 [&_.detail-extra-tags]:mb-5 [&_.detail-extra-tags]:rounded-[14px] [&_.detail-extra-tags]:border [&_.detail-extra-tags]:border-[rgba(0,0,0,0.1)] [&_.detail-extra-tags]:bg-[rgba(184,174,174,0.329)] [&_.detail-extra-tags]:px-4 [&_.detail-extra-tags]:py-[18px] dark:[&_.detail-extra-tags]:border-[rgba(255,255,255,0.08)] dark:[&_.detail-extra-tags]:bg-[rgba(26,26,46,0.35)]
  [&_.detail-tag-row+_.detail-tag-row]:mt-[18px] [&_.detail-tag-label]:mb-2 [&_.detail-tag-label]:flex [&_.detail-tag-label]:items-center [&_.detail-tag-label]:gap-2 [&_.detail-tag-label]:pl-0.5 [&_.detail-tag-label]:text-[14.5px] [&_.detail-tag-label]:font-semibold [&_.detail-tag-label]:text-[#050000] dark:[&_.detail-tag-label]:text-white [&_.detail-tag-label_i]:w-4 [&_.detail-tag-label_i]:text-center
  [&_.detail-tag-list]:flex [&_.detail-tag-list]:flex-wrap [&_.detail-tag-list]:justify-start [&_.detail-tag-list]:gap-1.5 [&_.detail-tag-list]:pl-0.5
  [&_.detail-gender-tag]:inline-flex [&_.detail-gender-tag]:cursor-pointer [&_.detail-gender-tag]:items-center [&_.detail-gender-tag]:whitespace-nowrap [&_.detail-gender-tag]:rounded-lg [&_.detail-gender-tag]:px-[11px] [&_.detail-gender-tag]:py-[5px] [&_.detail-gender-tag]:text-[11.5px] [&_.detail-gender-tag]:font-semibold [&_.detail-gender-tag]:no-underline [&_.detail-gender-tag]:transition-[background,border-color,transform] [&_.detail-gender-tag]:duration-200 [&_.detail-gender-tag:hover]:-translate-y-px [&_.detail-gender-tag:hover]:brightness-115
  [&_.female-tag]:border [&_.female-tag]:border-[rgba(216,27,96,0.3)] [&_.female-tag]:bg-[rgba(255,77,141,0.12)] [&_.female-tag]:text-[#d81b60] dark:[&_.female-tag]:border-[rgba(255,77,141,0.5)] dark:[&_.female-tag]:bg-[rgba(255,77,141,0.28)] dark:[&_.female-tag]:text-[#ffb2ce] [&_.male-tag]:border [&_.male-tag]:border-[rgba(37,99,235,0.3)] [&_.male-tag]:bg-[rgba(77,125,255,0.12)] [&_.male-tag]:text-[#2563eb] dark:[&_.male-tag]:border-[rgba(77,125,255,0.5)] dark:[&_.male-tag]:bg-[rgba(77,125,255,0.28)] dark:[&_.male-tag]:text-[#b5c9ff]
  [&_.demographic-item]:mt-[-5px] [&_.demographic-item]:flex-wrap [&_.demographic-item]:items-start [&_.demographic-item]:!gap-1 [&_.demographic-item_strong]:mt-px [&_.demographic-item_strong]:whitespace-nowrap
  [&_.demographic-tags]:mt-[-2px] [&_.demographic-tags]:flex [&_.demographic-tags]:flex-1 [&_.demographic-tags]:flex-wrap [&_.demographic-tags]:gap-1.5
  [&_.demographic-tag]:inline-flex [&_.demographic-tag]:cursor-pointer [&_.demographic-tag]:items-center [&_.demographic-tag]:whitespace-nowrap [&_.demographic-tag]:rounded-lg [&_.demographic-tag]:border [&_.demographic-tag]:border-[rgba(220,38,38,0.25)] [&_.demographic-tag]:bg-[rgba(220,38,38,0.1)] [&_.demographic-tag]:px-[10px] [&_.demographic-tag]:py-1 [&_.demographic-tag]:text-[10px] [&_.demographic-tag]:font-bold [&_.demographic-tag]:capitalize [&_.demographic-tag]:text-[#dc2626] [&_.demographic-tag]:no-underline [&_.demographic-tag]:transition-[background,border-color,transform] [&_.demographic-tag]:duration-200 [&_.demographic-tag:hover]:-translate-y-px [&_.demographic-tag:hover]:brightness-115 dark:[&_.demographic-tag]:border-[rgba(255,80,80,0.35)] dark:[&_.demographic-tag]:bg-[rgba(255,0,0,0.18)] dark:[&_.demographic-tag]:text-[#ffb3b3]
  [&_.synopsis]:mx-3 [&_.synopsis]:mb-[15px] [&_.synopsis]:rounded-[14px] [&_.synopsis]:border [&_.synopsis]:border-[rgba(0,0,0,0.1)] [&_.synopsis]:bg-[rgba(0,0,0,0.06)] [&_.synopsis]:px-[14px] [&_.synopsis]:py-[15px] [&_.synopsis]:text-[13px] [&_.synopsis]:text-[#050000] dark:[&_.synopsis]:border-[rgba(255,255,255,0.08)] dark:[&_.synopsis]:bg-[rgba(255,255,255,0.08)] dark:[&_.synopsis]:text-white
  [&_.synopsis_h2]:mb-[14px] [&_.synopsis_h2]:text-lg [&_.synopsis_h2]:text-[#050000] dark:[&_.synopsis_h2]:text-white [&_.synopsis-content_p]:mb-[10px] [&_.synopsis-content_p:last-child]:mb-0 [&_.synopsis-content_ul]:mb-[10px] [&_.synopsis-content_ul]:pl-6 [&_.synopsis-content_ol]:mb-[10px] [&_.synopsis-content_ol]:pl-6 [&_.synopsis-content_a]:text-blue-400 [&_.synopsis-content_a]:underline
  [&_.section-title]:my-[25px] [&_.section-title]:mb-[15px] [&_.section-title]:flex [&_.section-title]:min-h-[50px] [&_.section-title]:w-full [&_.section-title]:items-center [&_.section-title]:justify-center [&_.section-title]:gap-0 [&_.section-title]:pl-0 [&_.section-title]:text-sm [&_.section-title]:leading-5 [&_.section-title]:transition-[margin-left,width] [&_.section-title]:duration-300 [&_.section-title]:before:h-px [&_.section-title]:before:flex-1 [&_.section-title]:before:bg-[#aaa] [&_.section-title]:before:content-[''] [&_.section-title]:after:h-px [&_.section-title]:after:flex-1 [&_.section-title]:after:bg-[#aaa] [&_.section-title]:after:content-['']
  [&_.chapter-header]:box-border [&_.chapter-header]:flex [&_.chapter-header]:w-full [&_.chapter-header]:flex-wrap [&_.chapter-header]:items-center [&_.chapter-header]:gap-0 [&_.chapter-header]:px-[14px]
  [&_.chapter-header_.section-title]:order-2 [&_.chapter-header_.section-title]:my-1 [&_.chapter-header_.section-title]:mb-2 [&_.chapter-header_.section-title]:w-full [&_.chapter-header_.section-title]:basis-full [&_.chapter-header_.section-title]:p-0 [&_.chapter-header_.section-title]:text-center
  [&_.chapter-header-right]:order-1 [&_.chapter-header-right]:my-2 [&_.chapter-header-right]:flex [&_.chapter-header-right]:w-full [&_.chapter-header-right]:basis-full [&_.chapter-header-right]:min-w-0 [&_.chapter-header-right]:items-center [&_.chapter-header-right]:justify-between [&_.chapter-header-right]:gap-2 [&_.chapter-header-right]:[box-sizing:border-box]
  [&_.source-toggle]:flex [&_.source-toggle]:shrink-0 [&_.source-toggle]:items-center [&_.source-toggle]:gap-2 [&_.view-toggle]:flex [&_.view-toggle]:shrink-0 [&_.view-toggle]:items-center [&_.view-toggle]:gap-2
  [&_.server-btn]:relative [&_.server-btn]:shrink-0
  [&_.server-icon-wrap]:relative [&_.server-icon-wrap]:inline-flex [&_.server-icon-wrap]:h-[18px] [&_.server-icon-wrap]:w-[18px] [&_.server-icon-wrap]:items-center [&_.server-icon-wrap]:justify-center [&_.server-icon-wrap_svg]:block
  [&_.server-number]:absolute [&_.server-number]:-top-1 [&_.server-number]:-right-1 [&_.server-number]:block [&_.server-number]:min-w-0 [&_.server-number]:border-0 [&_.server-number]:bg-transparent [&_.server-number]:p-0 [&_.server-number]:text-[8px] [&_.server-number]:font-extrabold [&_.server-number]:leading-none [&_.server-number]:text-[#1d4ed8] [&_#sourceSv1Btn.active_.server-number]:text-white [&_#sourceSv2Btn_.server-number]:text-[#f59e0b] [&_#sourceSv2Btn.active_.server-number]:text-white [&_#sourceEsBtn_.server-number]:text-[#b91c1c] [&_#sourceEsBtn.active_.server-number]:text-white
  [&_.view-btn]:box-border [&_.view-btn]:inline-flex [&_.view-btn]:h-[38px] [&_.view-btn]:w-[38px] [&_.view-btn]:min-w-[38px] [&_.view-btn]:shrink-0 [&_.view-btn]:items-center [&_.view-btn]:justify-center [&_.view-btn]:cursor-pointer [&_.view-btn]:rounded-[10px] [&_.view-btn]:border [&_.view-btn]:border-[rgba(0,0,0,0.1)] [&_.view-btn]:bg-[rgba(80,78,78,0.04)] [&_.view-btn]:p-0 [&_.view-btn]:text-[#050000] [&_.view-btn]:transition-[background,border-color,transform] [&_.view-btn]:duration-[250ms] dark:[&_.view-btn]:border-[rgba(255,255,255,0.08)] dark:[&_.view-btn]:bg-[rgba(156,7,7,0.06)] dark:[&_.view-btn]:text-white [&_.view-btn:hover]:bg-[rgba(0,0,0,0.06)] [&_.view-btn:active]:scale-[0.94]
  [&_#sourceSv1Btn]:border-[rgba(96,165,250,0.5)] [&_#sourceSv1Btn]:bg-[rgba(59,130,246,0.2)] [&_#sourceSv1Btn]:text-[#60a5fa] [&_#sourceSv2Btn]:border-[rgba(251,191,36,0.5)] [&_#sourceSv2Btn]:bg-[rgba(245,158,11,0.2)] [&_#sourceSv2Btn]:text-[#fbbf24] [&_#sourceEsBtn]:border-[rgba(239,68,68,0.5)] [&_#sourceEsBtn]:bg-[rgba(239,68,68,0.2)] [&_#sourceEsBtn]:text-[#f87171] [&_#sourceEsBtn_svg]:shrink-0
  [&_#sourceSv1Btn.active]:!border-[#3b82f6] [&_#sourceSv1Btn.active]:!bg-[#3b82f6] [&_#sourceSv1Btn.active]:!text-white [&_#sourceSv2Btn.active]:!border-[#f59e0b] [&_#sourceSv2Btn.active]:!bg-[#f59e0b] [&_#sourceSv2Btn.active]:!text-white [&_#sourceEsBtn.active]:!border-[#ef4444] [&_#sourceEsBtn.active]:!bg-[#ef4444] [&_#sourceEsBtn.active]:!text-white
  [&_#textGridViewBtn]:border-[rgba(96,165,250,0.5)] [&_#textGridViewBtn]:bg-[rgba(59,130,246,0.2)] [&_#textGridViewBtn]:text-[#60a5fa] [&_#textGridViewBtn.active]:!border-[#3b82f6] [&_#textGridViewBtn.active]:!bg-[#3b82f6] [&_#textGridViewBtn.active]:!text-white [&_#gridViewBtn]:border-[rgba(251,191,36,0.5)] [&_#gridViewBtn]:bg-[rgba(245,158,11,0.2)] [&_#gridViewBtn]:text-[#fbbf24] [&_#gridViewBtn.active]:!border-[#f59e0b] [&_#gridViewBtn.active]:!bg-[#f59e0b] [&_#gridViewBtn.active]:!text-white [&_#listViewBtn]:border-[rgba(239,68,68,0.5)] [&_#listViewBtn]:bg-[rgba(239,68,68,0.2)] [&_#listViewBtn]:text-[#f87171] [&_#listViewBtn.active]:!border-[#ef4444] [&_#listViewBtn.active]:!bg-[#ef4444] [&_#listViewBtn.active]:!text-white
  [&_#sortChapterBtn.active-newest]:border-[#fd6dfd] [&_#sortChapterBtn.active-newest]:bg-[#ed74f8] [&_#sortChapterBtn.active-newest]:text-white [&_#sortChapterBtn.active-oldest]:border-[#f59e0b] [&_#sortChapterBtn.active-oldest]:bg-[#f59e0b] [&_#sortChapterBtn.active-oldest]:text-white
  max-[380px]:[&_.chapter-header]:px-[10px] max-[380px]:[&_.chapter-header_.section-title]:mt-px max-[380px]:[&_.chapter-header_.section-title]:mb-2 max-[380px]:[&_.chapter-header-right]:gap-[5px] max-[380px]:[&_.chapter-header-right]:mb-2 max-[380px]:[&_.source-toggle]:gap-1 max-[380px]:[&_.view-toggle]:gap-1 max-[380px]:[&_.view-btn]:h-[33px] max-[380px]:[&_.view-btn]:w-[33px] max-[380px]:[&_.view-btn]:min-w-[33px] max-[380px]:[&_.view-btn]:rounded-lg
  max-[330px]:[&_.chapter-header]:px-2 max-[330px]:[&_.chapter-header-right]:gap-1 max-[330px]:[&_.source-toggle]:gap-[3px] max-[330px]:[&_.view-toggle]:gap-[3px] max-[330px]:[&_.view-btn]:h-[31px] max-[330px]:[&_.view-btn]:w-[31px] max-[330px]:[&_.view-btn]:min-w-[31px] max-[330px]:[&_.view-btn]:rounded-[7px]
  max-[767px]:[&_.source-toggle]:min-w-0 max-[767px]:[&_.source-toggle]:shrink-0 max-[767px]:[&_.source-toggle]:gap-[6px] max-[767px]:[&_.view-toggle]:min-w-0 max-[767px]:[&_.view-toggle]:shrink-0 max-[767px]:[&_.view-toggle]:gap-[6px] max-[767px]:[&_.view-btn]:h-9 max-[767px]:[&_.view-btn]:w-9 max-[767px]:[&_.view-btn]:min-w-9 max-[767px]:[&_.view-btn]:rounded-[9px]
  md:[&_.container]:my-5 md:[&_.container]:max-w-[720px] md:[&_.container]:rounded-[20px]
  md:[&_.main]:gap-[30px] md:[&_.main]:px-[30px] md:[&_.main]:pt-[35px] md:[&_.main]:pb-[25px] md:[&_.left-column]:w-[200px] md:[&_.cover]:h-[280px] md:[&_.cover]:w-[200px] md:[&_.info_h1]:!text-2xl md:[&_.bookmark-btn]:px-6 md:[&_.bookmark-btn]:py-[10px] md:[&_.bookmark-btn]:text-sm
  md:[&_.genres]:grid-cols-[repeat(auto-fit,minmax(110px,1fr))] md:[&_.genres]:mx-0 md:[&_.genres]:w-auto md:[&_.genres]:gap-[10px] md:[&_.genres]:px-0 md:[&_.genres]:py-2 md:[&_.synopsis]:mx-0 md:[&_.synopsis]:mb-6 md:[&_.detail-extra-tags]:mx-0 md:[&_.detail-extra-tags]:mb-4 md:[&_.chapter-header]:px-0
  md:[&_.chapter-grid]:grid-cols-[repeat(6,minmax(0,1fr))] md:[&_.chapter-grid]:gap-[10px] md:[&_.chapter-grid]:px-0 md:[&_.chapter-grid]:pb-10
  md:[&_.content]:grid md:[&_.content]:grid-cols-[200px_minmax(0,1fr)] md:[&_.content]:gap-x-[30px] md:[&_.content]:px-[30px] md:[&_.content]:pt-[35px] md:[&_.main]:contents
  md:[&_.left-column]:col-start-1 md:[&_.left-column]:row-start-1 md:[&_.left-column]:row-span-7 md:[&_.left-column]:self-start md:[&_.left-column]:pt-0
  md:[&_.info]:col-start-2 md:[&_.info]:row-start-1 md:[&_.info]:px-0 md:[&_.info]:pt-0
  md:[&_.genres]:col-start-2 md:[&_.detail-extra-tags]:col-start-2 md:[&_.detail-extra-tags]:px-4 md:[&_.detail-extra-tags]:py-3
  md:[&_.detail-tabs]:col-start-2 md:[&_.detail-tabs]:mx-0 md:[&_.detail-tabs]:mb-4
  md:[&_.chapters]:col-start-2 md:[&_.chapters]:mx-0 md:[&_.chapters]:px-0 md:[&_.synopsis]:col-start-2
  md:[&_.chapter-search]:mx-0 md:[&_.chapter-search]:mb-3
  md:[&_.detail-tab-comments]:col-start-2 md:[&_.detail-tab-comments]:my-0 md:[&_.detail-tab-comments]:w-full
  lg:[&_.container]:my-[30px] lg:[&_.container]:max-w-[var(--detail-max-width)] lg:[&_.container]:rounded-3xl lg:[&_.container]:ml-[var(--detail-content-left)] lg:[&_.container]:mr-0 lg:[&_.container]:w-[var(--detail-content-width)]
  lg:[&_.main]:gap-10 lg:[&_.main]:px-10 lg:[&_.main]:pt-10 lg:[&_.main]:pb-[30px] lg:[&_.left-column]:w-[240px] lg:[&_.cover]:h-[340px] lg:[&_.cover]:w-[240px] lg:[&_.info_h1]:!text-[28px] lg:[&_.detail-item]:text-sm lg:[&_.detail-item_i]:w-[22px] lg:[&_.detail-item_i]:text-sm
  lg:[&_.genres]:py-[15px] lg:[&_.synopsis]:mb-10 lg:[&_.detail-extra-tags]:mb-4
  lg:[&_.chapter-grid]:grid-cols-[repeat(8,minmax(0,1fr))] lg:[&_.chapter-grid]:gap-[10px] lg:[&_.chapter-grid]:px-0 lg:[&_.chapter-grid]:pb-[50px]
  [&_.detail-route-message]:mx-auto [&_.detail-route-message]:my-8 [&_.detail-route-message]:max-w-[1150px] [&_.detail-route-message]:p-5 [&_.detail-route-message]:text-center
  [&_.detail-route-loading]:grid [&_.detail-route-loading]:min-h-screen [&_.detail-route-loading]:place-items-center
  [&_.detail-route-spinner]:h-[42px] [&_.detail-route-spinner]:w-[42px] [&_.detail-route-spinner]:animate-spin [&_.detail-route-spinner]:rounded-full [&_.detail-route-spinner]:border-4 [&_.detail-route-spinner]:border-[var(--mikoroku-accent)]/25 [&_.detail-route-spinner]:border-t-[var(--mikoroku-accent)]
  [&_.section-title]:before:!bg-[var(--mikoroku-detail-section-accent)] [&_.section-title]:after:!bg-[var(--mikoroku-detail-section-accent)] [&_.section-title>span]:!border-[var(--mikoroku-detail-section-accent)] [&_.section-title>span]:!text-[var(--mikoroku-detail-section-text)]
  [&_.detail-tabs_button[aria-selected=true]]:!border-[var(--mikoroku-detail-tab-accent)] [&_.detail-tabs_button[aria-selected=true]]:!text-[var(--mikoroku-detail-tab-accent)]
  [&_.view-btn.active]:!border-[var(--mikoroku-source-emergency)] [&_.view-btn.active]:!bg-[var(--mikoroku-source-emergency)] [&_.view-btn.active]:!text-white [&_.view-btn.active-oldest]:!border-[var(--mikoroku-sort-oldest)] [&_.view-btn.active-oldest]:!bg-[var(--mikoroku-sort-oldest)] [&_.view-btn.active-oldest]:!text-white [&_.view-btn.active-newest]:!border-[var(--mikoroku-sort-newest-border)] [&_.view-btn.active-newest]:!bg-[var(--mikoroku-sort-newest)] [&_.view-btn.active-newest]:!text-white
  [&_.synopsis>h2]:!text-[var(--mikoroku-detail-tag-icon)] [&_.detail-tag-label_i]:!text-[var(--mikoroku-detail-tag-icon)] [&_.chapter-search:focus-within]:!border-[var(--mikoroku-accent)]
  [&_.demographic-tag.female-tag]:!border-[var(--mikoroku-detail-female-border)] [&_.demographic-tag.female-tag]:!bg-[var(--mikoroku-detail-female-bg)] [&_.demographic-tag.female-tag]:!text-[var(--mikoroku-detail-female-text)] [&_.demographic-tag.male-tag]:!border-[var(--mikoroku-detail-male-border)] [&_.demographic-tag.male-tag]:!bg-[var(--mikoroku-detail-male-bg)] [&_.demographic-tag.male-tag]:!text-[var(--mikoroku-detail-male-text)]
  [&_.bookmark-btn:not(.bookmarked)]:!border-[var(--mikoroku-detail-bookmark-border)] [&_.bookmark-btn:not(.bookmarked)]:!bg-[var(--mikoroku-detail-bookmark-hover)] [&_.bookmark-btn:not(.bookmarked)]:!text-[var(--mikoroku-detail-bookmark-text)] dark:[&_.bookmark-btn:not(.bookmarked)]:!border-[rgba(245,220,190,0.48)] [&_.bookmark-btn:not(.bookmarked):hover]:!bg-[var(--mikoroku-detail-bookmark-hover)] [&_.bookmark-btn:not(.bookmarked):hover]:!border-[var(--mikoroku-detail-bookmark-hover-border)] dark:[&_.bookmark-btn:not(.bookmarked):hover]:!border-[rgba(255,230,200,0.62)]
  [&_.chapter-item:hover]:!ring-1 [&_.chapter-item:hover]:!ring-[var(--mikoroku-detail-chapter-hover)]
  lg:[&_.content]:grid-cols-[240px_minmax(0,1fr)] lg:[&_.content]:gap-x-10 lg:[&_.content]:px-10 lg:[&_.content]:pt-10 lg:[&_.left-column]:pt-0 lg:[&_.info]:pt-0
`;

function MetaTag({ label, value, icon }: { label: string; value?: string; icon: string }) {
  if (!value || value === "-" || value.toLowerCase() === "unknown") return null;
  return (
    <div className="detail-item">
      <i className={`fas ${icon}`} aria-hidden="true" />
      <span><strong>{label}:</strong> {value}</span>
    </div>
  );
}

function SeriesShareControl({ title, compact = false }: { title: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function toggleShareOptions() {
    if (open) {
      setOpen(false);
      return;
    }
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    setShareUrl(url.toString());
    setCopyStatus("");
    setOpen(true);
  }

  async function copyShareLink() {
    setCopyStatus("Copying link...");
    let copied = false;
    if (navigator.clipboard?.writeText) {
      let timeout: number | undefined;
      try {
        await Promise.race([
          navigator.clipboard.writeText(shareUrl),
          new Promise<void>((_resolve, reject) => {
            timeout = window.setTimeout(() => reject(new Error("Clipboard API timed out.")), 1500);
          }),
        ]);
        copied = true;
      } catch (error) {
        console.warn("Clipboard API could not copy the series link; trying the browser fallback.", error);
      } finally {
        if (timeout !== undefined) window.clearTimeout(timeout);
      }
    }

    if (!copied) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        try {
          textarea.select();
          copied = document.execCommand("copy");
        } finally {
          textarea.remove();
        }
        if (!copied) throw new Error("Browser clipboard fallback failed.");
      } catch (error) {
        console.error("Could not copy the series link.", error);
        setCopyStatus("Could not copy the link.");
        return;
      }
    }
    setCopyStatus("Link copied.");
  }

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const shareOptions = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
  ];

  return (
    <div className="relative w-full">
      <button
        className={`inline-flex w-full items-center justify-center rounded-lg border border-sky-500/45 bg-sky-500/10 font-semibold text-sky-700 transition hover:border-sky-500/70 hover:bg-sky-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-sky-200 ${compact
            ? "h-8 gap-1.5 px-1 text-[10px]"
            : "h-8 gap-1.5 px-1 text-[10px] md:h-11 md:gap-2 md:px-3 md:text-[13px]"
          }`}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggleShareOptions}
      >
        <i className="fas fa-share-alt" aria-hidden="true" />
        <span>Share</span>
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute left-0 top-full z-30 mt-2 grid w-full min-w-[220px] grid-cols-2 gap-2 rounded-xl border border-slate-300/70 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-slate-900"
          role="group"
          aria-label="Share this series"
        >
          {shareOptions.map((option) => (
            <a
              key={option.label}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300/70 px-2 py-1.5 text-center text-xs font-semibold text-slate-700 no-underline transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-white/15 dark:text-slate-100 dark:hover:bg-white/10"
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              {option.label}
            </a>
          ))}
          <button
            className="col-span-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-300/70 px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-white/15 dark:text-slate-100 dark:hover:bg-white/10"
            type="button"
            onClick={() => void copyShareLink()}
          >
            <i className="fas fa-link" aria-hidden="true" />
            <span>Copy link</span>
          </button>
          {copyStatus && (
            <p className="col-span-2 m-0 text-center text-xs text-slate-600 dark:text-slate-300" role="status">
              {copyStatus}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SeriesStatisticsBar({
  slug,
  bookmarked,
  notificationsEnabled,
  onToggleBookmark,
  onToggleNotifications,
  notificationError,
}: {
  slug: string;
  bookmarked: boolean;
  notificationsEnabled: boolean;
  onToggleBookmark: () => void;
  onToggleNotifications: () => void;
  notificationError: string;
}) {
  const [statistics, setStatistics] = useState<SeriesStatistics>(() => ({
    slug,
    views: 0,
    bookmarks: 0,
    notifications: 0,
    syncedAt: 0,
  }));
  const [syncError, setSyncError] = useState("");
  const visitedSlugRef = useRef("");
  const requestIdRef = useRef(0);
  const statisticsRef = useRef(statistics);
  const localInteractionVersionsRef = useRef({ bookmarks: 0, notifications: 0 });
  statisticsRef.current = statistics;

  function applyLoadedStatistics(
    incoming: SeriesStatistics,
    versionsAtLoadStart: { bookmarks: number; notifications: number },
  ) {
    const current = statisticsRef.current;
    const merged = { ...incoming };
    for (const key of ["bookmarks", "notifications"] as const) {
      if (localInteractionVersionsRef.current[key] !== versionsAtLoadStart[key]) {
        merged[key] = current[key];
      }
    }
    statisticsRef.current = merged;
    setStatistics(merged);
  }

  useEffect(() => {
    if (!slug || visitedSlugRef.current === slug) return;
    visitedSlugRef.current = slug;
    const requestId = ++requestIdRef.current;
    const initialStatistics = { slug, views: 0, bookmarks: 0, notifications: 0, syncedAt: 0 };
    statisticsRef.current = initialStatistics;
    localInteractionVersionsRef.current = { bookmarks: 0, notifications: 0 };
    setStatistics(initialStatistics);
    setSyncError("");
    const versionsAtLoadStart = { ...localInteractionVersionsRef.current };

    void (async () => {
      let cached: Awaited<ReturnType<typeof getCachedSeriesStatistics>> = null;
      try {
        cached = await getCachedSeriesStatistics(slug);
      } catch (error) {
        console.warn("Series statistics cache could not be read.", error);
      }

      if (requestId !== requestIdRef.current) return;
      if (cached) applyLoadedStatistics(cached, versionsAtLoadStart);

      try {
        const viewed = await recordSeriesViewInCache(slug);
        if (requestId !== requestIdRef.current) return;
        applyLoadedStatistics(viewed, versionsAtLoadStart);

        const updated = await syncSeriesStatisticsForVisit(slug);
        if (requestId !== requestIdRef.current) return;
        applyLoadedStatistics(updated, versionsAtLoadStart);
      } catch (error) {
        console.error(`Series statistics could not be synchronized for "${slug}".`, error);
        if (requestId === requestIdRef.current) {
          const errorCode = error && typeof error === "object" && "code" in error
            ? error.code
            : "";
          setSyncError(errorCode === "failed-precondition"
            ? "Firestore index belum tersedia. Deploy firestore.indexes.json ke project widget-comment."
            : errorCode === "permission-denied"
              ? "Firestore menolak akses statistik. Periksa rules di project widget-comment."
              : "Statistik sementara tidak tersedia.");
        }
      }
    })();
  }, [slug]);

  const items = [
    { key: "views", label: "Views", icon: "fa-eye", value: statistics?.views, active: false, disabled: true },
    { key: "bookmarks", label: bookmarked ? "Bookmarked" : "Bookmark", icon: bookmarked ? "fa-check" : "fa-bookmark", value: bookmarked ? Math.max(statistics.bookmarks, 1) : statistics.bookmarks, active: bookmarked, disabled: false },
    { key: "notifications", label: notificationsEnabled ? "Notifications on" : "Notify", icon: notificationsEnabled ? "fa-bell" : "fa-bell-slash", value: notificationsEnabled ? Math.max(statistics.notifications, 1) : statistics.notifications, active: notificationsEnabled, disabled: false },
  ] as const;

  function toggleStatistic(item: typeof items[number]) {
    if (item.key === "views" || item.disabled) return;
    const key = item.key;
    const wasActive = item.active;
    const next = {
      ...statisticsRef.current,
      [key]: Math.max(0, statisticsRef.current[key] + (wasActive ? -1 : 1)),
    };
    localInteractionVersionsRef.current[key] += 1;
    statisticsRef.current = next;
    setStatistics(next);
    if (key === "bookmarks") {
      void adjustCachedSeriesStatistic(slug, key, wasActive ? -1 : 1).catch((error: unknown) => {
        console.warn(`Cached series ${key} count could not be updated.`, error);
      });
    }
    if (key === "bookmarks") {
      onToggleBookmark();
    } else {
      void onToggleNotifications();
    }
  }

  return (
    <div className="my-1 w-full max-[767px]:mx-[14px] max-[767px]:w-auto">
      <div
        role="group"
        aria-label="Series statistics"
        style={{
          display: "flex",
          width: "100%",
          gap: 0,
          margin: 0,
          padding: 0,
          overflow: "hidden",
          border: "1px solid rgba(151, 145, 145, 0.35)",
          borderRadius: "10px",
        }}
        className="genres series-statistics-panel rounded-[2px] border border-gray-400/40 bg-black/10 dark:bg-white/10"
      >
        {items.map((item, index) => {
          const colorMap = {
            views: {
              accent: "#a0cbff",
              lightText: "#1d4ed8",
            },
            bookmarks: {
              accent: "#ffcc00",
              lightText: "#a16207",
            },
            notifications: {
              accent: "#cfa0ff",
              lightText: "#7c3aed",
            },
          }[item.key];

          const sharedClassName = [
            "genre series-statistic",
            index ? "border-l border-l-[rgba(156,163,175,0.42)] dark:border-l-[rgba(255,255,255,0.2)]" : "",
          ].filter(Boolean).join(" ");

          const sharedStyle = {
            display: "flex",
            minWidth: 0,
            flex: "1 1 0",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 4px",
            borderRadius: 0,
            borderTop: 0,
            borderRight: 0,
            borderBottom: 0,
            borderColor: "rgba(156, 163, 175, 0.35)",
            backgroundColor: item.active
              ? colorMap.accent
              : `${colorMap.accent}22`,
            "--genre-accent": colorMap.accent,
            "--genre-light-text": colorMap.lightText,
            fontSize: "11px",
            cursor: item.key === "views" ? "default" : "pointer",
            ...(item.active ? { color: "#000000" } : {}),
          } as React.CSSProperties;

          const contents = (
            <>
              <i
                className={`fas ${item.icon} shrink-0`}
                style={item.active ? { color: "#000000" } : undefined}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
              <strong className="shrink-0">{item.value.toLocaleString("id-ID")}</strong>
            </>
          );

          return item.key === "views" ? (
            <span className={sharedClassName} key={item.key} style={sharedStyle}>
              {contents}
            </span>
          ) : (
            <button
              className={sharedClassName}
              key={item.key}
              style={sharedStyle}
              type="button"
              aria-pressed={item.active}
              disabled={item.disabled}
              onClick={() => toggleStatistic(item)}
            >
              {contents}
            </button>
          );
        })}
      </div>
      {(syncError || notificationError) && (
        <p className="m-0 mt-1 text-[10px] text-red-600 dark:text-red-300" role="status">
          {notificationError || syncError}
        </p>
      )}
    </div>
  );
}

type DetailPageContentProps = {
  slug: string;
  initialManga?: Manga | null;
  initialChapters?: Chapter[];
  initialChapterSource?: ChapterSource | "cache";
  initialChaptersManaged?: boolean;
};

export default function DetailPageContent({
  slug,
  initialManga = null,
  initialChapters = [],
  initialChapterSource = "cache",
  initialChaptersManaged = false,
}: DetailPageContentProps) {
  const [manga, setManga] = useState<Manga | null>(() =>
    initialManga ?? getCurrentMangaForSlug(slug),
  );
  const [showNsfw] = useNsfwVisibility();
  const [selectedCoverUrl, setSelectedCoverUrl] = useState("");
  const [coverPreviewOpen, setCoverPreviewOpen] = useState(false);
  const [coverPreferenceError, setCoverPreferenceError] = useState("");
  const chapterSourceCacheRef = useRef(new Map<string, Chapter[]>());
  const chapterSourceFetchedAtRef = useRef(new Map<string, number>());
  const chapterCacheSlugRef = useRef(slug);
  const managedInitialSeededSlugRef = useRef("");
  const trackedSeriesRef = useRef(new Map<string, number>());
  const baseCoverUrl = manga?.covers?.length
    ? manga.covers[manga.covers.length - 1]
    : manga?.img || manga?.cover || "";
  const coverOptions = useMemo(
    () => [...new Set([...(manga?.covers || []), baseCoverUrl].filter(Boolean))],
    [baseCoverUrl, manga?.covers],
  );
  const selectedCoverSlugRef = useRef("");
  const activeCoverUrl = selectedCoverUrl || baseCoverUrl;
  const coverUpdatedAt = Number(manga?.coverUpdatedAt || 0);
  const cover = useCoverImageSource(
    activeCoverUrl,
    manga?.nsfw && !showNsfw ? "nsfwCover" : "coverDetail",
  );
  const coverPreviewSource = manga?.nsfw && !showNsfw
    ? cover
    : imageProxyUrl(originalReaderImageUrl(activeCoverUrl), "readerFallback");
  useEffect(() => {
    setDetailCoverLoaded(false);
    setDetailCoverFailed(false);
  }, [activeCoverUrl]);
  useEffect(() => {
    if (!coverPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCoverPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [coverPreviewOpen]);
  const [state, setState] = useState<DetailState>(() =>
    manga || initialManga ? "ready" : "loading",
  );
  const [detailCoverLoaded, setDetailCoverLoaded] = useState(false);
  const [detailCoverFailed, setDetailCoverFailed] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [managedChapterList, setManagedChapterList] = useState(
    () => initialChaptersManaged && initialChapters.length > 0,
  );
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [chapterState, setChapterState] = useState<"loading" | "ready" | "error">("loading");
  const [chapterError, setChapterError] = useState("");
  const [source, setSource] = useState<ChapterSource>("blogger");
  const [sourcePreferenceReady, setSourcePreferenceReady] = useState(false);
  const [chapterRetry, setChapterRetry] = useState(0);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [view, setView] = useState<"grid" | "list" | "text-grid">("text-grid");
  const [detailTab, setDetailTab] = useState<"chapters" | "synopsis" | "covers" | "discussion">("chapters");

  const [hideDetailCoverBackground, setHideDetailCoverBackground] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [chapterWindow, setChapterWindow] = useState(CHAPTER_UI_BATCH);
  const chapterSentinelRef = useRef<HTMLDivElement | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSyncError, setNotificationSyncError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("");
  const [reportTypeOpen, setReportTypeOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportToast, setReportToast] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const reportTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const mangaSlug = manga?.slug;
  const mangaTitle = manga?.title;

  useEffect(() => {
    try {
      setMetadataExpanded(window.localStorage.getItem("seriesMetadataExpanded") === "true");
    } catch (error) {
      console.warn("Could not read the series metadata display preference.", error);
    }
  }, []);

  useEffect(() => {
    if (!reportOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || sendingReport) return;
      if (reportTypeOpen) {
        setReportTypeOpen(false);
      } else {
        setReportOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [reportOpen, reportTypeOpen, sendingReport]);

  useEffect(() => {
    if (!reportOpen || !reportTypeOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!reportTypeDropdownRef.current?.contains(event.target as Node)) {
        setReportTypeOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [reportOpen, reportTypeOpen]);

  useEffect(() => {
    if (!reportToast) return;
    const timeout = window.setTimeout(() => setReportToast(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [reportToast]);

  useEffect(() => {
    const syncAppearance = () => {
      setHideDetailCoverBackground(readGlobalAppearance().hideDetailCoverBackground);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === GLOBAL_APPEARANCE_KEY || event.key === null) {
        syncAppearance();
      }
    };
    syncAppearance();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let active = true;
    setCommentCount(null);
    const pageId = `detail_${slug}`;
    const handleWidgetCount = (event: Event) => {
      const detail = (event as CustomEvent<{ postId?: string; count?: number }>).detail;
      if (detail?.postId === pageId && typeof detail.count === "number") {
        setCommentCount(detail.count);
      }
    };
    window.addEventListener("communityCommentCount", handleWidgetCount);

    const loadCount = async () => {
      try {
        const snapshot = await getDocs(
          collection(getCommentCountFirestore(), "comments", pageId, "postComments"),
        );
        if (active) setCommentCount(snapshot.size);
      } catch (error) {
        console.error(`Gagal memuat jumlah komentar ${pageId}.`, error);
        if (active) setCommentCount(null);
      }
    };
    void loadCount();

    return () => {
      active = false;
      window.removeEventListener("communityCommentCount", handleWidgetCount);
    };
  }, [slug]);

  useEffect(() => {
    if (!mangaSlug) return;
    let active = true;
    if (selectedCoverSlugRef.current !== mangaSlug) {
      selectedCoverSlugRef.current = mangaSlug;
      setSelectedCoverUrl("");
    }
    setCoverPreferenceError("");
    let localPreference = "";
    try {
      localPreference = localStorage.getItem(`${SERIES_COVER_PREFERENCE_STORAGE_KEY}${mangaSlug}`) || "";
    } catch (error) {
      console.warn(`Could not read the homepage cover selection for ${mangaSlug}.`, error);
    }
    let preferenceUpdatedAt = 0;
    try {
      preferenceUpdatedAt = Number(localStorage.getItem(`${SERIES_COVER_PREFERENCE_UPDATED_AT_KEY}${mangaSlug}`)) || 0;
    } catch (error) {
      console.warn(`Could not read the cover preference timestamp for ${mangaSlug}.`, error);
    }
    if (localPreference && (!coverUpdatedAt || preferenceUpdatedAt >= coverUpdatedAt)) {
      setSelectedCoverUrl(localPreference);
      return () => {
        active = false;
      };
    }
    if (!("indexedDB" in window)) return;
    void getSavedSeriesCoverUrl(mangaSlug).then((savedUrl) => {
      if (!active || !savedUrl || (coverUpdatedAt > 0 && preferenceUpdatedAt < coverUpdatedAt)) return;
      setSelectedCoverUrl(savedUrl);
      try {
        localStorage.setItem(`${SERIES_COVER_PREFERENCE_STORAGE_KEY}${mangaSlug}`, savedUrl);
      } catch (error) {
        console.warn(`Could not mirror the selected cover for ${mangaSlug} to homepage storage.`, error);
      }
    }).catch((error: unknown) => {
      console.error(`Could not load the selected cover for ${mangaSlug}.`, error);
      if (active) setCoverPreferenceError("Could not load the saved cover selection.");
    });
    return () => {
      active = false;
    };
  }, [mangaSlug, coverUpdatedAt]);

  const detailLayoutStyle = {
    "--detail-gutter": "32px",
    "--detail-max-width": "1250px",
  } as CSSProperties;
  const isHybridSeries = manga?.source === "hybrid" || initialManga?.source === "hybrid";
  const shouldLoadLiveChapterLinks = initialChaptersManaged || isHybridSeries;

  useLayoutEffect(() => {
    const sourcePreference = localStorage.getItem("chapterSourceMode");
    const sortPreference = localStorage.getItem("chapterSortMode");
    const viewPreference = localStorage.getItem("chapterViewMode");
    if (sourcePreference === "sv2" || sourcePreference === "es" || sourcePreference === "sv1") {
      setSource(sourcePreference === "sv1" ? "blogger" : sourcePreference === "sv2" ? "blogger2" : "firestore");
    }
    if (sortPreference === "oldest" || sortPreference === "newest") setSort(sortPreference);
    if (viewPreference === "list" || viewPreference === "text-grid" || viewPreference === "grid") {
      setView(viewPreference);
    }
    setSourcePreferenceReady(true);
  }, [initialChaptersManaged]);

  useEffect(() => {
    let controller = new AbortController();
    let requestId = 0;
    const publishManga = (nextManga: Manga) => {
      setManga(nextManga);
    };
    const loadCurrentManga = (force: boolean) => {
      controller.abort();
      controller = new AbortController();
      const requestSignal = controller.signal;
      const currentRequestId = ++requestId;
      if (!force) {
        const availableManga = manga || initialManga;
        const browserManga = getCurrentMangaForSlug(slug);
        const cachedManga =
          browserManga && availableManga
            ? mergeCachedManga(browserManga, availableManga)
            : browserManga || availableManga;
        if (cachedManga) {
          publishManga(cachedManga);
          setState("ready");
          void cacheMangaDetail(slug, cachedManga);
          if (hasCachedDetailMetadata(cachedManga)) {
            void fetchMangaCatalogSourceMode(requestSignal).then((sourceMode) => {
              if (!sourceMode || requestSignal.aborted || currentRequestId !== requestId) return;
              if (sourceMode !== (cachedManga.catalogSourceMode || "effective")) {
                loadCurrentManga(true);
              }
            }).catch((error: unknown) => {
              if (requestSignal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
              console.warn("Could not verify the catalog source for cached series metadata.", error);
            });
            return;
          }
        }
      }
      let hasDisplayedManga = false;
      if (!force && !manga && !initialManga) {
        setManga(null);
        setState("loading");
      }
      loadManga(slug, requestSignal, force, (availableManga) => {
        if (requestSignal.aborted || currentRequestId !== requestId) return;
        hasDisplayedManga = true;
        publishManga(availableManga);
        setState("ready");
      }).then((result) => {
        if (requestSignal.aborted || currentRequestId !== requestId) return;
        if (!result) {
          setState("not-found");
          return;
        }
        publishManga(result);
        setState("ready");
      }).catch((error: unknown) => {
        if (requestSignal.aborted || currentRequestId !== requestId) return;
        console.error("Detail manga gagal dimuat.", error);
        if (!force && !hasDisplayedManga) setState("error");
      });
    };
    const handleMetadataUpdated = () => loadCurrentManga(true);
    const handleCachedMetadataUpdated = () => loadCurrentManga(true);
    loadCurrentManga(false);
    window.addEventListener(MANGA_METADATA_UPDATED_EVENT, handleMetadataUpdated);
    window.addEventListener(MANGA_METADATA_CACHE_UPDATED_EVENT, handleCachedMetadataUpdated);
    return () => {
      window.removeEventListener(MANGA_METADATA_UPDATED_EVENT, handleMetadataUpdated);
      window.removeEventListener(MANGA_METADATA_CACHE_UPDATED_EVENT, handleCachedMetadataUpdated);
      controller.abort();
    };
  }, [slug]);

  useLayoutEffect(() => {
    if (!sourcePreferenceReady) return;
    const managedChapters = initialChaptersManaged
      ? initialChapters.filter((chapter) => chapter.source === "firestore" || chapter.source === source)
      : [];
    if (initialChaptersManaged && initialChapters.length > 0 &&
      source === initialChapterSource && !shouldLoadLiveChapterLinks) {
      setChapters(initialChapters);
      setManagedChapterList(true);
      setChapterState("ready");
      try {
        const saved = setLocalStorageCacheItem(`chapters_${slug}`, JSON.stringify({
          time: Date.now(),
          data: compactChapterCache(initialChapters),
          completeSources: ["firestore"],
          chapterListVersion: 2,
          summaryOnlySource: "firestore",
          managed: true,
        }));
        if (!saved) console.warn(`Managed chapter cache could not be saved for ${slug}.`);
      } catch (error) {
        console.warn(`Managed chapter cache could not be saved for ${slug}.`, error);
      }
      return;
    }
    if (
      initialChaptersManaged &&
      initialChapters.length > 0 &&
      source === "firestore" &&
      managedInitialSeededSlugRef.current !== slug
    ) {
      managedInitialSeededSlugRef.current = slug;
      setChapters(initialChapters);
      setManagedChapterList(true);
      setChapterState("ready");
      try {
        const saved = setLocalStorageCacheItem(`chapters_${slug}`, JSON.stringify({
          time: Date.now(),
          data: compactChapterCache(initialChapters),
          completeSources: ["firestore"],
          chapterListVersion: 2,
          summaryOnlySource: "firestore",
          managed: true,
        }));
        if (!saved) console.warn(`Managed chapter cache could not be saved for ${slug}.`);
      } catch (error) {
        console.warn(`Managed chapter cache could not be saved for ${slug}.`, error);
      }
    }
    if (managedChapterList && chapters.length > 0 &&
      source === initialChapterSource && !shouldLoadLiveChapterLinks) {
      setChapterState("ready");
      return;
    }
    const hasLocalCache = Boolean(
      typeof localStorage !== "undefined" && localStorage.getItem(`chapters_${slug}`),
    );

    if (source === "firestore" && initialChapters.length > 0 && chapters.length === 0) {
      setChapters(initialChapters);
      setChapterState("ready");
    }

    if (!mangaTitle && !hasLocalCache && !shouldLoadLiveChapterLinks) return;
    const controller = new AbortController();
    setChapterError("");
    if (chapterCacheSlugRef.current !== slug) {
      chapterSourceCacheRef.current.clear();
      chapterSourceFetchedAtRef.current.clear();
      chapterCacheSlugRef.current = slug;
    }
    let cachedChapters: Chapter[] = [];
    let cachedSelectedChapters: Chapter[] = [];
    let cachedFirestoreChapters: Chapter[] = [];
    let cacheAge = Number.POSITIVE_INFINITY;
    let summaryOnlySource: ChapterSource | null = null;
    const cached = localStorage.getItem(`chapters_${slug}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          time?: number;
          data?: Chapter[];
          completeSources?: ChapterSource[];
          chapterListVersion?: number;
          summaryOnlySource?: ChapterSource;
          managed?: boolean;
        };
        cacheAge = Date.now() - (parsed.time || 0);
        summaryOnlySource = parsed.summaryOnlySource || null;
        const cachedData = cacheAge >= 0 && cacheAge < CHAPTER_CACHE_DURATION_MS
          ? parsed.data || []
          : [];
        const completeSources = Array.isArray(parsed.completeSources)
          ? parsed.completeSources
          : [];
        const valid = cachedData.filter(
          (chapter) => chapter.source === "firestore" ||
            (parsed.chapterListVersion === 2 && completeSources.includes(chapter.source)),
        );
        if (parsed.managed && valid.length && summaryOnlySource === source) {
          cachedChapters = valid;
          cachedSelectedChapters = valid;
          setManagedChapterList(true);
        }
        cachedSelectedChapters = valid.filter(
          (chapter) => (parsed.managed === true && summaryOnlySource === source) ||
            (
              chapter.source === source &&
              summaryOnlySource !== source &&
              (source === "firestore" || !/^\/(?:manga|novel)\//.test(chapter.url || ""))
            ),
        );
        cachedFirestoreChapters = mergeChapterSources(
          initialChaptersManaged ? initialChapters : [],
          valid.filter((chapter) => chapter.source === "firestore"),
        );
        cachedChapters = mergeChapterFallback(source, cachedSelectedChapters, managedChapters);
      } catch (error) {
        console.warn("Cache chapter manga tidak valid dan akan diabaikan.", error);
        localStorage.removeItem(`chapters_${slug}`);
      }
    }
    if (
      cachedSelectedChapters.length > 0 &&
      cacheAge >= 0 &&
      cacheAge < CHAPTER_CACHE_DURATION_MS &&
      (source === "firestore" || cacheAge < BLOGGER_LIST_REFRESH_INTERVAL_MS) &&
      !shouldLoadLiveChapterLinks
    ) {
      if (source === "firestore" || chaptersHaveThumbnails(cachedSelectedChapters)) {
        chapterSourceCacheRef.current.set(
          chapterSourceCacheKey(slug, source),
          cachedSelectedChapters,
        );
        if (source !== "firestore") {
          chapterSourceFetchedAtRef.current.set(
            chapterSourceCacheKey(slug, source),
            Date.now() - cacheAge,
          );
        }
      }
      if (cachedFirestoreChapters.length) {
        chapterSourceCacheRef.current.set(
          chapterSourceCacheKey(slug, "firestore"),
          cachedFirestoreChapters,
        );
      }
      setChapters(mergeChapterFallback(source, cachedSelectedChapters, managedChapters));
      setChapterState("ready");
      return () => controller.abort();
    }
    const immediatelyAvailable = cachedChapterListForSource(
      chapterSourceCacheRef.current,
      slug,
      source,
    );

    if (immediatelyAvailable?.length) {
      setChapters(mergeChapterFallback(source, immediatelyAvailable, managedChapters));
      setChapterState("ready");
    } else if (cachedChapters.length > 0) {
      setChapters(cachedChapters);
      setChapterState("ready");
      if (
        cachedSelectedChapters.length > 0 &&
        (source === "firestore" || chaptersHaveThumbnails(cachedSelectedChapters))
      ) {
        chapterSourceCacheRef.current.set(
          chapterSourceCacheKey(slug, source),
          cachedSelectedChapters,
        );
      }
      if (cachedFirestoreChapters.length) {
        chapterSourceCacheRef.current.set(
          chapterSourceCacheKey(slug, "firestore"),
          cachedFirestoreChapters,
        );
      }
    } else if (chapters.length > 0) {
      setChapterState("ready");
    } else {
      setChapterState("loading");
    }

    const loadSelectedAndSupplementalSources = async () => {
      const loadAndCache = async (
        chapterSource: ChapterSource,
        forceServer = false,
      ): Promise<Chapter[]> => {
        const key = chapterSourceCacheKey(slug, chapterSource);
        const memoryCache = chapterSourceCacheRef.current;
        const cached = memoryCache.get(key);
        const fetchedAt = chapterSourceFetchedAtRef.current.get(key) || 0;
        if (
          !forceServer &&
          cached &&
          chapterSource !== "firestore" &&
          Date.now() - fetchedAt < BLOGGER_LIST_REFRESH_INTERVAL_MS
        ) {
          return cached;
        }
        if (!forceServer && cached?.length && chapterSource === "firestore") {
          try {
            await mergeSharedChapterCache(slug, chapterSource, cached);
          } catch (error) {
            console.warn(`IndexedDB chapter cache could not be updated for ${slug}.`, error);
          }
          return cached;
        }
        let sharedCachedChapters: Chapter[] = [];
        try {
          sharedCachedChapters =
            (await readSharedChapterCache<Chapter>(slug, chapterSource)) || [];
          if (
            !forceServer &&
            sharedCachedChapters.length &&
            (chapterSource === "firestore" || chaptersHaveThumbnails(sharedCachedChapters))
          ) {
            memoryCache.set(key, sharedCachedChapters);
            if (chapterSource === "firestore") return sharedCachedChapters;
          }
        } catch (error) {
          console.warn(`IndexedDB chapter cache could not be read for ${slug}.`, error);
        }
        const loaded = chapterSource === "firestore"
          ? await loadFirestoreChapterSource(slug, controller.signal, forceServer)
          : mangaTitle
            ? await loadBloggerChapterSource(mangaTitle, chapterSource, controller.signal)
            : [];
        if (controller.signal.aborted) {
          throw new DOMException("Permintaan chapter dibatalkan.", "AbortError");
        }
        if (!loaded.length) {
          if (chapterSource !== "firestore") {
            memoryCache.set(key, sharedCachedChapters);
            chapterSourceFetchedAtRef.current.set(key, Date.now());
          }
          return sharedCachedChapters;
        }
        let sharedChapters = loaded;
        if (!forceServer) {
          try {
            sharedChapters = await mergeSharedChapterCache(slug, chapterSource, loaded);
          } catch (error) {
            console.warn(`IndexedDB chapter cache could not be updated for ${slug}.`, error);
          }
        }
        memoryCache.set(key, sharedChapters);
        if (chapterSource !== "firestore") {
          chapterSourceFetchedAtRef.current.set(key, Date.now());
        }
        return sharedChapters;
      };

      const publishEarly = (list: Chapter[]) => {
        if (controller.signal.aborted || !list.length) return;
        setChapters(mergeChapterFallback(source, list, managedChapters));
        setChapterState("ready");
      };

      const liveManagedChapterLinksPromise = shouldLoadLiveChapterLinks && source !== "firestore"
        ? loadAndCache("firestore", true).then(
          (chapters) => {
            if (chapters.length) publishEarly(chapters);
            return { chapters };
          },
          (error: unknown) => ({ chapters: [] as Chapter[], error }),
        )
        : null;

      if (source === "firestore") {
        if (initialChaptersManaged && initialChapters.length > 0 && !shouldLoadLiveChapterLinks) {
          publishEarly(initialChapters);
          return initialChapters;
        }
        try {
          const only = await loadAndCache(source, shouldLoadLiveChapterLinks);
          if (only.length) return only;
        } catch (error) {
          if (cachedSelectedChapters.length) return cachedSelectedChapters;
          throw error;
        }
        return cachedSelectedChapters;
      }

      let selectedChapters = cachedSelectedChapters;
      let primaryError: unknown;
      let firestoreFallbackError: unknown;

      try {
        const primary = await loadAndCache(source);
        if (primary.length) selectedChapters = primary;
      } catch (error) {
        primaryError = error;
        console.warn(`Chapter source ${source} failed for ${slug}.`, error);
      }

      selectedChapters = mergeChapterFallback(source, selectedChapters, managedChapters);
      if (selectedChapters.length) publishEarly(selectedChapters);

      if (shouldLoadLiveChapterLinks) {
        const liveChapterLinksResult = liveManagedChapterLinksPromise
          ? await liveManagedChapterLinksPromise
          : { chapters: await loadAndCache("firestore", true) };
        if ("error" in liveChapterLinksResult) {
          firestoreFallbackError = liveChapterLinksResult.error;
          console.warn(
            `Live Firestore chapter links could not be loaded for managed series ${slug}.`,
            liveChapterLinksResult.error,
          );
        } else {
          selectedChapters = mergeChapterFallback(source, selectedChapters, liveChapterLinksResult.chapters);
          if (selectedChapters.length) publishEarly(selectedChapters);
        }
      } else if (!selectedChapters.length) {
        try {
          const firestoreChapters = await loadAndCache("firestore");
          selectedChapters = mergeChapterFallback(source, selectedChapters, firestoreChapters);
          if (selectedChapters.length) publishEarly(selectedChapters);
        } catch (error) {
          firestoreFallbackError = error;
          console.warn(`Firestore chapter fallback failed for ${slug}.`, error);
        }
      }

      if (!selectedChapters.length && primaryError) throw primaryError;
      if (!selectedChapters.length && firestoreFallbackError) throw firestoreFallbackError;
      return selectedChapters;
    };

    loadSelectedAndSupplementalSources().then((result) => {
      if (controller.signal.aborted) return;
      const finalResult = result.length || !cachedChapters.length ? result : cachedChapters;
      setChapters(finalResult);
      setChapterState("ready");
      const sourceChapters = finalResult.filter((chapter) => chapter.source === source);
      if (sourceChapters.length) {
        cacheChapterList(slug, sourceChapters, [source]);
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      console.error(`Chapter ${source} gagal dimuat.`, error);
      if (cachedChapters.length) {
        setChapters(cachedChapters);
        setChapterState("ready");
      } else {
        setChapterError(error instanceof Error ? error.message : String(error));
        setChapterState("error");
      }
    });

    return () => controller.abort();
  }, [
    slug,
    mangaTitle,
    source,
    chapterRetry,
    initialChapters,
    initialChaptersManaged,
    sourcePreferenceReady,
    isHybridSeries,
    shouldLoadLiveChapterLinks,
  ]);

  function changeChapterSource(nextSource: ChapterSource, preference: "sv1" | "sv2" | "es") {
    if (source === nextSource) return;
    localStorage.setItem("chapterSourceMode", preference);
    setChapterError("");
    const cachedChapters = cachedChapterListForSource(
      chapterSourceCacheRef.current,
      slug,
      nextSource,
    );
    const managedChapters = initialChaptersManaged
      ? initialChapters.filter((chapter) => chapter.source === "firestore" || chapter.source === nextSource)
      : [];
    if (cachedChapters?.length) {
      setChapters(mergeChapterFallback(nextSource, cachedChapters, managedChapters));
      setChapterState("ready");
    } else if (managedChapters.length) {
      setChapters(managedChapters);
      setChapterState("ready");
    } else {
      setChapters([]);
      setChapterState("loading");
    }
    setSource(nextSource);
  }

  function retryChapterLoad() {
    for (const chapterSource of ["blogger", "blogger2", "firestore"] as const) {
      chapterSourceCacheRef.current.delete(chapterSourceCacheKey(slug, chapterSource));
    }
    setChapterRetry((attempt) => attempt + 1);
  }

  useEffect(() => {
    if (!manga) return;
    document.title = `${manga.title} - Mikoroku`;
    const description = manga.desc || `Baca manga ${manga.title} di Mikoroku.`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description.slice(0, 200));
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${manga.title} - Mikoroku`);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description.slice(0, 200));
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", manga.cover || manga.img || "");
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", window.location.href);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", `${manga.title} - Mikoroku`);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", description.slice(0, 200));
    document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", manga.cover || manga.img || "");
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", window.location.href);
  }, [manga]);

  useEffect(() => {
    if (!manga || chapterState === "loading") return;
    const firebaseWindow = window as Window & {
      currentUser?: { uid?: string } | null;
      firebase?: SeriesBookmarkFirebase;
    };
    const auth = firebaseWindow.firebase?.auth?.();
    let active = true;
    const trackSeries = (uid?: string) => {
      if (!active || !uid) return;
      const key = `${uid}:${slug}`;
      const trackedCount = chapters.length;
      if (trackedSeriesRef.current.get(key) === trackedCount) return;
      trackedSeriesRef.current.set(key, trackedCount);
      void ensureSeriesTracked(uid, {
        slug,
        title: manga.title,
        cover: manga.cover || manga.img || "",
        kind: isNovelSeries(manga) ? "novel" : "manga",
        chapterCount: trackedCount,
      }).catch((error: unknown) => {
        console.warn(`Series tracking could not be synchronized for ${slug}.`, error);
        if (trackedSeriesRef.current.get(key) === trackedCount) {
          trackedSeriesRef.current.delete(key);
        }
      });
    };
    const updateCurrentUser = () => {
      const uid = auth?.currentUser?.uid || firebaseWindow.currentUser?.uid;
      if (uid) {
        trackSeries(uid);
        return;
      }
      for (const key of trackedSeriesRef.current.keys()) {
        if (key.endsWith(`:${slug}`)) trackedSeriesRef.current.delete(key);
      }
    };
    updateCurrentUser();
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = auth?.onAuthStateChanged?.((user) => {
        if (user?.uid) trackSeries(user.uid);
        else updateCurrentUser();
      });
    } catch (error) {
      console.error("Could not monitor account state for series tracking.", error);
    }
    window.addEventListener("firebaseCompatReady", updateCurrentUser);
    window.addEventListener(AUTH_USER_CHANGE_EVENT, updateCurrentUser);
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener("firebaseCompatReady", updateCurrentUser);
      window.removeEventListener(AUTH_USER_CHANGE_EVENT, updateCurrentUser);
    };
  }, [chapterState, chapters.length, manga, slug]);

  const genreList = useMemo(
    () => [...new Set((manga?.genres || [])
      .map((genre) => genre.trim())
      .filter((genre) => genre.length > 1)
      .filter((genre) => !/^(ongoing|completed|hiatus|dropped|canceled|up|manga|manhua|manhwa|novel|doujinshi|cg|type:|author:|artist:|publication:|serialization:|status:)$/i.test(genre))
      .filter((genre) => !/^\d+(?:\.\d+)?$/.test(genre) || Number(genre) > 10)
      .filter((genre) => !/^(shounen|seinen|shoujo|josei|kodomo|hentai)$/i.test(genre)))],
    [manga?.genres],
  );
  const filteredSortedChapters = useMemo(() => [...chapters]
    .filter((chapter) => {
      const query = chapterSearch.trim().toLowerCase();
      return !query || `chapter ${chapter.num} ${chapter.title || ""}`.toLowerCase().includes(query);
    })
    .sort((left, right) => {
      const order = chapterNumber(left.num) - chapterNumber(right.num);
      return sort === "newest" ? -order : order;
    }), [chapterSearch, chapters, sort]);

  const visibleChapters = useMemo(
    () => filteredSortedChapters.slice(0, chapterWindow),
    [filteredSortedChapters, chapterWindow],
  );
  const hasMoreChapters = filteredSortedChapters.length > chapterWindow;

  useEffect(() => {
    setChapterWindow(CHAPTER_UI_BATCH);
  }, [slug, source, sort, chapterSearch]);

  const chapterTotalRef = useRef(filteredSortedChapters.length);
  chapterTotalRef.current = filteredSortedChapters.length;

  useEffect(() => {
    if (!hasMoreChapters || chapterState !== "ready") return;
    const node = chapterSentinelRef.current;
    if (!node) return;

    const expand = () => {
      setChapterWindow((current) => {
        const total = chapterTotalRef.current;
        if (current >= total) return current;
        return Math.min(current + CHAPTER_UI_BATCH, total);
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      let frame = 0;
      const checkSentinel = () => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          const rect = node.getBoundingClientRect();
          const viewport = window.innerHeight || document.documentElement.clientHeight;
          if (rect.top < viewport + 320 && rect.bottom > -40) expand();
        });
      };
      window.addEventListener("scroll", checkSentinel, { passive: true });
      checkSentinel();
      return () => {
        window.removeEventListener("scroll", checkSentinel);
        if (frame) window.cancelAnimationFrame(frame);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) expand();
      },
      { root: null, rootMargin: "320px 0px", threshold: 0 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreChapters, chapterState, filteredSortedChapters.length]);
  function selectDetailCover(url: string) {
    setSelectedCoverUrl(url);
    setCoverPreferenceError("");
    if (!manga) return;
    let localSaved = false;
    try {
      localStorage.setItem(`${SERIES_COVER_PREFERENCE_STORAGE_KEY}${manga.slug}`, url);
      localStorage.setItem(`${SERIES_COVER_PREFERENCE_UPDATED_AT_KEY}${manga.slug}`, String(Date.now()));
      localSaved = true;
    } catch (error) {
      console.warn(`Could not save the homepage cover selection for ${manga.slug}.`, error);
    }
    if (!("indexedDB" in window)) {
      if (!localSaved) setCoverPreferenceError("Browser storage is unavailable; cover selection will not persist.");
      return;
    }
    void saveSeriesCoverUrl(manga.slug, url).catch((error: unknown) => {
      console.error(`Could not save the selected cover for ${manga.slug}.`, error);
      if (!localSaved) setCoverPreferenceError("Cover changed for this visit, but could not be saved in this browser.");
    });
  }
  const latestChapter = useMemo(
    () => chapters.reduce<Chapter | undefined>((latest, chapter) =>
      !latest || chapterNumber(chapter.num) > chapterNumber(latest.num) ? chapter : latest, undefined),
    [chapters],
  );
  const rating = Number.parseFloat(String(manga?.rating ?? ""));
  const ratingFromGenres = manga?.genres?.map((genre) => Number.parseFloat(genre))
    .find((value) => Number.isFinite(value) && value >= 0 && value <= 10);
  const ratingValue = Number.isFinite(rating) ? rating : ratingFromGenres;
  const latestChapterDate = useMemo(() => {
    const timestamps = chapters.flatMap((chapter) => {
      const value = chapter.updatedAt || chapter.date || chapter.createdAt || chapter.timestamp;
      const date = parseDateValue(value);
      return date ? [date.getTime()] : [];
    });
    return timestamps.length ? Math.max(...timestamps) : undefined;
  }, [chapters]);
  const latestUpdate = latestChapterDate ?? (
    manga?.latestUpdate || manga?.updatedAt
  );
  const chapterCount = chapters.length ? `${chapters.length} Chapters` : "Unknown";

  useEffect(() => {
    if (!manga) return;
    let current: Array<string | { title?: string; img?: string; slug?: string; addedAt?: number }> = [];
    try {
      current = JSON.parse(localStorage.getItem("mangaBookmarks") || "[]");
    } catch (error) {
      console.warn("Daftar bookmark lokal tidak valid dan akan diabaikan.", error);
    }
    setBookmarked(current.some((item) => normalizedKey(typeof item === "string" ? item : item.title || "") === normalizedKey(manga.title)));
    const refreshReadChapters = () => {
      try {
        setReadChapters(JSON.parse(localStorage.getItem(`read_${manga.title}`) || "[]"));
      } catch (error) {
        console.warn("Riwayat chapter lokal tidak valid dan akan diabaikan.", error);
        setReadChapters([]);
      }
    };
    refreshReadChapters();
    window.addEventListener("mikoroku:chapter-read", refreshReadChapters);
    return () => window.removeEventListener("mikoroku:chapter-read", refreshReadChapters);
  }, [manga]);

  useEffect(() => {
    let active = true;
    const refreshSubscription = async () => {
      const local = readSeriesNotificationSubscriptions();
      setNotificationsEnabled(local.some((item) => item.slug === slug));
      try {
        const subscriptions = await loadSeriesNotificationSubscriptions();
        if (active) {
          setNotificationsEnabled(subscriptions.some((item) => item.slug === slug));
          setNotificationSyncError("");
        }
      } catch (error) {
        console.warn("Series notification preference could not be synchronized.", error);
        if (active && getSeriesNotificationUserId()) {
          setNotificationSyncError("Notifikasi tersimpan di perangkat, tetapi gagal disinkronkan.");
        }
      }
    };
    const handleNotificationUpdate = () => {
      setNotificationsEnabled(
        readSeriesNotificationSubscriptions().some((item) => item.slug === slug),
      );
    };
    void refreshSubscription();
    window.addEventListener(SERIES_NOTIFICATIONS_UPDATED_EVENT, handleNotificationUpdate);
    const handleAccountChange = () => { void refreshSubscription(); };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SERIES_NOTIFICATIONS_STORAGE_KEY) void refreshSubscription();
    };
    window.addEventListener(AUTH_USER_CHANGE_EVENT, handleAccountChange);
    window.addEventListener("firebaseCompatReady", handleAccountChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener(SERIES_NOTIFICATIONS_UPDATED_EVENT, handleNotificationUpdate);
      window.removeEventListener(AUTH_USER_CHANGE_EVENT, handleAccountChange);
      window.removeEventListener("firebaseCompatReady", handleAccountChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [slug]);

  const toggleSeriesNotifications = useCallback(() => {
    if (!manga) return;
    setNotificationSyncError("");
    const uid = getSeriesNotificationUserId();
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      void removeSeriesNotificationSubscription(slug, uid).catch((error: unknown) => {
        console.error("Series notification preference could not be removed from Firestore.", error);
        setNotificationSyncError(uid
          ? "Perubahan notifikasi tersimpan lokal, tetapi gagal disinkronkan."
          : "");
      });
      return;
    }

    setNotificationsEnabled(true);
    const subscribedAt = Date.now();
    const currentCatalogRecord = getCachedFirestoreMangaCatalog()
      .find((item) => item.slug === slug);
    const fallbackVersion = seriesUpdateVersion(
      currentCatalogRecord ?? { ...manga.info, ...manga },
    );
    const subscription = {
      slug,
      title: manga.title,
      cover: manga.cover || manga.img || "",
      subscribedVersion: fallbackVersion,
      lastSeenVersion: fallbackVersion,
      subscribedAt,
    };
    try {
      saveLocalSeriesNotificationSubscription(subscription);
    } catch (error) {
      console.error("Series notification preference could not be saved locally.", error);
      setNotificationsEnabled(false);
      setNotificationSyncError("Notifikasi tidak dapat disimpan di perangkat ini.");
      return;
    }

    void (async () => {
      let version = fallbackVersion;
      try {
        const catalog = await loadFirestoreMangaCatalog();
        const match = catalog.find((item) => item.slug === slug);
        if (match) version = seriesUpdateVersion(match);
      } catch (error) {
        console.warn("Current series update version could not be loaded from the catalog.", error);
      }

      const current = readSeriesNotificationSubscriptions()
        .find((item) => item.slug === slug && item.subscribedAt === subscribedAt);
      if (!current) return;
      await saveSeriesNotificationSubscription({
        ...current,
        subscribedVersion: version,
        lastSeenVersion: version,
      }, uid);
    })().catch((error: unknown) => {
      console.error("Series notification preference could not be saved.", error);
      setNotificationSyncError(uid
        ? "Notifikasi tersimpan lokal, tetapi sinkronisasi akun gagal."
        : "Notifikasi tersimpan di perangkat ini. Login untuk menyinkronkannya.");
    });
  }, [manga, notificationsEnabled, slug]);

  const toggleBookmark = useCallback(() => {
    if (!manga) return;
    const key = normalizedKey(manga.title);
    let current: Array<string | { title?: string; img?: string; slug?: string; addedAt?: number }> = [];
    try {
      current = JSON.parse(localStorage.getItem("mangaBookmarks") || "[]");
    } catch (error) {
      console.warn("Daftar bookmark lokal tidak valid dan akan diabaikan.", error);
    }
    const next = current.filter((item) =>
      normalizedKey(typeof item === "string" ? item : item.title || "") !== key,
    );
    const isSaved = next.length === current.length;
    if (isSaved) {
      next.unshift({ title: manga.title, img: manga.cover || manga.img || "", slug, addedAt: Date.now() });
    }
    localStorage.setItem("mangaBookmarks", JSON.stringify(next));
    markLocalBookmarksUpdated();
    setBookmarked(isSaved);
    window.dispatchEvent(new Event("bookmarkUpdated"));
    const firebaseWindow = window as Window & {
      currentUser?: { uid?: string } | null;
      firebase?: SeriesBookmarkFirebase;
    };
    const uid = firebaseWindow.firebase?.auth?.().currentUser?.uid || firebaseWindow.currentUser?.uid;
    if (uid) {
      void setCachedBookmarkCount(uid, next.length).catch((cacheError: unknown) => {
        console.warn("Bookmark count could not be updated in the Stats cache.", cacheError);
      });
      void (async () => {
        const firestore = firebaseWindow.firebase?.firestore?.();
        if (!firestore) throw new Error("Bookmark synchronization is unavailable.");
        const fieldValue = firebaseWindow.firebase?.firestore?.FieldValue;
        if (!fieldValue) throw new Error("Firestore counters are unavailable.");
        const bookmarkReference = firestore.collection("users").doc(uid)
          .collection("bookmarks").doc(key);
        const statisticsReference = firestore.collection("seriesStats")
          .doc(encodeURIComponent(slug));
        await firestore.runTransaction(async (transaction) => {
          const [bookmarkSnapshot, statisticsSnapshot] = await Promise.all([
            transaction.get(bookmarkReference),
            transaction.get(statisticsReference),
          ]);
          const previousBookmark = bookmarkSnapshot.exists ? bookmarkSnapshot.data() ?? {} : {};
          const wasCounted = bookmarkSnapshot.exists &&
            previousBookmark.slug === slug &&
            previousBookmark.seriesNotification !== true;
          const willBeCounted = isSaved && previousBookmark.seriesNotification !== true;
          const delta = Number(willBeCounted) - Number(wasCounted);

          if (isSaved) {
            transaction.set(bookmarkReference, {
              title: manga.title,
              img: manga.cover || manga.img || "",
              slug,
              addedAt: Date.now(),
              updatedAt: Date.now(),
            }, { merge: true });
          } else if (bookmarkSnapshot.exists) {
            transaction.delete(bookmarkReference);
          }

          const previousStatistics = statisticsSnapshot.exists
            ? statisticsSnapshot.data() ?? {}
            : {};
          const count = (field: "views" | "bookmarks" | "notifications") => {
            const value = previousStatistics[field];
            return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
              ? value
              : 0;
          };
          const currentBookmarks = count("bookmarks");
          const nextBookmarks = Math.max(0, currentBookmarks + delta);
          if (delta !== 0 || !statisticsSnapshot.exists) {
            transaction.set(statisticsReference, {
              views: count("views"),
              bookmarks: delta !== 0 && currentBookmarks + delta >= 0
                ? fieldValue.increment(delta)
                : nextBookmarks,
              notifications: count("notifications"),
            }, { merge: true });
          }
        });
      })().catch((syncError: unknown) => {
        console.warn("Bookmark is saved locally and will need cloud synchronization.", syncError);
      });
    }
  }, [manga, slug]);

  async function submitDetailReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manga || !reportType) {
      setReportMessage("Please select a report type.");
      return;
    }

    setSendingReport(true);
    setReportMessage("");
    try {
      const { firestore } = initializeFirebaseClient();
      await addDoc(collection(firestore, "chapterReports"), {
        slug: manga.slug,
        chapter: "Detail",
        url: window.location.href,
        type: `Detail: ${reportType}`,
        reason: reportReason.trim() || "-",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setReportToast("Laporan berhasil terkirim.");
      setReportOpen(false);
      setReportMessage("");
      setReportType("");
      setReportTypeOpen(false);
      setReportReason("");
    } catch (error) {
      console.error("Failed to submit manga detail report.", error);
      setReportMessage(error instanceof Error ? error.message : "Failed to submit report.");
    } finally {
      setSendingReport(false);
    }
  }

  const openChapter = useCallback(async (chapter: Chapter) => {
    if (!manga) return;
    const isNovel = chapter.isNovel || isNovelSeries(manga);
    const chapterName = `Chapter ${chapter.num}`;
    const isManagedInternalLink = chapter.source === "firestore" &&
      /^\/(?:manga|novel)\//.test(chapter.url || "");
    const readerSource = chapter.source === "firestore" &&
      source !== "firestore" &&
      !isManagedInternalLink
      ? source
      : chapter.source;
    let images = chapter.source === "firestore" && readerSource !== "firestore"
      ? []
      : chapter.images || [];

    if (
      !isNovel &&
      !images.length &&
      (readerSource === "blogger" || readerSource === "blogger2") &&
      manga.title
    ) {
      try {
        images = await loadBloggerChapterImages(
          manga.title,
          readerSource,
          chapter.num,
        );
      } catch (error) {
        console.warn("Gagal mengambil gambar chapter dari proxy Blogger.", error);
      }
    }
    if (!isNovel && !images.length && chapter.source === "firestore" && readerSource === "firestore") {
      try {
        const response = await fetch(
          `${FIRESTORE_BASE}/manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapter.id || String(chapter.num))}`,
        );
        if (response.ok) {
          const document = await response.json() as { fields?: Record<string, unknown> };
          const data = decodeFirestoreDocument(document);
          images = extractChapterImages(data.images || data.content || data.html);
        } else if (response.status !== 404) {
          console.error(`Gambar chapter gagal dimuat (HTTP ${response.status}).`);
        }
      } catch (error) {
        console.error("Gambar chapter gagal dimuat dari Firestore.", error);
      }
    }
    images = [...new Set(images.map(originalReaderImageUrl))];
    localStorage.setItem("currentChapter", JSON.stringify({
      slug,
      id: readerSource === "firestore" ? chapter.id : undefined,
      num: chapter.num,
      title: manga.title,
      postTitle: chapter.title || chapterName,
      label: chapterName,
      images,
      thumbnail: chapter.thumbnail || images[0] || "",
      url: chapter.url || "",
      source: readerSource,
      isNovel,
    }));
    const readerRoute = isNovel ? "/novel" : "/manga";
    window.location.href = `${readerRoute}/${encodeURIComponent(slug)}/${encodeURIComponent(String(chapter.num))}`;
  }, [manga, slug]);

  if (state === "loading") {
    return (
      <>
        <SeriesLoadingContent />
        <SiteFooter backgroundColor="transparent" removeTopGap />
        <RouteIntegrations />
      </>
    );
  }
  if (state === "not-found") {
    return (
      <>
        <main className={`detail-route ${detailPageClasses}`} style={detailLayoutStyle}>
          <p className="detail-route-message" role="status">Manga tidak ditemukan.</p>
        </main>
        <SiteFooter backgroundColor="transparent" removeTopGap />
        <RouteIntegrations />
      </>
    );
  }
  if (state === "error" || !manga) {
    return (
      <>
        <main className={`detail-route ${detailPageClasses}`}>
          <p className="detail-route-message" role="alert">Detail manga gagal dimuat. Coba muat ulang halaman.</p>
        </main>
        <SiteFooter backgroundColor="transparent" removeTopGap />
        <RouteIntegrations />
      </>
    );
  }

  const status = (manga.status || "UNKNOWN").toUpperCase();
  const demographics = asStringList(manga.demographic);
  const femaleTags = asStringList(manga.femaleTags);
  const maleTags = asStringList(manga.maleTags);
  const formatTagLabel = (tag: string) => tag.replace(/_/g, " ");

  return (
    <>
      <div
        className="pointer-events-none fixed top-0 left-0 right-0 bottom-0 z-0 w-full bg-cover bg-center bg-no-repeat opacity-[0.22] transition-[background-image,opacity] duration-500 dark:opacity-100 max-md:h-[100dvh] max-md:min-h-[100dvh]"
        id="bgLayer"
        aria-hidden="true"
        style={{ backgroundImage: !hideDetailCoverBackground && cover ? `url("${cover}")` : undefined }}
      />
      <div
        className="pointer-events-none fixed top-0 left-0 right-0 bottom-0 z-[1] w-full bg-[linear-gradient(180deg,rgba(20,20,30,0.20)_0%,rgba(20,20,30,0.10)_40%,rgba(20,20,30,0.26)_100%)] dark:bg-[linear-gradient(180deg,rgba(5,5,10,0.88)_0%,rgba(5,5,10,0.52)_40%,rgba(5,5,10,0.60)_70%,rgba(10,5,12,0.90)_100%)] max-md:h-[100dvh] max-md:min-h-[100dvh]"
        aria-hidden="true"
        style={{ backgroundImage: hideDetailCoverBackground ? "none" : undefined }}
      />
      <main className={`detail-route ${detailPageClasses}`} style={detailLayoutStyle}>
        <div className="container relative z-[2] mx-auto my-0 min-h-screen w-full max-w-[480px] text-[#171717] transition-[margin-left,width,max-width,color] duration-300 dark:text-white md:my-5 md:max-w-[720px] lg:my-[30px] lg:ml-[var(--detail-content-left)] lg:mr-0 lg:max-w-[var(--detail-max-width)] lg:w-[var(--detail-content-width)]">
          <div className="content">
            <div className="main">
              <div className="left-column">
                <div className="cover group relative grid place-items-center bg-black/10 dark:bg-white/5">
                  <CoverImage
                    key={activeCoverUrl}
                    src={activeCoverUrl || "/assets/icons/favicon.ico"}
                    alt=""
                    loading="eager"
                    nsfw={manga?.nsfw === true}
                    onLoad={() => {
                      setDetailCoverLoaded(true);
                      setDetailCoverFailed(false);
                    }}
                    onError={(event) => {
                      setDetailCoverFailed(true);
                      event.currentTarget.src = "/assets/icons/favicon.ico";
                    }}
                  />
                  {!detailCoverLoaded && (
                    <span
                      className="pointer-events-none absolute inset-0 z-[1] grid place-items-center bg-black/35 px-2 text-center text-base font-semibold text-white"
                      aria-live="polite"
                    >
                      {detailCoverFailed ? "Cover unavailable" : "Loading cover..."}
                    </span>
                  )}
                  {detailCoverLoaded && (
                    <button
                      className="absolute left-1/2 top-1/2 z-[2] grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white opacity-0 shadow-lg transition hover:bg-black/75 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white group-hover:opacity-100 max-md:hidden"
                      type="button"
                      aria-label="View cover"
                      onClick={() => setCoverPreviewOpen(true)}
                    >
                      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                        <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                        <path d="M8 8 3 3" />
                        <path d="m16 8 5-5" />
                        <path d="m8 16-5 5" />
                        <path d="m16 16 5 5" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="rating" id="ratingBox">
                  <div className="stars" aria-label={`Rating ${ratingValue === undefined ? "N/A" : ratingValue}`}>
                    {Array.from({ length: 5 }, (_, index) => {
                      const score = (ratingValue ?? 0) / 2;
                      const icon = ratingValue === undefined || score < index + 0.5
                        ? "far fa-star"
                        : score < index + 1
                          ? "fas fa-star-half-alt"
                          : "fas fa-star";
                      return <i className={icon} aria-hidden="true" key={index} />;
                    })}
                  </div>
                  <div className="rating-number">{ratingValue === undefined ? "N/A" : ratingValue.toFixed(1)}</div>
                </div>
                <div className={`flex w-full flex-col gap-2.5 md:gap-3 ${metadataExpanded ? "max-[767px]:flex" : "max-[767px]:hidden"}`}>
                  {/* Read now */}
                  <button
                    className="start-reading-btn inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[rgba(229,154,0,0.65)] bg-[rgba(229,154,0,0.2)] px-1 text-[10px] font-semibold text-[#e59a00] transition hover:bg-[rgba(229,154,0,0.32)] disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:gap-2 md:px-3 md:text-[13px]"
                    type="button"
                    onClick={() => {
                      if (latestChapter) void openChapter(latestChapter);
                    }}
                    disabled={!latestChapter || chapterState !== "ready"}
                  >
                    <i className="fas fa-book-open shrink-0 text-[10px] md:text-[13px]" aria-hidden="true" />
                    <span className="truncate">{chapterState === "loading" ? "Loading..." : "Read now"}</span>
                  </button>

                  {/* Share */}
                  <SeriesShareControl title={manga.title} />

                  {/* Report */}
                  <button
                    className="detail-report-btn inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/60 bg-red-500/15 px-1 text-[10px] font-semibold text-red-600 transition hover:border-red-500 hover:bg-red-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-red-400/50 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25 md:h-11 md:gap-2 md:px-3 md:text-[13px]"
                    type="button"
                    onClick={() => {
                      setReportMessage("");
                      setReportOpen(true);
                    }}
                  >
                    <i className="fas fa-flag shrink-0 text-[10px] md:text-[13px]" aria-hidden="true" />
                    <span className="truncate">Report</span>
                  </button>
                </div>
              </div>
              <div className="info">
                <div className={`status ${status.toLowerCase()}`}>
                  <i className="fas fa-fire" aria-hidden="true" /> <span>{status}</span>
                </div>
                <h1 className="title">{manga.title}</h1>
                <div className="title-divider" />
                {manga.altTitle && <div className="alt-title">{manga.altTitle}</div>}
                <div
                  id="series-metadata"
                  className="overflow-hidden transition-[max-height,mask-image] duration-500 ease-in-out motion-reduce:transition-none"
                  style={{
                    maxHeight: metadataExpanded ? "480px" : "0px",
                    maskImage: metadataExpanded
                      ? "none"
                      : "none",
                  }}
                >
                  <MetaTag label="Type" value={manga.type} icon="fa-layer-group" />
                  <MetaTag label="Series" value={manga.series} icon="fa-bookmark" />
                  <MetaTag label="Characters" value={asStringList(manga.characters).join(", ")} icon="fa-user-group" />
                  <div className="detail-item"><i className="fas fa-book" aria-hidden="true" /><span><strong>Chapter:</strong> {chapterCount}</span></div>
                  <MetaTag label="Publication" value={manga.publication} icon="fa-calendar-alt" />
                  <MetaTag label="Serialization" value={manga.serialization} icon="fa-newspaper" />
                  <MetaTag label="Author" value={manga.author} icon="fa-user" />
                  <MetaTag label="Artist" value={manga.artist} icon="fa-palette" />
                  <MetaTag label="Group" value={manga.group} icon="fa-people-group" />
                  <MetaTag label="Circle" value={manga.circle} icon="fa-users" />
                  <div className="detail-item latest-update"><i className="fas fa-clock" aria-hidden="true" /><span><strong>Latest Update:</strong> {formatDate(latestUpdate)}</span></div>
                  {demographics.length > 0 && (
                    <div className="detail-item demographic-item">
                      <i className="fas fa-tags" aria-hidden="true" />
                      <strong>Demographic:</strong>
                      <div className="demographic-tags">{demographics.map((item) => <span className="demographic-tag" key={item}>{item}</span>)}</div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="my-1 flex w-full items-center gap-2 rounded px-1 py-1 text-sm font-semibold text-[#555] transition-colors hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent)] dark:text-white/70 dark:hover:text-white sm:text-base"
                  aria-expanded={metadataExpanded}
                  aria-controls="series-metadata"
                  onClick={() => {
                    const expanded = !metadataExpanded;
                    setMetadataExpanded(expanded);
                    try {
                      window.localStorage.setItem("seriesMetadataExpanded", String(expanded));
                    } catch (error) {
                      console.warn("Could not save the series metadata display preference.", error);
                    }
                  }}
                >
                  <span className="h-px flex-1 bg-current opacity-35" aria-hidden="true" />
                  <span>{metadataExpanded ? "Show less" : "Show more"}</span>
                  <i
                    className={`fas fa-chevron-down text-[11px] transition-transform duration-300 motion-reduce:transition-none ${metadataExpanded ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                  <span className="h-px flex-1 bg-current opacity-35" aria-hidden="true" />
                </button>
              </div>
            </div>

            {!metadataExpanded && (
              <div className="mx-[14px] mb-3 grid grid-cols-3 items-center gap-3 md:hidden">
                <button className="start-reading-btn inline-flex min-h-0 w-full items-center justify-center gap-1 rounded-lg border border-[rgba(229,154,0,0.65)] bg-[rgba(229,154,0,0.2)] px-2 py-[6px] text-[11px] font-semibold text-[#e59a00] transition hover:bg-[rgba(229,154,0,0.32)] disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => {
                  if (latestChapter) void openChapter(latestChapter);
                }} disabled={!latestChapter || chapterState !== "ready"}>
                  <i className="fas fa-book-open shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{chapterState === "loading" ? "Loading..." : "Read now"}</span>
                </button>
                <SeriesShareControl title={manga.title} compact />
                <button
                  className="detail-report-btn inline-flex min-h-0 w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-red-500/60 bg-red-500/15 px-2 py-[6px] text-[11px] font-semibold text-red-600 transition hover:border-red-500 hover:bg-red-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-red-400/50 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25"
                  type="button"
                  onClick={() => {
                    setReportMessage("");
                    setReportOpen(true);
                  }}
                >
                  <i className="fas fa-flag shrink-0" aria-hidden="true" />
                  <span>Report</span>
                </button>
              </div>
            )}

            <SeriesStatisticsBar
              slug={slug}
              bookmarked={bookmarked}
              notificationsEnabled={notificationsEnabled}
              onToggleBookmark={toggleBookmark}
              onToggleNotifications={toggleSeriesNotifications}
              notificationError={notificationSyncError}
            />
            <div className="genres">
              {genreList.map((genre, index) => {
                const { accent, lightText } = genreAccentColors[index % genreAccentColors.length];
                return (
                  <a
                    className="genre capitalize transition-[background,border-color,transform] duration-200 hover:-translate-y-px hover:brightness-110"
                    href={`/genre-list?genre=${encodeURIComponent(genre.toLowerCase())}`}
                    key={genre}
                    style={{
                      borderColor: `${accent}80`,
                      backgroundColor: `${accent}1f`,
                      "--genre-accent": accent,
                      "--genre-light-text": lightText,
                    } as CSSProperties}
                  >
                    {genre.replace(/_/g, " ")}
                  </a>
                );
              })}
            </div>
            {(femaleTags.length > 0 || maleTags.length > 0) && (
              <section className="detail-extra-tags" aria-label="Character tags">
                {femaleTags.length > 0 && (
                  <div className="detail-tag-row">
                    <h2 className="detail-tag-label"><i className="fas fa-venus" aria-hidden="true" />Female</h2>
                    <div className="detail-tag-list">
                      {femaleTags.map((tag) => (
                        <a className="detail-gender-tag female-tag capitalize" href={`/genre-list?genre=${encodeURIComponent(tag.toLowerCase())}`} title={`View ${formatTagLabel(tag)} tag`} key={`female-${tag}`}>
                          {formatTagLabel(tag)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {maleTags.length > 0 && (
                  <div className="detail-tag-row">
                    <h2 className="detail-tag-label"><i className="fas fa-mars" aria-hidden="true" />Male</h2>
                    <div className="detail-tag-list">
                      {maleTags.map((tag) => (
                        <a className="detail-gender-tag male-tag capitalize" href={`/genre-list?genre=${encodeURIComponent(tag.toLowerCase())}`} title={`View ${formatTagLabel(tag)} tag`} key={`male-${tag}`}>
                          {formatTagLabel(tag)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
            <nav className="detail-tabs mx-3 flex w-[calc(100%-24px)] flex-nowrap items-center justify-between py-2 text-[11px] sm:text-[12px] md:mx-[30px] md:w-auto md:justify-start md:gap-4 md:text-[14px] lg:mx-10 lg:gap-5 lg:text-[15px]" role="tablist" aria-label="Series details">
              {([
                ["chapters", `Chapters (${chapters.length})`],
                ["synopsis", "Synopsis"],
                ["covers", `Volumes (${coverOptions.length})`],
                ["discussion", `Comments (${commentCount ?? "…"})`],
              ] as const).map(([tab, label]) => {
                const isActive = detailTab === tab;
                return (
                  <button
                    key={tab}
                    className={`relative min-h-8 shrink-0 origin-center border-0 bg-transparent px-0.5 py-1 text-center font-medium leading-tight transition-all duration-300 ease-out will-change-transform sm:px-1 md:text-left ${isActive
                        ? "scale-110 text-[var(--mikoroku-detail-tab-accent)] font-bold underline underline-offset-4 sm:scale-125"
                        : "scale-95 text-[#333] opacity-80 hover:scale-100 hover:opacity-100 hover:text-[var(--mikoroku-detail-tab-accent)] dark:text-white sm:scale-90"
                      }`}
                    type="button"
                    id={`detail-tab-${tab}`}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setDetailTab(tab)}
                    title={label}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>

            {detailTab === "synopsis" && <section className="synopsis max-[767px]:mt-4" role="tabpanel" aria-labelledby="detail-tab-synopsis">
              <h2>Synopsis</h2>
              {manga.desc
                ? <div className="synopsis-content">{renderSynopsisNodes(parseSynopsis(manga.desc))}</div>
                : <p>Synopsis tidak tersedia.</p>}
            </section>}

            {detailTab === "covers" && <section className="series-covers mx-3 my-4 md:mx-[30px] lg:mx-10" role="tabpanel" aria-labelledby="detail-tab-covers">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-semibold">Choose a volume cover</h2>
                  <p className="mt-1 text-xs text-[#666] dark:text-white/60">Your selection is saved in this browser.</p>
                </div>
                <span className="text-xs text-[#666] dark:text-white/60">{coverOptions.length} volumes</span>
              </div>
              {coverPreferenceError && <p className="mb-3 text-sm text-red-600 dark:text-red-300" role="status">{coverPreferenceError}</p>}
              {coverOptions.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))]">
                  {coverOptions.map((coverUrl, index) => (
                    <button
                      className={`group relative overflow-hidden rounded-xl border-2 bg-black/5 text-left transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-white/5 ${activeCoverUrl === coverUrl ? "border-[var(--mikoroku-detail-cover-accent)] shadow-[0_0_0_2px_var(--mikoroku-accent-soft)]" : "border-black/10 dark:border-white/10"}`}
                      type="button"
                      key={coverUrl}
                      onClick={() => selectDetailCover(coverUrl)}
                      aria-pressed={activeCoverUrl === coverUrl}
                      aria-label={`Use volume ${manga.coverNumbers?.[coverUrl]?.trim() || index + 1} cover`}
                    >
                      <CoverImage className="aspect-[3/4] w-full object-cover" src={coverUrl} alt="" loading="lazy" optimizePreset="coverVolume" nsfw={manga?.nsfw === true} />
                      <span className="block truncate px-2 py-2 text-xs font-medium">Volume {manga.coverNumbers?.[coverUrl]?.trim() || index + 1}</span>
                      {activeCoverUrl === coverUrl && <span className="absolute right-2 top-2 rounded-full bg-[var(--mikoroku-detail-cover-accent)] px-2 py-1 text-[10px] font-bold text-white">Selected</span>}
                    </button>
                  ))}
                </div>
              ) : <p className="text-sm text-[#666] dark:text-white/60">No volume covers have been added yet.</p>}
            </section>}

            {detailTab === "discussion" && <div className="detail-tab-comments mx-3 my-4 w-[calc(100%-24px)] md:mx-[30px] md:w-[calc(100%-60px)]" role="tabpanel" aria-labelledby="detail-tab-discussion">
              <CommunityWidgets pageId={`detail_${slug}`} />
            </div>}

            {detailTab === "chapters" && <>
              <BannerAdSlot placement="series-before-chapters" />
              <ReaderServerNotice />
              <section className="chapters" role="tabpanel" aria-labelledby="detail-tab-chapters">
                <label className="chapter-search mx-[14px] mb-2 flex min-h-10 items-center gap-2 rounded-lg border border-black/15 bg-black/[0.03] px-3 text-[#555] dark:border-white/15 dark:bg-white/[0.04] dark:text-white/60 max-[767px]:mt-3 md:mx-[30px]">
                  <i className="fas fa-search text-xs" aria-hidden="true" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm text-inherit outline-none placeholder:text-inherit"
                    type="search"
                    value={chapterSearch}
                    onChange={(event) => setChapterSearch(event.target.value)}
                    placeholder="Search chapter number or title"
                    aria-label="Search chapters"
                  />
                </label>
                <div className="chapter-header">
                  <h2 className="section-title">
                    <span className="whitespace-nowrap rounded-[15px] border border-[#aaa] bg-transparent px-[10px] py-1">
                      Chapters
                    </span>
                  </h2>
                  <div className="chapter-header-right">
                    <div className="source-toggle" aria-label="Sumber chapter">
                      <button id="sourceSv1Btn" className={`view-btn server-btn${source === "blogger" ? " active" : ""}`} type="button" title="Server 1 — Mikodrive" aria-label="Server 1 — Mikodrive" aria-pressed={source === "blogger"} onClick={() => changeChapterSource("blogger", "sv1")}>
                        <span className="server-icon-wrap">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="2" y="2" width="20" height="8" rx="2" />
                            <rect x="2" y="14" width="20" height="8" rx="2" />
                            <line x1="6" y1="6" x2="6.01" y2="6" />
                            <line x1="6" y1="18" x2="6.01" y2="18" />
                          </svg>
                          <span className="server-number">1</span>
                        </span>
                      </button>
                      <button id="sourceSv2Btn" className={`view-btn server-btn${source === "blogger2" ? " active" : ""}`} type="button" title="Server 2 — Yomidays" aria-label="Server 2 — Yomidays" aria-pressed={source === "blogger2"} onClick={() => changeChapterSource("blogger2", "sv2")}>
                        <span className="server-icon-wrap">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="2" y="2" width="20" height="8" rx="2" />
                            <rect x="2" y="14" width="20" height="8" rx="2" />
                            <line x1="6" y1="6" x2="6.01" y2="6" />
                            <line x1="6" y1="18" x2="6.01" y2="18" />
                          </svg>
                          <span className="server-number">2</span>
                        </span>
                      </button>
                      <button id="sourceEsBtn" className={`view-btn server-btn emergency-server-btn${source === "firestore" ? " active" : ""}`} type="button" title="Emergency Server — Firestore" aria-label="Emergency Server — Firestore" aria-pressed={source === "firestore"} onClick={() => changeChapterSource("firestore", "es")}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                          <path d="m2 17 10 5 10-5" />
                          <path d="m2 12 10 5 10-5" />
                        </svg>
                      </button>
                    </div>
                    <div className="view-toggle">
                      <button id="sortChapterBtn" className={`view-btn${sort === "oldest" ? " active-oldest" : " active-newest"}`} type="button" title={`Urutan: ${sort}`} aria-label={`Sort chapters ${sort === "newest" ? "oldest first" : "newest first"}`} onClick={() => { const next = sort === "newest" ? "oldest" : "newest"; localStorage.setItem("chapterSortMode", next); setSort(next); }}>
                        <i className={`fas ${sort === "newest" ? "fa-arrow-down-wide-short" : "fa-arrow-up-wide-short"}`} aria-hidden="true" />
                      </button>
                      <button id="textGridViewBtn" className={`view-btn${view === "text-grid" ? " active" : ""}`} type="button" title="Text grid" aria-label="Text grid" onClick={() => { localStorage.setItem("chapterViewMode", "text-grid"); setView("text-grid"); }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="4" rx="1" />
                          <rect x="3" y="10" width="18" height="4" rx="1" />
                          <rect x="3" y="16" width="18" height="4" rx="1" />
                        </svg>
                      </button>
                      <button id="gridViewBtn" className={`view-btn${view === "grid" ? " active" : ""}`} type="button" title="Thumbnail grid" aria-label="Thumbnail grid" onClick={() => { localStorage.setItem("chapterViewMode", "grid"); setView("grid"); }}>
                        <i className="fas fa-th-large" aria-hidden="true" />
                      </button>
                      <button id="listViewBtn" className={`view-btn${view === "list" ? " active" : ""}`} type="button" title="List" aria-label="List" onClick={() => { localStorage.setItem("chapterViewMode", "list"); setView("list"); }}>
                        <i className="fas fa-list" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  className={`chapter-grid grid grid-cols-[repeat(4,minmax(0,1fr))] content-start justify-stretch gap-2 px-4 pt-0 pb-[30px] md:grid-cols-[repeat(6,minmax(0,1fr))] md:gap-[10px] md:px-6 md:pb-10 lg:grid-cols-[repeat(8,minmax(0,1fr))] lg:px-8 lg:pb-[50px] ${chapterState === "loading"
                      ? "!flex min-h-[220px] !grid-cols-none flex-col items-center justify-center gap-3"
                      : view === "list"
                        ? "list-mode !flex flex-col !gap-[10px]"
                        : view === "text-grid"
                          ? "text-grid-mode !grid-cols-[repeat(auto-fill,minmax(120px,1fr))] !gap-[10px] max-[767px]:!grid-cols-3 max-[767px]:!gap-2 md:!grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:!grid-cols-[repeat(auto-fill,minmax(170px,1fr))]"
                          : ""
                    }`}
                  aria-busy={chapterState === "loading"}
                >
                  {chapterState === "loading" && (
                    <div className="chapter-loading-inner flex w-full flex-col items-center justify-center px-5 py-10 text-center text-[#050000] dark:text-white">
                      <i className="fas fa-spinner fa-spin fa-2x mb-3" aria-hidden="true" />
                      <span>Loading chapters...</span>
                    </div>
                  )}
                  {chapterState === "error" && (
                    <div className="chapter-empty-inner col-span-full flex w-full flex-col items-center justify-center px-5 py-10 text-center text-[#050000] dark:text-white">
                      <p>Chapter gagal dimuat.</p>
                      {chapterError && <p>{chapterError}</p>}
                      <button type="button" onClick={retryChapterLoad}>Coba lagi</button>
                    </div>
                  )}
                  {chapterState === "ready" && visibleChapters.length === 0 && (
                    <div className="chapter-empty-inner col-span-full flex w-full flex-col items-center justify-center px-5 py-10 text-center text-[#050000] dark:text-white">
                      {chapterSearch.trim() ? "No matching chapters." : "Belum ada chapter."}
                    </div>
                  )}
                  {chapterState === "ready" && visibleChapters.map((chapter, index) => {
                    const isRead = readChapters.includes(String(chapter.num).match(/(\d+(?:\.\d+)?)/)?.[0] || "");
                    return (
                      <a
                        className={`chapter-item relative aspect-square w-full min-w-0 cursor-pointer overflow-hidden rounded-[10px] border-0 bg-[rgba(0,0,0,0.25)] p-0 text-left text-inherit no-underline transition-[transform,box-shadow,filter] duration-200 hover:z-[2] hover:scale-105 active:scale-[0.97]${isRead ? " read" : ""} ${view === "list"
                            ? `!flex !h-20 !w-full !items-center !rounded-xl !bg-[rgba(255,255,255,0.1)] ![aspect-ratio:unset]${isRead ? " !bg-[rgba(0,0,0,0.24)] dark:!bg-[rgba(0,0,0,0.3)]" : ""}`
                            : view === "text-grid"
                              ? `!flex !h-auto !min-h-[60px] !flex-col !justify-center !rounded-[10px] !border !border-[rgba(0,0,0,0.1)] !bg-[rgba(80,78,78,0.04)] !p-3 !text-[#111] ![aspect-ratio:unset] ![box-shadow:none] dark:!border-[rgba(255,255,255,0.18)] dark:!bg-[rgba(255,255,255,0.08)] dark:!text-white${isRead ? " !bg-[rgba(0,0,0,0.5)] !text-white dark:!bg-[rgba(0,0,0,0.58)]" : ""}`
                              : ""
                          }`}
                        data-index={index}
                        key={`${chapter.source}-${chapter.num}-${chapter.url || chapter.id || index}`}
                          href={`/${chapter.isNovel || isNovelSeries(manga) ? "novel" : "manga"}/${encodeURIComponent(slug)}/${encodeURIComponent(String(chapter.num))}`}
                      >
                        {view !== "text-grid" && (() => {
                          const pageImages = (chapter.images || []).filter(
                            (src): src is string => typeof src === "string" && src.length > 8,
                          );

                          const candidates = [
                            pageImages[2],
                            pageImages[1],
                            pageImages[0],
                            chapter.thumbnail,
                            chapter.source === "firestore" ? cover : "",
                          ].filter((src): src is string => typeof src === "string" && src.length > 8);
                          const unique = [...new Set(candidates)];
                          const proxied = unique.map(chapterThumbProxyUrl);
                          const thumbSrc = proxied[0] || "";
                          return thumbSrc ? (
                            <img
                              key={thumbSrc}
                              className={`absolute inset-0 m-0 h-full w-full rounded-[inherit] border-0 object-cover object-center p-0 opacity-0 transition-opacity duration-150 ${view === "list" ? "!static !h-full !w-[90px] shrink-0 !rounded-none" : ""} ${isRead ? (view === "list" ? "brightness-[0.82]" : "brightness-[0.65]") : ""}`}
                              style={{ opacity: 0 }}
                              alt=""
                              loading={index < 4 ? "eager" : "lazy"}
                              fetchPriority={index < 2 ? "high" : undefined}
                              decoding="async"
                              src={thumbSrc}
                              data-thumb-index="0"
                              referrerPolicy="no-referrer"
                              onLoad={(event) => {
                                event.currentTarget.style.opacity = "1";
                              }}
                              onError={(event) => {
                                const image = event.currentTarget;
                                const next = Number(image.dataset.thumbIndex || "0") + 1;
                                if (next < proxied.length) {
                                  image.style.opacity = "0";
                                  image.dataset.thumbIndex = String(next);
                                  image.src = proxied[next];
                                  return;
                                }
                                image.style.visibility = "hidden";
                              }}
                            />
                          ) : (
                            <span
                              className={`absolute inset-0 rounded-[inherit] bg-gradient-to-br from-zinc-800 to-zinc-950 ${view === "list" ? "!static !h-full !w-[90px] shrink-0 !rounded-none" : ""}`}
                              aria-hidden="true"
                            />
                          );
                        })()}
                        {isRead && (
                          <span
                            className={`pointer-events-none absolute inset-0 z-[1] ${view === "list" ? "bg-[rgba(0,0,0,0.08)]" : "bg-[rgba(0,0,0,0.22)]"}`}
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={`pointer-events-none absolute z-[6] flex flex-col items-end gap-1 ${view === "list"
                              ? "right-[10px] top-1/2 -translate-y-1/2"
                              : view === "text-grid"
                                ? "right-2 top-2"
                                : "right-1 top-1"
                            }`}
                          aria-hidden="true"
                        >
                          <span className={`inline-flex ${isRead ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>
                            <svg
                              viewBox="0 0 32 32"
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              {isRead ? (
                                <>
                                  <path d="M7 10 3 6M16 9V3M25 10l4-4" />
                                  <path d="M3 17Q16 5 29 17Q16 29 3 17Z" />
                                  <circle cx="16" cy="17" r="3" />
                                </>
                              ) : (
                                <>
                                  <path d="M4 14Q16 27 28 14" />
                                  <path d="M7 21 5 26M16 21v7M25 21l2 5" />
                                </>
                              )}
                            </svg>
                          </span>
                          <span className={`chapter-source-badge text-[9px] font-extrabold uppercase leading-none tracking-[0.2px] max-[480px]:text-[8px] ${chapter.source === "blogger" ? "text-[#60a5fa]" : chapter.source === "blogger2" ? "text-[#fbbf24]" : "text-[#ef4444]"} ${view === "list" ? "text-[10px]" : ""}`}
                          >
                            {chapter.source === "blogger" ? "SV1" : chapter.source === "blogger2" ? "SV2" : "ES"}
                          </span>
                        </span>
                        <span className={`chapter-label absolute right-0 bottom-0 left-0 z-[2] flex flex-col items-center gap-1 bg-[rgba(0,0,0,0.85)] px-[3px] pt-1 pb-[3px] text-center text-[9px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] ${view === "list"
                            ? "!static !min-w-0 !flex-1 !items-start !justify-center !gap-[5px] !bg-transparent !px-[14px] !py-3 !pr-12 !text-left !text-inherit"
                            : view === "text-grid"
                              ? "!static !items-start !gap-[5px] !bg-transparent !p-0 !pr-8 !text-left !text-inherit ![text-shadow:none]"
                              : ""
                          }`}>
                          <span className={`chapter-title block font-bold leading-[1.15] ${view === "list"
                              ? `!text-sm ${isRead ? "!text-[#a1a1aa] dark:!text-[#71717a]" : "text-[#111] dark:text-white"}`
                              : view === "text-grid"
                                ? `text-[12px] md:text-[12px] ${isRead ? "!text-[#a1a1aa] dark:!text-[#71717a]" : "text-[#111] dark:text-white"}`
                                : `text-[9px] ${isRead ? "opacity-60" : ""}`
                            }`}>
                            {view === "text-grid" ? (
                              <>
                                <span className="md:hidden">Ch {chapter.num}</span>
                                <span className="hidden md:inline">Chapter {chapter.num}</span>
                              </>
                            ) : (
                              <>Chapter {chapter.num}</>
                            )}
                          </span>
                          <span className={`chapter-date mt-0 block opacity-80 ${view === "list"
                              ? `text-[11px] ${isRead ? "!text-[#71717a] dark:!text-[#52525b]" : "text-[#444] dark:text-[#ddd]"}`
                              : view === "text-grid"
                                ? `text-[10px] opacity-70 md:text-[10px] ${isRead ? "!text-[#71717a] dark:!text-[#52525b]" : "text-[#444] dark:text-[#ddd]"}`
                                : `text-[7px] ${isRead ? "opacity-60" : ""}`
                            }`}>
                            {formatDate(chapter.createdAt || chapter.updatedAt || chapter.date)}
                          </span>
                        </span>
                      </a>
                    );
                  })}
                  {chapterState === "ready" && hasMoreChapters && (
                    <>
                      <div
                        ref={chapterSentinelRef}
                        className="col-span-full h-px w-full"
                        aria-hidden="true"
                      />
                      <div className="col-span-full flex w-full justify-center py-4">
                        <button
                          type="button"
                          className="rounded-lg border border-[rgba(128,128,128,0.35)] px-4 py-2 text-sm font-semibold text-current transition-colors hover:bg-[rgba(128,128,128,0.12)]"
                          onClick={() => setChapterWindow((current) =>
                            Math.min(current + CHAPTER_UI_BATCH, filteredSortedChapters.length),
                          )}
                        >
                          Load more chapters
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </>}
          </div>
        </div>
        <RecommendationSidebar manga={manga} />
      </main>
      {reportOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-[3px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !sendingReport) setReportOpen(false);
          }}
        >
          <form
            className="max-h-[min(90vh,700px)] w-full max-w-[520px] overflow-auto rounded-2xl border border-white/15 bg-white p-5 text-[#171717] shadow-2xl dark:bg-[#191a20] dark:text-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-report-title"
            onSubmit={submitDetailReport}
          >
            <h2 className="mb-2 text-lg font-bold" id="detail-report-title">Report manga detail</h2>
            <p className="mb-4 text-sm opacity-75">Tell us what is wrong with this manga page.</p>
            <label className="mb-1.5 block text-sm font-semibold" id="detail-report-type-label">Issue type</label>
            <div className="relative mb-4" ref={reportTypeDropdownRef}>
              <button
                aria-expanded={reportTypeOpen}
                aria-haspopup="listbox"
                aria-labelledby="detail-report-type-label"
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition hover:border-red-500/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-white/15 dark:bg-[#22232b] dark:hover:border-red-400/60"
                id="detail-report-type"
                type="button"
                onClick={() => setReportTypeOpen((open) => !open)}
              >
                <span className={reportType ? "" : "text-black/50 dark:text-white/50"}>
                  {reportType || "Choose an issue"}
                </span>
                <i className={`fas fa-chevron-down text-xs opacity-60 transition-transform ${reportTypeOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {reportTypeOpen && (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 overflow-hidden rounded-xl border border-black/10 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#22232b]"
                  role="listbox"
                  aria-labelledby="detail-report-type-label"
                >
                  {[
                    "Incorrect information",
                    "Broken link",
                    "Missing chapters",
                    "Other",
                  ].map((type) => (
                    <button
                      aria-selected={reportType === type}
                      className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-300 ${reportType === type ? "bg-red-50 font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300" : ""}`}
                      key={type}
                      role="option"
                      type="button"
                      onClick={() => {
                        setReportType(type);
                        setReportTypeOpen(false);
                      }}
                    >
                      <span>{type}</span>
                      {reportType === type && <i className="fas fa-check text-xs" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="mb-1.5 block text-sm font-semibold" htmlFor="detail-report-reason">Additional details</label>
            <textarea
              className="min-h-[110px] w-full resize-y rounded-lg border border-black/20 bg-transparent p-2.5 dark:border-white/20"
              id="detail-report-reason"
              placeholder="Describe the issue (optional)"
              value={reportReason}
              maxLength={1000}
              onChange={(event) => setReportReason(event.target.value)}
            />
            {reportMessage && (
              <p className="my-3 text-sm" role={reportMessage.includes("successfully") ? "status" : "alert"}>
                {reportMessage}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="min-h-10 rounded-lg border border-black/20 bg-black/5 px-4 py-2 text-sm dark:border-white/20 dark:bg-white/10"
                type="button"
                onClick={() => setReportOpen(false)}
                disabled={sendingReport}
              >Cancel</button>
              <button
                className="min-h-10 rounded-lg border border-red-700 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                type="submit"
                disabled={sendingReport || !reportType}
              >{sendingReport ? "Submitting..." : "Submit report"}</button>
            </div>
          </form>
        </div>
      )}
      {reportToast && typeof document !== "undefined" && createPortal(
        <div
          className="fixed left-1/2 top-5 z-[9999] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-emerald-500/40 bg-white px-5 py-3.5 text-sm font-semibold text-[#171717] shadow-2xl dark:bg-[#202129] dark:text-white"
          role="status"
          aria-live="polite"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <i className="fas fa-check" aria-hidden="true" />
          </span>
          {reportToast}
          <button
            className="ml-2 grid h-7 w-7 shrink-0 place-items-center rounded-md opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            type="button"
            aria-label="Tutup notifikasi"
            onClick={() => setReportToast("")}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>,
        document.body,
      )}
      {coverPreviewOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Cover preview: ${manga.title}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setCoverPreviewOpen(false);
          }}
        >
          <button
            className="fixed right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            type="button"
            aria-label="Close cover preview"
            onClick={() => setCoverPreviewOpen(false)}
          >
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
          <img
            className="max-h-[calc(100dvh-2rem)] max-w-[min(90vw,560px)] rounded-lg object-contain shadow-2xl"
            src={coverPreviewSource || cover || activeCoverUrl}
            alt={`${manga.title} cover`}
          />
        </div>,
        document.body,
      )}
      <div className="relative z-[2]">
        <SiteFooter backgroundColor="transparent" removeTopGap />
      </div>
      <RouteIntegrations />
    </>
  );
}

let firebaseCompatInitialization: Promise<void> | undefined;

function RouteIntegrations() {
  useEffect(() => {
    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src === new URL(src, location.href).href);
      if (existing) {
        const libraryReady = src.includes("firebase-app-compat.js")
          ? Boolean(window.firebase?.initializeApp)
          : src.includes("firebase-auth-compat.js")
            ? Boolean(window.firebase?.auth)
            : src.includes("firebase-firestore-compat.js")
              ? Boolean(window.firebase?.firestore)
              : existing.dataset.loaded === "true";
        if (existing.dataset.loaded === "true" || libraryReady) {
          resolve();
          return;
        }
        existing.addEventListener("load", () => {
          existing.dataset.loaded = "true";
          resolve();
        }, { once: true });
        existing.addEventListener("error", () => {
          existing.remove();
          reject(new Error(`Gagal memuat integrasi halaman manga: ${src}`));
        }, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => {
        script.remove();
        reject(new Error(`Gagal memuat integrasi halaman manga: ${src}`));
      };
      document.head.appendChild(script);
    });

    if (!firebaseCompatInitialization) {
      firebaseCompatInitialization = (async () => {
        await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
        const firebase = window.firebase;
        if (!firebase) throw new Error("Firebase compat SDK tidak tersedia.");
        if (!firebase.apps.some((candidate) => candidate.name === "[DEFAULT]")) {
          firebase.initializeApp(COMMENT_COUNT_FIREBASE_CONFIG);
        }
        await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js");
        await loadScript("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js");
      })().catch((error: unknown) => {
        firebaseCompatInitialization = undefined;
        console.error("Firebase halaman series gagal diinisialisasi.", error);
        throw error;
      });
    }

    void firebaseCompatInitialization.then(
      () => window.dispatchEvent(new Event("firebaseCompatReady")),
      () => undefined,
    );
  }, []);

  return (
    <>
      <GlobalAuth />
      <UserModals />
      <MangaDataProvider />
    </>
  );
}