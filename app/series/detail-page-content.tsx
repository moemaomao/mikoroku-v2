"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CommunityWidgets from "../community-widgets";
import { isNovelSeries } from "../../lib/reader-kind";

type Manga = {
  slug: string;
  title: string;
  img?: string;
  cover?: string;
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
type BloggerEntry = {
  title?: { $t?: string };
  link?: Array<{ rel?: string; href?: string }>;
  content?: { $t?: string };
  updated?: { $t?: string };
  published?: { $t?: string };
};

declare global {
  interface Window {
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

function resizeCover(value: string, width: number): string {
  if (!value) return "";
  if (value.includes("res.cloudinary.com")) {
    return value.replace("/upload/", `/upload/w_${width},h_${Math.round(width * 1.45)},c_fill,q_auto,f_auto/`);
  }
  if (/blogger\.googleusercontent\.com|lh3\.googleusercontent\.com/.test(value) ||
      /\/s\d+(-c)?\//.test(value)) {
    return value.replace(/\/s\d+(-c)?\//, `/s${width}/`);
  }
  return value;
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
    const timeout = window.setTimeout(() => finish(new Error("Waktu tunggu sumber manga habis.")), 15000);
    const callback = (data: T) => finish(undefined, data);
    let settled = false;

    function finish(error?: Error, data?: T) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      Reflect.deleteProperty(window, callbackName);
      script.remove();
      signal.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve(data as T);
    }

    const onAbort = () => finish(new DOMException("Permintaan dibatalkan.", "AbortError"));
    Object.defineProperty(window, callbackName, {
      configurable: true,
      value: callback,
    });
    script.onerror = () => finish(new Error("Sumber manga tidak dapat dimuat."));
    signal.addEventListener("abort", onAbort, { once: true });
    script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

async function loadManga(slug: string, signal: AbortSignal): Promise<Manga | null> {
  const cached = localStorage.getItem(`detail_${slug}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { time?: number; data?: Record<string, unknown> };
      if (parsed.data && Date.now() - (parsed.time || 0) < 15 * 60 * 1000) {
        return normalizeManga(parsed.data, slug);
      }
    } catch (error) {
      console.warn("Cache detail manga tidak valid dan akan diabaikan.", error);
      localStorage.removeItem(`detail_${slug}`);
    }
  }

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

  const matched = responses.find((result) => result.status === "fulfilled" && result.value);
  const manga = matched?.status === "fulfilled" ? matched.value : null;
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
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "/firebase.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Firebase SDK gagal dimuat."));
      signal.addEventListener("abort", () => {
        script.remove();
        reject(new DOMException("Permintaan dibatalkan.", "AbortError"));
      }, { once: true });
      document.head.appendChild(script);
    });
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
    const createdAt = firestoreDate(data.createdAt || data.updatedAt || data.date);
    const chapterImages = extractChapterImages(data.images || data.content || data.html);
    const chapterText = data.content || data.text || data.html;
    collectionChapters.push({
      id: document.id,
      num: asString(data.num, document.id),
      title: asString(data.title, `Chapter ${document.id}`),
      thumbnail: asString(data.thumbnail),
      images: chapterImages,
      isNovel: isNovelSeries(data) ||
        (typeof chapterText === "string" && Boolean(chapterText.trim()) && !chapterImages.length),
      createdAt,
      updatedAt: firestoreDate(data.updatedAt),
      date: firestoreDate(data.date || createdAt),
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
      num: asString(data.num, id),
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

  const sdkUrl = new URL("/firebase.js", window.location.href).href;
  let script = [...document.scripts].find((item) => item.src === sdkUrl);
  if (!script) {
    script = document.createElement("script");
    script.type = "module";
    script.src = sdkUrl;
    document.head.appendChild(script);
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Waktu tunggu inisialisasi Firebase Firestore habis."));
    }, 15000);
    const interval = window.setInterval(() => {
      if (window.firestore && window.fs?.collection && window.fs.getDocs) {
        cleanup();
        resolve(true);
      }
    }, 100);
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Permintaan Firestore dibatalkan.", "AbortError"));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      signal.removeEventListener("abort", onAbort);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (script) {
      script.addEventListener("error", () => {
        cleanup();
        reject(new Error("Firebase Firestore gagal dimuat."));
      }, { once: true });
    }
  });
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
  const [state, setState] = useState<DetailState>("loading");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterState, setChapterState] = useState<"loading" | "ready" | "error">("loading");
  const [chapterError, setChapterError] = useState("");
  const [source, setSource] = useState<ChapterSource>("blogger");
  const [firestoreLatestUpdate, setFirestoreLatestUpdate] = useState("");
  const [chapterRetry, setChapterRetry] = useState(0);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [view, setView] = useState<"grid" | "list" | "text-grid">("grid");
  const [bookmarked, setBookmarked] = useState(false);
  const [readChapters, setReadChapters] = useState<string[]>([]);

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
    setState("loading");
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
    setChapterState("loading");
    setChapterError("");
    let cachedChapters: Chapter[] = [];
    const cached = localStorage.getItem(`chapters_${slug}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { time?: number; data?: Chapter[] };
        const valid = parsed.data?.filter((chapter) => chapter.source === source) || [];
        if (valid.length && Date.now() - (parsed.time || 0) < 30 * 60 * 1000) {
          cachedChapters = valid;
        }
      } catch (error) {
        console.warn("Cache chapter manga tidak valid dan akan diabaikan.", error);
        localStorage.removeItem(`chapters_${slug}`);
      }
    }

    const loadSelectedAndSupplementalSources = async () => {
      if (source === "firestore") return loadFirestoreChapterSource(slug, controller.signal);
      const secondarySource: ChapterSource = source === "blogger" ? "blogger2" : "blogger";
      const settled = await Promise.allSettled([
        loadBloggerChapterSource(manga.title, source, controller.signal),
        loadBloggerChapterSource(manga.title, secondarySource, controller.signal),
        loadFirestoreChapterSource(slug, controller.signal),
      ]);
      if (controller.signal.aborted) throw new DOMException("Permintaan chapter dibatalkan.", "AbortError");

      const sources = settled.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        console.warn(
          `Chapter source ${index === 0 ? source : index === 1 ? secondarySource : "firestore"} failed for ${slug}.`,
          result.reason,
        );
        return [];
      });
      if (!sources.some((chapters) => chapters.length > 0)) {
        const firstError = settled.find((result) => result.status === "rejected");
        if (firstError?.status === "rejected") throw firstError.reason;
      }
      return mergeChapterSources(mergeChapterSources(sources[0], sources[1]), sources[2]);
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
        previous.filter((item) => item.source !== source && item.source !== "firestore"),
        finalResult,
      );
      localStorage.setItem(`chapters_${slug}`, JSON.stringify({ time: Date.now(), data: merged }));
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
    setChapters([]);
    setChapterError("");
    setChapterState("loading");
    setSource(nextSource);
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
  const visibleChapters = useMemo(() => [...chapters].sort((left, right) => {
    const order = chapterNumber(left.num) - chapterNumber(right.num);
    return sort === "newest" ? -order : order;
  }), [chapters, sort]);
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
    let images = chapter.images || [];
    if (!isNovel && !images.length && chapter.source === "firestore") {
      try {
        const response = await fetch(
          `${FIRESTORE_BASE}/manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(String(chapter.num))}`,
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
    images = [...new Set(images.map((image) => image.replace(/\/s\d+(-c)?\//, "/s0/")))];
    localStorage.setItem("currentChapter", JSON.stringify({
      slug,
      num: chapter.num,
      title: manga.title,
      label: chapterName,
      images,
      thumbnail: chapter.thumbnail || images[0] || "",
      url: chapter.url || "",
      source: chapter.source,
      isNovel,
    }));
    const readerRoute = isNovel ? "/read" : "/reader";
    window.location.href = `${readerRoute}/${encodeURIComponent(slug)}/${encodeURIComponent(String(chapter.num))}`;
  }, [manga, slug]);

  if (state === "loading") {
    return (
      <>
        <div id="site-header" />
        <main className="detail-route">
          <p className="detail-route-message" role="status">Memuat detail manga...</p>
        </main>
        <div id="site-footer" />
        <RouteIntegrations />
      </>
    );
  }
  if (state === "not-found") {
    return (
      <>
        <div id="site-header" />
        <main className="detail-route">
          <p className="detail-route-message" role="status">Manga tidak ditemukan.</p>
        </main>
        <div id="site-footer" />
        <RouteIntegrations />
      </>
    );
  }
  if (state === "error" || !manga) {
    return (
      <>
        <div id="site-header" />
        <main className="detail-route">
          <p className="detail-route-message" role="alert">Detail manga gagal dimuat. Coba muat ulang halaman.</p>
        </main>
        <div id="site-footer" />
        <RouteIntegrations />
      </>
    );
  }

  const cover = resizeCover(manga.img || manga.cover || "", 200);
  const status = (manga.status || "UNKNOWN").toUpperCase();
  const demographics = asStringList(manga.demographic);
  const femaleTags = asStringList(manga.femaleTags);
  const maleTags = asStringList(manga.maleTags);
  const formatTagLabel = (tag: string) => tag.replace(/_/g, " ");

  return (
    <>
      <div id="site-header" />
      <main className="detail-route">
        <div className="container">
          <div id="bgLayer" style={{ backgroundImage: cover ? `url("${cover}")` : undefined }} />
          <div className="content">
            <div className="main">
              <div className="left-column">
                <div className="cover">
                  <img src={cover || "/assets/icons/favicon.ico"} alt={`${manga.title} cover`} onError={(event) => { event.currentTarget.src = "/assets/icons/favicon.ico"; }} />
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
                <button className={`bookmark-btn${bookmarked ? " bookmarked" : ""}`} type="button" onClick={toggleBookmark}>
                  <i className={`fas ${bookmarked ? "fa-check" : "fa-bookmark"}`} aria-hidden="true" />
                  <span>{bookmarked ? "Bookmarked" : "Bookmark"}</span>
                </button>
              </div>
              <div className="info">
                <h1 className="title">{manga.title}</h1>
                <div className="title-divider" />
                {manga.altTitle && <div className="alt-title">{manga.altTitle}</div>}
                <div className={`status ${status.toLowerCase()}`}>
                  <i className="fas fa-fire" aria-hidden="true" /> <span>{status}</span>
                </div>
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
              {genreList.map((genre) => (
                <a className="genre" href={`/genre-list?genre=${encodeURIComponent(genre.toLowerCase())}`} key={genre}>{genre.replace(/_/g, " ")}</a>
              ))}
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
            <section className="synopsis">
              <h2>Synopsis</h2>
              <p>{manga.desc || "Synopsis tidak tersedia."}</p>
            </section>
            <div id="announcement-widget" />

            <section className="chapters">
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
              <div className={`chapter-grid${chapterState === "loading" ? " chapter-loading" : ""}${view === "list" ? " list-mode" : view === "text-grid" ? " text-grid-mode" : ""}`} aria-busy={chapterState === "loading"}>
                {chapterState === "loading" && <div className="chapter-loading-inner"><i className="fas fa-spinner fa-spin fa-2x" aria-hidden="true" /><span>Loading chapters...</span></div>}
                {chapterState === "error" && (
                  <div className="chapter-empty-inner">
                    <p>Chapter gagal dimuat.</p>
                    {chapterError && <p>{chapterError}</p>}
                    <button type="button" onClick={() => setChapterRetry((attempt) => attempt + 1)}>Coba lagi</button>
                  </div>
                )}
                {chapterState === "ready" && visibleChapters.length === 0 && <div className="chapter-empty-inner">Belum ada chapter.</div>}
                {chapterState === "ready" && visibleChapters.map((chapter, index) => (
                  <button
                    className={`chapter-item${readChapters.includes(String(chapter.num).match(/(\d+(?:\.\d+)?)/)?.[0] || "") ? " read" : ""}`}
                    data-index={index}
                    key={`${chapter.source}-${chapter.num}-${chapter.url || chapter.id || index}`}
                    onClick={() => openChapter(chapter)}
                    type="button"
                  >
                    {view !== "text-grid" && <img alt="" loading="lazy" src={chapter.thumbnail || cover || "/assets/icons/favicon.ico"} />}
                    <span className={`chapter-source-badge ${chapter.source === "blogger" ? "source-sv1" : chapter.source === "blogger2" ? "source-sv2" : "source-es"}`}>
                      {chapter.source === "blogger" ? "SV1" : chapter.source === "blogger2" ? "SV2" : "ES"}
                    </span>
                    <span className="chapter-label">
                      <span className="chapter-title">Chapter {chapter.num}</span>
                      <span className="chapter-date">{formatDate(chapter.createdAt || chapter.updatedAt || chapter.date)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
        <CommunityWidgets className="detail-widgets" pageId={`detail_${slug}`} />
        <div id="rec-recommend-grid" />
      </main>
      <div id="site-footer" />
      <RouteIntegrations />
    </>
  );
}

function RouteIntegrations() {
  useEffect(() => {
    const added: HTMLScriptElement[] = [];
    const load = (src: string) => new Promise<void>((resolve) => {
      const existing = [...document.scripts].find((script) => script.src === new URL(src, location.href).href);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => {
        console.error(`Gagal memuat integrasi halaman manga: ${src}`);
        resolve();
      };
      added.push(script);
      document.body.appendChild(script);
    });

    void (async () => {
      await load("https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js");
      await load("https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js");
      await load("https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js");
      const firebaseInit = document.createElement("script");
      firebaseInit.textContent = `if (typeof firebase !== "undefined" && !firebase.apps.length) { firebase.initializeApp({ apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4", authDomain: "widget-comment.firebaseapp.com", projectId: "widget-comment", storageBucket: "widget-comment.firebasestorage.app", messagingSenderId: "249700505242", appId: "1:249700505242:web:dab240af09caf30ad7f123" }); }`;
      added.push(firebaseInit);
      document.head.appendChild(firebaseInit);
      await load("/auth-loader.js");
      await load("/user-modals.js");
      await load("/header.js");
      await load("/footer.js");
      await load("/announcement.js");
      await load("/recommendation-sidebar.js");
    })();

    return () => {
      for (const script of added) script.remove();
      document.getElementById("site-header")?.replaceChildren();
      document.getElementById("site-footer")?.replaceChildren();
      document.getElementById("rec-recommend-grid")?.replaceChildren();
    };
  }, []);

  return null;
}
