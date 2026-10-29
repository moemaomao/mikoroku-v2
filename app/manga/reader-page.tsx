"use client";

import JSZip from "jszip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommunityWidgets from "../community-widgets";
import { BannerAdSlot } from "../advertisement-manager";
import SiteChrome from "../site-chrome";
import { chapterNumberFromRecord, normalizeChapterNumber } from "../../lib/chapter-number";
import { imageProxyUrl } from "../../lib/image-proxy";
import { originalReaderImageUrl, readerImageUrlWithQuality } from "../../lib/reader-image-url";
import { isNovelSeries } from "../../lib/reader-kind";
import {
  updateReadingHistoryProgress,
  upsertReadingHistoryEntry,
} from "../../lib/reading-history";
import { initializeFirebaseClient } from "../lib/firebase-client";

type ReaderKind = "manga" | "novel";
type ChapterRecord = {
  id?: string;
  num?: string | number;
  title?: string;
  postTitle?: string;
  chapterTitle?: string;
  label?: string;
  cover?: string;
  images?: unknown;
  pages?: unknown;
  content?: unknown;
  text?: unknown;
  html?: unknown;
  isNovel?: boolean;
  source?: string;
  order?: number;
  url?: string;
};

type ReaderData = {
  kind: ReaderKind;
  id?: string;
  title: string;
  cover: string;
  chapterTitle: string;
  images: string[];
  text: string;
  chapters: string[];
  chapter: string;
  source?: string;
};

const mangaDatasetUrl =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json";
const bloggerChapterSources = [
  { source: "blogger", domain: "https://www.mikodrive.my.id" },
  { source: "blogger2", domain: "https://www.yomidays.my.id" },
] as const;
const mangaReportTypes = [
  { value: "Chapter Tidak Muncul", label: "Chapter Not Showing" },
  { value: "Chapter Acak", label: "Wrong Chapter Order" },
  { value: "Chapter Double", label: "Duplicate Chapter" },
  { value: "Typo", label: "Typo" },
  { value: "Gambar Rusak", label: "Broken Images" },
  { value: "Gambar Tidak Lengkap", label: "Missing Pages" },
  { value: "Urutan Halaman Salah", label: "Wrong Page Order" },
  { value: "Terjemahan Salah", label: "Incorrect Translation" },
  { value: "Lainnya", label: "Other" },
];
const novelReportTypes = [
  { value: "Chapter Error", label: "Chapter Error" },
  { value: "Tidak Bisa Dibuka", label: "Cannot Open" },
  { value: "Konten Rusak", label: "Corrupted Content" },
  { value: "Terjemahan Salah", label: "Incorrect Translation" },
  { value: "Lainnya", label: "Other" },
];

function imageList(input: unknown, allowAnyUrl = false): string[] {
  if (Array.isArray(input)) {
    return [...new Set(input.flatMap((value) => imageList(value, true)))];
  }
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    const url = record.url || record.src || record.image || record.imageUrl;
    return typeof url === "string" ? imageList(url, true) : [];
  }
  if (typeof input !== "string") return [];

  const value = input.trim();
  if (!value) return [];
  if (value.startsWith("[") || value.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed !== input) return imageList(parsed, allowAnyUrl);
    } catch {
    }
  }

  const htmlImages = [...value.matchAll(/<img\b[^>]*>/gi)].flatMap(([tag]) => {
    const attributes = new Map(
      [...tag.matchAll(/\b(data-lazy-src|data-src|data-original|data-srcset|srcset|src)\s*=\s*(["'])(.*?)\2/gi)]
        .map(([, name, , url]) => [name.toLowerCase(), url]),
    );
    const srcset = attributes.get("data-srcset") || attributes.get("srcset");
    const srcsetUrl = srcset?.split(",").at(-1)?.trim().split(/\s+/)[0];
    const url = attributes.get("data-lazy-src") ||
      attributes.get("data-src") ||
      attributes.get("data-original") ||
      srcsetUrl ||
      attributes.get("src");
    return url ? [url] : [];
  });
  const candidates = htmlImages.length
    ? htmlImages
    : value.split(/[\r\n]+/).flatMap((line) =>
        line.match(/https?:\/\/[^\s"'<>]+/gi) || [],
      );

  return [...new Set(candidates.map((url) => url.replace(/[),;}\]]+$/, "").trim()).filter((url) => {
    if (!/^https?:\/\//i.test(url)) return false;
    if (allowAnyUrl) return true;
    return /\.(?:jpg|jpeg|png|gif|webp|bmp|avif)(?:$|[?#])/i.test(url) ||
      /(?:blogger\.googleusercontent\.com|googleusercontent\.com|imgur\.com|pixiv\.net)/i.test(url);
  }))];
}

function chapterImages(chapter: ChapterRecord | null | undefined): string[] {
  return [...new Set([
    ...imageList(chapter?.images, true),
    ...imageList(chapter?.pages, true),
  ])];
}

function hasChapterPayload(chapter: ChapterRecord | null | undefined): boolean {
  return Boolean(
    chapterImages(chapter).length ||
    imageList(chapter?.content || chapter?.text || chapter?.html, true).length,
  );
}

function novelText(value: unknown): string {
  if (typeof value !== "string") return "";
  const parsed = new DOMParser().parseFromString(value, "text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed").forEach((element) => element.remove());
  parsed.querySelectorAll("br").forEach((element) => element.replaceWith("\n"));
  parsed.querySelectorAll("p,div,li,h1,h2,h3").forEach((element) => {
    element.append("\n\n");
  });
  return parsed.body.textContent?.replace(/\n{3,}/g, "\n\n").trim() || value.trim();
}

function chapterValue(value: string | number): number {
  return Number.parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
}

function imageWithQuality(url: string, quality: number): string {
  return readerImageUrlWithQuality(url, quality);
}

function readerImageUrl(url: string, dataSaver: boolean, quality: number): string {
  return dataSaver ? imageWithQuality(url, quality) : originalReaderImageUrl(url);
}

const READER_IMAGE_CACHE_NAME = "mikoroku-reader-images-v1";
const READER_IMAGE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const READER_IMAGE_CACHE_MAX_ENTRIES = 100;
const READER_IMAGE_CACHE_MAX_BYTES = 120 * 1024 * 1024;
const READER_IMAGE_CACHE_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function pruneReaderImageCache(cache: Cache): Promise<void> {
  const keys = await cache.keys();
  const entries = await Promise.all(keys.map(async (request) => {
    const response = await cache.match(request);
    const cachedAt = Number(response?.headers.get("x-mikoroku-cached-at"));
    const size = Number(response?.headers.get("x-mikoroku-cache-size"));
    return {
      request,
      cachedAt,
      size: Number.isFinite(size) ? size : 0,
      expired: !response || !Number.isFinite(cachedAt) || Date.now() - cachedAt > READER_IMAGE_CACHE_MAX_AGE,
    };
  }));
  const retained = entries.filter((entry) => !entry.expired)
    .sort((left, right) => left.cachedAt - right.cachedAt);
  let totalBytes = retained.reduce((total, entry) => total + entry.size, 0);
  let totalEntries = retained.length;

  for (const entry of entries) {
    if (entry.expired) await cache.delete(entry.request);
  }
  for (const entry of retained) {
    if (totalEntries <= READER_IMAGE_CACHE_MAX_ENTRIES && totalBytes <= READER_IMAGE_CACHE_MAX_BYTES) break;
    await cache.delete(entry.request);
    totalEntries -= 1;
    totalBytes -= entry.size;
  }
}

function ReaderImage({
  src,
  alt,
  className,
  wrapperClassName,
  loading,
  fetchPriority = "auto",
}: {
  src: string;
  alt: string;
  className: string;
  wrapperClassName: string;
  loading: "eager" | "lazy";
  fetchPriority?: "high" | "auto" | "low";
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  function handleError(event: React.SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    if (image.dataset.fallbackTried) {
      setFailed(true);
      return;
    }
    image.dataset.fallbackTried = "true";
    const fallback = imageProxyUrl(src, "readerFallback");
    if (fallback === image.src) {
      setFailed(true);
      return;
    }
    image.src = fallback;
  }

  return (
    <span className={`reader-image-frame relative block ${wrapperClassName}`} aria-busy={!loaded && !failed}>
      {failed ? (
        <span className="grid min-h-[40vh] place-items-center bg-black/[.04] px-4 text-sm text-slate-500 dark:bg-white/[.04] dark:text-slate-400" role="img" aria-label={`${alt} could not be loaded`}>
          Image could not be loaded
        </span>
      ) : (
        <img
          className={`${className} relative`}
          src={src}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}
    </span>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

function getCurrentChapterCache(slug: string): ChapterRecord | null {
  try {
    const value = JSON.parse(localStorage.getItem("currentChapter") || "null") as (ChapterRecord & { slug?: string }) | null;
    return value && (!value.slug || value.slug === slug) ? value : null;
  } catch (error) {
    console.warn("Stored chapter data is invalid.", error);
    return null;
  }
}

function getCachedChapters(slug: string): ChapterRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "[]") as unknown;
    if (Array.isArray(value)) return value as ChapterRecord[];
    if (value && typeof value === "object") {
      const data = (value as { data?: unknown }).data;
      return Array.isArray(data) ? data as ChapterRecord[] : [];
    }
  } catch (error) {
    console.warn("Stored chapter list is invalid.", error);
  }
  return [];
}

function getCachedReaderData(
  slug: string,
  chapter: string,
  kind: ReaderKind,
  forceSource?: "sv1" | "sv2" | "es" | null,
): ReaderData | null {
  if (kind !== "manga") return null;
  const targetChapter = normalizeChapterNumber(chapter);
  if (!targetChapter) return null;

  const sourcePreference = forceSource || localStorage.getItem("chapterSourceMode");
  const selectedSource = sourcePreference === "sv1"
    ? "blogger"
    : sourcePreference === "sv2"
      ? "blogger2"
      : sourcePreference === "es"
        ? "firestore"
        : undefined;
  const cachedCurrent = getCurrentChapterCache(slug);
  const cachedChapters = getCachedChapters(slug);
  const matchesChapter = (record: ChapterRecord) =>
    normalizeChapterNumber(chapterNumberFromRecord(record, record.id || "")) === targetChapter;
  const matchesSource = (record: ChapterRecord) =>
    !selectedSource || record.source === selectedSource;
  const cachedChapter = cachedChapters.find((record) =>
    matchesChapter(record) && matchesSource(record) && hasChapterPayload(record),
  );
  const currentChapterMatches = cachedCurrent &&
    matchesChapter(cachedCurrent) &&
    matchesSource(cachedCurrent) &&
    hasChapterPayload(cachedCurrent);
  const record = currentChapterMatches ? cachedCurrent : cachedChapter;
  if (!record) return null;

  const content = record.content || record.text || record.html;
  const images = [...new Set([...chapterImages(record), ...imageList(content, true)])];
  if (!images.length) return null;

  const chapters = [...new Set([
    ...cachedChapters.map((item) =>
      normalizeChapterNumber(chapterNumberFromRecord(item, item.id || "")),
    ),
    targetChapter,
  ].filter((value): value is string => Boolean(value)))];

  return {
    kind: "manga",
    id: record.id,
    title: String(cachedCurrent?.title || slug.replace(/-/g, " ")),
    cover: String(cachedCurrent?.cover || ""),
    chapterTitle: String(record.label || record.chapterTitle || record.postTitle || record.title || `Chapter ${targetChapter}`),
    images,
    text: novelText(content),
    chapters,
    chapter: targetChapter,
    source: record.source,
  };
}

type BloggerFeedEntry = {
  title?: { $t?: string };
  link?: Array<{ rel?: string; href?: string }>;
  content?: { $t?: string };
};

function getJsonp<T>(url: string, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Chapter request was superseded.", "AbortError"));
      return;
    }

    const callbackName = `mikorokuReaderJsonp${Date.now()}${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const globalWindow = window as typeof window & Record<string, unknown>;
    let settled = false;
    const finish = (error?: Error, data?: T) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      script.remove();
      delete globalWindow[callbackName];
      if (error) reject(error);
      else resolve(data as T);
    };
    const onAbort = () => finish(new DOMException("Chapter request was superseded.", "AbortError"));
    const timeout = window.setTimeout(
      () => finish(new Error("Timed out while loading the chapter from Blogger.")),
      15000,
    );
    globalWindow[callbackName] = (data: T) => finish(undefined, data);
    script.onerror = () => finish(new Error("Failed to load the chapter from Blogger."));
    signal.addEventListener("abort", onAbort, { once: true });
    const feedUrl = new URL(url);
    feedUrl.searchParams.set("callback", callbackName);
    script.src = feedUrl.href;
    document.head.appendChild(script);
  });
}

function normalizePostUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/+$/, "").toLowerCase();
  }
}

function chapterNumberFromPostTitle(title: string): string | null {
  const match = title.match(/(?:chapter|chapters|ch\.?|chap\.?|ep\.?|episode)\s*[:\-]?\s*(\d+(?:[.,．]\d+)?)/i)
    || title.match(/第\s*(\d+(?:[.,．]\d+)?)\s*[話话回]?/)
    || title.match(/#\s*(\d+(?:[.,．]\d+)?)/)
    || [...title.matchAll(/(\d+(?:[.,．]\d+)?)/g)].at(-1);
  return normalizeChapterNumber(match?.[1]);
}

function normalizedSearchKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function differsByAtMostOneCharacter(first: string, second: string): boolean {
  const a = normalizedSearchKey(first);
  const b = normalizedSearchKey(second);
  if (Math.min(a.length, b.length) < 12 || Math.abs(a.length - b.length) > 1) return false;

  let firstIndex = 0;
  let secondIndex = 0;
  let differences = 0;
  while (firstIndex < a.length && secondIndex < b.length) {
    if (a[firstIndex] === b[secondIndex]) {
      firstIndex += 1;
      secondIndex += 1;
      continue;
    }
    differences += 1;
    if (differences > 1) return false;
    if (a.length > b.length) firstIndex += 1;
    else if (b.length > a.length) secondIndex += 1;
    else {
      firstIndex += 1;
      secondIndex += 1;
    }
  }
  if (firstIndex < a.length || secondIndex < b.length) differences += 1;
  return differences <= 1;
}

async function findFirestoreSeriesSlug(
  slug: string,
  signal: AbortSignal,
): Promise<string> {
  await waitForReaderFirestore(signal);
  if (!window.firestore || !window.fs?.collection || !window.fs.getDocs) {
    throw new Error("The Firebase Firestore series-list API is unavailable.");
  }

  const snapshot = await window.fs.getDocs(window.fs.collection(window.firestore, "manga"));
  const matches: string[] = [];
  snapshot.forEach((document) => {
    const data = document.data();
    if (
      differsByAtMostOneCharacter(slug, document.id) ||
      differsByAtMostOneCharacter(slug, String(data.title || ""))
    ) {
      matches.push(document.id);
    }
  });
  return matches.length === 1 ? matches[0] : slug;
}

async function loadMangaMetadataFromDataset(
  slug: string,
  signal: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const response = await fetch(mangaDatasetUrl, { signal });
  if (!response.ok) throw new Error(`Manga dataset returned HTTP ${response.status}.`);
  const entries = await response.json() as Array<Record<string, unknown>>;
  return entries.find((entry) =>
    String(entry.slug || "") === slug ||
    normalizedSearchKey(String(entry.title || "")) === normalizedSearchKey(slug),
  ) || null;
}

async function loadBloggerChapterFromFeeds(
  slug: string,
  seriesTitle: string,
  chapter: string,
  preferredSource: "blogger" | "blogger2" | undefined,
  signal: AbortSignal,
): Promise<ChapterRecord | null> {
  const sources = preferredSource
    ? [
        ...bloggerChapterSources.filter((item) => item.source === preferredSource),
        ...bloggerChapterSources.filter((item) => item.source !== preferredSource),
      ]
    : bloggerChapterSources;
  const seriesKeys = [normalizedSearchKey(seriesTitle), normalizedSearchKey(slug)]
    .filter((key) => key.length >= 5);
  const settled = await Promise.allSettled(sources.map(async ({ source, domain }) => {
    const feedUrl = new URL("/feeds/posts/default", domain);
    feedUrl.searchParams.set("alt", "json-in-script");
    feedUrl.searchParams.set("max-results", "500");
    feedUrl.searchParams.set("q", seriesTitle || slug.replace(/-/g, " "));
    const feed = await getJsonp<{ feed?: { entry?: BloggerFeedEntry[] } }>(feedUrl.href, signal);
    return (feed.feed?.entry || []).flatMap((entry) => {
      const postTitle = entry.title?.$t?.trim() || "";
      const postKey = normalizedSearchKey(postTitle);
      if (chapterNumberFromPostTitle(postTitle) !== chapter ||
        !seriesKeys.some((key) => postKey.includes(key))) return [];
      const url = entry.link?.find((link) => link.rel === "alternate")?.href || "";
      const content = entry.content?.$t || "";
      return [{
        num: chapter,
        title: postTitle,
        postTitle,
        label: `Chapter ${chapter}`,
        url,
        images: imageList(content, true),
        content,
        source,
      }];
    });
  }));
  for (const [index, result] of settled.entries()) {
    if (result.status === "rejected" && !signal.aborted) {
      console.warn(`Blogger ${sources[index].source} lookup failed for ${slug} chapter ${chapter}.`, result.reason);
    }
  }
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : [])[0] || null;
}

async function getBloggerChapterNumbers(
  title: string,
  source: "blogger" | "blogger2",
  signal: AbortSignal,
): Promise<string[]> {
  const params = new URLSearchParams({ title: title.trim(), source, full: "1" });
  const response = await fetch(`/api/blogger/chapters?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Blogger chapter list returned HTTP ${response.status}.`);
  }
  const payload = await response.json() as { chapters?: Array<{ num?: unknown }> };
  return [...new Set((payload.chapters || [])
    .map(({ num }) => normalizeChapterNumber(num))
    .filter((num): num is string => Boolean(num)))];
}

async function getBloggerChapterImages(
  chapter: ChapterRecord,
  signal: AbortSignal,
): Promise<string[]> {
  if (chapter.source !== "blogger" && chapter.source !== "blogger2") return [];
  const title = String(chapter.postTitle || chapter.label || chapter.title || "").trim();
  if (!title) return [];
  const domain = chapter.source === "blogger"
    ? "https://www.mikodrive.my.id"
    : "https://www.yomidays.my.id";
  const feedUrl = new URL("/feeds/posts/default", domain);
  feedUrl.searchParams.set("alt", "json-in-script");
  feedUrl.searchParams.set("max-results", "20");
  feedUrl.searchParams.set("q", title);
  const feed = await getJsonp<{ feed?: { entry?: BloggerFeedEntry[] } }>(feedUrl.href, signal);
  const targetUrl = chapter.url ? normalizePostUrl(chapter.url) : "";
  const entry = (feed.feed?.entry || []).find((item) => {
    const alternateUrl = item.link?.find((link) => link.rel === "alternate")?.href || "";
    return targetUrl
      ? normalizePostUrl(alternateUrl) === targetUrl
      : item.title?.$t?.trim().toLowerCase() === title.toLowerCase();
  });
  return imageList(entry?.content?.$t, true);
}

async function getFirestoreDocument(path: string, signal: AbortSignal): Promise<Record<string, unknown> | null> {
  await waitForReaderFirestore(signal);
  if (!window.firestore || !window.fs?.doc || !window.fs.getDoc) {
    throw new Error("Firebase Firestore SDK is unavailable.");
  }
  const reference = window.fs.doc(window.firestore, ...path.split("/"));
  const snapshot = await window.fs.getDoc(reference);
  return snapshot.exists() ? snapshot.data() : null;
}

async function waitForReaderFirestore(signal: AbortSignal): Promise<void> {
  if (window.firestore && window.fs?.doc && window.fs.getDoc) return;
  if (signal.aborted) throw new DOMException("Firestore request was cancelled.", "AbortError");
  initializeFirebaseClient();
  if (!window.firestore || !window.fs?.doc || !window.fs.getDoc) {
    throw new Error("Firebase Firestore is unavailable.");
  }
}

async function getReaderChapterDocuments(
  slug: string,
  signal: AbortSignal,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  await waitForReaderFirestore(signal);
  if (!window.firestore || !window.fs?.collection || !window.fs.getDocs) {
    throw new Error("The Firebase Firestore chapter-list API is unavailable.");
  }

  const snapshot = await window.fs.getDocs(
    window.fs.collection(window.firestore, "manga", slug, "chapters"),
  );
  const documents: Array<{ id: string; data: Record<string, unknown> }> = [];
  snapshot.forEach((document) => documents.push({ id: document.id, data: document.data() }));
  if (documents.length) return documents;

  try {
    if (!window.fs.doc || !window.fs.getDoc) {
      throw new Error("The Firebase Firestore series-document API is unavailable.");
    }
    const seriesSnapshot = await window.fs.getDoc(
      window.fs.doc(window.firestore, "manga", slug),
    );
    if (!seriesSnapshot.exists()) return [];
    const manga = seriesSnapshot.data();
    const chapterMap: Record<string, unknown> = {};
    for (const field of [manga.chapters, manga.chapter]) {
      if (field && typeof field === "object" && !Array.isArray(field)) {
        Object.assign(chapterMap, field);
      }
    }
    for (const [key, value] of Object.entries(manga)) {
      const match = key.match(/^chapters?[.\[](.+?)\]?$/i);
      if (match && ((value && typeof value === "object") || typeof value === "string")) {
        chapterMap[match[1]] = value;
      }
    }
    return Object.entries(chapterMap).flatMap(([id, value]) => {
      if (Array.isArray(value)) return [{ id, data: { images: value } }];
      if (value && typeof value === "object") {
        return [{ id, data: value as Record<string, unknown> }];
      }
      return typeof value === "string" ? [{ id, data: { content: value } }] : [];
    });
  } catch (error) {
    if (signal.aborted) throw error;
    console.warn("Could not load the chapter map from the Firestore series document.", error);
    return [];
  }
}

async function loadReaderData(
  slug: string,
  chapter: string,
  kind: ReaderKind,
  signal: AbortSignal,
  forceSource?: "sv1" | "sv2" | "es" | null,
): Promise<ReaderData> {
  const cachedCurrent = getCurrentChapterCache(slug);
  const cachedChapters = getCachedChapters(slug);
  const targetChapter = normalizeChapterNumber(chapter) ||
    normalizeChapterNumber(cachedCurrent?.num) ||
    "1";
  const hasMatchingCachedCurrent = cachedCurrent &&
    String(cachedCurrent.num) === targetChapter &&
    (kind !== "novel" || (cachedCurrent.source !== "blogger" && cachedCurrent.source !== "blogger2"));
  const cachedCurrentHasPayload = hasChapterPayload(cachedCurrent);
  const sourcePreference = kind === "manga"
    ? (forceSource || localStorage.getItem("chapterSourceMode"))
    : null;
  const selectedSource = sourcePreference === "sv1"
    ? "blogger"
    : sourcePreference === "sv2"
      ? "blogger2"
      : sourcePreference === "es"
        ? "firestore"
        : undefined;
  const canUseCachedCurrent = Boolean(
    hasMatchingCachedCurrent &&
    (selectedSource
      ? cachedCurrent?.source === selectedSource
      : (cachedCurrent?.source !== "blogger" && cachedCurrent?.source !== "blogger2") || cachedCurrentHasPayload),
  );
  let requestedSource = kind === "novel"
    ? "firestore"
    : selectedSource || (canUseCachedCurrent
      ? cachedCurrent?.source
      : undefined);
  let isBloggerSource = requestedSource === "blogger" || requestedSource === "blogger2";
  let manga: Record<string, unknown> | null = null;
  let chapterData: Record<string, unknown> | null = null;
  const matchingCachedChapters = cachedChapters.filter((item) =>
    chapterNumberFromRecord(item, item.id || "") === targetChapter &&
    (kind !== "novel" || (item.source !== "blogger" && item.source !== "blogger2")),
  );
  const cachedMatch = isBloggerSource
    ? matchingCachedChapters.find((item) => item.source === requestedSource)
    : matchingCachedChapters.find((item) => item.source === "firestore" && hasChapterPayload(item)) ||
      matchingCachedChapters.find(hasChapterPayload) ||
      matchingCachedChapters.find((item) => item.source === "firestore") ||
      matchingCachedChapters[0];
  let chapterDocumentId = cachedMatch?.id ||
    (canUseCachedCurrent ? cachedCurrent?.id : undefined) ||
    targetChapter;
  let firestoreSlug = slug;
  let readerDocuments: Array<{ id: string; data: Record<string, unknown> }> | undefined;
  let chapterListAttempted = false;
  let chapterListError: unknown;
  let chapterDocumentAttempted = false;
  if (cachedMatch) chapterData = cachedMatch as Record<string, unknown>;

  if (kind === "novel" && !chapterData) {
    chapterDocumentAttempted = true;
    try {
      chapterData = await getFirestoreDocument(
        `manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterDocumentId)}`,
        signal,
      );
    } catch (error) {
      if (signal.aborted) throw error;
      console.warn("The requested novel chapter could not be loaded directly from Firestore.", error);
    }
  }

  if (!isBloggerSource && !cachedMatch?.id && !chapterData) {
    chapterListAttempted = true;
    try {
      readerDocuments = await getReaderChapterDocuments(firestoreSlug, signal);
    } catch (error) {
      if (signal.aborted) throw error;
      chapterListError = error;
      console.warn("The Firestore chapter list failed; trying the requested chapter document.", error);
    }
    if (kind === "manga" && !readerDocuments?.length) {
      try {
        const resolvedSlug = await findFirestoreSeriesSlug(slug, signal);
        if (resolvedSlug !== slug) {
          firestoreSlug = resolvedSlug;
          readerDocuments = await getReaderChapterDocuments(firestoreSlug, signal);
          chapterListError = undefined;
        }
      } catch (error) {
        if (signal.aborted) throw error;
        chapterListError = error;
        console.warn("The Firestore series ID could not be resolved from the shared link.", error);
      }
    }
    const current = readerDocuments?.find(({ id, data }) =>
      chapterNumberFromRecord(data, id) === targetChapter,
    ) || readerDocuments?.find(({ id }) => id === targetChapter);
    if (current) {
      chapterData = current.data;
      chapterDocumentId = current.id;
    }
  }
  if (!chapterData && canUseCachedCurrent && cachedCurrent) {
    chapterData = cachedCurrent;
    chapterDocumentId = cachedCurrent.id || targetChapter;
  }

  if (kind === "novel" && !chapterData && !chapterDocumentAttempted) {
    chapterDocumentAttempted = true;
    try {
      chapterData = await getFirestoreDocument(
        `manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterDocumentId)}`,
        signal,
      );
    } catch (error) {
      if (signal.aborted) throw error;
      console.warn("The requested novel chapter could not be loaded directly from Firestore.", error);
    }
  }

  try {
    manga = await getFirestoreDocument(`manga/${encodeURIComponent(firestoreSlug)}`, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    if (!chapterData && kind !== "novel") {
      console.warn("Series metadata could not be loaded from Firestore.", error);
    }
    console.warn("Series info could not be loaded; continuing with available chapter data.", error);
  }

  if (kind === "manga" && !manga && (!chapterData || !hasMatchingCachedCurrent)) {
    try {
      manga = await loadMangaMetadataFromDataset(slug, signal);
    } catch (error) {
      if (signal.aborted) throw error;
      console.warn(`Manga metadata lookup failed for ${slug}.`, error);
    }
  }

  if (kind === "manga" && !hasChapterPayload(chapterData) && sourcePreference !== "es") {
    try {
      const bloggerChapter = await loadBloggerChapterFromFeeds(
        slug,
        String(manga?.title || manga?.name || slug.replace(/-/g, " ")),
        targetChapter,
        selectedSource === "blogger" || selectedSource === "blogger2" ? selectedSource : undefined,
        signal,
      );
      if (bloggerChapter) {
        chapterData = bloggerChapter;
        if (bloggerChapter.source === "blogger" || bloggerChapter.source === "blogger2") {
          requestedSource = bloggerChapter.source;
          isBloggerSource = true;
        }
      }
    } catch (error) {
      if (signal.aborted) throw error;
      console.warn(`Blogger fallback failed for ${slug} chapter ${targetChapter}.`, error);
    }
  }
  if (isBloggerSource && !hasChapterPayload(chapterData)) isBloggerSource = false;

  let resolvedKind: ReaderKind = isNovelSeries(manga) || cachedCurrent?.isNovel ? "novel" : kind;
  if (resolvedKind !== kind) {
    return {
      kind: resolvedKind,
      title: String(manga?.title || manga?.name || cachedCurrent?.title || slug.replace(/-/g, " ")),
      cover: String(manga?.img || manga?.cover || ""),
      chapterTitle: `Chapter ${targetChapter}`,
      images: [],
      text: "",
      chapters: [targetChapter],
      chapter: targetChapter,
      id: chapterDocumentId,
      source: String(chapterData?.source || cachedCurrent?.source || ""),
    };
  }
  const cachedContent = chapterData?.content || chapterData?.text || chapterData?.html;
  if (resolvedKind === "manga" && isBloggerSource) {
    try {
      const bloggerImages = await getBloggerChapterImages(chapterData || {}, signal);
      if (bloggerImages.length) chapterData = { ...chapterData, images: bloggerImages };
    } catch (error) {
      if (signal.aborted) throw error;
      console.warn("Blogger chapter images could not be refreshed; using cached chapter data.", error);
    }
  }

  if (!isBloggerSource && resolvedKind === "manga" &&
    !chapterImages(chapterData).length &&
    !imageList(chapterData?.content || chapterData?.html).length) {
    try {
      const storedChapter = await getFirestoreDocument(
        `manga/${encodeURIComponent(firestoreSlug)}/chapters/${encodeURIComponent(chapterDocumentId)}`,
        signal,
      );
      if (storedChapter &&
        (chapterImages(storedChapter).length ||
          imageList(storedChapter.content || storedChapter.html).length)) {
        chapterData = storedChapter;
      }
    } catch (error) {
      if (signal.aborted) throw error;
      console.warn("Firestore chapter document could not be loaded; trying the chapter list.", error);
    }
  } else if (!isBloggerSource && resolvedKind === "novel" &&
    !chapterDocumentAttempted &&
    (typeof cachedContent !== "string" || !cachedContent.trim())) {
    chapterDocumentAttempted = true;
    chapterData = await getFirestoreDocument(
      `manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterDocumentId)}`,
      signal,
    ) || chapterData;
  }

  if (!chapterData) {
    const map = manga?.chapters;
    if (map && typeof map === "object") {
      const fromMap = (map as Record<string, unknown>)[targetChapter];
      if (fromMap && typeof fromMap === "object") chapterData = fromMap as Record<string, unknown>;
      else if (typeof fromMap === "string") chapterData = { content: fromMap };
    }
  }

  let chapters = cachedChapters
    .map((item) => chapterNumberFromRecord(item, item.id || ""))
    .filter(Boolean);
  if (chapters.length <= 1 ||
    (resolvedKind === "manga" &&
      !chapterImages(chapterData).length &&
      !imageList(chapterData?.content || chapterData?.html).length)) {
    try {
      if (!chapterListAttempted) {
        chapterListAttempted = true;
        readerDocuments = await getReaderChapterDocuments(firestoreSlug, signal);
      }
      if (!readerDocuments && chapterListError) throw chapterListError;
      const documents = readerDocuments || [];
      const fetchedChapters = documents
        .map(({ id, data }) => chapterNumberFromRecord(data, id))
        .filter(Boolean);
      if (fetchedChapters.length > chapters.length) chapters = fetchedChapters;
      const current = documents.find(({ id, data }) =>
        chapterNumberFromRecord(data, id) === targetChapter,
      ) || documents.find(({ id }) => id === targetChapter);
      if (!isBloggerSource && current) {
        const currentImages = chapterImages(current.data);
        const currentContent = current.data.content || current.data.text || current.data.html;
        if (currentImages.length || imageList(currentContent).length || !chapterData) {
          chapterData = current.data;
          chapterDocumentId = current.id;
        }
      }
    } catch (error) {
      if (signal.aborted) throw error;
      if (!chapterData) throw error;
      console.warn("The Firestore chapter list failed; using the cached chapter.", error);
    }
  }
  if (isBloggerSource && chapters.length <= 1) {
    try {
      const source = chapterData?.source === "blogger2" || requestedSource === "blogger2"
        ? "blogger2"
        : "blogger";
      const bloggerChapters = await getBloggerChapterNumbers(
        String(manga?.title || manga?.name || slug.replace(/-/g, " ")),
        source,
        signal,
      );
      if (bloggerChapters.length > chapters.length) {
        chapters = [...new Set([...chapters, ...bloggerChapters])];
      }
    } catch (error) {
      if (signal.aborted) throw error;
      console.warn(`The Blogger chapter list failed for ${slug}; using the available chapter list.`, error);
    }
  }
  const resolvedChapter = chapterNumberFromRecord(chapterData || {}, targetChapter);
  if (!chapters.includes(resolvedChapter)) chapters.push(resolvedChapter);
  chapters = [...new Set(chapters)].sort((a, b) => chapterValue(a) - chapterValue(b));

  if (!isBloggerSource && !chapterData) {
    const map = manga?.chapters;
    if (map && typeof map === "object") {
      const fromMap = (map as Record<string, unknown>)[targetChapter];
      if (fromMap && typeof fromMap === "object") chapterData = fromMap as Record<string, unknown>;
      else if (typeof fromMap === "string") chapterData = { content: fromMap };
    }
  }

  const title = String(manga?.title || manga?.name || cachedCurrent?.title || slug.replace(/-/g, " "));
  const content = chapterData?.content || chapterData?.text || chapterData?.html ||
    (typeof chapterData?.data === "object" && chapterData.data
      ? (chapterData.data as Record<string, unknown>).content
      : "");
  const images = [...new Set([...chapterImages(chapterData), ...imageList(content)])];
  const text = novelText(content);
  if (resolvedKind === "manga" && !images.length && text) resolvedKind = "novel";
  if (!chapterData) throw new Error(`Chapter ${targetChapter} was not found.`);
  if (resolvedKind === "manga" && !images.length) throw new Error(`No images found for chapter ${targetChapter}.`);
  if (resolvedKind === "novel" && !text) throw new Error(`Chapter ${targetChapter} has no text content.`);

  return {
    kind: resolvedKind,
    id: chapterDocumentId,
    title,
    cover: String(manga?.img || manga?.cover || ""),
    chapterTitle: String(chapterData.label || chapterData.chapterTitle || chapterData.title || `Chapter ${targetChapter}`),
    images,
    text,
    chapters,
    chapter: resolvedChapter,
    source: typeof chapterData.source === "string" ? chapterData.source : undefined,
  };
}

export default function ReaderPage({
  slug,
  chapter,
  kind,
  preferStoredChapter = false,
}: {
  slug: string;
  chapter?: string;
  kind: ReaderKind;
  preferStoredChapter?: boolean;
}) {
  const [data, setData] = useState<ReaderData | null>(null);
  const [error, setError] = useState("");
  const [forcedServer, setForcedServer] = useState<"sv1" | "sv2" | "es" | null>(null);
  const [activeServer, setActiveServer] = useState<"sv1" | "sv2" | "es" | null>(() => {
    if (typeof window === "undefined") return null;
    const mode = localStorage.getItem("chapterSourceMode");
    return mode === "sv1" || mode === "sv2" || mode === "es" ? mode : null;
  });
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"long-strip" | "single">("long-strip");
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("Georgia, serif");
  const [columnWidth, setColumnWidth] = useState<"narrow" | "medium" | "wide">("medium");
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(50);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [readerNotice, setReaderNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [floatingHidden, setFloatingHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const pageRef = useRef(page);
  pageRef.current = page;
  useEffect(() => {
    if (settingsOpen || reportOpen) setFloatingHidden(false);
  }, [settingsOpen, reportOpen]);

  const [chapterListOpen, setChapterListOpen] = useState(false);
  const [bottomChapterListOpen, setBottomChapterListOpen] = useState(false);
  const [bottomPageListOpen, setBottomPageListOpen] = useState(false);
  const bottomChaptersRef = useRef<HTMLDivElement | null>(null);
  const bottomPagesRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (bottomChapterListOpen || bottomPageListOpen) setFloatingHidden(false);
  }, [bottomChapterListOpen, bottomPageListOpen]);

  useEffect(() => {
    if (!bottomChapterListOpen && !bottomPageListOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (bottomChaptersRef.current && !bottomChaptersRef.current.contains(target)) {
        setBottomChapterListOpen(false);
      }
      if (bottomPagesRef.current && !bottomPagesRef.current.contains(target)) {
        setBottomPageListOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [bottomChapterListOpen, bottomPageListOpen]);

  const [dataSaver, setDataSaver] = useState(false);
  const [imageQuality, setImageQuality] = useState(600);
  const [readerProgress, setReaderProgress] = useState(0);
  const activeKind = data?.kind || kind;

  useEffect(() => {
    if (!data || data.kind !== "manga" || mode !== "single" || !data.images.length) return;
    const progress = Math.round((Math.min(page, data.images.length) / data.images.length) * 100);
    setReaderProgress(progress);
    const historyUrl = `/manga/${encodeURIComponent(slug)}/${encodeURIComponent(data.chapter)}`;
    void updateReadingHistoryProgress(historyUrl, progress)
      .then(() => window.dispatchEvent(new Event("mikoroku:reading-history-updated")))
      .catch((historyError: unknown) => console.error("Reading progress could not be saved.", historyError));
  }, [data, mode, page, slug]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (activeKind === "manga") {
      setMode(localStorage.getItem("readerMode") === "page" ? "single" : "long-strip");
      return;
    }
    const storedFontSize = Number(localStorage.getItem("novelFontSize"));
    if (storedFontSize >= 14 && storedFontSize <= 28) setFontSize(storedFontSize);
    setFontFamily(localStorage.getItem("novelFontFamily") || "Georgia, serif");
    const storedColumn = localStorage.getItem("novelColumn");
    if (storedColumn === "narrow" || storedColumn === "medium" || storedColumn === "wide") {
      setColumnWidth(storedColumn);
    }
    const storedSpeed = Number(localStorage.getItem("novelAutoScrollSpeed"));
    if (storedSpeed >= 10 && storedSpeed <= 100) setAutoScrollSpeed(storedSpeed);
  }, [activeKind]);

  useEffect(() => {
    const controller = new AbortController();
    let targetChapter = chapter || "";
    if (preferStoredChapter || !targetChapter) {
      const cached = getCurrentChapterCache(slug);
      if (cached?.num) targetChapter = String(cached.num);
    }
    const cachedData = getCachedReaderData(slug, targetChapter, kind, forcedServer);
    setData(cachedData);
    setError("");
    loadReaderData(slug, targetChapter, kind, controller.signal, forcedServer)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.kind !== kind) {
          const route = result.kind === "novel" ? "/novel" : "/manga";
          window.location.replace(`${route}/${encodeURIComponent(slug)}/${encodeURIComponent(result.chapter)}`);
          return;
        }
        const readerRoute = result.kind === "novel" ? "/novel" : "/manga";
        const canonicalPath = `${readerRoute}/${encodeURIComponent(slug)}/${encodeURIComponent(result.chapter)}`;
        if (window.location.pathname !== canonicalPath) {
          window.location.replace(canonicalPath);
          return;
        }
        setData(result);
        setPage(1);
        localStorage.setItem("currentChapter", JSON.stringify({
          ...getCurrentChapterCache(slug),
          slug,
          id: result.id,
          num: result.chapter,
          title: result.title,
          cover: result.cover,
          label: result.chapterTitle,
          images: result.images,
          source: result.source || "firestore",
        }));
        const historyItem = {
          series: result.title,
          title: result.title,
          chapter: result.chapterTitle,
          cover: result.cover,
          slug,
          url: `${readerRoute}/${encodeURIComponent(slug)}/${encodeURIComponent(result.chapter)}`,
          time: Date.now(),
          progress: 0,
        };
        void upsertReadingHistoryEntry(historyItem).then(() => {
          window.dispatchEvent(new Event("mikoroku:reading-history-updated"));
        }).catch((historyError: unknown) => {
          console.error("Reading history could not be saved.", historyError);
        });
        localStorage.setItem(`read_${result.title}`, JSON.stringify([
          ...new Set([
            ...(() => {
              try {
                const saved = JSON.parse(localStorage.getItem(`read_${result.title}`) || "[]") as string[];
                return Array.isArray(saved) ? saved : [];
              } catch { return []; }
            })(),
            result.chapter,
          ]),
        ]));
        window.dispatchEvent(new Event("mikoroku:chapter-read"));
        document.title = `${result.chapterTitle} - ${result.title} | Mikoroku`;
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted || isAbortError(loadError)) return;
        console.error("Reader failed to load the chapter.", loadError);
        if (!cachedData) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load chapter.");
        }
      });
    return () => {
      if (!controller.signal.aborted) {
        controller.abort(new DOMException("Chapter request was superseded.", "AbortError"));
      }
    };
  }, [chapter, forcedServer, kind, preferStoredChapter, slug]);

  const chapterIndex = useMemo(
    () => data?.chapters.indexOf(data.chapter) ?? -1,
    [data],
  );

  const changeChapter = useCallback((target: string) => {
    const path = activeKind === "novel" ? "/novel" : "/manga";
    window.location.replace(`${path}/${encodeURIComponent(slug)}/${encodeURIComponent(target)}`);
  }, [activeKind, slug]);

  const tryServer = useCallback((server: "sv1" | "sv2" | "es") => {
    try {
      localStorage.setItem("chapterSourceMode", server);
    } catch (persistError) {
      console.warn("Could not persist chapter source preference.", persistError);
    }
    setActiveServer(server);
    setError("");
    setData(null);
    setForcedServer(null);
    window.setTimeout(() => setForcedServer(server), 0);
  }, []);

  function toggleMode() {
    const nextMode = mode === "long-strip" ? "single" : "long-strip";
    setMode(nextMode);
    localStorage.setItem("readerMode", nextMode === "single" ? "page" : "webtoon");
    setPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!data || kind !== "manga") return;
    const start = Math.max(0, page - 1);
    const preloadCount = mode === "single" ? 5 : 8;
    data.images.slice(start, start + preloadCount).forEach((src) => {
      const image = new Image();
      image.decoding = "async";
      image.src = readerImageUrl(src, dataSaver, imageQuality);
    });
  }, [data, dataSaver, imageQuality, kind, mode, page]);

  useEffect(() => {
    if (!data || kind !== "manga" || mode !== "long-strip") return;
    const images = [...document.querySelectorAll<HTMLImageElement>(".reader-images.long-strip img")];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
      if (!visible) return;
      const index = images.indexOf(visible.target as HTMLImageElement);
      if (index >= 0) setPage(index + 1);
    }, { rootMargin: "-40% 0px -40% 0px" });
    images.forEach((image) => observer.observe(image));
    return () => observer.disconnect();
  }, [data, kind, mode]);

  useEffect(() => {
    if (!data || kind !== "manga" || mode !== "single") return;
    const imageCount = data.images.length;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft" && page > 1) {
        event.preventDefault();
        setPage((current) => Math.max(1, current - 1));
      } else if (event.key === "ArrowRight" && page < imageCount) {
        event.preventDefault();
        setPage((current) => Math.min(imageCount, current + 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [data, kind, mode, page]);

  useEffect(() => {
    setDataSaver(localStorage.getItem("dataSaver") === "true");
    const savedQuality = Number(localStorage.getItem("imageQuality"));
    if ([600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000].includes(savedQuality)) {
      setImageQuality(savedQuality);
    }
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setChapterListOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  useEffect(() => {
    if (!data) return;
    const scrollKey = `scrollPos_${slug}_${data.chapter}`;
    const savedPosition = Number(localStorage.getItem(scrollKey));
    if (savedPosition > 0 && mode === "long-strip") {
      window.setTimeout(() => window.scrollTo({ top: savedPosition }), 120);
    }
    let saveTimer = 0;
    lastScrollYRef.current = window.scrollY;
    const calculateContentProgress = () => {
      if (data.kind === "manga" && mode === "single") {
        return data.images.length
          ? Math.round((Math.min(pageRef.current, data.images.length) / data.images.length) * 100)
          : 0;
      }

      const readerRoot = document.querySelector<HTMLElement>(".reader-page");
      const isReaderFullscreen = document.fullscreenElement === readerRoot;
      const readerViewport = isReaderFullscreen && readerRoot
        ? readerRoot.getBoundingClientRect()
        : null;
      const viewportTop = readerViewport?.top ?? 0;
      const viewportBottom = readerViewport?.bottom ?? window.innerHeight;
      const viewportHeight = viewportBottom - viewportTop;
      const chapterImages = data.kind === "manga"
        ? document.querySelectorAll<HTMLElement>(".reader-images.long-strip img")
        : [];
      const contentEnd = data.kind === "manga"
        ? chapterImages[chapterImages.length - 1]
        : document.querySelector<HTMLElement>(".reader-novel-text");
      const firstImage = data.kind === "manga" ? chapterImages[0] : null;
      if (!contentEnd) return 0;

      const contentStartY = firstImage?.getBoundingClientRect().top
        ?? document.querySelector<HTMLElement>(".reader-novel-text")?.getBoundingClientRect().top
        ?? contentEnd.getBoundingClientRect().top;
      const contentEndY = contentEnd.getBoundingClientRect().bottom;
      const contentHeight = contentEndY - contentStartY;
      if (contentHeight <= 0) return 0;
      const effectiveHeight = Math.max(1, contentHeight - viewportHeight);
      const effectiveProgress = viewportTop - contentStartY;
      return Math.round(Math.min(100, Math.max(0, (effectiveProgress / effectiveHeight) * 100)));
    };

    const updateProgress = () => {
      const y = window.scrollY;
      const progress = calculateContentProgress();
      setReaderProgress(progress);
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        localStorage.setItem(scrollKey, String(y));
        const historyUrl = `${data.kind === "novel" ? "/novel" : "/manga"}/${encodeURIComponent(slug)}/${encodeURIComponent(data.chapter)}`;
        void updateReadingHistoryProgress(historyUrl, progress).then(() => {
          window.dispatchEvent(new Event("mikoroku:reading-history-updated"));
        }).catch((historyError: unknown) => {
          console.error("Reading progress could not be saved.", historyError);
        });
      }, 250);

      const delta = y - lastScrollYRef.current;
      if (y < 48) {
        setFloatingHidden(false);
      } else if (delta > 8) {
        setFloatingHidden(true);
      } else if (delta < -8) {
        setFloatingHidden(false);
      }
      if (mode === "long-strip" && data.kind === "manga") {
        const images = [...document.querySelectorAll<HTMLImageElement>(".reader-images.long-strip img")];
        const readingLine = window.innerHeight * 0.55;
        const visibleIndex = images.findIndex((image) => image.getBoundingClientRect().bottom >= readingLine);
        const currentPage = visibleIndex >= 0 ? visibleIndex + 1 : images.length;
        if (currentPage > 0) setPage((previous) => previous === currentPage ? previous : currentPage);
      }
      lastScrollYRef.current = y;
    };

    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.classList?.contains("reader-page")) {
        const y = target.scrollTop;
        const delta = y - lastScrollYRef.current;
        if (y < 48) setFloatingHidden(false);
        else if (delta > 8) setFloatingHidden(true);
        else if (delta < -8) setFloatingHidden(false);
        if (mode === "long-strip" && data.kind === "manga") {
          const images = [...target.querySelectorAll<HTMLImageElement>(".reader-images.long-strip img")];
          const readingLine = window.innerHeight * 0.55;
          const visibleIndex = images.findIndex((image) => image.getBoundingClientRect().bottom >= readingLine);
          const currentPage = visibleIndex >= 0 ? visibleIndex + 1 : images.length;
          if (currentPage > 0) setPage((previous) => previous === currentPage ? previous : currentPage);
        }
        lastScrollYRef.current = y;
      }
      updateProgress();
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    const contentResizeObserver = new ResizeObserver(updateProgress);
    const contentElement = data.kind === "manga"
      ? mode === "long-strip"
        ? document.querySelector<HTMLElement>(".reader-images.long-strip")
        : null
      : document.querySelector<HTMLElement>(".reader-novel-text");
    if (contentElement) contentResizeObserver.observe(contentElement);
    updateProgress();
    return () => {
      window.clearTimeout(saveTimer);
      contentResizeObserver.disconnect();
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
    };
  }, [data, mode, slug]);

  useEffect(() => {
    if (!autoScrolling || kind !== "novel") return;
    const timer = window.setInterval(() => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setAutoScrolling(false);
        return;
      }
      window.scrollBy(0, 1);
    }, 101 - autoScrollSpeed);
    return () => window.clearInterval(timer);
  }, [autoScrollSpeed, autoScrolling, kind]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  function updateFontSize(value: number) {
    setFontSize(value);
    localStorage.setItem("novelFontSize", String(value));
  }

  function updateFontFamily(value: string) {
    setFontFamily(value);
    localStorage.setItem("novelFontFamily", value);
  }

  function updateColumnWidth(value: "narrow" | "medium" | "wide") {
    setColumnWidth(value);
    localStorage.setItem("novelColumn", value);
  }

  function updateAutoScrollSpeed(value: number) {
    setAutoScrollSpeed(value);
    localStorage.setItem("novelAutoScrollSpeed", String(value));
  }

  function toggleSpeech() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!data || !("speechSynthesis" in window)) {
      setReaderNotice("Text-to-speech is not available in this browser.");
      return;
    }
    setReaderNotice("");
    const utterance = new SpeechSynthesisUtterance(data.text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  async function sendReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !reportType) {
      setReportMessage("Please select a report type.");
      return;
    }
    if (!window.fs?.collection || !window.fs.addDoc || !window.fs.serverTimestamp || !window.firestore) {
      setReportMessage("The report service is unavailable. Reload the page and try again.");
      return;
    }
    setSendingReport(true);
    setReportMessage("");
    try {
      await window.fs.addDoc(window.fs.collection(window.firestore, "chapterReports"), {
        chapter: data.chapter,
        slug,
        url: window.location.href,
        type: reportType,
        reason: reportReason.trim() || "-",
        status: "pending",
        createdAt: window.fs.serverTimestamp(),
      });
      setReportMessage("Report submitted successfully.");
      setReportType("");
      setReportReason("");
      window.setTimeout(() => setReportOpen(false), 900);
    } catch (reportError) {
      console.error("Failed to submit chapter report.", reportError);
      setReportMessage(reportError instanceof Error ? reportError.message : "Failed to submit report.");
    } finally {
      setSendingReport(false);
    }
  }

  async function downloadChapter() {
    if (!data || !data.images.length || downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus(`Downloading 0/${data.images.length} images...`);
    const archive = new JSZip();
    const results = new Array<Blob | null>(data.images.length).fill(null);
    let completed = 0;
    let succeeded = 0;
    let failed = 0;
    let imageCache: Cache | null = null;

    if ("caches" in window) {
      try {
        imageCache = await window.caches.open(READER_IMAGE_CACHE_NAME);
        await pruneReaderImageCache(imageCache);
      } catch (cacheError) {
        console.warn("Reader image cache is unavailable; downloading from the network.", cacheError);
        imageCache = null;
      }
    }

    try {
      let nextIndex = 0;
      const downloadWorker = async () => {
        while (nextIndex < data.images.length) {
          const index = nextIndex++;
          const imageUrl = data.images[index];
          const readerUrl = readerImageUrl(imageUrl, dataSaver, imageQuality);
          const candidates = [
            readerUrl,
            imageUrl,
            imageProxyUrl(imageUrl, "readerFallback"),
          ];
          let imageBlob: Blob | undefined;

          for (const candidate of [...new Set(candidates)]) {
            if (imageCache) {
              try {
                const cachedResponse = await imageCache.match(candidate);
                if (cachedResponse) {
                  const cachedBlob = await cachedResponse.blob();
                  if (cachedBlob.size >= 100) {
                    imageBlob = cachedBlob;
                    break;
                  }
                  await imageCache.delete(candidate);
                }
              } catch (cacheError) {
                console.warn(`Could not read cached page ${index + 1}; trying the network.`, cacheError);
              }
            }

            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 40000);
            try {
              const response = await fetch(candidate, {
                mode: "cors",
                credentials: "omit",
                cache: "force-cache",
                signal: controller.signal,
                referrerPolicy: "no-referrer",
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const blob = await response.blob();
              if (blob.size < 100) throw new Error("Image is empty or invalid.");
              imageBlob = blob;
              if (imageCache && blob.size <= READER_IMAGE_CACHE_MAX_IMAGE_BYTES) {
                try {
                  const headers = new Headers({
                    "content-type": blob.type || "application/octet-stream",
                    "x-mikoroku-cached-at": String(Date.now()),
                    "x-mikoroku-cache-size": String(blob.size),
                  });
                  void imageCache.put(candidate, new Response(blob, { headers })).catch((cacheError: unknown) => {
                    console.warn(`Could not cache downloaded page ${index + 1}.`, cacheError);
                  });
                } catch (cacheError) {
                  console.warn(`Could not cache downloaded page ${index + 1}.`, cacheError);
                }
              }
              break;
            } catch (downloadError) {
              if (candidate === candidates[candidates.length - 1]) {
                console.warn(`Failed to download page ${index + 1}.`, downloadError);
              }
            } finally {
              window.clearTimeout(timeout);
            }
          }

          if (imageBlob) {
            results[index] = imageBlob;
            succeeded += 1;
          } else {
            failed += 1;
          }
          completed += 1;
          setDownloadStatus(`Downloading ${completed}/${data.images.length} images · ${succeeded} succeeded`);
          setDownloadProgress(Math.round((completed / data.images.length) * 100));
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, data.images.length) }, () => downloadWorker()));

      if (!succeeded) throw new Error("No images could be downloaded. Check your connection and try again.");
      results.forEach((imageBlob, index) => {
        if (!imageBlob) return;
        const imageUrl = data.images[index];
        let extension = imageBlob.type.split("/")[1]?.replace("jpeg", "jpg") || "";
        if (!/^[a-z0-9]{2,5}$/i.test(extension)) {
          extension = new URL(imageUrl).pathname.split(".").pop()?.match(/^[a-z0-9]{2,5}$/i)?.[0] || "jpg";
        }
        archive.file(`${String(index + 1).padStart(3, "0")}.${extension}`, imageBlob);
      });
      const zipBlob = await archive.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      const safeName = `${data.title} - ${data.chapterTitle}`.replace(/[\\/:*?"<>|]/g, "").trim();
      anchor.href = objectUrl;
      anchor.download = `${safeName || "Chapter"}.zip`;
      anchor.click();
      setDownloadProgress(100);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 20000);
      setDownloadStatus(failed ? `ZIP ready · ${succeeded} succeeded, ${failed} failed` : `ZIP ready · ${succeeded} images`);
    } catch (downloadError) {
      console.error("Chapter download failed.", downloadError);
      setDownloadStatus(downloadError instanceof Error ? downloadError.message : "Chapter download failed.");
    } finally {
      setDownloading(false);
    }
  }

  function goToPage(targetPage: number) {
    if (!data || targetPage < 1 || targetPage > data.images.length) return;
    setPage(targetPage);
    if (mode === "long-strip") {
      document.querySelectorAll(".reader-images.long-strip img")[targetPage - 1]
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function toggleDataSaver() {
    setDataSaver((current) => {
      localStorage.setItem("dataSaver", String(!current));
      return !current;
    });
  }

  function updateImageQuality(value: number) {
    setImageQuality(value);
    localStorage.setItem("imageQuality", String(value));
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector(".reader-page")?.requestFullscreen();
    } catch (fullscreenError) {
      console.error("Failed to enter fullscreen mode.", fullscreenError);
      setReaderNotice("Fullscreen is not supported in this browser.");
    }
  }

  return (
    <>
      <SiteChrome showChrome showFooter={false} />
      <main className={`reader-page [--mikoroku-accent:var(--mikoroku-reader-accent)] [--mikoroku-accent-soft:var(--mikoroku-reader-accent-soft)] [--mikoroku-accent-border:var(--mikoroku-reader-accent-border)] min-h-[calc(100vh-50px)] bg-[#f1f2f4] pb-10 text-[#22242a] dark:bg-[#111216] dark:text-[#f3f3f5] ${activeKind === "novel" ? "novel-reader" : "manga-reader"}`} style={isFullscreen ? {
        boxSizing: "border-box",
        height: "100vh",
        maxHeight: "100vh",
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "48px",
      } : undefined}>
      <header className="reader-toolbar relative z-[2] border-b border-black/10 bg-white text-left shadow-sm dark:border-white/10 dark:bg-[#191a20]">
        <div className="reader-heading-row mx-auto grid min-h-[62px] w-full max-w-[1000px] grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-2 sm:px-4">
          <a className="reader-home-link inline-flex size-[42px] items-center justify-center justify-self-start rounded-[11px] border border-black/10 bg-[#f4f5f7] text-[var(--mikoroku-accent)] transition hover:-translate-y-px hover:bg-[var(--mikoroku-accent-soft)] dark:border-white/10 dark:bg-[#22242c]" href={`/series/${encodeURIComponent(slug)}`} aria-label="Back to series details" title="Back to series details">
            <svg className="size-[22px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
            </svg>
          </a>
          <div className="reader-title-block grid min-w-0 justify-items-center text-center leading-[1.35]">
            <span className="reader-kind-label text-[10px] font-bold uppercase tracking-[.12em] text-[var(--mikoroku-accent)]">{activeKind === "novel" ? "Novel Reader" : "Manga Reader"}</span>
            <strong className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-bold sm:text-base">{data?.title || ""}</strong>
            <span className="text-xs text-[#777983] dark:text-[#a5a5ad]">{data ? data.chapterTitle : `Chapter ${chapter || ""}`}</span>
          </div>
          <span className="reader-header-actions">
            <button className="reader-icon-button reader-fullscreen-button inline-grid size-[38px] place-items-center justify-self-end rounded-[11px] border border-black/10 bg-[#f4f5f7] text-inherit dark:border-white/10 dark:bg-[#22242c]" type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              <i className={`fas ${isFullscreen ? "fa-compress" : "fa-expand"}`} aria-hidden="true" />
            </button>
          </span>
        </div>
      </header>
      <div className="reader-progress-track pointer-events-none fixed left-0 top-0 z-[10000] h-[3px] w-full" aria-hidden="true"><span className="block h-full bg-[var(--mikoroku-accent)] transition-[width] duration-200" style={{ width: `${readerProgress}%` }} /></div>
      {downloadStatus && !downloading && <div className="reader-download-status sticky top-[3px] z-[6] mx-auto mt-2 flex w-[calc(100%-28px)] max-w-[780px] items-center gap-2 rounded-[11px] border border-black/10 bg-white p-[10px_13px] text-xs dark:border-white/10 dark:bg-[#191a20]" role="status">
        <i className={`text-[var(--mikoroku-accent)] fas ${downloadStatus.startsWith("ZIP ready") ? "fa-circle-check" : "fa-circle-exclamation"}`} aria-hidden="true" /><span>{downloadStatus}</span>
      </div>}
      {readerNotice && <p className="reader-feedback mx-auto my-3 w-[calc(100%-32px)] max-w-[800px] text-center text-[#9a6700] dark:text-[#f3c96b]" role="status">{readerNotice}</p>}

      <BannerAdSlot placement="reader-before-content" />
      {error ? <section className="reader-message mx-auto my-12 w-[min(calc(100%-32px),700px)] rounded-2xl border border-black/10 bg-white p-6 text-center shadow-lg dark:border-white/10 dark:bg-[#191a20]" role="alert">
          <h1 className="text-lg font-bold">Unable to load chapter</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
          {kind === "manga" && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Try another server</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  aria-pressed={activeServer === "sv1"}
                  className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
                    activeServer === "sv1"
                      ? "border-[var(--mikoroku-source-one,#3b82f6)] bg-[var(--mikoroku-source-one,#3b82f6)] text-white shadow-[0_0_0_2px_color-mix(in_srgb,var(--mikoroku-source-one,#3b82f6)_35%,transparent)]"
                      : "border-[color-mix(in_srgb,var(--mikoroku-source-one,#3b82f6)_45%,transparent)] bg-[color-mix(in_srgb,var(--mikoroku-source-one,#3b82f6)_12%,transparent)] text-[var(--mikoroku-source-one,#3b82f6)] hover:bg-[color-mix(in_srgb,var(--mikoroku-source-one,#3b82f6)_22%,transparent)]"
                  }`}
                  onClick={() => tryServer("sv1")}
                  title="Server 1 — Mikodrive"
                >
                  SV1
                </button>
                <button
                  type="button"
                  aria-pressed={activeServer === "sv2"}
                  className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
                    activeServer === "sv2"
                      ? "border-[var(--mikoroku-source-two,#f59e0b)] bg-[var(--mikoroku-source-two,#f59e0b)] text-white shadow-[0_0_0_2px_color-mix(in_srgb,var(--mikoroku-source-two,#f59e0b)_35%,transparent)]"
                      : "border-[color-mix(in_srgb,var(--mikoroku-source-two,#f59e0b)_45%,transparent)] bg-[color-mix(in_srgb,var(--mikoroku-source-two,#f59e0b)_12%,transparent)] text-[var(--mikoroku-source-two,#f59e0b)] hover:bg-[color-mix(in_srgb,var(--mikoroku-source-two,#f59e0b)_22%,transparent)]"
                  }`}
                  onClick={() => tryServer("sv2")}
                  title="Server 2 — Yomidays"
                >
                  SV2
                </button>
                <button
                  type="button"
                  aria-pressed={activeServer === "es"}
                  className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
                    activeServer === "es"
                      ? "border-[var(--mikoroku-source-emergency,#ef4444)] bg-[var(--mikoroku-source-emergency,#ef4444)] text-white shadow-[0_0_0_2px_color-mix(in_srgb,var(--mikoroku-source-emergency,#ef4444)_35%,transparent)]"
                      : "border-[color-mix(in_srgb,var(--mikoroku-source-emergency,#ef4444)_45%,transparent)] bg-[color-mix(in_srgb,var(--mikoroku-source-emergency,#ef4444)_12%,transparent)] text-[var(--mikoroku-source-emergency,#ef4444)] hover:bg-[color-mix(in_srgb,var(--mikoroku-source-emergency,#ef4444)_22%,transparent)]"
                  }`}
                  onClick={() => tryServer("es")}
                  title="Emergency Server — Firestore"
                >
                  ES
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                {activeServer === "sv1" && "Currently using SV1"}
                {activeServer === "sv2" && "Currently using SV2"}
                {activeServer === "es" && "Currently using Emergency Server"}
                {!activeServer && "SV1 = Server 1 · SV2 = Server 2 · ES = Emergency Server"}
              </p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button className="rounded-lg border border-black/20 bg-black/10 px-3 py-2 text-sm dark:border-white/20 dark:bg-white/10" type="button" onClick={() => window.location.reload()}>Try again</button>
            <a className="rounded-lg border border-black/20 px-3 py-2 text-sm no-underline dark:border-white/20" href={`/series/${encodeURIComponent(slug)}`}>Back to series</a>
          </div>
        </section>
        : !data ? (
          <section
            className="reader-loading mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-[1000px] flex-col items-center justify-center gap-3 px-4 text-center"
            role="status"
            aria-label={`Loading chapter ${chapter || ""}`}
          >
            <span
              className="size-10 animate-spin rounded-full border-[3px] border-[var(--mikoroku-accent)]/25 border-t-[var(--mikoroku-accent)]"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading series...</span>
          </section>
        )
        : activeKind === "manga" ? (
          <section className={`reader-images ${mode} mx-auto min-h-[40vh] w-full max-w-[1000px] bg-white py-3.5 pb-6 shadow-[0_0_0_1px_rgba(128,128,140,.08)] dark:bg-[#0a0a0c] ${mode === "single" ? "grid min-h-[calc(100vh-190px)] content-center p-[18px]" : ""}`}>
            {mode === "long-strip" ? data.images.map((image, index) => {
              const src = readerImageUrl(image, dataSaver, imageQuality);
              return (
                <ReaderImage
                  className="block h-auto w-full"
                  wrapperClassName="w-full"
                  key={`${src}:${index}`}
                  src={src}
                  alt={`Page ${index + 1}`}
                  loading={index < 6 ? "eager" : "lazy"}
                  fetchPriority={index < 3 ? "high" : "auto"}
                />
              );
            }) : (
              <>
                <div className="reader-single-page-frame relative grid w-full justify-items-center">
                  <ReaderImage
                    className="w-auto max-w-full object-contain [max-height:calc(100vh-250px)]"
                    wrapperClassName="grid w-full justify-items-center"
                    key={readerImageUrl(data.images[page - 1], dataSaver, imageQuality)}
                    src={readerImageUrl(data.images[page - 1], dataSaver, imageQuality)}
                    alt={`Page ${page}`}
                    loading="eager"
                    fetchPriority="high"
                  />
                  <button className="reader-image-nav reader-image-nav-previous absolute left-2 top-1/2 grid h-14 w-11 -translate-y-1/2 place-items-center rounded-[14px] border border-black/10 bg-white/90 text-lg text-[var(--mikoroku-accent)] shadow-lg backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35 sm:left-5 dark:border-white/10 dark:bg-[#191a20]/90" type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)} aria-label="Previous page" title="Previous page">
                    <i className="fas fa-chevron-left" aria-hidden="true" />
                  </button>
                  <button className="reader-image-nav reader-image-nav-next absolute right-2 top-1/2 grid h-14 w-11 -translate-y-1/2 place-items-center rounded-[14px] border border-black/10 bg-white/90 text-lg text-[var(--mikoroku-accent)] shadow-lg backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35 sm:right-5 dark:border-white/10 dark:bg-[#191a20]/90" type="button" disabled={page >= data.images.length} onClick={() => goToPage(page + 1)} aria-label="Next page" title="Next page">
                    <i className="fas fa-chevron-right" aria-hidden="true" />
                  </button>
                </div>
                <div className="reader-page-navigation py-3 text-center"><span>Page {page} / {data.images.length}</span></div>
              </>
            )}
          </section>
        ) : (
          <article className={`reader-novel-text mx-auto my-6 min-h-[70vh] w-[calc(100%-24px)] rounded-2xl border border-black/10 bg-white p-6 shadow-lg sm:w-[min(calc(100%-32px),1040px)] sm:p-12 dark:border-white/10 dark:bg-[#191a20] ${columnWidth === "narrow" ? "max-w-[620px]" : columnWidth === "medium" ? "max-w-[800px]" : "max-w-[1040px]"}`} style={{ fontSize: `${fontSize}px`, fontFamily, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
            {data.text.split(/\n{2,}/).map((paragraph, index) => <p className="mb-[1.2em] last:mb-0" key={index}>{paragraph}</p>)}
            {data.images.map((image, index) => {
              const src = image;
              return (
                <ReaderImage
                  className="mx-auto block h-auto max-w-full"
                  wrapperClassName="mx-auto my-4 w-full"
                  key={`${src}:${index}`}
                  src={src}
                  alt={`Illustration ${index + 1}`}
                  loading={index < 3 ? "eager" : "lazy"}
                  fetchPriority={index < 3 ? "high" : "auto"}
                />
              );
            })}
          </article>
        )}

      {data && <nav className={`reader-bottom-nav fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[15] grid w-[calc(100%-8px)] -translate-x-1/2 grid-cols-[64px_minmax(0,1fr)_64px] items-stretch overflow-visible rounded-[10px] border border-black/10 bg-white shadow-lg transition-[opacity,transform,visibility] duration-200 min-[761px]:bottom-[calc(12px+env(safe-area-inset-bottom))] min-[761px]:w-[min(calc(100%-28px),1000px)] min-[761px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] min-[761px]:rounded-[14px] dark:border-white/10 dark:bg-[#191a20]${floatingHidden ? " invisible translate-y-3 opacity-0 pointer-events-none" : ""}`} aria-label="Chapter navigation">
        {downloading && <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 overflow-hidden rounded-t-[10px] bg-black/10 min-[761px]:rounded-t-[14px] dark:bg-white/10" aria-hidden="true">
          <span className="block h-full bg-[var(--mikoroku-accent)] transition-[width] duration-200" style={{ width: `${downloadProgress}%` }} />
        </span>}
        <button className="reader-bottom-button reader-bottom-previous flex min-h-10 w-[64px] min-w-0 items-center justify-center gap-1 border-r border-black/10 bg-transparent px-0 text-center text-[var(--mikoroku-accent)] disabled:cursor-not-allowed disabled:opacity-40 min-[761px]:min-h-12 min-[761px]:w-full min-[761px]:gap-2 min-[761px]:px-2 min-[761px]:text-sm dark:border-white/10" type="button" onClick={() => chapterIndex > 0 && changeChapter(data.chapters[chapterIndex - 1])} disabled={chapterIndex <= 0} aria-label="Previous chapter" title="Previous chapter">
          <i className="fas fa-chevron-left" aria-hidden="true" /><span className="reader-bottom-label"><strong>Prev</strong></span>
        </button>
        <div className={`reader-bottom-middle grid min-w-0 w-full items-stretch ${data.kind === "manga" && data.images.length > 0 ? "grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] min-[761px]:grid-cols-3" : "grid-cols-1"}`}>
          <div className="reader-bottom-chapters relative z-[2] flex min-w-0 w-full border-r border-black/10 dark:border-white/10" ref={bottomChaptersRef}>
            <button className={`reader-bottom-button reader-bottom-list flex min-h-10 w-full min-w-0 items-center justify-center gap-1 bg-transparent px-1 text-center text-xs font-bold text-[var(--mikoroku-accent)] hover:bg-black/5 sm:min-h-12 sm:gap-2 sm:px-2 dark:hover:bg-white/5 ${bottomChapterListOpen ? "is-active" : ""}`} type="button" onClick={() => setBottomChapterListOpen((open) => !open)} aria-expanded={bottomChapterListOpen}>
              <span className="reader-bottom-label min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"><strong aria-label={`Chapter ${data.chapter}`}>Ch. {data.chapter}</strong></span><i className={`fas ${bottomChapterListOpen ? "fa-chevron-up" : "fa-chevron-down"} reader-bottom-chevron hidden sm:inline`} aria-hidden="true" />
            </button>
            {bottomChapterListOpen && <div className="reader-bottom-chapter-menu fixed bottom-[calc(100%+10px)] left-1/2 z-30 max-h-[min(58vh,440px)] w-[min(320px,calc(100vw-24px))] -translate-x-1/2 overflow-auto rounded-[15px] border border-black/10 bg-white p-2 shadow-xl min-[761px]:absolute min-[761px]:w-[min(320px,calc(100vw-32px))] dark:border-white/10 dark:bg-[#191a20]" role="listbox" aria-label="Chapter list">
              <div className="reader-bottom-menu-heading sticky top-[-8px] -mx-2 -mt-2 mb-1.5 flex min-h-[42px] items-center justify-between border-b border-black/10 bg-white px-3 py-2 text-xs dark:border-white/10 dark:bg-[#191a20]"><strong>{data.chapters.length} chapters</strong><button className="size-7 rounded-lg bg-black/5 text-lg dark:bg-white/10" type="button" onClick={() => setBottomChapterListOpen(false)} aria-label="Close chapter list">×</button></div>
              {[...data.chapters].reverse().map((item) => (
                <button type="button" role="option" aria-selected={item === data.chapter} key={item} className={`flex min-h-[38px] w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-black/5 dark:hover:bg-white/5 ${item === data.chapter ? "bg-[var(--mikoroku-accent-soft)] font-bold text-[var(--mikoroku-accent)]" : ""}`} onClick={() => changeChapter(item)}>
                  <span>Ch. {item}</span>{item === data.chapter && <i className="fas fa-check" aria-hidden="true" />}
                </button>
              ))}
            </div>}
          </div>
          {data.kind === "manga" && data.images.length > 0 && <button
            className="flex min-h-10 min-w-0 flex-col items-center justify-center gap-0.5 border-r border-black/10 bg-transparent text-[var(--mikoroku-accent)] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 min-[761px]:min-h-12 dark:border-white/10 dark:hover:bg-white/5"
            type="button"
            onClick={() => void downloadChapter()}
            disabled={downloading || !data.images.length}
            aria-label={downloading ? `Downloading chapter, ${downloadProgress}%` : "Download chapter"}
            title={downloading ? `Downloading ${downloadProgress}%` : "Download chapter"}
          >
            {downloading ? <>
              <svg className="size-7" viewBox="0 0 32 32" role="img" aria-hidden="true">
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="81.68" strokeDashoffset={81.68 * (1 - downloadProgress / 100)} transform="rotate(-90 16 16)" />
                <text x="16" y="19" fill="currentColor" fontSize="8" fontWeight="700" textAnchor="middle">{downloadProgress}</text>
              </svg>
            </> : <i className="fas fa-download text-sm" aria-hidden="true" />}
          </button>}
          {data.kind === "manga" && data.images.length > 0 && (
            <div className="reader-bottom-pages relative z-[2] flex min-w-0 w-full border-r border-black/10 dark:border-white/10" ref={bottomPagesRef}>
              <button
                className={`reader-bottom-button reader-bottom-page-count flex min-h-10 w-full min-w-0 items-center justify-center gap-1 bg-transparent px-1 text-center text-xs font-bold tabular-nums text-[var(--mikoroku-accent)] hover:bg-black/5 sm:min-h-12 sm:gap-2 sm:px-2 dark:hover:bg-white/5 ${bottomPageListOpen ? "is-active" : ""}`}
                type="button"
                aria-label={`Jump to page ${page} of ${data.images.length}`}
                aria-haspopup="listbox"
                aria-expanded={bottomPageListOpen}
                onClick={() => setBottomPageListOpen((open) => !open)}
              >
                <span className="reader-bottom-label"><strong>Pg. {page}/{data.images.length}</strong></span>
                <i className={`fas ${bottomPageListOpen ? "fa-chevron-up" : "fa-chevron-down"} reader-bottom-chevron`} aria-hidden="true" />
              </button>
              {bottomPageListOpen && <div className="reader-bottom-page-menu fixed bottom-[calc(100%+8px)] left-1/2 z-30 max-h-[min(58vh,420px)] w-[min(280px,calc(100vw-24px))] -translate-x-1/2 overflow-auto rounded-xl border border-[var(--mikoroku-reader-page-soft)] bg-white p-2 shadow-xl min-[761px]:absolute dark:bg-[#191a20]" role="listbox" aria-label="Jump to page">
                <div className="reader-bottom-menu-heading sticky top-[-8px] -mx-2 -mt-2 mb-1.5 flex min-h-[42px] items-center justify-between border-b border-black/10 bg-white px-3 py-2 text-xs dark:border-white/10 dark:bg-[#191a20]"><strong>Go to page</strong><button className="size-7 rounded-lg bg-black/5 text-lg dark:bg-white/10" type="button" onClick={() => setBottomPageListOpen(false)} aria-label="Close page list">×</button></div>
                <div className="reader-bottom-page-options grid grid-cols-5 gap-1">
                  {data.images.map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected={pageNumber === page}
                        key={pageNumber}
                        className={`min-h-[34px] rounded-md text-xs hover:bg-[var(--mikoroku-reader-page-soft)] ${pageNumber === page ? "bg-[var(--mikoroku-reader-page-soft)] text-[var(--mikoroku-reader-page-accent)]" : ""}`}
                        onClick={() => {
                          goToPage(pageNumber);
                          setBottomPageListOpen(false);
                        }}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>
              </div>}
            </div>
          )}
        </div>
        <button className="reader-bottom-button reader-bottom-next flex min-h-10 w-[64px] min-w-0 items-center justify-center gap-1 border-l border-black/10 bg-transparent px-0 text-center text-[var(--mikoroku-accent)] disabled:cursor-not-allowed disabled:opacity-40 min-[761px]:min-h-12 min-[761px]:w-full min-[761px]:gap-2 min-[761px]:px-2 dark:border-white/10" type="button" onClick={() => chapterIndex < data.chapters.length - 1 && changeChapter(data.chapters[chapterIndex + 1])} disabled={chapterIndex >= data.chapters.length - 1} aria-label="Next chapter" title="Next chapter">
          <span className="reader-bottom-label"><strong>Next</strong></span><i className="fas fa-chevron-right" aria-hidden="true" />
        </button>
      </nav>}
      <div className={`reader-floating-controls fixed bottom-[calc(62px+env(safe-area-inset-bottom))] right-2.5 z-[8] flex flex-col gap-2 transition-[opacity,transform,visibility] duration-200 min-[761px]:bottom-[22px] min-[761px]:right-[18px] max-[420px]:bottom-[calc(58px+env(safe-area-inset-bottom))] ${floatingHidden ? "invisible translate-y-3 opacity-0 pointer-events-none" : ""}`}>
        <button className="grid size-[38px] place-items-center rounded-xl border border-black/10 bg-white text-[var(--mikoroku-accent)] shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--mikoroku-accent-soft)] dark:border-white/10 dark:bg-[#191a20] min-[761px]:size-11 min-[761px]:rounded-[14px]" type="button" onClick={() => {
          const reader = document.querySelector<HTMLElement>(".reader-page");
          if (reader && document.fullscreenElement === reader) reader.scrollTo({ top: 0, behavior: "smooth" });
          else window.scrollTo({ top: 0, behavior: "smooth" });
        }} aria-label="Back to top" title="Back to top"><i className="fas fa-arrow-up" aria-hidden="true" /></button>
        <button className={`grid size-[38px] place-items-center rounded-xl border border-black/10 text-[var(--mikoroku-accent)] shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--mikoroku-accent-soft)] dark:border-white/10 min-[761px]:size-11 min-[761px]:rounded-[14px] ${settingsOpen ? "bg-[var(--mikoroku-accent-soft)]" : "bg-white dark:bg-[#191a20]"}`} type="button" onClick={() => {
          setSettingsOpen((open) => !open);
          setChapterListOpen(false);
        }} aria-label="Reader settings" aria-expanded={settingsOpen} title="Reader settings">
          <i className="fas fa-sliders" aria-hidden="true" />
        </button>
        <button className="grid size-[38px] place-items-center rounded-xl border border-black/10 bg-white text-[var(--mikoroku-accent)] shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--mikoroku-accent-soft)] dark:border-white/10 dark:bg-[#191a20] min-[761px]:size-11 min-[761px]:rounded-[14px]" type="button" onClick={() => setReportOpen(true)} aria-label="Report chapter" title="Report chapter"><i className="fas fa-flag" aria-hidden="true" /></button>
      </div>
      {settingsOpen && <div className="reader-settings-backdrop fixed inset-0 z-40 flex items-end justify-center p-3 min-[761px]:justify-end min-[761px]:p-[18px_76px_18px_18px]" onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setSettingsOpen(false);
          setChapterListOpen(false);
        }
      }}>
      <div className="reader-settings-panel pointer-events-auto max-h-[min(76vh,640px)] w-full max-w-[480px] overflow-auto rounded-[18px] border border-black/10 bg-white p-[18px] text-inherit shadow-2xl min-[761px]:max-h-[min(78vh,680px)] min-[761px]:max-w-[360px] min-[761px]:rounded-[20px] dark:border-white/10 dark:bg-[#191a20]" role="dialog" aria-label="Reader settings" aria-modal="true">
        <div className="reader-settings-heading mb-3.5 flex items-start justify-between">
          <div className="grid gap-[3px]"><span className="text-[10px] font-extrabold tracking-[.12em] text-[var(--mikoroku-accent)]">READER</span><strong className="text-[17px]">Reading settings</strong></div>
          <button className="size-[34px] rounded-[10px] bg-black/5 text-[22px] dark:bg-white/10" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
        </div>
        {activeKind === "manga" ? <>
          <div className="reader-setting-row flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left dark:border-white/10">
            <div className="grid gap-[3px]"><strong className="text-[13px]">Reading mode</strong><small className="text-[11px] text-[#83858f] dark:text-[#a6a8b1]">Choose how pages are displayed</small></div>
            <button type="button" className="min-h-[34px] rounded-lg border border-[var(--mikoroku-accent-border)] bg-[var(--mikoroku-accent-soft)] px-2.5 text-[11px] font-bold text-[var(--mikoroku-accent)]" onClick={toggleMode}>
              {mode === "long-strip" ? "Single page" : "Scroll"}
            </button>
          </div>
          <label className="reader-setting-block flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left dark:border-white/10">
            <span className="grid gap-[3px]"><strong className="text-[13px]">Go to page</strong><small className="text-[11px] text-[#83858f] dark:text-[#a6a8b1]">{data ? `${page} of ${data.images.length}` : "Loading pages"}</small></span>
            <select className="min-h-9 max-w-[150px] rounded-lg border border-black/15 bg-white px-2.5 text-xs dark:border-white/15 dark:bg-[#191a20]" aria-label="Select page" value={page} disabled={!data} onChange={(event) => goToPage(Number(event.target.value))}>
              {data?.images.map((_, index) => <option key={index + 1} value={index + 1}>Page {index + 1}</option>)}
            </select>
          </label>
          <label className="reader-setting-row flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left dark:border-white/10">
            <div className="grid gap-[3px]"><strong className="text-[13px]">Data saver</strong><small className="text-[11px] text-[#83858f] dark:text-[#a6a8b1]">Reduce image quality</small></div>
            <input className="size-[18px] accent-[var(--mikoroku-accent)]" type="checkbox" checked={dataSaver} onChange={toggleDataSaver} />
          </label>
          {dataSaver && <label className="reader-setting-block flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left dark:border-white/10">
            <span className="grid gap-[3px]"><strong className="text-[13px]">Image quality</strong><small className="text-[11px] text-[#83858f] dark:text-[#a6a8b1]">{imageQuality}px</small></span>
            <input className="w-[138px] accent-[var(--mikoroku-accent)]" type="range" min="600" max="2000" step="100" value={imageQuality} onChange={(event) => updateImageQuality(Number(event.target.value))} />
          </label>}
        </> : <>
          <label className="reader-setting-block flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left dark:border-white/10">
            <span className="grid gap-[3px]"><strong className="text-[13px]">Font size</strong><small className="text-[11px] text-[#83858f] dark:text-[#a6a8b1]">{fontSize}px</small></span>
            <input className="w-[138px] accent-[var(--mikoroku-accent)]" type="range" min="14" max="28" value={fontSize} onChange={(event) => updateFontSize(Number(event.target.value))} />
          </label>
          <label className="reader-setting-block flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left dark:border-white/10">
            <span className="text-[13px] font-semibold">Font family</span>
            <select className="min-h-9 max-w-[150px] rounded-lg border border-black/15 bg-white px-2.5 text-xs dark:border-white/15 dark:bg-[#191a20]" value={fontFamily} onChange={(event) => updateFontFamily(event.target.value)}>
              <option value="Georgia, serif">Classic (Georgia)</option>
              <option value="Lora, serif">Lora</option>
              <option value="Merriweather, serif">Merriweather</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Open Sans, sans-serif">Open Sans</option>
              <option value="Nunito, sans-serif">Nunito</option>
              <option value="Patrick Hand, cursive">Patrick Hand</option>
              <option value="Caveat, cursive">Caveat</option>
            </select>
          </label>
          <label className="reader-setting-block flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left dark:border-white/10">
            <span className="text-[13px] font-semibold">Column width</span>
            <select className="min-h-9 max-w-[150px] rounded-lg border border-black/15 bg-white px-2.5 text-xs dark:border-white/15 dark:bg-[#191a20]" value={columnWidth} onChange={(event) => updateColumnWidth(event.target.value as "narrow" | "medium" | "wide")}>
              <option value="narrow">Narrow</option>
              <option value="medium">Medium</option>
              <option value="wide">Wide</option>
            </select>
          </label>
          <label className="reader-setting-block flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left dark:border-white/10">
            <span className="grid gap-[3px]"><strong className="text-[13px]">Auto-scroll speed</strong><small className="text-[11px] text-[#83858f] dark:text-[#a6a8b1]">{autoScrollSpeed}</small></span>
            <input className="w-[138px] accent-[var(--mikoroku-accent)]" type="range" min="10" max="100" value={autoScrollSpeed} onChange={(event) => updateAutoScrollSpeed(Number(event.target.value))} />
          </label>
          <button type="button" className="reader-setting-row reader-setting-button flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left hover:text-[var(--mikoroku-accent)] dark:border-white/10" onClick={() => setAutoScrolling((active) => !active)}>
            <div className="grid gap-[3px]"><strong className="text-[13px]">{autoScrolling ? "Stop auto-scroll" : "Start auto-scroll"}</strong><small className="text-[11px] text-[#83858f] dark:text-[#a6a8b1]">Scroll through the text automatically</small></div>
            <i className={`fas ${autoScrolling ? "fa-pause" : "fa-play"}`} aria-hidden="true" />
          </button>
          <button type="button" className="reader-setting-row reader-setting-button flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left hover:text-[var(--mikoroku-accent)] dark:border-white/10" onClick={toggleSpeech}>
            <div className="grid gap-[3px]"><strong className="text-[13px]">{speaking ? "Stop text-to-speech" : "Text-to-speech"}</strong><small className="text-[11px] text-[#83858f] dark:text-[#a6a8b1]">Listen to the chapter</small></div>
            <i className={`fas ${speaking ? "fa-stop" : "fa-volume-high"}`} aria-hidden="true" />
          </button>
        </>}
        <div className="reader-settings-divider my-[7px] h-px bg-black/10 dark:bg-white/10" />
        <button type="button" className="reader-setting-row reader-setting-button flex min-h-[54px] w-full items-center justify-between gap-3.5 border-b border-black/10 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10" onClick={() => setChapterListOpen((open) => !open)} disabled={!data} aria-expanded={chapterListOpen}>
          <div className="grid gap-[3px]"><strong className="text-[13px]">Chapter list</strong><small className="text-[11px] text-[#83858f] dark:text-[#a6a8b1]">{data ? `${data.chapters.length} chapters available` : "Loading chapter list"}</small></div>
          <i className={`fas ${chapterListOpen ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
        </button>
        {chapterListOpen && data && <div className="reader-settings-chapter-list grid max-h-[200px] overflow-auto py-1 pl-2.5">
          {[...data.chapters].reverse().map((item) => (
            <button type="button" key={item} className={`flex min-h-9 items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-black/5 dark:hover:bg-white/5 ${item === data.chapter ? "bg-[var(--mikoroku-accent-soft)] font-bold text-[var(--mikoroku-accent)]" : ""}`} onClick={() => changeChapter(item)}>
              <span>Chapter {item}</span>{item === data.chapter && <i className="fas fa-check" aria-hidden="true" />}
            </button>
          ))}
        </div>}
      </div>
      </div>}
      <BannerAdSlot placement="reader-after-content" />
      {data && <CommunityWidgets className="reader-community mx-auto my-6 w-[calc(100%-28px)] max-w-[1000px]" pageId={`reader_${slug}_${data.chapter}`} />}
      {reportOpen && <div className="reader-report-backdrop fixed inset-0 z-20 grid place-items-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setReportOpen(false);
      }}>
        <form className="reader-report-dialog max-h-[min(90vh,760px)] w-full max-w-[520px] overflow-auto rounded-2xl border border-black/20 bg-white p-5 text-inherit shadow-2xl dark:border-white/20 dark:bg-[#191a20]" role="dialog" aria-modal="true" aria-labelledby="reader-report-title" onSubmit={sendReport}>
          <h2 className="mb-3 text-lg font-bold" id="reader-report-title">Report chapter</h2>
          <p className="mb-3">Help us improve this chapter.</p>
          <div className="reader-report-types my-4 flex flex-wrap gap-2">
            {(activeKind === "manga" ? mangaReportTypes : novelReportTypes).map((type) => (
              <button key={type.value} type="button" className={`min-h-[38px] rounded-lg border border-black/20 bg-black/5 px-3 py-2 text-sm dark:border-white/20 dark:bg-white/10 ${reportType === type.value ? "border-[var(--mikoroku-accent)] bg-[var(--mikoroku-accent)] text-white" : ""}`} onClick={() => setReportType(type.value)}>{type.label}</button>
            ))}
          </div>
          <label className="mb-1.5 block" htmlFor="reader-report-reason">Additional details</label>
          <textarea className="min-h-[110px] w-full resize-y rounded-lg border border-black/20 bg-transparent p-2.5 dark:border-white/20" id="reader-report-reason" placeholder="Describe the issue (optional)" value={reportReason} maxLength={1000} onChange={(event) => setReportReason(event.target.value)} />
          {reportMessage && <p className="my-3" role={reportMessage.includes("successfully") ? "status" : "alert"}>{reportMessage}</p>}
          <div className="reader-report-actions mt-3.5 flex justify-end gap-2">
            <button className="min-h-[38px] rounded-lg border border-black/20 bg-black/5 px-3 py-2 dark:border-white/20 dark:bg-white/10" type="button" onClick={() => setReportOpen(false)}>Cancel</button>
            <button className="min-h-[38px] rounded-lg border border-[var(--mikoroku-accent)] bg-[var(--mikoroku-accent)] px-3 py-2 text-white disabled:cursor-wait disabled:opacity-60" type="submit" disabled={sendingReport}>{sendingReport ? "Submitting..." : "Submit report"}</button>
          </div>
        </form>
      </div>}
      </main>
      <SiteChrome
        showChrome={false}
        footerBackgroundColor="light-dark(#f1f2f4, #111216)"
        removeFooterTopGap
      />
    </>
  );
}
