"use client";

import { createElement, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import CommunityWidgets from "../community-widgets";
import { CoverImage, useCoverImageSource } from "../lib/cover-image";
import { chapterNumberFromRecord } from "../../lib/chapter-number";
import { originalReaderImageUrl } from "../../lib/reader-image-url";
import { isNovelSeries } from "../../lib/reader-kind";
import { SERIES_COVER_PREFERENCE_STORAGE_KEY } from "../lib/series-cover-preferences";
import RecommendationSidebar from "./recommendation-sidebar";
import ReaderServerNotice from "./reader-server-notice";
import SiteFooter from "../site-footer";
import SiteHeader from "../site-header";
import GlobalAuth from "../global-auth";
import { initializeFirebaseClient } from "../lib/firebase-client";
import { compactChapterCache } from "../lib/chapter-cache";
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
  info?: Record<string, unknown>;
};

type Chapter = {
  id?: string;
  num: string | number;
  title?: string;
  thumbnail?: string;
  images?: string[];
  isNovel?: boolean;
  url?: string;
  source: "blogger" | "blogger2" | "firestore";
  createdAt?: string;
  updatedAt?: string;
  date?: string;
  timestamp?: string | number;
  order?: number;
};

type DetailState = "loading" | "ready" | "not-found" | "error";
type ChapterSource = Chapter["source"];
type CompatCommentCountCollection = {
  get: () => Promise<{ forEach: (callback: (document: unknown) => void) => void }>;
};

function isCompatCommentCountCollection(value: unknown): value is CompatCommentCountCollection {
  return typeof value === "object" && value !== null &&
    "get" in value && typeof value.get === "function";
}

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

type BloggerEntry = {
  title?: { $t?: string };
  link?: Array<{ rel?: string; href?: string }>;
  content?: { $t?: string };
  updated?: { $t?: string };
  published?: { $t?: string };
};

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

const GITHUB_DATA_URL =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json";
const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
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

function firestoreDate(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toISOString();
  }
  return asString(value);
}

function resolveCover(value: unknown): string {
  const cover = asString(value).trim().replace(/\.$/, "");
  if (!cover) return "";
  if (/^https?:\/\//i.test(cover)) return cover;
  return `${GITHUB_RAW_BASE}${cover.replace(/^\//, "")}`;
}

function normalizeManga(value: Record<string, unknown>, fallbackSlug: string): Manga {
  const rawTitle = asString(value.title, fallbackSlug);
  const slug = asString(value.slug, normalizedSlug(rawTitle) || fallbackSlug);
  const info = value.info && typeof value.info === "object"
    ? value.info as Record<string, unknown>
    : {};
  const cover = resolveCover(value.img || value.cover || value.image || value.thumbnail || value.thumb);
  const genres = value.genres ?? info.genres;

  return {
    slug,
    title: rawTitle,
    img: cover,
    cover,
    covers: asStringList(value.covers).map(resolveCover).filter(Boolean),
    coverNumbers: value.coverNumbers && typeof value.coverNumbers === "object"
      ? Object.fromEntries(Object.entries(value.coverNumbers).map(([url, number]) => [url, asString(number)]))
      : {},
    desc: asString(value.desc || value.description || value.synopsis || value.sinopsis),
    genres: Array.isArray(genres) ? genres.map((genre) => asString(genre)) : asStringList(genres),
    rating: (value.rating ?? info.rating) as number | string | null | undefined,
    status: asString(value.status || info.status, "UNKNOWN"),
    type: asString(value.type || info.type, "Manga"),
    altTitle: asString(value.altTitle || info.altTitle),
    author: asString(value.author || info.author, "-"),
    artist: asString(value.artist || info.artist, "-"),
    publication: asString(value.publication || info.publication, "-"),
    serialization: asString(value.serialization || info.serialization, "-"),
    demographic: (value.demographic || info.demographic) as string | string[] | undefined,
    series: asString(value.series || info.series),
    characters: (value.characters || info.characters) as string | string[] | undefined,
    circle: asString(value.circle || info.circle),
    group: asString(value.group || info.group),
    femaleTags: (value.femaleTags || info.femaleTags) as string | string[] | undefined,
    maleTags: (value.maleTags || info.maleTags) as string | string[] | undefined,
    updatedAt: asString(value.updatedAt || value.latestUpdate || info.updatedAt || info.latestUpdate || info.date),
    latestUpdate: asString(value.latestUpdate || value.updatedAt || info.latestUpdate || info.updatedAt || info.date),
    info,
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

async function readSeriesCoverPreference(slug: string): Promise<string | null> {
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

async function writeSeriesCoverPreference(slug: string, url: string): Promise<void> {
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
  return match?.[1]?.replace(/[,_．]/g, ".").replace(/-/g, ".") || "?";
}

function parseBloggerEntries(data: { feed?: { entry?: BloggerEntry[] } }, source: ChapterSource): Chapter[] {
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
      thumbnail: (images[2] || images[0] || "").replace(/\/s\d+/, "/s100"),
      createdAt: entry.updated?.$t || entry.published?.$t || "",
      source,
    };
  });
}

function jsonp<T>(url: string, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `mikorokuJsonp${Date.now()}${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(
      () => finish(new Error("Waktu tunggu sumber manga habis.")),
      15000,
    );
    let settled = false;

    const root = window as any;

    function finish(error?: Error, data?: T) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      script.remove();
      window.setTimeout(() => {
        try {
          delete root[callbackName];
        } catch {
          /* ignore */
        }
      }, 5000);
      if (error) reject(error);
      else resolve(data as T);
    }

    const onAbort = () => {
      root[callbackName] = () => {};
      finish(new DOMException("Permintaan dibatalkan.", "AbortError"));
    };

    root[callbackName] = (data: T) => finish(undefined, data);

    script.onerror = () => finish(new Error("Sumber manga tidak dapat dimuat."));
    signal.addEventListener("abort", onAbort, { once: true });
    script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

function getCachedManga(slug: string): Manga | null {
  const cached = localStorage.getItem(`detail_${slug}`);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as { time?: number; data?: Record<string, unknown> };
    if (parsed.data && Date.now() - (parsed.time || 0) < 15 * 60 * 1000) {
      return normalizeManga(parsed.data, slug);
    }
  } catch (error) {
    console.warn("Cache detail manga tidak valid dan akan diabaikan.", error);
    localStorage.removeItem(`detail_${slug}`);
  }
  return null;
}

async function loadManga(slug: string, signal: AbortSignal): Promise<Manga | null> {
  const cachedManga = getCachedManga(slug);
  if (cachedManga) return cachedManga;

  const responses = await Promise.allSettled([
    fetch(GITHUB_DATA_URL, { signal }).then(async (response) => {
      if (!response.ok) throw new Error(`Dataset manga merespons HTTP ${response.status}.`);
      const items = await response.json() as Record<string, unknown>[];
      const result = items.find((item) =>
        asString(item.slug) === slug ||
        normalizedSlug(asString(item.title)) === slug ||
        normalizedKey(asString(item.title)) === normalizedKey(slug),
      );
      return result ? normalizeManga(result, slug) : null;
    }),
    fetch(`${FIRESTORE_BASE}/manga/${encodeURIComponent(slug)}`, { signal }).then(async (response) => {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Firestore merespons HTTP ${response.status}.`);
      return normalizeManga(decodeFirestoreDocument(await response.json()), slug);
    }),
  ]);

  const githubManga = responses[0].status === "fulfilled" ? responses[0].value : null;
  const firestoreManga = responses[1].status === "fulfilled" ? responses[1].value : null;
  const manga = githubManga && firestoreManga
    ? { ...githubManga, covers: firestoreManga.covers, coverNumbers: firestoreManga.coverNumbers }
    : githubManga || firestoreManga;
  for (const [index, result] of responses.entries()) {
    if (result.status === "rejected" && !signal.aborted) {
      console.warn(
        index === 0 ? "Dataset manga GitHub gagal dimuat." : "Dokumen detail Firestore gagal dimuat.",
        result.reason,
      );
    }
  }

  if (manga) {
    localStorage.setItem("currentManga", JSON.stringify(manga));
    localStorage.setItem(`detail_${slug}`, JSON.stringify({ time: Date.now(), data: manga }));
    return manga;
  }

  let firestore: Manga | null = null;
  try {
    firestore = await loadFirebaseDocument(slug, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    console.warn("Firestore SDK tidak dapat mengambil detail manga.", error);
  }
  if (firestore) {
    localStorage.setItem("currentManga", JSON.stringify(firestore));
    localStorage.setItem(`detail_${slug}`, JSON.stringify({ time: Date.now(), data: firestore }));
    return firestore;
  }

  const feed = await jsonp<{ feed?: { entry?: BloggerEntry[] } }>(
    "https://www.mikoroku.top/feeds/posts/default?alt=json-in-script&max-results=200",
    signal,
  );
  const entry = (feed.feed?.entry || []).find((item) => {
    const title = item.title?.$t || "";
    return normalizedSlug(title) === slug && !/(?:chapter|chap)\s*\d+/i.test(title);
  });
  if (!entry) return null;

  const title = entry.title?.$t || slug;
  const content = entry.content?.$t || "";
  const cover = entry.link?.find((item) => item.rel === "enclosure")?.href ||
    content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
  const result = normalizeManga({
    title,
    slug,
    img: cover,
    desc: content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    genres: (entry as BloggerEntry & { category?: Array<{ term?: string }> }).category?.map((item) => item.term || "") || [],
    status: "UNKNOWN",
  }, slug);
  localStorage.setItem("currentManga", JSON.stringify(result));
  localStorage.setItem(`detail_${slug}`, JSON.stringify({ time: Date.now(), data: result }));
  return result;
}

async function loadFirebaseDocument(slug: string, signal: AbortSignal): Promise<Manga | null> {
  if ((!window.firestore || !window.fs?.doc || !window.fs.getDoc) && !signal.aborted) {
    initializeFirebaseClient();
  }
  if (!window.firestore || !window.fs?.doc || !window.fs.getDoc) return null;

  const reference = window.fs.doc(window.firestore, "manga", slug);
  const snapshot = await window.fs.getDoc(reference);
  return snapshot.exists() ? normalizeManga(snapshot.data(), slug) : null;
}

async function loadBloggerChapterSource(
  title: string,
  source: ChapterSource,
  signal: AbortSignal,
): Promise<Chapter[]> {
  if (source === "firestore") return [];
  const domain = source === "blogger"
    ? "https://www.mikodrive.my.id"
    : "https://www.yomidays.my.id";
  const feed = await jsonp<{ feed?: { entry?: BloggerEntry[] } }>(
    `${domain}/feeds/posts/default?alt=json-in-script&max-results=500&q=${encodeURIComponent(title)}`,
    signal,
  );
  return parseBloggerEntries(feed, source);
}

async function loadFirestoreChapterSource(slug: string, signal: AbortSignal): Promise<Chapter[]> {
  const ready = await waitForFirestoreSdk(signal);
  if (!ready || !window.firestore || !window.fs?.collection || !window.fs.getDocs) {
    throw new Error("Firebase Firestore SDK tidak tersedia untuk membaca chapter.");
  }

  const reference = window.fs.collection(window.firestore, "manga", slug, "chapters");
  const chapterSnapshot = await window.fs.getDocs(reference);
  const collectionChapters: Chapter[] = [];
  chapterSnapshot.forEach((document) => {
    const data = document.data();
    if (data.isDraft === true) return;
    const snapshotUpdateTime = document.updateTime?.toDate?.().toISOString();
    const createdAt = firestoreDate(data.createdAt || data.updatedAt || data.date || snapshotUpdateTime);
    const chapterImages = extractChapterImages(data.images || data.content || data.html);
    const chapterText = data.content || data.text || data.html;
    collectionChapters.push({
      id: document.id,
      num: chapterNumberFromRecord(data, document.id),
      title: asString(data.title, `Chapter ${document.id}`),
      thumbnail: asString(data.thumbnail),
      images: chapterImages,
      isNovel: isNovelSeries(data) ||
        (typeof chapterText === "string" && Boolean(chapterText.trim()) && !chapterImages.length),
      createdAt,
      updatedAt: firestoreDate(data.updatedAt || snapshotUpdateTime),
      date: firestoreDate(data.date || data.createdAt || data.updatedAt || snapshotUpdateTime || createdAt),
      timestamp: typeof data.timestamp === "string" || typeof data.timestamp === "number" ? data.timestamp : undefined,
      order: Number(data.order ?? document.id) || 0,
      source: "firestore",
    });
  });
  if (collectionChapters.length) return collectionChapters;

  if (!window.fs.doc || !window.fs.getDoc) {
    throw new Error("API dokumen Firebase Firestore tidak tersedia.");
  }
  const mangaReference = window.fs.doc(window.firestore, "manga", slug);
  const mangaSnapshot = await window.fs.getDoc(mangaReference);
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
      thumbnail: asString(data.thumbnail),
      images: chapterImages,
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

async function waitForFirestoreSdk(signal: AbortSignal): Promise<boolean> {
  if (window.firestore && window.fs?.collection && window.fs.getDocs) return true;
  if (signal.aborted) throw new DOMException("Permintaan Firestore dibatalkan.", "AbortError");
  initializeFirebaseClient();
  return Boolean(window.firestore && window.fs?.collection && window.fs.getDocs);
}

function chapterNumber(value: Chapter["num"]): number {
  return Number.parseFloat(String(value).replace(",", ".")) || 0;
}

function chapterKey(chapter: Chapter): string {
  const raw = String(chapter.num).trim().toLowerCase().replace(",", ".");
  const numeric = Number.parseFloat(raw);
  return Number.isFinite(numeric) ? String(numeric) : raw;
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

function chapterSourceCacheKey(slug: string, source: ChapterSource): string {
  return JSON.stringify([slug, source]);
}

function cachedChapterListForSource(
  cache: Map<string, Chapter[]>,
  slug: string,
  source: ChapterSource,
): Chapter[] | undefined {
  if (source === "firestore") return cache.get(chapterSourceCacheKey(slug, source));

  const sourceKey = chapterSourceCacheKey(slug, source);
  if (!cache.has(sourceKey)) return undefined;
  return mergeChapterSources(
    cache.get(sourceKey) || [],
    cache.get(chapterSourceCacheKey(slug, "firestore")) || [],
  );
}

function cacheChapterList(slug: string, chapters: Chapter[]): void {
  const key = `chapters_${slug}`;
  const data = compactChapterCache(chapters);
  const value = JSON.stringify({ time: Date.now(), data });

  try {
    localStorage.removeItem(key);
    localStorage.setItem(key, value);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "QuotaExceededError") {
      console.warn(`Cache chapter tidak dapat disimpan untuk ${slug}.`, error);
      return;
    }

    try {
      for (const cachedKey of Object.keys(localStorage)) {
        if (cachedKey.startsWith("chapters_") && cachedKey !== key) {
          localStorage.removeItem(cachedKey);
        }
      }
      localStorage.setItem(key, value);
    } catch (retryError) {
      console.warn(`Cache chapter tidak dapat disimpan karena kuota penyimpanan browser penuh untuk ${slug}.`, retryError);
    }
  }
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
  [&_.genre]:block [&_.genre]:overflow-hidden [&_.genre]:truncate [&_.genre]:whitespace-nowrap [&_.genre]:rounded-lg [&_.genre]:border [&_.genre]:border-[rgba(0,0,0,0.1)] [&_.genre]:bg-[rgba(0,0,0,0.06)] [&_.genre]:px-2 [&_.genre]:py-[6px] [&_.genre]:text-center [&_.genre]:text-[11px] [&_.genre]:text-[var(--genre-light-text)] [&_.genre]:no-underline [&_.genre]:backdrop-blur [&_.genre]:transition-[background,border-color,transform] [&_.genre]:duration-200 dark:[&_.genre]:border-[rgba(255,255,255,0.08)] dark:[&_.genre]:bg-[rgba(0,0,0,0.35)] dark:[&_.genre]:text-[var(--genre-accent)] [&_.genre:hover]:-translate-y-px [&_.genre:hover]:bg-[rgba(80,78,78,0.04)]
  [&_.detail-extra-tags]:mx-3 [&_.detail-extra-tags]:mb-5 [&_.detail-extra-tags]:rounded-[14px] [&_.detail-extra-tags]:border [&_.detail-extra-tags]:border-[rgba(0,0,0,0.1)] [&_.detail-extra-tags]:bg-[rgba(184,174,174,0.329)] [&_.detail-extra-tags]:px-4 [&_.detail-extra-tags]:py-[18px] dark:[&_.detail-extra-tags]:border-[rgba(255,255,255,0.08)] dark:[&_.detail-extra-tags]:bg-[rgba(26,26,46,0.35)]
  [&_.detail-tag-row+_.detail-tag-row]:mt-[18px] [&_.detail-tag-label]:mb-2 [&_.detail-tag-label]:flex [&_.detail-tag-label]:items-center [&_.detail-tag-label]:gap-2 [&_.detail-tag-label]:pl-0.5 [&_.detail-tag-label]:text-[14.5px] [&_.detail-tag-label]:font-semibold [&_.detail-tag-label]:text-[#050000] dark:[&_.detail-tag-label]:text-white [&_.detail-tag-label_i]:w-4 [&_.detail-tag-label_i]:text-center
  [&_.detail-tag-list]:flex [&_.detail-tag-list]:flex-wrap [&_.detail-tag-list]:justify-start [&_.detail-tag-list]:gap-1.5 [&_.detail-tag-list]:pl-0.5
  [&_.detail-gender-tag]:inline-flex [&_.detail-gender-tag]:cursor-pointer [&_.detail-gender-tag]:items-center [&_.detail-gender-tag]:whitespace-nowrap [&_.detail-gender-tag]:rounded-lg [&_.detail-gender-tag]:px-[11px] [&_.detail-gender-tag]:py-[5px] [&_.detail-gender-tag]:text-[11.5px] [&_.detail-gender-tag]:font-semibold [&_.detail-gender-tag]:no-underline [&_.detail-gender-tag]:transition-[background,border-color,transform] [&_.detail-gender-tag]:duration-200 [&_.detail-gender-tag:hover]:-translate-y-px [&_.detail-gender-tag:hover]:brightness-115
  [&_.female-tag]:border [&_.female-tag]:border-[rgba(216,27,96,0.3)] [&_.female-tag]:bg-[rgba(255,77,141,0.12)] [&_.female-tag]:text-[#d81b60] dark:[&_.female-tag]:border-[rgba(255,77,141,0.5)] dark:[&_.female-tag]:bg-[rgba(255,77,141,0.28)] dark:[&_.female-tag]:text-[#ffb2ce] [&_.male-tag]:border [&_.male-tag]:border-[rgba(37,99,235,0.3)] [&_.male-tag]:bg-[rgba(77,125,255,0.12)] [&_.male-tag]:text-[#2563eb] dark:[&_.male-tag]:border-[rgba(77,125,255,0.5)] dark:[&_.male-tag]:bg-[rgba(77,125,255,0.28)] dark:[&_.male-tag]:text-[#b5c9ff]
  [&_.demographic-item]:mt-[-5px] [&_.demographic-item]:flex-wrap [&_.demographic-item]:items-start [&_.demographic-item]:!gap-1 [&_.demographic-item_strong]:mt-px [&_.demographic-item_strong]:whitespace-nowrap
  [&_.demographic-tags]:mt-[-2px] [&_.demographic-tags]:flex [&_.demographic-tags]:flex-1 [&_.demographic-tags]:flex-wrap [&_.demographic-tags]:gap-1.5
  [&_.demographic-tag]:inline-flex [&_.demographic-tag]:cursor-pointer [&_.demographic-tag]:items-center [&_.demographic-tag]:whitespace-nowrap [&_.demographic-tag]:rounded-lg [&_.demographic-tag]:border [&_.demographic-tag]:border-[rgba(220,38,38,0.25)] [&_.demographic-tag]:bg-[rgba(220,38,38,0.1)] [&_.demographic-tag]:px-[10px] [&_.demographic-tag]:py-1 [&_.demographic-tag]:text-[10px] [&_.demographic-tag]:font-bold [&_.demographic-tag]:capitalize [&_.demographic-tag]:text-[#dc2626] [&_.demographic-tag]:no-underline [&_.demographic-tag]:transition-[background,border-color,transform] [&_.demographic-tag]:duration-200 [&_.demographic-tag:hover]:-translate-y-px [&_.demographic-tag:hover]:brightness-115 dark:[&_.demographic-tag]:border-[rgba(255,80,80,0.35)] dark:[&_.demographic-tag]:bg-[rgba(255,0,0,0.18)] dark:[&_.demographic-tag]:text-[#ffb3b3]
  [&_.synopsis]:mx-3 [&_.synopsis]:mb-[15px] [&_.synopsis]:rounded-[14px] [&_.synopsis]:border [&_.synopsis]:border-[rgba(0,0,0,0.1)] [&_.synopsis]:bg-[rgba(184,174,174,0.329)] [&_.synopsis]:px-[14px] [&_.synopsis]:py-[15px] [&_.synopsis]:text-[13px] [&_.synopsis]:text-[#050000] dark:[&_.synopsis]:border-[rgba(255,255,255,0.08)] dark:[&_.synopsis]:bg-[rgba(26,26,46,0.35)] dark:[&_.synopsis]:text-white
  [&_.synopsis_h2]:mb-[14px] [&_.synopsis_h2]:text-lg [&_.synopsis_h2]:text-[#050000] dark:[&_.synopsis_h2]:text-white [&_.synopsis-content_p]:mb-[10px] [&_.synopsis-content_p:last-child]:mb-0 [&_.synopsis-content_ul]:mb-[10px] [&_.synopsis-content_ul]:pl-6 [&_.synopsis-content_ol]:mb-[10px] [&_.synopsis-content_ol]:pl-6 [&_.synopsis-content_a]:text-blue-400 [&_.synopsis-content_a]:underline
  [&_.section-title]:my-[25px] [&_.section-title]:mb-[15px] [&_.section-title]:flex [&_.section-title]:min-h-[50px] [&_.section-title]:w-full [&_.section-title]:items-center [&_.section-title]:justify-center [&_.section-title]:gap-0 [&_.section-title]:pl-0 [&_.section-title]:text-xl [&_.section-title]:leading-5 [&_.section-title]:transition-[margin-left,width] [&_.section-title]:duration-300 [&_.section-title]:before:h-px [&_.section-title]:before:flex-1 [&_.section-title]:before:bg-[#aaa] [&_.section-title]:before:content-[''] [&_.section-title]:after:h-px [&_.section-title]:after:flex-1 [&_.section-title]:after:bg-[#aaa] [&_.section-title]:after:content-['']
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
  [&_#gridViewBtn]:border-[rgba(96,165,250,0.5)] [&_#gridViewBtn]:bg-[rgba(59,130,246,0.2)] [&_#gridViewBtn]:text-[#60a5fa] [&_#gridViewBtn.active]:!border-[#3b82f6] [&_#gridViewBtn.active]:!bg-[#3b82f6] [&_#gridViewBtn.active]:!text-white [&_#textGridViewBtn]:border-[rgba(251,191,36,0.5)] [&_#textGridViewBtn]:bg-[rgba(245,158,11,0.2)] [&_#textGridViewBtn]:text-[#fbbf24] [&_#textGridViewBtn.active]:!border-[#f59e0b] [&_#textGridViewBtn.active]:!bg-[#f59e0b] [&_#textGridViewBtn.active]:!text-white [&_#listViewBtn]:border-[rgba(239,68,68,0.5)] [&_#listViewBtn]:bg-[rgba(239,68,68,0.2)] [&_#listViewBtn]:text-[#f87171] [&_#listViewBtn.active]:!border-[#ef4444] [&_#listViewBtn.active]:!bg-[#ef4444] [&_#listViewBtn.active]:!text-white
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
  [&_.detail-route-spinner]:h-[42px] [&_.detail-route-spinner]:w-[42px] [&_.detail-route-spinner]:animate-spin [&_.detail-route-spinner]:rounded-full [&_.detail-route-spinner]:border-4 [&_.detail-route-spinner]:border-[rgba(128,128,128,0.25)] [&_.detail-route-spinner]:border-t-current
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

export default function DetailPageContent({ slug }: { slug: string }) {
  const [manga, setManga] = useState<Manga | null>(null);
  const [selectedCoverUrl, setSelectedCoverUrl] = useState("");
  const [coverPreferenceError, setCoverPreferenceError] = useState("");
  const chapterSourceCacheRef = useRef(new Map<string, Chapter[]>());
  const chapterCacheSlugRef = useRef(slug);
  const baseCoverUrl = manga?.covers?.length
    ? manga.covers[manga.covers.length - 1]
    : manga?.img || manga?.cover || "";
  const coverOptions = useMemo(
    () => [...new Set([...(manga?.covers || []), baseCoverUrl].filter(Boolean))],
    [baseCoverUrl, manga?.covers],
  );
  const selectedCoverSlugRef = useRef("");
  const activeCoverUrl = selectedCoverUrl || baseCoverUrl;
  const cover = useCoverImageSource(activeCoverUrl, 1200);
  const [state, setState] = useState<DetailState>("loading");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [chapterState, setChapterState] = useState<"loading" | "ready" | "error">("loading");
  const [chapterError, setChapterError] = useState("");
  const [source, setSource] = useState<ChapterSource>("blogger");
  const [firestoreLatestUpdate, setFirestoreLatestUpdate] = useState("");
  const [chapterRetry, setChapterRetry] = useState(0);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [view, setView] = useState<"grid" | "list" | "text-grid">("grid");
  const [detailTab, setDetailTab] = useState<"chapters" | "synopsis" | "covers" | "discussion">("chapters");
  const [hideDetailCoverBackground, setHideDetailCoverBackground] = useState(
    () => readGlobalAppearance().hideDetailCoverBackground,
  );
  const [chapterSearch, setChapterSearch] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [readChapters, setReadChapters] = useState<string[]>([]);
  const [recommendationsHidden, setRecommendationsHidden] = useState(false);
  const handleRecommendationVisibilityChange = useCallback(
    (visible: boolean) => setRecommendationsHidden(!visible),
    [],
  );
  const [siteSidebarOpen, setSiteSidebarOpen] = useState(false);
  const mangaSlug = manga?.slug;

  useEffect(() => {
    const syncAppearance = (event: StorageEvent) => {
      if (event.key === GLOBAL_APPEARANCE_KEY || event.key === null) {
        setHideDetailCoverBackground(readGlobalAppearance().hideDetailCoverBackground);
      }
    };
    window.addEventListener("storage", syncAppearance);
    return () => window.removeEventListener("storage", syncAppearance);
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
        const compatFirestore = window.firebase?.firestore?.();
        if (compatFirestore) {
          const maybeCommentCollection: unknown = compatFirestore
            .collection("comments")
            .doc(pageId)
            .collection("postComments");
          if (!isCompatCommentCountCollection(maybeCommentCollection)) {
            throw new Error("Firebase compat tidak menyediakan pembacaan komentar.");
          }
          const commentCollection = maybeCommentCollection;
          const snapshot = await commentCollection.get();
          let count = 0;
          snapshot.forEach(() => { count += 1; });
          if (active) setCommentCount(count);
          return;
        }
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
    if (localPreference) {
      setSelectedCoverUrl(localPreference);
      return () => {
        active = false;
      };
    }
    if (!("indexedDB" in window)) return;
    void readSeriesCoverPreference(mangaSlug).then((savedUrl) => {
      if (!active || !savedUrl) return;
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
  }, [mangaSlug]);

  useEffect(() => {
    const updateSidebarState = () => setSiteSidebarOpen(document.body.classList.contains("sidebar-open"));
    const observer = new MutationObserver(updateSidebarState);
    updateSidebarState();
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const detailRecSpace = recommendationsHidden ? "0px" : "calc(var(--sidebar-width) + 40px)";
  const detailContentWidth = recommendationsHidden
    ? siteSidebarOpen
      ? "min(var(--detail-max-width), calc(100% - var(--sidebar-width) - (var(--detail-gutter) * 2)))"
      : "min(var(--detail-max-width), calc(100% - (var(--detail-gutter) * 2)))"
    : siteSidebarOpen
      ? "min(var(--detail-max-width), calc(100% - var(--sidebar-width) - var(--detail-rec-space) - (var(--detail-gutter) * 2)))"
      : "min(var(--detail-max-width), calc(100% - var(--detail-rec-space) - (var(--detail-gutter) * 2)))";
  const detailContentLeft = recommendationsHidden
    ? siteSidebarOpen
      ? "calc(var(--sidebar-width) + max(var(--detail-gutter), calc((100% - var(--sidebar-width) - var(--detail-max-width)) / 2)))"
      : "max(var(--detail-gutter), calc((100% - var(--detail-max-width)) / 2))"
    : siteSidebarOpen
      ? "calc(var(--sidebar-width) + max(var(--detail-gutter), calc((100% - var(--sidebar-width) - var(--detail-rec-space) - var(--detail-max-width)) / 2)))"
      : "max(var(--detail-gutter), calc((100% - var(--detail-rec-space) - var(--detail-max-width)) / 2))";
  const detailLayoutStyle = {
    "--detail-gutter": "32px",
    "--detail-max-width": "1250px",
    "--detail-rec-space": detailRecSpace,
    "--detail-content-width": detailContentWidth,
    "--detail-content-left": detailContentLeft,
  } as CSSProperties;

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const cachedManga = getCachedManga(slug);
    if (cachedManga) {
      setManga(cachedManga);
      setState("ready");
    } else {
      setManga(null);
      setState("loading");
    }
    loadManga(slug, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (!result) {
        setState("not-found");
        return;
      }
      setManga(result);
      setState("ready");
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      console.error("Detail manga gagal dimuat.", error);
      setState("error");
    });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!manga) return;
    const controller = new AbortController();
    setFirestoreLatestUpdate("");
    void (async () => {
      try {
        await waitForFirestoreSdk(controller.signal);
        if (!window.firestore || !window.fs?.doc || !window.fs.getDoc) {
          throw new Error("Firestore document API is unavailable.");
        }
        const reference = window.fs.doc(window.firestore, "manga", slug);
        const snapshot = await window.fs.getDoc(reference);
        if (!snapshot.exists() || controller.signal.aborted) return;
        const data = snapshot.data();
        const firestoreCovers = asStringList(data.covers).map(resolveCover).filter(Boolean);
        const hasFirestoreCovers = Array.isArray(data.covers);
        const coverNumbers = data.coverNumbers && typeof data.coverNumbers === "object"
          ? Object.fromEntries(Object.entries(data.coverNumbers).map(([url, number]) => [url, asString(number)]))
          : {};
        setManga((current) => {
          if (current?.slug !== slug) return current;
          const currentCovers = current.covers || [];
          const coversMatch = !hasFirestoreCovers ||
            (firestoreCovers.length === currentCovers.length &&
              firestoreCovers.every((cover, index) => cover === currentCovers[index]));
          const currentCoverNumbers = current.coverNumbers || {};
          const coverNumbersMatch =
            Object.keys(coverNumbers).length === Object.keys(currentCoverNumbers).length &&
            Object.entries(coverNumbers).every(([url, number]) => currentCoverNumbers[url] === number);
          if (coversMatch && coverNumbersMatch) return current;
          return {
            ...current,
            ...(hasFirestoreCovers ? { covers: firestoreCovers } : {}),
            coverNumbers,
          };
        });
        const latest = data.latestUpdate || data.updatedAt;
        if (latest) setFirestoreLatestUpdate(firestoreDate(latest));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn(`Firestore latest update date failed to load for ${slug}.`, error);
        }
      }
    })();
    return () => controller.abort();
  }, [manga, slug]);

  useEffect(() => {
    if (!manga) return;
    const controller = new AbortController();
    setChapterError("");
    if (chapterCacheSlugRef.current !== slug) {
      chapterSourceCacheRef.current.clear();
      chapterCacheSlugRef.current = slug;
    }
    let cachedChapters: Chapter[] = [];
    let cachedSelectedChapters: Chapter[] = [];
    let cachedFirestoreChapters: Chapter[] = [];
    const cached = localStorage.getItem(`chapters_${slug}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { time?: number; data?: Chapter[] };
        const valid = Date.now() - (parsed.time || 0) < 30 * 60 * 1000
          ? parsed.data || []
          : [];
        cachedChapters = valid.filter((chapter) => chapter.source === source);
        cachedSelectedChapters = valid.filter((chapter) => chapter.source === source);
        cachedFirestoreChapters = valid.filter((chapter) => chapter.source === "firestore");
        if (source !== "firestore" && cachedSelectedChapters.length) {
          cachedChapters = mergeChapterSources(cachedSelectedChapters, cachedFirestoreChapters);
        }
      } catch (error) {
        console.warn("Cache chapter manga tidak valid dan akan diabaikan.", error);
        localStorage.removeItem(`chapters_${slug}`);
      }
    }
    const immediatelyAvailable = cachedChapterListForSource(
      chapterSourceCacheRef.current,
      slug,
      source,
    );
    if (immediatelyAvailable !== undefined) {
      setChapters(immediatelyAvailable);
      setChapterState("ready");
    } else {
      setChapterState("loading");
    }

    const loadSelectedAndSupplementalSources = async () => {
      const loadAndCache = async (chapterSource: ChapterSource): Promise<Chapter[]> => {
        const key = chapterSourceCacheKey(slug, chapterSource);
        const memoryCache = chapterSourceCacheRef.current;
        if (memoryCache.has(key)) return memoryCache.get(key) || [];
        const loaded = chapterSource === "firestore"
          ? await loadFirestoreChapterSource(slug, controller.signal)
          : await loadBloggerChapterSource(manga.title, chapterSource, controller.signal);
        if (controller.signal.aborted) {
          throw new DOMException("Permintaan chapter dibatalkan.", "AbortError");
        }
        memoryCache.set(key, loaded);
        return loaded;
      };

      if (source === "firestore") return loadAndCache(source);
      const settled = await Promise.allSettled([
        loadAndCache(source),
        loadAndCache("firestore"),
      ]);
      if (controller.signal.aborted) throw new DOMException("Permintaan chapter dibatalkan.", "AbortError");

      const sources = settled.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        console.warn(
          `Chapter source ${index === 0 ? source : "firestore"} failed for ${slug}.`,
          result.reason,
        );
        return [];
      });
      const selectedChapters = sources[0].length ? sources[0] : cachedSelectedChapters;
      const firestoreChapters = sources[1].length ? sources[1] : cachedFirestoreChapters;
      const mergedChapters = mergeChapterSources(selectedChapters, firestoreChapters);
      if (mergedChapters.length) return mergedChapters;
      const firstError = settled.find((result) => result.status === "rejected");
      if (firstError?.status === "rejected") throw firstError.reason;
      return cachedSelectedChapters;
    };

    loadSelectedAndSupplementalSources().then((result) => {
      if (controller.signal.aborted) return;
      const finalResult = result.length || !cachedChapters.length ? result : cachedChapters;
      setChapters(finalResult);
      setChapterState("ready");
      const existing = localStorage.getItem(`chapters_${slug}`);
      let previous: Chapter[] = [];
      if (existing) {
        try {
          previous = (JSON.parse(existing) as { data?: Chapter[] }).data || [];
        } catch (error) {
          console.warn("Cache chapter lama tidak valid.", error);
        }
      }
      const merged = mergeChapterSources(
        previous.filter((item) => item.source !== source),
        finalResult,
      );
      cacheChapterList(slug, merged);
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
  }, [slug, manga, source, chapterRetry]);

  function changeChapterSource(nextSource: ChapterSource, preference: "sv1" | "sv2" | "es") {
    if (source === nextSource) return;
    localStorage.setItem("chapterSourceMode", preference);
    setChapterError("");
    const cachedChapters = cachedChapterListForSource(
      chapterSourceCacheRef.current,
      slug,
      nextSource,
    );
    if (cachedChapters !== undefined) {
      setChapters(cachedChapters);
      setChapterState("ready");
    } else {
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
    document.querySelector('meta[property="og:image"]')?.setAttribute("content", manga.img || manga.cover || "");
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", window.location.href);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", `${manga.title} - Mikoroku`);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", description.slice(0, 200));
    document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", manga.img || manga.cover || "");
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", window.location.href);
  }, [manga]);

  const genreList = useMemo(
    () => [...new Set((manga?.genres || [])
      .map((genre) => genre.trim())
      .filter((genre) => genre.length > 1)
      .filter((genre) => !/^(ongoing|completed|hiatus|dropped|canceled|up|manga|manhua|manhwa|novel|doujinshi|cg|type:|author:|artist:|publication:|serialization:|status:)$/i.test(genre))
      .filter((genre) => !/^\d+(?:\.\d+)?$/.test(genre) || Number(genre) > 10)
      .filter((genre) => !/^(shounen|seinen|shoujo|josei|kodomo|hentai)$/i.test(genre)))],
    [manga?.genres],
  );
  const visibleChapters = useMemo(() => [...chapters]
    .filter((chapter) => {
      const query = chapterSearch.trim().toLowerCase();
      return !query || `chapter ${chapter.num} ${chapter.title || ""}`.toLowerCase().includes(query);
    })
    .sort((left, right) => {
      const order = chapterNumber(left.num) - chapterNumber(right.num);
      return sort === "newest" ? -order : order;
    }), [chapterSearch, chapters, sort]);
  function selectDetailCover(url: string) {
    setSelectedCoverUrl(url);
    setCoverPreferenceError("");
    if (!manga) return;
    let localSaved = false;
    try {
      localStorage.setItem(`${SERIES_COVER_PREFERENCE_STORAGE_KEY}${manga.slug}`, url);
      localSaved = true;
    } catch (error) {
      console.warn(`Could not save the homepage cover selection for ${manga.slug}.`, error);
    }
    if (!("indexedDB" in window)) {
      if (!localSaved) setCoverPreferenceError("Browser storage is unavailable; cover selection will not persist.");
      return;
    }
    void writeSeriesCoverPreference(manga.slug, url).catch((error: unknown) => {
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
    manga?.latestUpdate || manga?.updatedAt || firestoreLatestUpdate
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
    try {
      setReadChapters(JSON.parse(localStorage.getItem(`read_${manga.title}`) || "[]"));
    } catch (error) {
      console.warn("Riwayat chapter lokal tidak valid dan akan diabaikan.", error);
      setReadChapters([]);
    }
  }, [manga]);

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
      next.unshift({ title: manga.title, img: manga.img || manga.cover || "", slug, addedAt: Date.now() });
    }
    localStorage.setItem("mangaBookmarks", JSON.stringify(next));
    setBookmarked(isSaved);
    window.dispatchEvent(new Event("bookmarkUpdated"));
  }, [manga, slug]);

  const openChapter = useCallback(async (chapter: Chapter) => {
    if (!manga) return;
    const isNovel = chapter.isNovel || isNovelSeries(manga);
    const chapterName = `Chapter ${chapter.num}`;
    const readKey = `read_${manga.title}`;
    let read: string[] = [];
    try {
      read = JSON.parse(localStorage.getItem(readKey) || "[]");
    } catch (error) {
      console.warn("Riwayat chapter lokal tidak valid dan akan diabaikan.", error);
    }
    const numeric = String(chapter.num).match(/(\d+(?:\.\d+)?)/)?.[0];
    if (numeric && !read.includes(numeric)) {
      read.push(numeric);
      localStorage.setItem(readKey, JSON.stringify(read));
      setReadChapters(read);
    }
    const readerSource = chapter.source === "firestore" && source !== "firestore"
      ? source
      : chapter.source;
    let images = chapter.source === "firestore" && readerSource !== "firestore"
      ? []
      : chapter.images || [];
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
        <SiteHeader />
        <main className={`detail-route ${detailPageClasses}`}>
          <div className="detail-route-loading" role="status" aria-label="Memuat detail manga">
            <span className="detail-route-spinner" aria-hidden="true" />
          </div>
        </main>
        <SiteFooter />
        <RouteIntegrations />
      </>
    );
  }
  if (state === "not-found") {
    return (
      <>
        <SiteHeader />
        <main className={`detail-route ${detailPageClasses}`} style={detailLayoutStyle}>
          <p className="detail-route-message" role="status">Manga tidak ditemukan.</p>
        </main>
        <SiteFooter />
        <RouteIntegrations />
      </>
    );
  }
  if (state === "error" || !manga) {
    return (
      <>
        <SiteHeader />
        <main className={`detail-route ${detailPageClasses}`}>
          <p className="detail-route-message" role="alert">Detail manga gagal dimuat. Coba muat ulang halaman.</p>
        </main>
        <SiteFooter />
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
      <SiteHeader />
      <div
        className="pointer-events-none fixed inset-0 z-0 scale-[1.05] bg-cover bg-center bg-no-repeat opacity-[0.22] blur-[1px] transition-[background-image,opacity] duration-500 dark:opacity-100"
        id="bgLayer"
        aria-hidden="true"
        style={{ backgroundImage: !hideDetailCoverBackground && cover ? `url("${cover}")` : undefined }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[1] bg-[linear-gradient(180deg,rgba(20,20,30,0.18)_0%,rgba(20,20,30,0.12)_45%,rgba(35,12,25,0.24)_100%)] dark:bg-[linear-gradient(180deg,rgba(5,5,10,0.92)_0%,rgba(5,5,10,0.55)_45%,rgba(5,5,10,0.55)_55%,rgba(15,5,12,0.94)_100%)]"
        aria-hidden="true"
      />
      <main className={`detail-route ${detailPageClasses}`} style={detailLayoutStyle}>
        <div className="container relative z-[2] mx-auto my-0 min-h-screen w-full max-w-[480px] text-[#171717] transition-[margin-left,width,max-width,color] duration-300 dark:text-white md:my-5 md:max-w-[720px] lg:my-[30px] lg:ml-[var(--detail-content-left)] lg:mr-0 lg:max-w-[var(--detail-max-width)] lg:w-[var(--detail-content-width)]">
          <div className="content">
            <div className="main">
              <div className="left-column">
                <div className="cover">
                  <CoverImage
                    src={activeCoverUrl || "/assets/icons/favicon.ico"}
                    alt={`${manga.title} cover`}
                    loading="eager"
                    onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }}
                  />
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
                <button className="start-reading-btn mb-1 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[rgba(229,154,0,0.65)] bg-[rgba(229,154,0,0.2)] px-1 py-2 text-[10px] font-semibold text-[#e59a00] transition hover:bg-[rgba(229,154,0,0.32)] disabled:cursor-not-allowed disabled:opacity-50 max-[767px]:min-h-0 max-[767px]:px-[5px] max-[767px]:py-[3px] lg:px-3 lg:text-sm" type="button" onClick={() => {
                  if (latestChapter) void openChapter(latestChapter);
                }} disabled={!latestChapter || chapterState !== "ready"}>
                  <i className="fas fa-book-open" aria-hidden="true" />
                  <span>{chapterState === "loading" ? "Loading..." : "Read now"}</span>
                </button>
                <button className={`bookmark-btn${bookmarked ? " bookmarked" : ""}`} type="button" onClick={toggleBookmark}>
                  <i className={`fas ${bookmarked ? "fa-check" : "fa-bookmark"}`} aria-hidden="true" />
                  <span>{bookmarked ? "Bookmarked" : "Bookmark"}</span>
                </button>
              </div>
              <div className="info">
                <div className={`status ${status.toLowerCase()}`}>
                  <i className="fas fa-fire" aria-hidden="true" /> <span>{status}</span>
                </div>
                <h1 className="title">{manga.title}</h1>
                <div className="title-divider" />
                {manga.altTitle && <div className="alt-title">{manga.altTitle}</div>}
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
            </div>

            <div className="genres">
              {genreList.map((genre, index) => {
                const { accent, lightText } = genreAccentColors[index % genreAccentColors.length];
                return (
                  <a
                    className="genre transition-[background,border-color,transform] duration-200 hover:-translate-y-px hover:brightness-110"
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
                        <a className="detail-gender-tag female-tag" href={`/genre-list?genre=${encodeURIComponent(tag.toLowerCase())}`} title={`View ${formatTagLabel(tag)} tag`} key={`female-${tag}`}>
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
                        <a className="detail-gender-tag male-tag" href={`/genre-list?genre=${encodeURIComponent(tag.toLowerCase())}`} title={`View ${formatTagLabel(tag)} tag`} key={`male-${tag}`}>
                          {formatTagLabel(tag)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
            <nav className="detail-tabs mx-3 flex w-[calc(100%-24px)] flex-nowrap items-stretch justify-between border-b border-black/15 text-sm dark:border-white/15 md:mx-[30px] md:w-auto md:justify-start lg:mx-10" role="tablist" aria-label="Series details">
              {([
                ["chapters", `Chapters (${chapters.length})`],
                ["synopsis", "Synopsis"],
                ["covers", `Volumes (${coverOptions.length})`],
                ["discussion", `Comments (${commentCount ?? "…" })`],
              ] as const).map(([tab, label]) => (
                <button
                  className={`relative min-h-10 min-w-0 flex-1 truncate border-b-2 px-0.5 py-2 text-center text-[10px] font-medium leading-tight transition-colors sm:text-[11px] md:min-h-12 md:flex-none md:px-4 md:text-left md:text-sm ${detailTab === tab ? "border-[var(--mikoroku-detail-tab-accent)] text-[var(--mikoroku-detail-tab-accent)]" : "border-transparent text-[#666] hover:text-[var(--mikoroku-detail-tab-accent)] dark:text-white/60 dark:hover:text-[var(--mikoroku-detail-tab-accent)]"}`}
                  type="button"
                  key={tab}
                  id={`detail-tab-${tab}`}
                  role="tab"
                  aria-selected={detailTab === tab}
                  onClick={() => setDetailTab(tab)}
                  title={label}
                >
                  {label}
                </button>
              ))}
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
                      <CoverImage className="aspect-[3/4] w-full object-cover" src={coverUrl} alt="" loading="lazy" optimizeWidth={240} />
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
                <h2 className="section-title">Chapters</h2>
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
                    <button id="gridViewBtn" className={`view-btn${view === "grid" ? " active" : ""}`} type="button" title="Thumbnail grid" aria-label="Thumbnail grid" onClick={() => { localStorage.setItem("chapterViewMode", "grid"); setView("grid"); }}>
                      <i className="fas fa-th-large" aria-hidden="true" />
                    </button>
                    <button id="textGridViewBtn" className={`view-btn${view === "text-grid" ? " active" : ""}`} type="button" title="Text grid" aria-label="Text grid" onClick={() => { localStorage.setItem("chapterViewMode", "text-grid"); setView("text-grid"); }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="4" rx="1" />
                        <rect x="3" y="10" width="18" height="4" rx="1" />
                        <rect x="3" y="16" width="18" height="4" rx="1" />
                      </svg>
                    </button>
                    <button id="listViewBtn" className={`view-btn${view === "list" ? " active" : ""}`} type="button" title="List" aria-label="List" onClick={() => { localStorage.setItem("chapterViewMode", "list"); setView("list"); }}>
                      <i className="fas fa-list" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <div
                className={`chapter-grid grid grid-cols-[repeat(4,minmax(0,1fr))] content-start justify-stretch gap-2 px-4 pt-0 pb-[30px] md:grid-cols-[repeat(6,minmax(0,1fr))] md:gap-[10px] md:px-6 md:pb-10 lg:grid-cols-[repeat(8,minmax(0,1fr))] lg:px-8 lg:pb-[50px] ${
                  chapterState === "loading"
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
                    <button
                    className={`chapter-item relative aspect-square w-full min-w-0 cursor-pointer overflow-hidden rounded-[10px] border-0 bg-[rgba(0,0,0,0.25)] p-0 transition-[transform,box-shadow,filter] duration-200 hover:z-[2] hover:scale-105 active:scale-[0.97]${isRead ? " read" : ""} ${
                      view === "list"
                        ? `!flex !h-20 !w-full !items-center !rounded-xl !bg-[rgba(80,78,78,0.04)] ![aspect-ratio:unset] dark:!bg-[rgba(156,7,7,0.06)]${isRead ? " !bg-[rgba(0,0,0,0.5)] dark:!bg-[rgba(0,0,0,0.58)]" : ""}`
                        : view === "text-grid"
                          ? `!flex !h-auto !min-h-[60px] !flex-col !justify-center !rounded-[10px] !border !border-[rgba(0,0,0,0.1)] !bg-[rgba(80,78,78,0.04)] !p-3 !text-[#111] ![aspect-ratio:unset] ![box-shadow:none] dark:!border-[rgba(255,255,255,0.18)] dark:!bg-[rgba(156,7,7,0.06)] dark:!text-white${isRead ? " !bg-[rgba(0,0,0,0.5)] !text-white dark:!bg-[rgba(0,0,0,0.58)]" : ""}`
                          : ""
                    }`}
                    data-index={index}
                    key={`${chapter.source}-${chapter.num}-${chapter.url || chapter.id || index}`}
                    onClick={() => openChapter(chapter)}
                    type="button"
                  >
                    {view !== "text-grid" && (
                      <img
                        className={`absolute inset-0 m-0 h-full w-full rounded-[inherit] border-0 object-cover object-center p-0 ${view === "list" ? "!static !h-full !w-[90px] shrink-0 !rounded-none" : ""} ${isRead ? "brightness-[0.65]" : ""}`}
                        alt=""
                        loading="lazy"
                        src={chapter.thumbnail || cover || "/assets/icons/favicon.ico"}
                      />
                    )}
                    {isRead && (
                      <span
                        className="pointer-events-none absolute inset-0 z-[1] bg-[rgba(0,0,0,0.22)]"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`pointer-events-none absolute z-[6] flex flex-col items-end gap-1 ${
                        view === "list"
                          ? "right-[10px] top-1/2 -translate-y-1/2"
                          : view === "text-grid"
                            ? "right-2 top-2"
                            : "right-1 top-1"
                      }`}
                      aria-hidden="true"
                    >
                      <span className={`text-[13px] ${isRead ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>
                        <i className={`fas ${isRead ? "fa-eye" : "fa-eye-slash"}`} />
                      </span>
                      <span className={`chapter-source-badge text-[9px] font-extrabold uppercase leading-none tracking-[0.2px] [text-shadow:0_0_2px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.85)] max-[480px]:text-[8px] ${chapter.source === "blogger" ? "text-[#60a5fa]" : chapter.source === "blogger2" ? "text-[#fbbf24]" : "text-[#ef4444]"} ${view === "list" ? "text-[10px] [text-shadow:none]" : ""}`}
                      >
                        {chapter.source === "blogger" ? "SV1" : chapter.source === "blogger2" ? "SV2" : "ES"}
                      </span>
                    </span>
                    <span className={`chapter-label absolute right-0 bottom-0 left-0 z-[2] flex flex-col items-center gap-1 bg-[rgba(0,0,0,0.85)] px-[3px] pt-1 pb-[3px] text-center text-[9px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] ${
                      view === "list"
                        ? "!static !min-w-0 !flex-1 !items-start !justify-center !gap-[5px] !bg-transparent !px-[14px] !py-3 !pr-12 !text-left !text-inherit"
                        : view === "text-grid"
                          ? "!static !items-start !gap-[5px] !bg-transparent !p-0 !pr-8 !text-left !text-inherit ![text-shadow:none]"
                          : ""
                    }`}>
                      <span className={`chapter-title block font-bold leading-[1.15] ${
                        view === "list"
                          ? `!text-sm ${isRead ? "text-white" : "text-[#111] dark:text-white"}`
                          : view === "text-grid"
                            ? `text-[12px] md:text-[12px] ${isRead ? "text-white" : "text-[#111] dark:text-white"}`
                            : "text-[9px]"
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
                      <span className={`chapter-date mt-0 block opacity-80 ${
                        view === "list"
                          ? `text-[11px] ${isRead ? "text-[#ddd]" : "text-[#444] dark:text-[#ddd]"}`
                          : view === "text-grid"
                            ? `text-[10px] opacity-70 md:text-[10px] ${isRead ? "text-[#ddd]" : "text-[#444] dark:text-[#ddd]"}`
                            : "text-[7px]"
                      }`}>
                        {formatDate(chapter.createdAt || chapter.updatedAt || chapter.date)}
                      </span>
                    </span>
                    </button>
                  );
                })}
              </div>
            </section>
            </>}
          </div>
        </div>
        <RecommendationSidebar manga={manga} onVisibilityChange={handleRecommendationVisibilityChange} />
      </main>
      <div className="relative z-[2]">
        <SiteFooter />
      </div>
      <RouteIntegrations />
    </>
  );
}

function RouteIntegrations() {
  useEffect(() => {
    const added: HTMLScriptElement[] = [];
    const load = (src: string, persistent = false) => new Promise<void>((resolve) => {
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
          console.error(`Gagal memuat integrasi halaman manga: ${src}`);
          resolve();
        }, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => {
        console.error(`Gagal memuat integrasi halaman manga: ${src}`);
        resolve();
      };
      if (!persistent) added.push(script);
      document.body.appendChild(script);
    });

    void (async () => {
      await load("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
      await load("https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js");
      await load("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js");
      const firebaseInit = document.createElement("script");
      firebaseInit.textContent = `if (typeof firebase !== "undefined" && !firebase.apps.some(function(app) { return app.name === "[DEFAULT]"; })) { firebase.initializeApp({ apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4", authDomain: "widget-comment.firebaseapp.com", projectId: "widget-comment", storageBucket: "widget-comment.firebasestorage.app", messagingSenderId: "249700505242", appId: "1:249700505242:web:dab240af09caf30ad7f123" }); }`;
      added.push(firebaseInit);
      document.head.appendChild(firebaseInit);
    })();

    return () => {
      for (const script of added) script.remove();
    };
  }, []);

  return (
    <>
      <GlobalAuth />
      <UserModals />
      <MangaDataProvider />
    </>
  );
}
