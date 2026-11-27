"use client";

import dynamic from "next/dynamic";
import {
  getApps,
  initializeApp,
} from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  getFirestore,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from "react";
import "quill/dist/quill.snow.css";
import styles from "./admin.module.css";
import AdvertisementSettings from "./advertisement-settings";
import OgCoverTool from "./og-cover-tool";
import { CoverImage } from "../lib/cover-image";
import { MarkdownContent } from "../lib/markdown-content";
import RichTextEditor from "./rich-text-editor";
import MangaMetadataEditor from "./manga-metadata-editor";
import MetadataJsonEditor from "./metadata-json-editor";
import { loadFirestoreMangaCatalog } from "../lib/firebase-client";
import { imageProxyUrl } from "../../lib/image-proxy";
import {
  fetchMangaMetadataPayload,
  MANGA_METADATA_SOURCE_PATH,
  notifyMangaMetadataUpdated,
  parseMangaMetadataPayload,
  setDevelopmentMangaCatalogSourceMode,
  type MangaMetadataPayload,
} from "../lib/manga-metadata";
import {
  DEFAULT_READER_SERVER_NOTICE,
  normalizeReaderServerNoticeConfig,
  type ReaderServerNoticeConfig,
} from "../series/reader-server-notice-config";
import { isNovelSeries } from "../../lib/reader-kind";
import { getSeriesStatisticsFirestore } from "../lib/series-statistics";

const ModerationPage = dynamic(() => import("./moderation-page"), {
  ssr: false,
  loading: () => <div className="p-6 text-sm">Loading moderation tools...</div>,
});

const firebaseConfig = {
  apiKey: "AIzaSyAi8z8oGGNJSNe87UVWh3FagJZSy_uhuoI",
  authDomain: "mikoroku.firebaseapp.com",
  databaseURL: "https://mikoroku-default-rtdb.firebaseio.com",
  projectId: "mikoroku",
  storageBucket: "mikoroku.firebasestorage.app",
  messagingSenderId: "271920446600",
  appId: "1:271920446600:web:974b11c707ebc11a7bf33d",
};

const ADMIN_APP_NAME = "mikoroku-admin";
const ADMIN_MANGA_CACHE_KEY = "adminMangaCatalogCache_v4";
const ADMIN_MANGA_CACHE_DURATION = 2 * 60 * 60 * 1000;
const IMGBB_API_KEY = "751e8d146b32b8a00499aef04f568e30";

type AdminFirebase = { auth: Auth; firestore: Firestore };
type MetadataCatalogSourceMode = "effective" | "baseline";
type MetadataSourceDebugCatalog = {
  payload: MangaMetadataPayload;
  records: Awaited<ReturnType<typeof loadFirestoreMangaCatalog>>;
};

type MangaRecord = {
  [key: string]: unknown;
  slug: string;
  title: string;
  altTitle: string;
  cover: string;
  covers?: string[];
  coverNumbers?: Record<string, string>;
  coverUpdatedAt?: number;
  desc: string;
  type: string;
  commissionEnabled?: boolean;
  nsfw?: boolean;
  status: string;
  author: string;
  artist: string;
  circle: string;
  group: string;
  series: string;
  serialization: string;
  publication: string;
  genres: string[];
  demographic: string[];
  femaleTags: string[];
  maleTags: string[];
  tags: string[];
  characters: string[];
  rating: number;
  chapterCount: number;
  updatedAt: number;
  source: string;
  origin: string;
  githubSlug?: string;
  managedByAdmin?: boolean;
  isDraft?: boolean;
};

export type MangaDraft = {
  slug: string;
  title: string;
  updateDate: string;
  altTitle: string;
  cover: string;
  desc: string;
  type: string;
  commissionEnabled: boolean;
  nsfw: boolean;
  status: string;
  author: string;
  artist: string;
  circle: string;
  group: string;
  series: string;
  serialization: string;
  publication: string;
  genres: string;
  demographic: string;
  femaleTags: string;
  maleTags: string;
  tags: string;
  characters: string;
  rating: string;
  isDraft: boolean;
};

type SummaryEntry = {
  slug: string;
  title: string;
  altTitle: string;
  cover: string;
  type: string;
  commissionEnabled: boolean;
  status: string;
  author: string;
  genres: string[];
  rating: number;
  chapterCount: number;
  updatedAt: number;
  lastChapter: string | number | null;
  source: string;
  origin: string;
  githubSlug: string | null;
  managedByAdmin: boolean;
  isDraft: boolean;
};

type AdminReport = {
  id: string;
  slug: string;
  chapter: string;
  type: string;
  reason: string;
  url: string;
  createdAt: unknown;
};

type AdminAnnouncement = {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: unknown;
  publishedAt: unknown;
  updatedAt: unknown;
};

type ChapterDraft = {
  mangaSlug: string;
  number: string;
  title: string;
  thumbnail: string;
  images: string;
  content: string;
  isDraft: boolean;
};

type AdminChapter = {
  num: string;
  title: string;
  thumbnail: string;
  images: string[];
  content: string;
  isDraft: boolean;
  date: unknown;
  order: number;
};

type AdminChapterLink = {
  id: string;
  chapterId: string;
  num: string;
  title: string;
  url: string;
  date: string;
  thumbnail: string;
  source: "firestore";
  order: number;
};

type UploadNotice = {
  status: "uploading" | "success" | "error";
  message: string;
};

const emptyDraft: MangaDraft = {
  slug: "",
  title: "",
  updateDate: "",
  altTitle: "",
  cover: "",
  desc: "",
  type: "manga",
  commissionEnabled: false,
  nsfw: false,
  status: "ongoing",
  author: "",
  artist: "",
  circle: "",
  group: "",
  series: "",
  serialization: "",
  publication: "",
  genres: "",
  demographic: "",
  femaleTags: "",
  maleTags: "",
  tags: "",
  characters: "",
  rating: "",
  isDraft: false,
};

const emptyChapterDraft: ChapterDraft = {
  mangaSlug: "",
  number: "",
  title: "",
  thumbnail: "",
  images: "",
  content: "",
  isDraft: false,
};

function getAdminFirebase(): AdminFirebase {
  const app =
    getApps().find((candidate) => candidate.name === ADMIN_APP_NAME) ??
    initializeApp(firebaseConfig, ADMIN_APP_NAME);
  return { auth: getAuth(app), firestore: getFirestore(app) };
}

async function refreshSharedMangaCatalogCache(): Promise<void> {
  const user = getAdminFirebase().auth.currentUser;
  if (!user) throw new Error("Sign in as an admin before refreshing the shared catalog cache.");
  const response = await fetch("/api/admin/refresh-manga-catalog-cache", {
    method: "POST",
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  if (response.status === 404 && process.env.NODE_ENV !== "production") return;
  if (!response.ok) {
    let detail = "";
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "error" in body) {
        detail = ` ${String(body.error)}`;
      }
    } catch (error) {
      console.warn("Shared catalog cache refresh returned an unreadable error response.", error);
    }
    throw new Error(`Shared catalog cache refresh returned HTTP ${response.status}.${detail}`);
  }
}

async function refreshChapterSummaryCache(
  slug: string,
  chapters: AdminChapterLink[],
): Promise<void> {
  const user = getAdminFirebase().auth.currentUser;
  if (!user) throw new Error("Sign in as an admin before saving chapter links.");
  const response = await fetch("/api/admin/chapter-summaries", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ slug, chapters }),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json() as { error?: string };
      detail = body.error ? ` ${body.error}` : "";
    } catch (error) {
      console.warn("Chapter summary cache returned an unreadable error response.", error);
    }
    throw new Error(`Chapter summary cache refresh returned HTTP ${response.status}.${detail}`);
  }
}

function scheduleSharedMangaCatalogCacheRefresh(): void {
  void refreshSharedMangaCatalogCache()
    .catch((error: unknown) => {
      console.error("The shared manga catalog cache could not be refreshed.", error);
    })
    .finally(notifyMangaMetadataUpdated);
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function chapterLinkDocumentId(number: string): string {
  return `link-${encodeURIComponent(number.trim())}`;
}

function toDateTimeInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).map(text).filter(Boolean);
  }
  return [];
}

function recordMetadata(data: Record<string, unknown>): Record<string, unknown> {
  const info = data.info && typeof data.info === "object" && !Array.isArray(data.info)
    ? data.info as Record<string, unknown>
    : {};
  const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
    ? data.metadata as Record<string, unknown>
    : {};
  return { ...info, ...metadata };
}

function firstText(...values: unknown[]): string {
  return values.map(text).find(Boolean) || "";
}

function firstList(...values: unknown[]): string[] {
  for (const value of values) {
    const list = stringList(value);
    if (list.length) return list;
  }
  return [];
}

function firstNumber(...values: unknown[]): number {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(parsed) && parsed !== 0) return parsed;
  }
  return 0;
}

function toDraft(manga?: MangaRecord): MangaDraft {
  if (!manga) return { ...emptyDraft };
  return {
    slug: manga.slug,
    title: manga.title,
    updateDate: toDateTimeInput(manga.updatedAt),
    altTitle: manga.altTitle,
    cover: manga.cover,
    desc: manga.desc,
    type: manga.type || "manga",
    commissionEnabled: manga.commissionEnabled === true,
    nsfw: manga.nsfw === true,
    status: manga.status || "ongoing",
    author: manga.author,
    artist: manga.artist,
    circle: manga.circle,
    group: manga.group,
    series: manga.series,
    serialization: manga.serialization,
    publication: manga.publication,
    genres: manga.genres.join(", "),
    demographic: manga.demographic.join(", "),
    femaleTags: manga.femaleTags.join(", "),
    maleTags: manga.maleTags.join(", "),
    tags: manga.tags.join(", "),
    characters: manga.characters.join(", "),
    rating: manga.rating ? String(manga.rating) : "",
    isDraft: manga.isDraft === true,
  };
}

function fromFirestore(slug: string, data: Record<string, unknown>): MangaRecord {
  const mangaData = { ...data };
  const info = recordMetadata(data);
  const title = firstText(data.title, info.title, data.name, info.name);
  delete mangaData.chapters;
  return {
    ...mangaData,
    slug,
    title: title.toLowerCase() === slug.toLowerCase() ? "" : title,
    altTitle: firstText(info.altTitle, info.alternative, data.altTitle, data.alternative),
    cover: firstText(info.cover, info.img, data.cover, data.img),
    covers: firstList(info.covers, data.covers),
    coverNumbers: data.coverNumbers && typeof data.coverNumbers === "object"
      ? Object.fromEntries(Object.entries(data.coverNumbers).map(([url, number]) => [url, text(number)]))
      : {},
    coverUpdatedAt: typeof data.coverUpdatedAt === "number" ? data.coverUpdatedAt : 0,
    desc: firstText(info.desc, info.description, info.synopsis, info.sinopsis, data.desc, data.description, data.synopsis, data.sinopsis),
    type: firstText(info.type, data.type) || "manga",
    commissionEnabled: typeof info.commissionEnabled === "boolean" ? info.commissionEnabled : data.commissionEnabled === true,
    nsfw: typeof info.nsfw === "boolean" ? info.nsfw : data.nsfw === true,
    status: firstText(info.status, data.status) || "unknown",
    author: firstText(info.author, info.authors, data.author, data.authors),
    artist: firstText(info.artist, info.artists, data.artist, data.artists),
    circle: firstText(info.circle, data.circle),
    group: firstText(info.group, data.group),
    series: firstText(info.series, data.series),
    serialization: firstText(info.serialization, data.serialization),
    publication: firstText(info.publication, info.year, data.publication, data.year),
    genres: firstList(info.genres, info.genre, data.genres, data.genre),
    demographic: firstList(info.demographic, data.demographic),
    femaleTags: firstList(info.femaleTags, data.femaleTags),
    maleTags: firstList(info.maleTags, data.maleTags),
    tags: firstList(info.tags, data.tags),
    characters: firstList(info.characters, data.characters),
    rating: firstNumber(info.rating, data.rating),
    chapterCount:
      typeof data.chapterCount === "number"
        ? data.chapterCount
        : data.chapters && typeof data.chapters === "object"
          ? Object.keys(data.chapters).length
          : firstNumber(info.chapterCount),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    source: text(data.source) || "firestore",
    origin: text(data.origin) || "firestore",
    githubSlug: text(data.githubSlug) || undefined,
    managedByAdmin: data.managedByAdmin === true,
    isDraft: data.isDraft === true,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Repair Blogger/Google URLs that were line-wrapped or split mid-path when pasted */
function repairBrokenImageUrls(content: string): string {
  // 1) Join lines that are continuations of a previous unfinished URL
  const lines = content.split(/\r?\n/);
  const joined: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const prev = joined[joined.length - 1];
    const prevIsOpenUrl =
      prev &&
      /^https?:\/\//i.test(prev) &&
      !/\.(jpe?g|png|gif|webp|bmp|avif)(?:\?.*)?$/i.test(prev) &&
      (prev.includes("googleusercontent.com") ||
        prev.includes("blogspot.com") ||
        prev.includes("ggpht.com") ||
        prev.length > 80);
    const lineIsContinuation =
      prevIsOpenUrl &&
      !/^https?:\/\//i.test(line) &&
      !/^[\[{<]/.test(line);
    if (lineIsContinuation) {
      joined[joined.length - 1] = prev + line.replace(/\s+/g, "");
    } else {
      joined.push(line);
    }
  }
  let result = joined.join("\n");

  // 2) Remove horizontal spaces inside a URL path (do NOT touch newlines between URLs)
  for (let i = 0; i < 8; i++) {
    const next = result.replace(
      /(https?:\/\/(?:blogger\.)?googleusercontent\.com\/[^\s"'<>]*?)[^\S\r\n]+([^\s"'<>]+)/gi,
      (full, a, b) => {
        // never glue a finished image URL onto the next http URL
        if (/\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(a) && /^https?:/i.test(b)) return full;
        if (/^https?:/i.test(b) && /googleusercontent|blogspot|ggpht/i.test(b)) return full;
        return a + b;
      },
    );
    if (next === result) break;
    result = next;
  }
  return result;
}

function extractChapterImageUrls(content: string): string[] {
  try {
    // Hard limit input size to prevent main-thread freeze / crash
    const safeContent = typeof content === "string" ? content.slice(0, 500_000) : "";
    if (!safeContent.trim()) return [];

    const normalized = repairBrokenImageUrls(safeContent)
      .replace(/&amp;/gi, "&")
      .replace(/&#39;|&apos;|&#x27;/gi, "'")
      .replace(/&quot;|&#34;|&#x22;/gi, '"');
    const candidates: string[] = [];
    const imageTags = normalized.match(/<img\b[^>]{0,2000}>/gi) || [];

    const bestSrcsetUrl = (srcset: string): string => {
      let bestUrl = "";
      let bestSize = -1;
      for (const candidate of srcset.split(",").slice(0, 20)) {
        const match = candidate.trim().match(/^(\S+)(?:\s+([\d.]+)(w|x))?$/i);
        if (!match) continue;
        const size = match[2] ? Number(match[2]) : 0;
        if (size >= bestSize) {
          bestUrl = match[1];
          bestSize = size;
        }
      }
      return bestUrl;
    };

    for (const tag of imageTags.slice(0, 300)) {
      const attributes = new Map<string, string>();
      for (const match of tag.matchAll(/\b([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
        attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
      }

      const url = [
        attributes.get("data-original"),
        attributes.get("data-lazy-src"),
        attributes.get("data-src"),
        bestSrcsetUrl(attributes.get("data-srcset") || ""),
        bestSrcsetUrl(attributes.get("srcset") || ""),
        attributes.get("src"),
      ].find((candidate) => {
        if (!candidate || candidate.length > 4000) return false;
        try {
          const parsed = new URL(candidate);
          return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
        } catch {
          return false;
        }
      });
      if (url) candidates.push(url);
    }

    if (!candidates.length) {
      const plainMatches = normalized.match(/https?:\/\/[^\s"'<>]+/gi) || [];
      candidates.push(...plainMatches.slice(0, 300));
    }

    return [...new Set(candidates
      .map((value) => value.replace(/["'<>),;}\]]+$/, "").trim())
      .filter((value) => {
        if (!value || value.length > 4000) return false;
        try {
          const url = new URL(value);
          return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
        } catch {
          return false;
        }
      }))];
  } catch (err) {
    console.error("extractChapterImageUrls failed:", err);
    return [];
  }
}

async function uploadToImgBB(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image file.`);
  }
  if (file.size > 32 * 1024 * 1024) {
    throw new Error(`${file.name} exceeds the 32 MB limit.`);
  }
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData,
  });
  const result: {
    success?: boolean;
    data?: { url?: string };
    error?: { message?: string };
  } = await response.json();
  if (!response.ok || !result.success || !result.data?.url) {
    throw new Error(result.error?.message || `Upload failed (${response.status}).`);
  }
  return result.data.url;
}

function imageFileName(url: string): string {
  try {
    const path = new URL(url).pathname;
    const name = path.split("/").pop() || "";
    try {
      const decoded = decodeURIComponent(name);
      return decoded.length > 60 ? decoded.slice(0, 57) + "..." : decoded || "image";
    } catch {
      return name.length > 60 ? name.slice(0, 57) + "..." : name || "image";
    }
  } catch {
    return url.length > 40 ? "…" + url.slice(-40) : url;
  }
}

/** Use a resized preview so large chapter pages load faster in the editor. */
function adminPreviewSrc(url: string, bust = 0): string {
  try {
    const sourceUrl = new URL(url);
    let src = url;
    if (/(^|\.)googleusercontent\.com$/i.test(sourceUrl.hostname)) {
      sourceUrl.pathname = sourceUrl.pathname
        .replace(/\/s\d+(?:-c)?\//i, "/s600/")
        .replace(/\/w\d+-h\d+(?:-[a-z0-9-]+)?\//i, "/s600/");
      src = sourceUrl.toString()
        .replace(/=s\d+(?:-c)?(?:-[a-z0-9-]+)?(?=$|[?#])/i, "=s600")
        .replace(/=w\d+-h\d+(?:-[a-z0-9-]+)?(?=$|[&#])/i, "=s600");
    } else {
      src = imageProxyUrl(url, "chapterPreview", undefined, false);
    }
    if (!bust) return src;
    return `${src}${src.includes("?") ? "&" : "?"}_r=${bust}`;
  } catch {
    return url;
  }
}

function splitList(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unknown error occurred.";
}

function getLoginErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/user-not-found":
      return "This email is not registered.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return getErrorMessage(error);
  }
}

function toSummaryEntry(manga: MangaRecord): SummaryEntry {
  return {
    slug: manga.slug,
    title: manga.title,
    altTitle: manga.altTitle,
    cover: manga.cover,
    type: manga.type || "manga",
    commissionEnabled: manga.commissionEnabled === true,
    status: manga.status.toLowerCase(),
    author: manga.author,
    genres: manga.genres.slice(0, 12),
    rating: manga.rating,
    chapterCount: manga.chapterCount,
    updatedAt: manga.updatedAt,
    lastChapter:
      typeof manga.lastChapter === "string" || typeof manga.lastChapter === "number"
        ? manga.lastChapter
        : null,
    source: manga.source || "firestore",
    origin: manga.origin || "firestore",
    githubSlug: manga.githubSlug || null,
    managedByAdmin: manga.managedByAdmin === true,
    isDraft: manga.isDraft === true,
  };
}

function isSummaryEntry(value: unknown): value is SummaryEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "slug" in value &&
    typeof value.slug === "string" &&
    "updatedAt" in value &&
    typeof value.updatedAt === "number"
  );
}

function readAdminMangaCache(): { items: MangaRecord[]; time: number } | null {
  try {
    const cached: unknown = JSON.parse(
      window.localStorage.getItem(ADMIN_MANGA_CACHE_KEY) || "null",
    );
    if (
      !cached ||
      typeof cached !== "object" ||
      !("time" in cached) ||
      typeof cached.time !== "number" ||
      !("items" in cached) ||
      !Array.isArray(cached.items)
    ) {
      return null;
    }
    const items = cached.items.flatMap((item) => {
      if (!item || typeof item !== "object" || !("slug" in item)) return [];
      const slug = text(item.slug);
      return slug ? [fromFirestore(slug, item as Record<string, unknown>)] : [];
    });
    return { items: dedupeMangaByTitle(items), time: cached.time };
  } catch (error) {
    console.warn("Admin catalog cache is invalid and will be ignored.", error);
    return null;
  }
}

function writeAdminMangaCache(items: MangaRecord[]): void {
  try {
    window.localStorage.setItem(
      ADMIN_MANGA_CACHE_KEY,
      JSON.stringify({ time: Date.now(), items: dedupeMangaByTitle(items) }),
    );
  } catch (error) {
    console.warn("Unable to save the admin catalog cache.", error);
  }
}

function invalidateAdminMangaCache(): void {
  try {
    window.localStorage.removeItem(ADMIN_MANGA_CACHE_KEY);
  } catch (error) {
    console.warn("Unable to clear the admin catalog cache.", error);
  }
}

function getTimestamp(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = value.seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function generatedChapterPath(slug: string, number: string, isNovel: boolean): string {
  const kind = isNovel ? "novel" : "manga";
  return `/${kind}/${encodeURIComponent(slug)}/${encodeURIComponent(number)}`;
}

function generatedChapterLink(
  slug: string,
  isNovel: boolean,
  chapter: AdminChapter,
  order: number,
): AdminChapterLink {
  const chapterId = chapter.num;
  const timestamp = chapter.date ? getTimestamp(chapter.date) : 0;
  return {
    id: chapterLinkDocumentId(chapter.num),
    chapterId,
    num: chapter.num,
    title: chapter.title || `Chapter ${chapter.num}`,
    url: generatedChapterPath(slug, chapter.num, isNovel),
    date: timestamp > 0 ? new Date(timestamp).toISOString() : "",
    thumbnail: chapter.thumbnail,
    source: "firestore",
    order,
  };
}

async function syncGeneratedChapterLinks(
  firestore: Firestore,
  slug: string,
  isNovel: boolean,
  chapters: AdminChapter[],
): Promise<string> {
  const links = chapters
    .filter((chapter) => !chapter.isDraft)
    .map((chapter, order) => generatedChapterLink(slug, isNovel, chapter, order));
  const linkCollection = collection(firestore, "manga", slug, "chapterLinks");
  const existing = await getDocs(linkCollection);
  const linkIds = new Set(links.map((link) => link.id));
  const stale = existing.docs.filter((link) => !linkIds.has(link.id));

  for (let start = 0; start < stale.length; start += 450) {
    const batch = writeBatch(firestore);
    stale.slice(start, start + 450).forEach((link) => batch.delete(link.ref));
    await batch.commit();
  }
  for (let start = 0; start < links.length; start += 450) {
    const batch = writeBatch(firestore);
    links.slice(start, start + 450).forEach((link) => {
      batch.set(doc(firestore, "manga", slug, "chapterLinks", link.id), link);
    });
    await batch.commit();
  }

  let warning = "";
  try {
    await refreshChapterSummaryCache(slug, links);
  } catch (error) {
    warning = error instanceof Error ? error.message : String(error);
    console.error(`Generated links were saved, but their shared cache could not be refreshed for ${slug}.`, error);
  }
  try {
    window.localStorage.setItem(`chapters_${slug}`, JSON.stringify({
      time: Date.now(),
      data: links.map((link) => ({ ...link, id: link.chapterId, images: [] })),
      summaryOnlySource: "firestore",
      managed: true,
    }));
  } catch (error) {
    console.warn(`Generated links were saved, but local chapter cache could not be updated for ${slug}.`, error);
  }
  return warning;
}

function isQuotaError(error: unknown): boolean {
  const msg = getErrorMessage(error).toLowerCase();
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code.toLowerCase()
      : "";
  return (
    code.includes("resource-exhausted") ||
    msg.includes("quota exceeded") ||
    msg.includes("resource-exhausted")
  );
}

async function updateSummary(
  firestore: Firestore,
  manga: MangaRecord,
  remove = false,
): Promise<"ok" | "skipped"> {
  const summaryRef = doc(firestore, "meta", "mangaSummary");
  try {
    const snapshot = await getDoc(summaryRef);
    const rawList: unknown = snapshot.exists() ? snapshot.data()?.list : [];
    const list = Array.isArray(rawList) ? rawList.filter(isSummaryEntry) : [];
    const nextList = remove
      ? list.filter((entry) => entry.slug !== manga.slug)
      : [
          ...list.filter((entry) => entry.slug !== manga.slug),
          toSummaryEntry(manga),
        ].sort((left, right) => right.updatedAt - left.updatedAt);
    await setDoc(
      summaryRef,
      { list: nextList, count: nextList.length, updatedAt: Date.now() },
      { merge: true },
    );
    return "ok";
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn("[admin] summary skipped (quota)", error);
      return "skipped";
    }
    throw error;
  }
}

async function syncSeoToKv(payload: {
  slug: string;
  title: string;
  description: string;
  cover: string;
  updatedAt: number;
}): Promise<void> {
  if (!payload.slug || !payload.cover || !/^https?:\/\//i.test(payload.cover)) return;
  try {
    await fetch("/api/admin/sync-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("[admin] SEO KV sync failed", error);
  }
}


function mapMetadataRecord(raw: Record<string, unknown>): MangaRecord | null {
  const info = recordMetadata(raw);
  const title = firstText(raw.title, raw.name, info.title, info.name);
  const slug = firstText(raw.slug, info.slug) || slugify(title);
  if (!slug) return null;
  return {
    ...raw,
    slug,
    title: title.toLowerCase() === slug.toLowerCase() ? "" : title,
    altTitle: firstText(raw.altTitle, raw.alternative, raw.alt_title, info.altTitle, info.alternative, info.alt_title),
    cover: firstText(raw.cover, raw.img, info.cover, info.img),
    covers: firstList(raw.covers, info.covers),
    coverNumbers: raw.coverNumbers && typeof raw.coverNumbers === "object"
      ? Object.fromEntries(Object.entries(raw.coverNumbers).map(([url, number]) => [url, text(number)]))
      : {},
    desc: firstText(raw.desc, raw.description, raw.synopsis, raw.sinopsis, info.desc, info.description, info.synopsis, info.sinopsis),
    type: firstText(raw.type, info.type) || "manga",
    status: firstText(raw.status, info.status) || "unknown",
    author: firstText(raw.author, raw.authors, info.author, info.authors),
    artist: firstText(raw.artist, raw.artists, info.artist, info.artists),
    circle: firstText(raw.circle, info.circle),
    group: firstText(raw.group, info.group),
    series: firstText(raw.series, info.series),
    serialization: firstText(raw.serialization, info.serialization),
    publication: firstText(raw.publication, raw.year, info.publication, info.year),
    genres: firstList(raw.genres, raw.genre, info.genres, info.genre),
    demographic: firstList(raw.demographic, info.demographic),
    femaleTags: firstList(raw.femaleTags, info.femaleTags),
    maleTags: firstList(raw.maleTags, info.maleTags),
    tags: firstList(raw.tags, info.tags),
    characters: firstList(raw.characters, info.characters),
    rating: firstNumber(raw.rating, info.rating),
    chapterCount: firstNumber(raw.chapterCount, info.chapterCount),
    updatedAt: getTimestamp(raw.updatedAt) || getTimestamp(info.updatedAt) || getTimestamp(info.latestUpdate) || getTimestamp(info.date),
    commissionEnabled: raw.commissionEnabled === true || info.commissionEnabled === true,
    nsfw: typeof info.nsfw === "boolean"
      ? info.nsfw
      : typeof raw.nsfw === "boolean"
        ? raw.nsfw
        : undefined,
    isDraft: raw.isDraft === true || info.isDraft === true,
    source: firstText(raw.source, info.source) || "metadata",
    origin: firstText(raw.origin, info.origin) || "metadata",
    githubSlug: firstText(raw.githubSlug, info.githubSlug) || slug,
  };
}

function mangaTitleKey(title: string): string {
  return title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function preferDuplicateManga(current: MangaRecord, candidate: MangaRecord): MangaRecord {
  if (current.managedByAdmin !== candidate.managedByAdmin) {
    return candidate.managedByAdmin ? candidate : current;
  }
  if (current.updatedAt !== candidate.updatedAt) {
    return candidate.updatedAt > current.updatedAt ? candidate : current;
  }
  const sourceRank = (source: string) =>
    source === "firestore" ? 2 : source === "hybrid" ? 1 : 0;
  return sourceRank(candidate.source) > sourceRank(current.source) ? candidate : current;
}

function dedupeMangaByTitle(items: MangaRecord[]): MangaRecord[] {
  const unique = new Map<string, MangaRecord>();
  for (const item of items) {
    const key = mangaTitleKey(item.title);
    if (!key) continue;
    const current = unique.get(key);
    unique.set(key, current ? preferDuplicateManga(current, item) : item);
  }
  return [...unique.values()];
}

function mergeMetadataRecords(
  metadataManga: MangaRecord[],
  firestoreManga: MangaRecord[],
): MangaRecord[] {
  const merged = new Map(firestoreManga.map((manga) => [manga.slug, manga]));
  const fill = <T,>(existing: T, incoming: T): T =>
    existing == null || existing === "" || (Array.isArray(existing) && existing.length === 0)
      ? incoming
      : existing;

  for (const remote of metadataManga) {
    const current = merged.get(remote.slug);
    if (!current) {
      merged.set(remote.slug, remote);
      continue;
    }
    const preferredCover = text(current.cover) || text(current.img) || text(remote.cover) || text(remote.img);
    merged.set(remote.slug, {
      ...remote,
      ...current,
      title: fill(current.title, remote.title),
      altTitle: fill(current.altTitle, remote.altTitle),
      cover: preferredCover,
      img: preferredCover,
      desc: fill(current.desc, remote.desc),
      type: fill(current.type, remote.type),
      status: fill(current.status, remote.status),
      author: fill(current.author, remote.author),
      artist: fill(current.artist, remote.artist),
      circle: fill(current.circle, remote.circle),
      group: fill(current.group, remote.group),
      series: fill(current.series, remote.series),
      serialization: fill(current.serialization, remote.serialization),
      publication: fill(current.publication, remote.publication),
      genres: fill(current.genres, remote.genres),
      demographic: fill(current.demographic, remote.demographic),
      tags: fill(current.tags, remote.tags),
      characters: fill(current.characters, remote.characters),
      rating: current.rating || remote.rating,
      githubSlug: remote.githubSlug,
      source: "hybrid",
    });
  }
  return dedupeMangaByTitle([...merged.values()])
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manga, setManga] = useState<MangaRecord[]>([]);
  const [catalogFromCache, setCatalogFromCache] = useState(false);
  const [loadingManga, setLoadingManga] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [warning, setWarning] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [metadataJsonText, setMetadataJsonText] = useState("");
  const [metadataJsonLoading, setMetadataJsonLoading] = useState(false);
  const [metadataJsonSaving, setMetadataJsonSaving] = useState(false);
  const [metadataJsonStatus, setMetadataJsonStatus] = useState("");
  const [metadataSourceMode, setMetadataSourceMode] = useState<MetadataCatalogSourceMode>("effective");
  const [metadataSourceSaving, setMetadataSourceSaving] = useState(false);
  const [metadataSourceError, setMetadataSourceError] = useState("");
  const [metadataSourceDebugCatalog, setMetadataSourceDebugCatalog] = useState<MetadataSourceDebugCatalog | null>(null);
  const [metadataSourceDebugLoading, setMetadataSourceDebugLoading] = useState(false);
  const [metadataSourceDebugError, setMetadataSourceDebugError] = useState("");
  const [metadataSourceDebugSlug, setMetadataSourceDebugSlug] = useState("");
  const metadataJsonOriginalRef = useRef("");
  const [queryText, setQueryText] = useState("");
  const [activeSection, setActiveSection] = useState<
    "dashboard" | "manga-list" | "editor" | "manga-detail" | "metadata-json" | "reports" | "announcements" | "moderation" | "genres" | "advertisements" | "settings" | "og-cover"
  >("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editing, setEditing] = useState<MangaRecord | null>(null);
  const [draft, setDraft] = useState<MangaDraft>({ ...emptyDraft });
  const [selectedManga, setSelectedManga] = useState<MangaRecord | null>(null);
  const [savedCoverOrder, setSavedCoverOrder] = useState<string[]>([]);
  const [detailTab, setDetailTab] = useState<"info" | "chapters" | "covers">("chapters");
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [message, setMessage] = useState("");
  const [isLightMode, setIsLightMode] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const [chapterEditorOpen, setChapterEditorOpen] = useState(false);
  const [editingChapterNumber, setEditingChapterNumber] = useState<string | null>(null);
  const [chapterDraft, setChapterDraft] = useState<ChapterDraft>({ ...emptyChapterDraft });
  const [chapterError, setChapterError] = useState("");
  const [reportList, setReportList] = useState<AdminReport[]>([]);
  const [reportStatus, setReportStatus] = useState("");
  const [loadingReports, setLoadingReports] = useState(false);
  const [announcementList, setAnnouncementList] = useState<AdminAnnouncement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [announcementStatus, setAnnouncementStatus] = useState("");
  const [editingAnnouncement, setEditingAnnouncement] = useState<AdminAnnouncement | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPublished, setAnnouncementPublished] = useState(true);
  const [readerNoticeConfig, setReaderNoticeConfig] = useState<ReaderServerNoticeConfig>(DEFAULT_READER_SERVER_NOTICE);
  const [loadingReaderNotice, setLoadingReaderNotice] = useState(false);
  const [readerNoticeLoaded, setReaderNoticeLoaded] = useState(false);
  const [readerNoticeStatus, setReaderNoticeStatus] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");
  const [uploadNotice, setUploadNotice] = useState<UploadNotice | null>(null);
  const [draggingCoverUrl, setDraggingCoverUrl] = useState<string | null>(null);
  const coverFileInput = useRef<HTMLInputElement>(null);
  const coverGalleryFilesInput = useRef<HTMLInputElement>(null);
  const thumbnailFileInput = useRef<HTMLInputElement>(null);
  const chapterFilesInput = useRef<HTMLInputElement>(null);
  const loadingMangaRef = useRef(false);
  const [imageReloadKey, setImageReloadKey] = useState(0);
  const chapterImageUrls = useMemo(() => {
    try {
      return extractChapterImageUrls(chapterDraft.images || "");
    } catch (err) {
      console.error("chapterImageUrls useMemo failed:", err);
      return [];
    }
  }, [chapterDraft.images]);
  const chapterManga = manga.find((item) => item.slug === chapterDraft.mangaSlug) || selectedManga;
  const generatedReaderLinkPath = chapterDraft.mangaSlug && chapterDraft.number.trim()
    ? generatedChapterPath(
        chapterDraft.mangaSlug,
        chapterDraft.number.trim(),
        isNovelSeries(chapterManga || {}),
      )
    : "";
  const generatedReaderLink = generatedReaderLinkPath;

  useEffect(() => {
    setIsLightMode(window.localStorage.getItem("theme") === "light");
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("section") === "moderation") {
      setActiveSection("moderation");
    }
  }, []);

  // Swallow benign AbortErrors (Next.js / fetch cancellation) so they don't show as red overlays
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const isAbort =
        (typeof DOMException !== "undefined" && reason instanceof DOMException && reason.name === "AbortError") ||
        (reason instanceof Error && reason.name === "AbortError") ||
        (typeof reason === "string" && /signal is aborted/i.test(reason));
      if (isAbort) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  useEffect(() => {
    if (!uploadNotice || uploadNotice.status === "uploading") return;
    const timeout = window.setTimeout(() => setUploadNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [uploadNotice]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!quickAddOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !quickAddRef.current?.contains(event.target)) {
        setQuickAddOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQuickAddOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [quickAddOpen]);

  const loadManga = useCallback(async (force = false) => {
    if (loadingMangaRef.current) return;
    const cached = readAdminMangaCache();
    const hasFreshCache =
      !force && Boolean(cached && Date.now() - cached.time < ADMIN_MANGA_CACHE_DURATION);
    if (hasFreshCache && cached) {
      setManga(cached.items);
      setCatalogFromCache(true);
      setLoadError("");
      setWarning("");
    }

    loadingMangaRef.current = true;
    if (!hasFreshCache) setLoadingManga(true);
    setCatalogFromCache(hasFreshCache);
    setLoadError("");
    setWarning("");
    setSyncStatus("Loading manga catalog...");
    try {
      const { firestore } = getAdminFirebase();
      const [summaryResult, metadataResult] = await Promise.allSettled([
        getDoc(doc(firestore, "meta", "mangaSummary")),
        loadFirestoreMangaCatalog({ force }),
      ]);

      const firestoreManga: MangaRecord[] = [];
      let summaryWarning = "";
      if (summaryResult.status === "fulfilled" && summaryResult.value.exists()) {
        const entries: unknown = summaryResult.value.data().list;
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            if (!isSummaryEntry(entry)) continue;
            firestoreManga.push(fromFirestore(entry.slug, entry));
          }
        }
      } else if (summaryResult.status === "rejected") {
        console.warn("Failed to load the Firestore manga summary.", summaryResult.reason);
        summaryWarning = `Firestore summary unavailable: ${getErrorMessage(summaryResult.reason)}.`;
      }
      if (!firestoreManga.length && !summaryWarning) {
        summaryWarning = "The Firestore summary is empty or invalid.";
      }

      const metadataManga = metadataResult.status === "fulfilled"
        ? metadataResult.value
            .map((record) => {
              const cleanRecord = { ...record };
              delete cleanRecord.__catalogDebugSources;
              delete cleanRecord.firestore;
              return mapMetadataRecord(cleanRecord);
            })
            .filter((entry): entry is MangaRecord => entry !== null)
        : [];
      if (metadataResult.status === "rejected") {
        console.warn("Failed to load the manga metadata catalog.", metadataResult.reason);
      }
      setSyncStatus(
        metadataManga.length
          ? `Loaded ${metadataManga.length} manga from the active catalog.`
          : "Active catalog is empty or unavailable.",
      );
      if (!metadataManga.length && !firestoreManga.length) {
        if (cached?.items.length) {
          setManga(cached.items);
          setCatalogFromCache(true);
          setWarning(
            `Could not load the latest catalog. Showing the local cache. ${summaryWarning} ${metadataResult.status === "rejected" ? getErrorMessage(metadataResult.reason) : ""}`.trim(),
          );
          return;
        }
        throw new Error(
          summaryWarning ||
            (metadataResult.status === "rejected"
              ? getErrorMessage(metadataResult.reason)
              : "No catalog data is available."),
        );
      }

      const loadedManga = mergeMetadataRecords(firestoreManga, metadataManga);
      setManga(loadedManga);
      setCatalogFromCache(false);
      writeAdminMangaCache(loadedManga);
      const metadataWarning = metadataResult.status === "rejected"
        ? `Manga metadata unavailable: ${getErrorMessage(metadataResult.reason)}.`
        : "";
      setWarning([summaryWarning, metadataWarning].filter(Boolean).join(" "));
    } catch (error) {
      console.error("Failed to load the admin manga list.", error);
      setSyncStatus(`Manga catalog could not load: ${getErrorMessage(error)}`);
      if (cached?.items.length) {
        setManga(cached.items);
        setCatalogFromCache(true);
        setWarning(`Could not load the latest catalog. Showing the local cache: ${getErrorMessage(error)}`);
      } else {
        setLoadError(`Failed to load manga: ${getErrorMessage(error)}`);
      }
    } finally {
      loadingMangaRef.current = false;
      setLoadingManga(false);
    }
  }, []);

  function loadMangaCache() {
    const cached = readAdminMangaCache();
    if (!cached?.items.length) {
      setWarning("No saved local manga cache is available yet.");
      return;
    }
    setManga(cached.items);
    setCatalogFromCache(true);
    setLoadError("");
    setWarning(`Loaded local cache from ${new Date(cached.time).toLocaleString()}.`);
  }

  function setMetadataSourceDebugData(
    payload: MangaMetadataPayload,
    records: MetadataSourceDebugCatalog["records"],
  ) {
    setMetadataSourceDebugCatalog({ payload, records });
    setMetadataSourceMode(payload.catalogSourceMode === "baseline" ? "baseline" : "effective");
    setMetadataSourceDebugSlug((currentSlug) =>
      records.some((record) => record.slug === currentSlug)
        ? currentSlug
        : records[0]?.slug || "",
    );
  }

  async function loadMetadataSourceDebug() {
    setMetadataSourceDebugLoading(true);
    setMetadataSourceDebugError("");
    try {
      const payload = await fetchMangaMetadataPayload({ force: true });
      const records = await loadFirestoreMangaCatalog({ force: true, payload });
      setMetadataSourceDebugData(payload, records);
    } catch (error) {
      console.error("Failed to load metadata source diagnostics.", error);
      setMetadataSourceDebugCatalog(null);
      setMetadataSourceDebugError(`Could not load source details: ${getErrorMessage(error)}`);
    } finally {
      setMetadataSourceDebugLoading(false);
    }
  }

  async function selectMetadataCatalogSource(nextSource: MetadataCatalogSourceMode) {
    if (!user || metadataSourceSaving) return;
    setMetadataSourceSaving(true);
    setMetadataSourceError("");
    try {
      if (process.env.NODE_ENV === "development") {
        setDevelopmentMangaCatalogSourceMode(nextSource);
      } else {
        const response = await fetch("/api/admin/manga-catalog-source", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sourceMode: nextSource }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null) as {
            error?: string;
            detail?: string;
          } | null;
          const message = [body?.error, body?.detail].filter(Boolean).join(" ");
          throw new Error(message || `Catalog source update returned HTTP ${response.status}.`);
        }
        const result = await response.json() as { sourceMode?: unknown };
        if (result.sourceMode !== nextSource) {
          throw new Error("The server did not confirm the requested catalog source.");
        }
      }
      setMetadataSourceMode(nextSource);
      notifyMangaMetadataUpdated();
      void loadMetadataSourceDebug();
    } catch (error) {
      console.error("Global catalog source could not be changed.", error);
      setMetadataSourceError(
        error instanceof Error ? error.message : "Catalog source could not be changed.",
      );
    } finally {
      setMetadataSourceSaving(false);
    }
  }

  async function loadMetadataJson() {
    setMetadataJsonLoading(true);
    setMetadataJsonStatus("");
    try {
      const { firestore } = getAdminFirebase();
      const sourceRef = doc(firestore, ...MANGA_METADATA_SOURCE_PATH);
      const sourceSnapshot = await getDocFromServer(sourceRef);
      let payload: MangaMetadataPayload;
      if (sourceSnapshot.exists()) {
        const content: unknown = sourceSnapshot.data().content;
        if (typeof content !== "string") {
          throw new Error("The Firestore catalog document is missing its JSON content.");
        }
        payload = parseMangaMetadataPayload(JSON.parse(content));
      } else {
        payload = await fetchMangaMetadataPayload({ force: true });
      }
      const records = await loadFirestoreMangaCatalog({ force: true, payload });
      const catalog = records.map((record) => {
        const cleanRecord = { ...record };
        delete cleanRecord.__catalogDebugSources;
        delete cleanRecord.firestore;
        return cleanRecord;
      });
      const editorPayload = {
        ...payload,
        mangaCount: catalog.length,
        manga: catalog,
      };
      let initializedCatalog = false;
      if (!sourceSnapshot.exists()) {
        const now = Date.now();
        const recoveredPayload = {
          ...editorPayload,
          exportedAt: new Date(now).toISOString(),
          exportedAtMs: now,
          type: "manga-metadata",
          includeChapters: false,
        };
        const content = JSON.stringify(recoveredPayload, null, 2);
        if (new TextEncoder().encode(content).byteLength > 900_000) {
          throw new Error("The recovered catalog is too large to store in Firestore (limit: 900 KB).");
        }
        await setDoc(sourceRef, {
          content,
          exportedAtMs: now,
          mangaCount: catalog.length,
          updatedAt: now,
        });
        scheduleSharedMangaCatalogCacheRefresh();
        initializedCatalog = true;
        setMetadataJsonText(content);
        metadataJsonOriginalRef.current = content;
      } else {
        const content = JSON.stringify(editorPayload, null, 2);
        setMetadataJsonText(content);
        metadataJsonOriginalRef.current = content;
      }
      setMetadataJsonStatus(
        initializedCatalog
          ? `Recovered ${catalog.length} manga and initialized the Firestore catalog.`
          : `Loaded ${catalog.length} manga from the active catalog.`,
      );
    } catch (error) {
      console.error("Failed to load the metadata JSON editor.", error);
      setMetadataJsonStatus(`Failed to load metadata.json: ${getErrorMessage(error)}`);
    } finally {
      setMetadataJsonLoading(false);
    }
  }

  function formatMetadataJson() {
    try {
      const parsed: unknown = JSON.parse(metadataJsonText);
      setMetadataJsonText(JSON.stringify(parsed, null, 2));
      setMetadataJsonStatus("JSON formatted. Save to publish the changes.");
    } catch (error) {
      setMetadataJsonStatus(`Invalid JSON: ${getErrorMessage(error)}`);
    }
  }

  async function saveMetadataJson() {
    setMetadataJsonSaving(true);
    setMetadataJsonStatus("");
    try {
      const parsedValue: unknown = JSON.parse(metadataJsonText);
      const payload = parseMangaMetadataPayload(parsedValue);
      if (
        !parsedValue ||
        typeof parsedValue !== "object" ||
        !("manga" in parsedValue) ||
        !Array.isArray(parsedValue.manga) ||
        payload.manga.length !== parsedValue.manga.length
      ) {
        throw new Error("Every manga entry must be a JSON object.");
      }
      if (!payload.manga.length) {
        throw new Error("The catalog must contain at least one manga entry.");
      }

      const slugs = new Set<string>();
      const records = payload.manga.map((entry, index) => {
        const mapped = mapMetadataRecord(entry);
        if (!mapped) {
          throw new Error(`Manga entry ${index + 1} needs a slug or title.`);
        }
        const slug = mapped.slug.trim();
        if (!slug || slug.includes("/") || new TextEncoder().encode(slug).byteLength > 1500) {
          throw new Error(`Manga entry ${index + 1} has an invalid slug.`);
        }
        const slugKey = slug.toLowerCase();
        if (slugs.has(slugKey)) {
          throw new Error(`The catalog contains duplicate slug "${slug}".`);
        }
        slugs.add(slugKey);
        const cleanRecord: Record<string, unknown> = { ...entry, slug };
        delete cleanRecord.firestore;
        delete cleanRecord.__catalogDebugSources;
        return {
          raw: cleanRecord,
          manga: mapMetadataRecord(cleanRecord)!,
        };
      });

      const now = Date.now();
      const updatedPayload = {
        ...payload,
        exportedAt: new Date(now).toISOString(),
        exportedAtMs: now,
        type: "manga-metadata",
        includeChapters: false,
        mangaCount: records.length,
        manga: records.map((record) => record.raw),
      };
      const content = JSON.stringify(updatedPayload, null, 2);
      if (new TextEncoder().encode(content).byteLength > 900_000) {
        throw new Error("The catalog is too large to store in Firestore (limit: 900 KB).");
      }

      const { firestore } = getAdminFirebase();
      const originalText = metadataJsonOriginalRef.current;
      if (!originalText) {
        throw new Error("Reload the active catalog before saving so changes can be compared safely.");
      }
      const previousPayload = parseMangaMetadataPayload(JSON.parse(originalText));
      const catalogRef = doc(firestore, ...MANGA_METADATA_SOURCE_PATH);
      const summaryRef = doc(firestore, "meta", "mangaSummary");
      const [sourceSnapshot, summarySnapshot] = await Promise.all([
        getDocFromServer(catalogRef),
        getDocFromServer(summaryRef),
      ]);
      if (
        sourceSnapshot.exists() &&
        typeof sourceSnapshot.data().exportedAtMs === "number" &&
        sourceSnapshot.data().exportedAtMs !== previousPayload.exportedAtMs
      ) {
        throw new Error("The catalog changed after it was loaded. Reload it before saving to avoid overwriting newer edits.");
      }

      const previousRecords = new Map<string, Record<string, unknown>>();
      for (const entry of previousPayload.manga) {
        const previous = mapMetadataRecord(entry);
        if (previous) previousRecords.set(previous.slug, entry);
      }
      const incomingSlugs = new Set(records.map((record) => record.manga.slug));
      const changedRecords = records.filter(({ raw, manga }) => {
        const previous = previousRecords.get(manga.slug);
        return !previous || JSON.stringify(raw) !== JSON.stringify(previous);
      });

      const removedSlugs = new Set<string>();
      for (const slug of previousRecords.keys()) {
        if (!incomingSlugs.has(slug)) removedSlugs.add(slug);
      }
      if (
        removedSlugs.size &&
        !window.confirm(
          `This update removes ${removedSlugs.size} manga from the catalog. Chapter data will be preserved. Continue?`,
        )
      ) {
        setMetadataJsonStatus("Save cancelled.");
        return;
      }

      const previousSummary: SummaryEntry[] = summarySnapshot.exists() && Array.isArray(summarySnapshot.data().list)
        ? summarySnapshot.data().list.filter(isSummaryEntry)
        : [];
      const previousLastChapters = new Map(
        previousSummary.map((entry) => [entry.slug, entry.lastChapter]),
      );
      const summaryList = records
        .map((record) => {
          const entry = toSummaryEntry(record.manga);
          return {
            ...entry,
            lastChapter: previousLastChapters.get(entry.slug) ?? entry.lastChapter,
          };
        })
        .sort((left, right) => right.updatedAt - left.updatedAt);
      const summaryNeedsUpdate =
        !summarySnapshot.exists() ||
        JSON.stringify(previousSummary) !== JSON.stringify(summaryList);
      const generatedFields = new Set(["exportedAt", "exportedAtMs", "mangaCount", "manga"]);
      const previousEnvelope = Object.fromEntries(
        Object.entries(previousPayload).filter(([key]) => !generatedFields.has(key)),
      );
      const nextEnvelope = Object.fromEntries(
        Object.entries(payload).filter(([key]) => !generatedFields.has(key)),
      );
      const catalogNeedsUpdate =
        changedRecords.length > 0 ||
        removedSlugs.size > 0 ||
        JSON.stringify(previousEnvelope) !== JSON.stringify(nextEnvelope);
      if (!catalogNeedsUpdate && !summaryNeedsUpdate) {
        setMetadataJsonStatus("No catalog changes to save; Firestore was not written.");
        return;
      }

      const operationCount =
        changedRecords.length +
        removedSlugs.size * 2 +
        (catalogNeedsUpdate ? 1 : 0) +
        (summaryNeedsUpdate ? 1 : 0);
      if (operationCount > 500) {
        throw new Error("This catalog requires more than 500 Firestore writes. Split the update into smaller changes.");
      }

      const batch = writeBatch(firestore);
      for (const record of changedRecords) {
        batch.set(doc(firestore, "manga", record.manga.slug), {
          ...record.raw,
          metadataUpdatedAt: now,
        });
      }
      for (const slug of removedSlugs) {
        batch.delete(doc(firestore, "manga", slug));
        const tombstoneId = `__catalog_deleted__${encodeURIComponent(slug)}`;
        batch.set(doc(firestore, "manga", tombstoneId), {
          isCatalogTombstone: true,
          deletedSlug: slug,
          metadataUpdatedAt: now + 1,
          updatedAt: now + 1,
        });
      }
      if (catalogNeedsUpdate) {
        batch.set(doc(firestore, ...MANGA_METADATA_SOURCE_PATH), {
          content,
          exportedAtMs: now,
          mangaCount: records.length,
          updatedAt: now,
        });
      }
      if (summaryNeedsUpdate) {
        batch.set(
          summaryRef,
          { list: summaryList, count: summaryList.length, updatedAt: now },
          { merge: true },
        );
      }
      await batch.commit();
      let sharedCacheWarning = "";
      if (catalogNeedsUpdate) {
        try {
          await refreshSharedMangaCatalogCache();
        } catch (error) {
          console.error("Catalog was saved, but the shared cache refresh failed.", error);
          sharedCacheWarning = ` Shared cache refresh failed: ${getErrorMessage(error)}`;
        }
      }
      notifyMangaMetadataUpdated();

      const savedRecords = records.map((record) =>
        mapMetadataRecord({ ...record.raw, metadataUpdatedAt: now }),
      ).filter((record): record is MangaRecord => record !== null);
      if (catalogNeedsUpdate) {
        setMetadataJsonText(content);
        metadataJsonOriginalRef.current = content;
      }
      setMetadataJsonStatus(
        catalogNeedsUpdate
          ? `Saved the ${savedRecords.length}-manga catalog; updated ${changedRecords.length} manga records in Firestore.${sharedCacheWarning}`
          : `Catalog unchanged; refreshed the manga summary in Firestore.${sharedCacheWarning}`,
      );
      setManga(dedupeMangaByTitle(savedRecords));
      writeAdminMangaCache(savedRecords);
      void loadFirestoreMangaCatalog({ force: true }).catch((error: unknown) => {
        console.error("Saved metadata.json, but the live catalog cache could not refresh.", error);
      });
    } catch (error) {
      console.error("Failed to save metadata.json to Firestore.", error);
      setMetadataJsonStatus(`Could not save metadata.json: ${getErrorMessage(error)}`);
    } finally {
      setMetadataJsonSaving(false);
    }
  }

  useEffect(() => {
    const { auth } = getAdminFirebase();
    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
      },
      (error) => {
        console.error("Failed to read the admin sign-in status.", error);
        setLoginError(`Failed to verify the session: ${getErrorMessage(error)}`);
        setAuthReady(true);
      },
    );
  }, []);

  useEffect(() => {
    if (user) void loadManga();
    else setManga([]);
  }, [loadManga, user]);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    body.classList.toggle("adminPageBody", Boolean(user));
    body.classList.toggle("adminLight", Boolean(user) && isLightMode);
    html.classList.toggle("adminPageHtml", Boolean(user));

    const prevPaddingTop = body.style.paddingTop;
    const prevHtmlPaddingTop = html.style.paddingTop;
    if (user) {
      body.style.setProperty("padding-top", "0px", "important");
      html.style.setProperty("padding-top", "0px", "important");
      body.style.setProperty("margin-top", "0px", "important");
    }

    return () => {
      body.classList.remove("adminPageBody");
      body.classList.remove("adminLight");
      html.classList.remove("adminPageHtml");
      body.style.paddingTop = prevPaddingTop;
      html.style.paddingTop = prevHtmlPaddingTop;
      body.style.removeProperty("margin-top");
    };
  }, [user, isLightMode]);

  useEffect(() => {
    if (activeSection === "reports" && user) void loadReports();
  }, [activeSection, user]);

  useEffect(() => {
    if (activeSection === "announcements" && user) void loadAnnouncements();
  }, [activeSection, user]);

  useEffect(() => {
    if (activeSection === "settings" && user) void loadReaderNoticeConfig();
  }, [activeSection, user]);

  const metadataSourceDebugOptions = useMemo(
    () => (metadataSourceDebugCatalog?.records || [])
      .filter((record) => record.slug)
      .map((record) => ({
        slug: record.slug,
        title: typeof record.title === "string" ? record.title : record.slug,
      }))
      .sort((left, right) => left.title.localeCompare(right.title)),
    [metadataSourceDebugCatalog],
  );

  const metadataSourceDebugInfo = useMemo(() => {
    const catalog = metadataSourceDebugCatalog;
    if (!catalog || !metadataSourceDebugSlug) return [];

    const catalogManga = catalog.payload.manga.find(
      (record) => record.slug === metadataSourceDebugSlug,
    );
    const metadataRecord = catalog.records.find(
      (record) => record.slug === metadataSourceDebugSlug,
    );
    const firestoreDeltaFound =
      metadataRecord?.__catalogDebugSources?.includes("Firestore delta") === true;
    const firestoreChapterUpdateFound =
      metadataRecord?.__catalogDebugSources?.includes("Firestore chapter update") === true;
    const catalogSourceMode =
      catalog.payload.catalogSourceMode === "baseline" ? "baseline" : "effective";
    const effectiveSource = catalogSourceMode === "baseline"
      ? firestoreChapterUpdateFound
        ? "Catalog baseline (global) + chapter update"
        : "Catalog baseline (global)"
      : firestoreDeltaFound
        ? "Firestore catalog delta (catalog baseline)"
        : metadataRecord || catalogManga
          ? "Effective catalog"
          : "none";

    return [
      `Catalog entry: ${metadataRecord ? "found" : "not found"}`,
      `Firestore catalog delta: ${
        firestoreDeltaFound ? "changed record found" : "no newer change for this manga"
      }`,
      `Firestore chapter update: ${
        firestoreChapterUpdateFound ? "chapter progress found" : "no chapter update for this manga"
      }`,
      catalogSourceMode === "baseline"
        ? `${process.env.NODE_ENV === "development" ? "Local" : "Global"} source setting: full Firestore catalog deltas are disabled; chapter-only updates are included.`
        : "Firestore per-manga metadata read: skipped; using the catalog baseline and change query",
      `Catalog primary record: ${catalogManga ? "found" : "not found"}`,
      `Effective source: ${effectiveSource}`,
    ];
  }, [metadataSourceDebugCatalog, metadataSourceDebugSlug]);

  const filteredManga = useMemo(() => {
    const titledManga = manga.filter((item) => item.title.trim().length > 0);
    const normalized = queryText.trim().toLowerCase();
    if (!normalized) return titledManga;
    return titledManga.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.slug.toLowerCase().includes(normalized) ||
        item.altTitle.toLowerCase().includes(normalized),
    );
  }, [manga, queryText]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const { auth } = getAdminFirebase();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch (error) {
      setLoginError(getLoginErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      const { auth } = getAdminFirebase();
      await signOut(auth);
      setActiveSection("dashboard");
    } catch (error) {
      setMessage(`Failed to log out: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function openNewManga() {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setMessage("");
    setActiveSection("editor");
  }

  async function openEditor(item: MangaRecord) {
    setBusy(true);
    setMessage("");
    try {
      const { firestore } = getAdminFirebase();
      const snapshot = await getDocFromServer(doc(firestore, "manga", item.slug));
      const savedManga = snapshot.exists()
        ? mergeMetadataRecords([item], [fromFirestore(item.slug, snapshot.data())])[0] || item
        : item;

      setManga((current) => {
        const next = current.map((entry) => entry.slug === savedManga.slug ? savedManga : entry);
        writeAdminMangaCache(next);
        return next;
      });
      setEditing(savedManga);
      setDraft(toDraft(savedManga));
      setSelectedManga(savedManga);
      setDetailTab("info");
      setActiveSection("manga-detail");
    } catch (error) {
      console.error("Failed to load saved manga metadata.", error);
      setMessage(`Failed to load saved metadata: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function updateDraft<K extends keyof MangaDraft>(key: K, value: MangaDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === "title" && !editing) {
      setDraft((current) => ({
        ...current,
        title: String(value),
        slug: slugify(String(value)),
      }));
    }
  }

  function updateDraftField(key: keyof MangaDraft, value: string | boolean) {
    if (key === "isDraft" || key === "commissionEnabled" || key === "nsfw") {
      if (typeof value === "boolean") updateDraft(key, value);
      return;
    }
    if (typeof value === "string") updateDraft(key, value);
  }

  async function handleSaveManga(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = draft.slug.trim() || slugify(draft.title);
    if (!draft.title.trim() || !slug) {
      setMessage("Manga title and slug are required.");
      return;
    }
    const parsedRating = Number(draft.rating);
    if (draft.rating.trim() && (!Number.isFinite(parsedRating) || parsedRating < 0 || parsedRating > 10)) {
      setMessage("Rating must be a number between 0 and 10.");
      return;
    }
    setBusy(true);
    setMessage("");
    let writeCompleted = false;
    try {
      const { firestore } = getAdminFirebase();
      const mangaRef = doc(firestore, "manga", slug);
      if (!editing || editing.slug !== slug) {
        const existing = await getDoc(mangaRef);
        if (existing.exists()) {
          setMessage(`The slug "${slug}" is already in use.`);
          setBusy(false);
          return;
        }
      }

      const updatedAt = draft.updateDate
        ? new Date(draft.updateDate).getTime()
        : Date.now();
      if (!Number.isFinite(updatedAt)) {
        setMessage("Enter a valid update date and time.");
        return;
      }
      const isGithub = Boolean(
        editing &&
          (editing.origin === "github" ||
            editing.source === "github" ||
            editing.githubSlug),
      );
      const mainCover = draft.cover.trim();
      const existingVolumes = selectedManga?.slug === slug
        ? selectedManga.covers || []
        : editing?.covers || [];
      const existingVolumeNumbers = selectedManga?.slug === slug
        ? selectedManga.coverNumbers || {}
        : editing?.coverNumbers || {};
      const covers = mainCover
        ? [mainCover, ...existingVolumes.filter((volume) => volume !== mainCover)]
        : existingVolumes;
      const coverNumbers = Object.fromEntries(
        covers
          .filter((volume) => existingVolumeNumbers[volume]?.trim())
          .map((volume) => [volume, existingVolumeNumbers[volume].trim()]),
      );
      const metadata = {
        altTitle: draft.altTitle.trim(),
        desc: draft.desc.trim(),
        type: draft.type,
        commissionEnabled: draft.commissionEnabled,
        nsfw: draft.nsfw,
        status: draft.status,
        author: draft.author.trim(),
        artist: draft.artist.trim(),
        circle: draft.circle.trim(),
        group: draft.group.trim(),
        series: draft.series.trim(),
        serialization: draft.serialization.trim(),
        publication: draft.publication.trim(),
        genres: splitList(draft.genres),
        demographic: splitList(draft.demographic),
        femaleTags: splitList(draft.femaleTags),
        maleTags: splitList(draft.maleTags),
        tags: splitList(draft.tags),
        characters: splitList(draft.characters),
        rating: draft.rating.trim() ? Math.min(10, Math.max(0, parsedRating)) : 0,
      };
      const data = {
        title: draft.title.trim(),
        cover: mainCover,
        covers,
        coverNumbers,
        coverUpdatedAt: mainCover !== editing?.cover ? Date.now() : editing?.coverUpdatedAt || 0,
        metadataUpdatedAt: Date.now(),
        ...metadata,
        metadata,
        isDraft: draft.isDraft,
        managedByAdmin: true,
        origin: isGithub ? "github" : "firestore",
        source: isGithub ? "hybrid" : "firestore",
        ...(editing?.githubSlug ? { githubSlug: editing.githubSlug } : {}),
        ...(editing ? { chapterCount: editing.chapterCount } : { chapterCount: 0 }),
        updatedAt,
        latestUpdate: updatedAt,
      };
      const saveBatch = writeBatch(firestore);
      saveBatch.set(mangaRef, data, { merge: true });
      saveBatch.delete(
        doc(firestore, "manga", `__catalog_deleted__${encodeURIComponent(slug)}`),
      );
      await saveBatch.commit();
      scheduleSharedMangaCatalogCacheRefresh();
      writeCompleted = true;

      const savedSnapshot = await getDocFromServer(mangaRef);
      if (!savedSnapshot.exists()) {
        throw new Error("Firestore did not return the saved manga document.");
      }
      const savedData = savedSnapshot.data();
      const savedMetadata = savedData.metadata;
      if (!savedMetadata || typeof savedMetadata !== "object" || Array.isArray(savedMetadata)) {
        throw new Error("Firestore did not return the saved metadata object.");
      }
      const savedMetadataRecord = savedMetadata as Record<string, unknown>;
      const unverifiedFields = Object.entries(metadata)
        .filter(([key, value]) => JSON.stringify(savedMetadataRecord[key]) !== JSON.stringify(value))
        .map(([key]) => key);
      if (unverifiedFields.length) {
        throw new Error(`Firestore did not confirm these metadata fields: ${unverifiedFields.join(", ")}.`);
      }
      const savedManga = fromFirestore(slug, savedData);

      setManga((current) => {
        const next = mergeMetadataRecords(
          current
            .filter((item) => item.slug !== editing?.slug && item.slug !== slug)
            .filter((item) => item.source !== "github" || item.slug !== slug),
          [savedManga],
        );
        writeAdminMangaCache(next);
        return next;
      });

      void syncSeoToKv({
        slug,
        title: draft.title.trim(),
        description: draft.desc.trim(),
        cover: mainCover,
        updatedAt,
      });

      try {
        const summaryResult = await updateSummary(firestore, savedManga);
        setMessage(
          summaryResult === "ok"
            ? "Manga saved successfully."
            : "Manga saved. Summary skipped (Firestore quota). Use Rebuild Summary later.",
        );
      } catch (error) {
        console.error("Failed to update the manga summary.", error);
        setMessage(
          `Manga saved, but the summary could not be updated: ${getErrorMessage(error)}`,
        );
      }
      setEditing(savedManga);
      setSelectedManga(savedManga);
      setDraft(toDraft(savedManga));
      if (selectedManga?.slug === savedManga.slug) {
        setDetailTab("info");
        setActiveSection("manga-detail");
      } else {
        setActiveSection("manga-list");
      }
    } catch (error) {
      console.error(writeCompleted ? "Manga saved but metadata verification failed." : "Failed to save the manga.", error);
      setMessage(
        writeCompleted
          ? `Manga was written, but Firestore did not verify its metadata: ${getErrorMessage(error)}`
          : `Failed to save manga: ${getErrorMessage(error)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateTimestamp() {
    if (!editing) return;
    const updatedAt = draft.updateDate
      ? new Date(draft.updateDate).getTime()
      : Date.now();
    if (!Number.isFinite(updatedAt)) {
      setMessage("Enter a valid update date and time.");
      return;
    }
    if (!window.confirm(`Update timestamp to ${new Date(updatedAt).toLocaleString()}?`)) return;

    setBusy(true);
    setMessage("");
    try {
      const { firestore } = getAdminFirebase();
      const isGithub = editing.origin === "github" ||
        editing.source === "github" ||
        Boolean(editing.githubSlug);
      const timestampData = {
        updatedAt,
        latestUpdate: updatedAt,
        metadataUpdatedAt: Date.now(),
        managedByAdmin: true,
        ...(isGithub ? {
          title: editing.title,
          cover: editing.cover,
          desc: editing.desc,
          type: editing.type,
          status: editing.status,
          genres: editing.genres,
          chapterCount: editing.chapterCount,
          origin: "github",
          source: "hybrid",
          githubSlug: editing.githubSlug || editing.slug,
        } : {}),
      };
      await setDoc(doc(firestore, "manga", editing.slug), timestampData, { merge: true });
      scheduleSharedMangaCatalogCacheRefresh();

      const updatedManga = fromFirestore(editing.slug, {
        ...editing,
        ...timestampData,
      });
      setManga((current) => current.map((item) =>
        item.slug === updatedManga.slug ? updatedManga : item,
      ));
      setEditing(updatedManga);
      setSelectedManga(updatedManga);
      setDraft((current) => ({
        ...current,
        updateDate: toDateTimeInput(updatedAt),
      }));
      setManga((current) => {
        const next = current.map((item) =>
          item.slug === updatedManga.slug ? updatedManga : item,
        );
        writeAdminMangaCache(next);
        return next;
      });

      try {
        const summaryResult = await updateSummary(firestore, updatedManga);
        setMessage(
          summaryResult === "ok"
            ? "Manga timestamp updated successfully."
            : "Timestamp saved. Summary skipped (Firestore quota).",
        );
      } catch (error) {
        console.error("Failed to update the manga summary.", error);
        setMessage(`Timestamp saved, but the summary could not be updated: ${getErrorMessage(error)}`);
      }
    } catch (error) {
      console.error("Failed to update the manga timestamp.", error);
      setMessage(`Failed to update timestamp: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteManga(item: MangaRecord) {
    if (!window.confirm(`Delete manga "${item.slug}" and all of its chapters?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const { firestore } = getAdminFirebase();
      const chaptersRef = collection(firestore, "manga", item.slug, "chapters");
      let chapterBatch = await getDocs(query(chaptersRef, limit(450)));
      while (!chapterBatch.empty) {
        const batch = writeBatch(firestore);
        chapterBatch.docs.forEach((chapter) => batch.delete(chapter.ref));
        await batch.commit();
        chapterBatch = await getDocs(query(chaptersRef, limit(450)));
      }
      const deleteBatch = writeBatch(firestore);
      const deletedAt = Date.now();
      deleteBatch.delete(doc(firestore, "manga", item.slug));
      deleteBatch.set(
        doc(
          firestore,
          "manga",
          `__catalog_deleted__${encodeURIComponent(item.slug)}`,
        ),
        {
          isCatalogTombstone: true,
          deletedSlug: item.slug,
          metadataUpdatedAt: deletedAt,
          updatedAt: deletedAt,
        },
      );
      await deleteBatch.commit();
      scheduleSharedMangaCatalogCacheRefresh();
      setManga((current) => {
        const next = current.filter((entry) => entry.slug !== item.slug);
        writeAdminMangaCache(next);
        return next;
      });
      try {
        const summaryResult = await updateSummary(firestore, item, true);
        setMessage(
          summaryResult === "ok"
            ? `Manga "${item.slug}" and its chapters were deleted successfully.`
            : `Manga deleted. Summary skipped (Firestore quota). Rebuild Summary later.`,
        );
      } catch (error) {
        console.error("Failed to update the manga summary after deletion.", error);
        setMessage(
          `Manga deleted, but the summary could not be updated: ${getErrorMessage(error)}`,
        );
      }
    } catch (error) {
      console.error("Failed to delete manga.", error);
      setMessage(`Failed to delete manga: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadReports() {
    setLoadingReports(true);
    setReportStatus("");
    try {
      const { firestore } = getAdminFirebase();
      const snapshot = await getDocs(
        query(
          collection(firestore, "chapterReports"),
          where("status", "==", "pending"),
          limit(100),
        ),
      );
      const reports = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            id: item.id,
            slug: text(data.slug) || "-",
            chapter: text(data.chapter) || "-",
            type: text(data.type) || "-",
            reason: text(data.reason) || "-",
            url: text(data.url),
            createdAt: data.createdAt,
          };
        })
        .sort((left, right) => getTimestamp(right.createdAt) - getTimestamp(left.createdAt));
      setReportList(reports);
      setReportStatus(reports.length ? `${reports.length} reports are awaiting review.` : "There are no pending reports.");
    } catch (error) {
      console.error("Failed to load chapter reports.", error);
      setReportStatus(`Failed to load reports: ${getErrorMessage(error)}`);
    } finally {
      setLoadingReports(false);
    }
  }

  async function loadAnnouncements() {
    setLoadingAnnouncements(true);
    setAnnouncementStatus("");
    try {
      const { firestore } = getAdminFirebase();
      const snapshot = await getDocs(collection(firestore, "announcements"));
      const announcements = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            id: item.id,
            title: text(data.title),
            content: text(data.content),
            published: data.published === true,
            createdAt: data.createdAt,
            publishedAt: data.publishedAt,
            updatedAt: data.updatedAt,
          };
        })
        .sort((left, right) => getTimestamp(right.updatedAt || right.createdAt) - getTimestamp(left.updatedAt || left.createdAt));
      setAnnouncementList(announcements);
      setAnnouncementStatus(
        announcements.length
          ? `${announcements.length} announcement${announcements.length === 1 ? "" : "s"} found.`
          : "There are no announcements yet.",
      );
      return true;
    } catch (error) {
      console.error("Failed to load announcements.", error);
      setAnnouncementStatus(`Failed to load announcements: ${getErrorMessage(error)}`);
      return false;
    } finally {
      setLoadingAnnouncements(false);
    }
  }

  async function loadReaderNoticeConfig() {
    setLoadingReaderNotice(true);
    setReaderNoticeLoaded(false);
    setReaderNoticeStatus("");
    try {
      const { firestore } = getAdminFirebase();
      const snapshot = await getDoc(doc(firestore, "meta", "mangaSummary"));
      const savedConfig = snapshot.exists() ? snapshot.data().readerServerNotice : null;
      setReaderNoticeConfig(savedConfig
        ? normalizeReaderServerNoticeConfig(savedConfig)
        : DEFAULT_READER_SERVER_NOTICE);
      setReaderNoticeStatus(savedConfig
        ? "Reader notice settings loaded."
        : "No saved settings yet. The default notice is shown.");
      setReaderNoticeLoaded(true);
    } catch (error) {
      console.error("Failed to load reader notice settings.", error);
      setReaderNoticeStatus(`Failed to load reader notice settings: ${getErrorMessage(error)}`);
    } finally {
      setLoadingReaderNotice(false);
    }
  }

  async function saveReaderNoticeConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readerNoticeConfig.code.length > 50_000) {
      setReaderNoticeStatus("Notice code must be 50,000 characters or fewer.");
      return;
    }
    setBusy(true);
    setReaderNoticeStatus("");
    try {
      const { firestore } = getAdminFirebase();
      await setDoc(
        doc(firestore, "meta", "mangaSummary"),
        {
          readerServerNotice: readerNoticeConfig,
          r9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8: Date.now(),
        },
        { merge: true },
      );
      setReaderNoticeStatus("Reader notice settings saved.");
    } catch (error) {
      console.error("Failed to save reader notice settings.", error);
      setReaderNoticeStatus(`Failed to save reader notice settings: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function editAnnouncement(announcement: AdminAnnouncement) {
    setEditingAnnouncement(announcement);
    setAnnouncementTitle(announcement.title);
    setAnnouncementContent(announcement.content);
    setAnnouncementPublished(announcement.published);
    setAnnouncementStatus("");
  }

  function resetAnnouncementForm() {
    setEditingAnnouncement(null);
    setAnnouncementTitle("");
    setAnnouncementContent("");
    setAnnouncementPublished(true);
    setAnnouncementStatus("");
  }

  async function saveAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = announcementTitle.trim();
    const content = announcementContent.trim();
    if (!title || !content) {
      setAnnouncementStatus("A title and message are required.");
      return;
    }

    setBusy(true);
    setAnnouncementStatus("");
    const wasEditing = Boolean(editingAnnouncement);
    const successMessage = wasEditing ? "Announcement updated." : "Announcement created.";
    try {
      const { firestore } = getAdminFirebase();
      const now = Date.now();
      if (editingAnnouncement) {
        await updateDoc(doc(firestore, "announcements", editingAnnouncement.id), {
          title,
          content,
          published: announcementPublished,
          publishedAt: announcementPublished
            ? getTimestamp(editingAnnouncement.publishedAt) || now
            : null,
          updatedAt: now,
        });
      } else {
        const announcementRef = doc(collection(firestore, "announcements"));
        await setDoc(announcementRef, {
          title,
          content,
          published: announcementPublished,
          createdAt: now,
          publishedAt: announcementPublished ? now : null,
          updatedAt: now,
        });
      }
      resetAnnouncementForm();
      const refreshed = await loadAnnouncements();
      setAnnouncementStatus(
        refreshed
          ? successMessage
          : "Announcement was saved, but the list could not be refreshed. Use Refresh to verify it.",
      );
    } catch (error) {
      console.error("Failed to save announcement.", error);
      setAnnouncementStatus(`Failed to save announcement: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function removeAnnouncement(announcement: AdminAnnouncement) {
    if (!window.confirm(`Delete the announcement "${announcement.title}"? This cannot be undone.`)) return;
    setBusy(true);
    setAnnouncementStatus("");
    try {
      const { firestore } = getAdminFirebase();
      await deleteDoc(doc(firestore, "announcements", announcement.id));
      setAnnouncementList((current) => current.filter((item) => item.id !== announcement.id));
      if (editingAnnouncement?.id === announcement.id) resetAnnouncementForm();
      setAnnouncementStatus("Announcement deleted.");
    } catch (error) {
      console.error("Failed to delete announcement.", error);
      setAnnouncementStatus(`Failed to delete announcement: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function resolveReport(report: AdminReport) {
    if (!window.confirm(`Mark the report for chapter ${report.chapter} as resolved?`)) return;
    setBusy(true);
    setReportStatus("");
    try {
      const { firestore, auth } = getAdminFirebase();
      await updateDoc(doc(firestore, "chapterReports", report.id), {
        status: "resolved",
        resolvedAt: Date.now(),
        resolvedBy: auth.currentUser?.email || "admin",
      });
      setReportList((current) => current.filter((item) => item.id !== report.id));
      setReportStatus("Report marked as resolved.");
    } catch (error) {
      console.error("Failed to update the report.", error);
      setReportStatus(`Failed to update report: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function rebuildSummary() {
    setBusy(true);
    setSettingsStatus("Rebuilding the manga summary...");
    try {
      const { firestore } = getAdminFirebase();
      const entries = manga
        .map(toSummaryEntry)
        .sort((left, right) => right.updatedAt - left.updatedAt);
      await setDoc(
        doc(firestore, "meta", "mangaSummary"),
        { list: entries, count: entries.length, updatedAt: Date.now() },
        { merge: true },
      );
      setSettingsStatus(`Summary updated successfully: ${entries.length} manga.`);
    } catch (error) {
      console.error("Failed to rebuild the manga summary.", error);
      setSettingsStatus(`Failed to rebuild summary: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function downloadJson(filename: string, payload: unknown) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function backupFirestore(includeChapters: boolean) {
    setBusy(true);
    setSettingsStatus(
      includeChapters
        ? "Creating a manga and chapter backup..."
        : "Creating a manga metadata backup...",
    );
    try {
      const { firestore } = getAdminFirebase();
      const mangaSnapshot = await getDocs(collection(firestore, "manga"));
      const mangaData: Array<Record<string, unknown>> = [];
      let chapterCount = 0;
      for (const mangaDoc of mangaSnapshot.docs) {
        const source = mangaDoc.data();
        if (source.isCatalogTombstone === true) continue;
        const metadata = Object.fromEntries(
          Object.entries(source).filter(([key]) =>
            key !== "chapters" &&
            key !== "_chapters" &&
            !key.startsWith("chapters.") &&
            !key.startsWith("_chapters."),
          ),
        );
        const record: Record<string, unknown> = {
          id: mangaDoc.id,
          ...(includeChapters ? source : metadata),
        };
        if (includeChapters) {
          const chapters = await getDocs(
            collection(firestore, "manga", mangaDoc.id, "chapters"),
          );
          record._chapters = Object.fromEntries(
            chapters.docs.map((chapter) => [chapter.id, chapter.data()]),
          );
          chapterCount += chapters.size;
        }
        mangaData.push(record);
        setSettingsStatus(`Processing manga ${mangaData.length}/${mangaSnapshot.size}...`);
      }
      const now = new Date();
      const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadJson(
        `mikoroku-backup-${includeChapters ? "full" : "metadata"}-${stamp}.json`,
        {
          exportedAt: now.toISOString(),
          exportedAtMs: now.getTime(),
          type: includeChapters ? "full" : "manga-metadata",
          includeChapters,
          mangaCount: mangaData.length,
          ...(includeChapters ? { chapterCount } : {}),
          manga: mangaData,
        },
      );
      setSettingsStatus(
        includeChapters
          ? `Full backup completed: ${mangaData.length} manga and ${chapterCount} chapters.`
          : `Metadata backup completed: ${mangaData.length} manga.`,
      );
    } catch (error) {
      console.error("Firestore backup failed.", error);
      setSettingsStatus(`Backup failed: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function exportAllStaticChapterSummaries() {
    setBusy(true);
    setSettingsStatus("Scanning all manga chapter collections...");
    try {
      const { firestore } = getAdminFirebase();
      const mangaSnapshot = await getDocs(collection(firestore, "manga"));
      const series: Record<string, AdminChapterLink[]> = {};
      let scannedManga = 0;
      let exportedChapterCount = 0;

      for (const mangaDocument of mangaSnapshot.docs) {
        const mangaData = mangaDocument.data();
        if (mangaData.isCatalogTombstone === true) continue;

        const chapterSnapshot = await getDocs(
          collection(firestore, "manga", mangaDocument.id, "chapters"),
        );
        const chapters = chapterSnapshot.docs
          .map((chapterDocument) => {
            const data = chapterDocument.data();
            return {
              num: chapterDocument.id,
              title: text(data.title) || `Chapter ${chapterDocument.id}`,
              thumbnail: text(data.thumbnail),
              images: stringList(data.images),
              content: text(data.content),
              isDraft: data.isDraft === true,
              date: data.date || data.createdAt,
              order: typeof data.order === "number" ? data.order : 0,
            } satisfies AdminChapter;
          })
          .filter((chapter) => !chapter.isDraft)
          .sort((left, right) => {
            const difference = Number.parseFloat(right.num) - Number.parseFloat(left.num);
            return Number.isFinite(difference) && difference !== 0
              ? difference
              : right.order - left.order;
          });

        if (chapters.length) {
          series[mangaDocument.id] = chapters.map((chapter, order) =>
            generatedChapterLink(
              mangaDocument.id,
              isNovelSeries(mangaData),
              chapter,
              order,
            ),
          );
          exportedChapterCount += chapters.length;
        }

        scannedManga += 1;
        setSettingsStatus(
          `Scanned ${scannedManga}/${mangaSnapshot.size} manga; ${exportedChapterCount} chapters found...`,
        );
      }

      downloadJson("chapter-summaries-all.json", { series });
      setSettingsStatus(
        `Static chapter export completed: ${Object.keys(series).length} manga and ${exportedChapterCount} chapters.`,
      );
    } catch (error) {
      console.error("Failed to export static chapter summaries.", error);
      setSettingsStatus(`Static chapter export failed: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function exportSeriesStatisticsJson() {
    setBusy(true);
    setSettingsStatus("Loading series statistics from Firestore...");
    try {
      const firestore = getSeriesStatisticsFirestore();
      const snapshot = await getDocs(collection(firestore, "seriesStats"));
      const series: Record<string, {
        views: number;
        bookmarks: number;
        notifications: number;
      }> = {};

      for (const statisticsDocument of snapshot.docs) {
        let slug: string;
        try {
          slug = decodeURIComponent(statisticsDocument.id);
        } catch {
          throw new Error(`Invalid encoded series statistics document ID: ${statisticsDocument.id}`);
        }
        if (!slug) {
          throw new Error(`Series statistics document "${statisticsDocument.id}" has no series slug.`);
        }
        const data = statisticsDocument.data();
        const count = (key: "views" | "bookmarks" | "notifications") =>
          typeof data[key] === "number" &&
            Number.isSafeInteger(data[key]) &&
            data[key] >= 0
            ? data[key]
            : 0;
        series[slug] = {
          views: count("views"),
          bookmarks: count("bookmarks"),
          notifications: count("notifications"),
        };
      }

      const exportedAt = new Date();
      downloadJson("series-statistics.json", {
        exportedAt: exportedAt.toISOString(),
        exportedAtMs: exportedAt.getTime(),
        series,
      });
      setSettingsStatus(
        `Series statistics JSON exported: ${Object.keys(series).length} series. Replace public/series-statistics.json with this file and deploy it to publish the counts.`,
      );
    } catch (error) {
      console.error("Failed to export series statistics JSON.", error);
      setSettingsStatus(`Series statistics export failed: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function toggleTheme() {
    setIsLightMode((current) => {
      const next = !current;
      window.localStorage.setItem("theme", next ? "light" : "dark");
      return next;
    });
  }

  function openNewChapterEditor() {
    setEditingChapterNumber(null);
    setChapterDraft({ ...emptyChapterDraft });
    setChapterError("");
    setUploadNotice(null);
    setQuickAddOpen(false);
    setChapterEditorOpen(true);
  }

  async function uploadCoverFile(file = coverFileInput.current?.files?.[0]) {
    if (!file) {
      setUploadNotice({ status: "error", message: "Choose a cover image file first." });
      return;
    }
    setBusy(true);
    setUploadNotice({ status: "uploading", message: "Uploading cover..." });
    try {
      const url = await uploadToImgBB(file);
      setDraft((current) => ({ ...current, cover: url }));
      setUploadNotice({ status: "success", message: "Cover uploaded successfully." });
    } catch (error) {
      console.error("Failed to upload the cover.", error);
      setUploadNotice({ status: "error", message: `Cover upload failed: ${getErrorMessage(error)}` });
    } finally {
      if (coverFileInput.current) coverFileInput.current.value = "";
      setBusy(false);
    }
  }

  async function saveMangaCoverList(covers: string[], coverNumbers = selectedManga?.coverNumbers || {}) {
    if (!selectedManga) throw new Error("Choose a manga before managing its covers.");
    const nextCovers = [...new Set(covers.filter((url) => /^https?:\/\//i.test(url)))];
    const nextCoverNumbers = Object.fromEntries(
      nextCovers
        .filter((url) => coverNumbers[url]?.trim())
        .map((url) => [url, coverNumbers[url].trim()]),
    );
    const { firestore } = getAdminFirebase();
    const mainCover = nextCovers[nextCovers.length - 1] || selectedManga.cover;
    const metadataUpdatedAt = Date.now();
    await setDoc(
      doc(firestore, "manga", selectedManga.slug),
      {
        slug: selectedManga.slug,
        title: selectedManga.title,
        cover: mainCover,
        covers: nextCovers,
        coverNumbers: nextCoverNumbers,
        coverUpdatedAt: metadataUpdatedAt,
        metadataUpdatedAt,
      },
      { merge: true },
    );
    scheduleSharedMangaCatalogCacheRefresh();

    const updatedManga = {
      ...selectedManga,
      cover: mainCover,
      covers: nextCovers,
      coverNumbers: nextCoverNumbers,
      coverUpdatedAt: metadataUpdatedAt,
    };
    setSelectedManga(updatedManga);
    setSavedCoverOrder(nextCovers);
    const updatedCatalog = manga.map((item) => item.slug === updatedManga.slug ? updatedManga : item);
    setManga(updatedCatalog);
    writeAdminMangaCache(updatedCatalog);

    if (mainCover) {
      void syncSeoToKv({
        slug: selectedManga.slug,
        title: selectedManga.title,
        description: selectedManga.desc || "",
        cover: mainCover,
        updatedAt: Date.now(),
      });
    }
  }

  async function uploadAdditionalCovers() {
    const files = Array.from(coverGalleryFilesInput.current?.files || []);
    if (coverGalleryFilesInput.current) coverGalleryFilesInput.current.value = "";
    if (!selectedManga || !files.length) {
      setUploadNotice({ status: "error", message: "Choose one or more cover images first." });
      return;
    }
    setBusy(true);
    const uploaded: string[] = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        setUploadNotice({
          status: "uploading",
          message: `Uploading cover ${index + 1} of ${files.length}...`,
        });
        uploaded.push(await uploadToImgBB(files[index]));
      }
      await saveMangaCoverList([...(selectedManga.covers || []), ...uploaded]);
      setUploadNotice({
        status: "success",
        message: `${uploaded.length} cover${uploaded.length === 1 ? "" : "s"} uploaded and saved.`,
      });
    } catch (error) {
      console.error(`Failed to save additional covers for ${selectedManga.slug}.`, error);
      setUploadNotice({
        status: "error",
        message: `Cover upload or save failed: ${getErrorMessage(error)}${uploaded.length ? " Some uploaded images may not have been added to the gallery." : ""}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeAdditionalCover(url: string) {
    if (!selectedManga || busy) return;
    if (!window.confirm("Remove this cover from the series gallery?")) return;
    setBusy(true);
    setUploadNotice({ status: "uploading", message: "Removing cover..." });
    try {
      const nextCovers = (selectedManga.covers || []).filter((cover) => cover !== url);
      const nextCoverNumbers = { ...selectedManga.coverNumbers };
      delete nextCoverNumbers[url];
      await saveMangaCoverList(nextCovers, nextCoverNumbers);
      setUploadNotice({ status: "success", message: "Cover removed from the series gallery." });
    } catch (error) {
      console.error(`Failed to remove a cover from ${selectedManga.slug}.`, error);
      setUploadNotice({ status: "error", message: `Could not remove cover: ${getErrorMessage(error)}` });
    } finally {
      setBusy(false);
    }
  }

  function reorderCoverInMemory(fromUrl: string, toIndex: number): string[] | null {
    const covers = [...(selectedManga?.covers || [])];
    const fromIndex = covers.indexOf(fromUrl);
    if (fromIndex < 0 || toIndex < 0 || toIndex >= covers.length || fromIndex === toIndex) return null;
    const next = [...covers];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setSelectedManga((current) => {
      if (!current || current.slug !== selectedManga?.slug) return current;
      return { ...current, cover: next[next.length - 1] || current.cover, covers: next };
    });
    return next;
  }

  function handleVolumeDragStart(event: DragEvent<HTMLElement>, url: string) {
    if (busy) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", url);
    event.dataTransfer.effectAllowed = "move";
    setDraggingCoverUrl(url);

    const img = event.currentTarget.querySelector("img");
    if (img) {
      const ghost = img.cloneNode(true) as HTMLImageElement;
      ghost.style.width = "110px";
      ghost.style.height = "150px";
      ghost.style.objectFit = "cover";
      ghost.style.borderRadius = "8px";
      ghost.style.boxShadow = "0 18px 40px rgba(0,0,0,0.55)";
      ghost.style.position = "absolute";
      ghost.style.top = "-9999px";
      ghost.style.left = "-9999px";
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, 55, 75);
      window.setTimeout(() => ghost.remove(), 0);
    }
  }

  function handleVolumeDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleVolumeDrop(event: DragEvent<HTMLElement>, toIndex: number) {
    event.preventDefault();
    const fromUrl = event.dataTransfer.getData("text/plain");
    if (!fromUrl) return;
    reorderCoverInMemory(fromUrl, toIndex);
    setDraggingCoverUrl(null);
  }

  function handleVolumeDragEnd() {
    setDraggingCoverUrl(null);
  }

  async function saveCoverOrder() {
    if (!selectedManga || busy) return;
    setBusy(true);
    setUploadNotice({ status: "uploading", message: "Saving volume order..." });
    try {
      await saveMangaCoverList(selectedManga.covers || []);
      setUploadNotice({ status: "success", message: "Volume order saved." });
    } catch (error) {
      console.error(`Failed to reorder volumes for ${selectedManga.slug}.`, error);
      setUploadNotice({ status: "error", message: `Could not save volume order: ${getErrorMessage(error)}` });
    } finally {
      setBusy(false);
    }
  }

  const currentCoverOrder = selectedManga?.covers || [];
  const coverOrderChanged = currentCoverOrder.length !== savedCoverOrder.length ||
    currentCoverOrder.some((url, index) => url !== savedCoverOrder[index]);

  async function saveCoverNumber(url: string, number: string) {
    if (!selectedManga || busy) return;
    const coverNumbers = { ...selectedManga.coverNumbers, [url]: number };
    setSelectedManga({ ...selectedManga, coverNumbers });
    setBusy(true);
    try {
      await saveMangaCoverList(selectedManga.covers || [], coverNumbers);
    } catch (error) {
      console.error(`Failed to save volume number for ${selectedManga.slug}.`, error);
      setUploadNotice({ status: "error", message: `Could not save volume number: ${getErrorMessage(error)}` });
    } finally {
      setBusy(false);
    }
  }

  async function uploadThumbnailFile() {
    const file = thumbnailFileInput.current?.files?.[0];
    if (!file) {
      setUploadNotice({ status: "error", message: "Choose a thumbnail image file first." });
      return;
    }
    setBusy(true);
    setUploadNotice({ status: "uploading", message: "Uploading thumbnail..." });
    try {
      const url = await uploadToImgBB(file);
      setChapterDraft((current) => ({ ...current, thumbnail: url }));
      setUploadNotice({ status: "success", message: "Thumbnail uploaded successfully." });
      if (thumbnailFileInput.current) thumbnailFileInput.current.value = "";
    } catch (error) {
      console.error("Failed to upload the thumbnail.", error);
      setUploadNotice({ status: "error", message: `Thumbnail upload failed: ${getErrorMessage(error)}` });
    } finally {
      setBusy(false);
    }
  }

  async function uploadChapterFiles() {
    const files = Array.from(chapterFilesInput.current?.files ?? []).sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }),
    );
    if (!files.length) {
      setUploadNotice({ status: "error", message: "Choose one or more chapter images first." });
      return;
    }
    setBusy(true);
    setChapterError("");
    const uploaded: string[] = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        setUploadNotice({
          status: "uploading",
          message: `Uploading image ${index + 1} of ${files.length}...`,
        });
        uploaded.push(await uploadToImgBB(files[index]));
        setChapterDraft((current) => ({
          ...current,
          images: [...current.images.split(/\r?\n/).map((url) => url.trim()).filter(Boolean), uploaded[uploaded.length - 1]].join("\n"),
          thumbnail:
            current.thumbnail ||
            uploaded[Math.min(2, uploaded.length - 1)],
        }));
      }
      setUploadNotice({
        status: "success",
        message: `${uploaded.length} chapter image${uploaded.length === 1 ? "" : "s"} uploaded successfully.`,
      });
      if (chapterFilesInput.current) chapterFilesInput.current.value = "";
    } catch (error) {
      console.error("Failed to upload chapter images.", error);
      setUploadNotice({
        status: "error",
        message: uploaded.length
          ? `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded; the next upload failed: ${getErrorMessage(error)}`
          : `Image upload failed: ${getErrorMessage(error)}`,
      });
    } finally {
      setBusy(false);
    }
  }

  function addChapterImageUrls() {
    const uniqueUrls = extractChapterImageUrls(chapterDraft.images).slice(0, 200);
    setChapterDraft((current) => ({
      ...current,
      images: uniqueUrls.join("\n"),
      thumbnail: current.thumbnail || uniqueUrls[Math.min(2, uniqueUrls.length - 1)] || "",
    }));
  }

  function pasteChapterImages(event: ClipboardEvent<HTMLTextAreaElement>) {
    try {
      const clipboardHtml = event.clipboardData.getData("text/html") || "";
      const clipboardText = event.clipboardData.getData("text/plain") || "";
      const preferText = clipboardText.length > 0 && (
        clipboardText.includes("blogger.googleusercontent.com") ||
        clipboardText.includes("http") && clipboardHtml.length > 100_000
      );
      const rawContent = preferText || !/<img\b/i.test(clipboardHtml)
        ? clipboardText.slice(0, 500_000)
        : clipboardHtml.slice(0, 500_000);
      const pastedContent = repairBrokenImageUrls(rawContent);

      const pastedUrls = extractChapterImageUrls(pastedContent);
      if (!pastedUrls.length) return;

      event.preventDefault();
      setChapterDraft((current) => {
        try {
          const existing = extractChapterImageUrls(current.images || "");
          const images = [...new Set([...existing, ...pastedUrls])].slice(0, 200);
          return {
            ...current,
            images: images.join("\n"),
            thumbnail: current.thumbnail || images[Math.min(2, images.length - 1)] || "",
          };
        } catch (inner) {
          console.error("pasteChapterImages state update failed:", inner);
          return current;
        }
      });
    } catch (err) {
      console.error("pasteChapterImages failed:", err);
    }
  }

  function sortChapterImages() {
    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    const sorted = [...chapterImageUrls].sort((left, right) =>
      collator.compare(imageFileName(left), imageFileName(right)),
    );
    setChapterDraft((current) => ({ ...current, images: sorted.join("\n") }));
  }

  function moveChapterImage(index: number, offset: number) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= chapterImageUrls.length) return;
    const nextImages = [...chapterImageUrls];
    [nextImages[index], nextImages[nextIndex]] = [nextImages[nextIndex], nextImages[index]];
    setChapterDraft((current) => ({ ...current, images: nextImages.join("\n") }));
  }

  function removeChapterImage(index: number) {
    setChapterDraft((current) => ({
      ...current,
      images: chapterImageUrls.filter((_, imageIndex) => imageIndex !== index).join("\n"),
    }));
  }

  function updateChapterImageUrl(index: number, newUrl: string) {
    const next = [...chapterImageUrls];
    next[index] = newUrl.trim();
    setChapterDraft((current) => ({
      ...current,
      images: next.join("\n"),
    }));
  }

  async function copyChapterImageUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setUploadNotice({ status: "success", message: "URL copied to clipboard." });
    } catch {
      setUploadNotice({ status: "error", message: "Failed to copy URL." });
    }
  }

  async function copyGeneratedReaderLink() {
    if (!generatedReaderLink) return;
    try {
      await navigator.clipboard.writeText(generatedReaderLink);
      setUploadNotice({ status: "success", message: "Chapter link copied to clipboard." });
    } catch {
      setUploadNotice({ status: "error", message: "Failed to copy chapter link." });
    }
  }

  async function openMangaChapters(item: MangaRecord) {
    const initialVolumes = item.covers?.length ? item.covers : [item.cover].filter(Boolean);
    setSelectedManga({ ...item, cover: initialVolumes[initialVolumes.length - 1] || item.cover, covers: initialVolumes });
    setSavedCoverOrder(initialVolumes);
    setDetailTab("chapters");
    setActiveSection("manga-detail");
    setLoadingChapters(true);
    setChapters([]);
    try {
      const { firestore } = getAdminFirebase();
      const snapshot = await getDocs(
        collection(firestore, "manga", item.slug, "chapters"),
      );
      const mangaSnapshot = await getDoc(doc(firestore, "manga", item.slug));
      const savedVolumes = mangaSnapshot.exists() ? stringList(mangaSnapshot.data().covers) : [];
      const savedVolumeNumbers = mangaSnapshot.exists() && mangaSnapshot.data().coverNumbers &&
        typeof mangaSnapshot.data().coverNumbers === "object"
        ? Object.fromEntries(Object.entries(mangaSnapshot.data().coverNumbers).map(([url, number]) => [url, text(number)]))
        : {};
      const volumes = savedVolumes.length ? savedVolumes : [item.cover].filter(Boolean);
      setSavedCoverOrder(volumes);
      setSelectedManga((current) => current?.slug === item.slug
        ? { ...current, cover: volumes[volumes.length - 1] || current.cover, covers: volumes, coverNumbers: savedVolumeNumbers }
        : current);
      const loaded = snapshot.docs
        .map((chapter) => {
          const data = chapter.data();
          return {
            num: chapter.id,
            title: text(data.title) || `Chapter ${chapter.id}`,
            thumbnail: text(data.thumbnail),
            images: stringList(data.images),
            content: text(data.content),
            isDraft: data.isDraft === true,
            date: data.date,
            order: typeof data.order === "number" ? data.order : 0,
          };
        })
        .sort((left, right) => {
          const leftNumber = Number.parseFloat(left.num);
          const rightNumber = Number.parseFloat(right.num);
          return Number.isFinite(rightNumber - leftNumber)
            ? rightNumber - leftNumber
            : right.order - left.order;
        });
      setChapters(loaded);
      try {
        const linksSnapshot = await getDocs(
          collection(firestore, "manga", item.slug, "chapterLinks"),
        );
        if (linksSnapshot.empty && loaded.some((chapter) => !chapter.isDraft)) {
          const warning = await syncGeneratedChapterLinks(
            firestore,
            item.slug,
            isNovelSeries(item),
            loaded,
          );
          setMessage(warning
            ? `Chapter links generated, but cache refresh failed: ${warning}`
            : `${loaded.filter((chapter) => !chapter.isDraft).length} chapter links generated.`);
        }
      } catch (error) {
        console.error(`Failed to generate chapter links for ${item.slug}.`, error);
        setMessage(`Chapter list loaded, but generated links could not be updated: ${getErrorMessage(error)}`);
      }
    } catch (error) {
      console.error(`Failed to load chapters for ${item.slug}.`, error);
      setMessage(`Failed to load chapters: ${getErrorMessage(error)}`);
    } finally {
      setLoadingChapters(false);
    }
  }

  function openExistingChapterEditor(chapter: AdminChapter) {
    if (!selectedManga) return;
    setEditingChapterNumber(chapter.num);
    setChapterDraft({
      mangaSlug: selectedManga.slug,
      number: chapter.num,
      title: chapter.title,
      thumbnail: chapter.thumbnail,
      images: chapter.images.join("\n"),
      content: chapter.content,
      isDraft: chapter.isDraft,
    });
    setChapterError("");
    setChapterEditorOpen(true);
  }

  async function toggleChapterDraft(chapter: AdminChapter) {
    const mangaRecord = selectedManga;
    if (!mangaRecord) return;

    const nextIsDraft = !chapter.isDraft;
    setBusy(true);
    setMessage("");
    try {
      const { firestore } = getAdminFirebase();
      await updateDoc(
        doc(firestore, "manga", mangaRecord.slug, "chapters", chapter.num),
        { isDraft: nextIsDraft },
      );

      const updatedChapters = chapters.map((item) =>
        item.num === chapter.num ? { ...item, isDraft: nextIsDraft } : item,
      );
      setChapters(updatedChapters);

      let chapterLinkWarning = "";
      try {
        chapterLinkWarning = await syncGeneratedChapterLinks(
          firestore,
          mangaRecord.slug,
          isNovelSeries(mangaRecord),
          updatedChapters,
        );
      } catch (error) {
        chapterLinkWarning = `Chapter status changed, but live links could not be updated: ${getErrorMessage(error)}`;
        console.error(`Chapter ${chapter.num} visibility changed, but its links could not be synchronized.`, error);
      }

      const statusMessage = `Chapter ${chapter.num} ${nextIsDraft ? "hidden from readers" : "shown to readers"}.`;
      setMessage([statusMessage, chapterLinkWarning].filter(Boolean).join(" "));
    } catch (error) {
      console.error(`Failed to update visibility for chapter ${chapter.num}.`, error);
      setMessage(`Failed to update chapter visibility: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteChapter(chapter: AdminChapter) {
    if (!selectedManga || !window.confirm(`Delete chapter ${chapter.num}?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const { firestore } = getAdminFirebase();
      await deleteDoc(
        doc(firestore, "manga", selectedManga.slug, "chapters", chapter.num),
      );
      const remaining = chapters.filter((item) => item.num !== chapter.num);
      let chapterLinkWarning = "";
      try {
        chapterLinkWarning = await syncGeneratedChapterLinks(
          firestore,
          selectedManga.slug,
          isNovelSeries(selectedManga),
          remaining,
        );
      } catch (error) {
        chapterLinkWarning = `Managed chapter links could not be updated: ${getErrorMessage(error)}`;
        console.error("Chapter was deleted, but generated links could not be synchronized.", error);
      }
      const latestChapter = remaining
        .map((item) => item.num)
        .sort((left, right) => Number.parseFloat(right) - Number.parseFloat(left))[0] ?? null;
      const now = Date.now();
      await setDoc(
        doc(firestore, "manga", selectedManga.slug),
        {
          chapterCount: remaining.length,
          lastChapter: latestChapter,
          lastChapterUpdated: latestChapter,
          chapterUpdatedAt: now,
          updatedAt: now,
          latestUpdate: now,
          metadataUpdatedAt: now,
        },
        { merge: true },
      );
      scheduleSharedMangaCatalogCacheRefresh();
      const nextManga = {
        ...selectedManga,
        chapterCount: remaining.length,
        lastChapter: latestChapter,
        updatedAt: now,
      };
      setSelectedManga(nextManga);
      setChapters(remaining);
      setManga((current) => {
        const next = current
          .map((item) => item.slug === nextManga.slug ? nextManga : item)
          .sort((left, right) => right.updatedAt - left.updatedAt);
        writeAdminMangaCache(next);
        return next;
      });
      try {
        const summaryResult = await updateSummary(firestore, nextManga);
        const summaryMessage = summaryResult === "ok"
          ? `Chapter ${chapter.num} deleted successfully.`
          : `Chapter ${chapter.num} deleted. Summary skipped (quota).`;
        setMessage([summaryMessage, chapterLinkWarning].filter(Boolean).join(" "));
      } catch (error) {
        console.error("Failed to update summary after chapter delete.", error);
        setMessage([
          `Chapter deleted, but summary could not be updated: ${getErrorMessage(error)}`,
          chapterLinkWarning,
        ].filter(Boolean).join(" "));
      }
    } catch (error) {
      console.error(`Failed to delete chapter ${chapter.num}.`, error);
      setMessage(`Failed to delete chapter: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function moveChapter(chapterNumber: string, offset: number) {
    const index = chapters.findIndex((chapter) => chapter.num === chapterNumber);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= chapters.length) return;
    const reordered = [...chapters];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    setChapters(reordered);
  }

  async function saveChapterOrder() {
    if (!selectedManga) return;
    setBusy(true);
    setMessage("");
    try {
      const { firestore } = getAdminFirebase();
      for (let start = 0; start < chapters.length; start += 450) {
        const batch = writeBatch(firestore);
        chapters.slice(start, start + 450).forEach((chapter, index) => {
          batch.update(
            doc(firestore, "manga", selectedManga.slug, "chapters", chapter.num),
            { order: chapters.length - start - index },
          );
        });
        await batch.commit();
      }
      const ordered = chapters.map((chapter, index) => ({
        ...chapter,
        order: chapters.length - index,
      }));
      setChapters(ordered);
      let chapterLinkWarning = "";
      try {
        chapterLinkWarning = await syncGeneratedChapterLinks(
          firestore,
          selectedManga.slug,
          isNovelSeries(selectedManga),
          ordered,
        );
      } catch (error) {
        chapterLinkWarning = `Managed chapter links could not be updated: ${getErrorMessage(error)}`;
        console.error("Chapter order was saved, but generated links could not be synchronized.", error);
      }
      setMessage(chapterLinkWarning
        ? `Chapter order saved. ${chapterLinkWarning}`
        : "Chapter order saved successfully.");
    } catch (error) {
      console.error("Failed to save the chapter order.", error);
      setMessage(`Failed to save chapter order: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mangaSlug = chapterDraft.mangaSlug.trim();
    const chapterNumber = chapterDraft.number.trim();
    if (!mangaSlug || !chapterNumber) {
      setChapterError("Manga and chapter number are required.");
      return;
    }
    const typedImages = extractChapterImageUrls(chapterDraft.images);
    const chapterContentDocument = new DOMParser().parseFromString(
      chapterDraft.content,
      "text/html",
    );
    const editorImages = Array.from(chapterContentDocument.images)
      .map((image) => image.src || image.getAttribute("src") || "")
      .filter(Boolean);
    const images = [...new Set([...typedImages, ...editorImages])];
    const chapterTextContent = (chapterContentDocument.body.textContent || "")
      .replace(/\u00a0/g, " ")
      .trim();
    if (!images.length && !chapterTextContent) {
      setChapterError("Add image URLs or chapter content.");
      return;
    }
    if (images.some((image) => !/^https?:\/\//i.test(image))) {
      setChapterError("Each image URL must start with http:// or https://.");
      return;
    }
    setBusy(true);
    setChapterError("");
    try {
      const { firestore } = getAdminFirebase();
      const mangaRef = doc(firestore, "manga", mangaSlug);
      const mangaSnapshot = await getDoc(mangaRef);
      const oldChapterNumber = editingChapterNumber;
      const existingChapterSnapshot = await getDoc(
        doc(
          firestore,
          "manga",
          mangaSlug,
          "chapters",
          oldChapterNumber || chapterNumber,
        ),
      );
      if (
        oldChapterNumber &&
        chapterNumber !== oldChapterNumber &&
        (await getDoc(doc(firestore, "manga", mangaSlug, "chapters", chapterNumber))).exists()
      ) {
        setChapterError(`Chapter ${chapterNumber} already exists.`);
        setBusy(false);
        return;
      }
      const existingChapter = existingChapterSnapshot.data();
      const firestoreMangaData = mangaSnapshot.data();
      const firestoreManga = mangaSnapshot.exists()
        ? fromFirestore(mangaSlug, firestoreMangaData ?? {})
        : null;
      const catalogManga = manga.find((item) => item.slug === mangaSlug);
      const mangaWithUnsetDefaults = firestoreManga
        ? {
            ...firestoreManga,
            type: text(firestoreMangaData?.type),
            status: text(firestoreMangaData?.status),
          }
        : null;
      const currentManga = mangaWithUnsetDefaults
        ? mergeMetadataRecords(
            catalogManga ? [catalogManga] : [],
            [mangaWithUnsetDefaults],
          )[0]
        : catalogManga;
      const record: AdminChapter = {
        num: chapterNumber,
        title: chapterDraft.title.trim() || `Chapter ${chapterNumber}`,
        thumbnail: chapterDraft.thumbnail.trim(),
        images,
        content: chapterDraft.content,
        isDraft: chapterDraft.isDraft,
        date: existingChapter?.date || Date.now(),
        order:
          typeof existingChapter?.order === "number"
            ? existingChapter.order
            : (currentManga?.chapterCount || 0) + 1,
      };
      await setDoc(
        doc(firestore, "manga", mangaSlug, "chapters", chapterNumber),
        {
          title: record.title,
          thumbnail: record.thumbnail,
          images: record.images,
          content: record.content,
          isDraft: record.isDraft,
          date: record.date,
          order: record.order,
        },
        { merge: true },
      );
      if (oldChapterNumber && oldChapterNumber !== chapterNumber) {
        await deleteDoc(
          doc(firestore, "manga", mangaSlug, "chapters", oldChapterNumber),
        );
      }

      let nextManga = currentManga;
      let refreshedChapters: AdminChapter[] | null = null;
      let chapterLinkWarning = "";
      const allChapters = await getDocs(
        collection(firestore, "manga", mangaSlug, "chapters"),
      );
      refreshedChapters = allChapters.docs
        .map((chapter) => {
          const data = chapter.data();
          return {
            num: chapter.id,
            title: text(data.title) || `Chapter ${chapter.id}`,
            thumbnail: text(data.thumbnail),
            images: stringList(data.images),
            content: text(data.content),
            isDraft: data.isDraft === true,
            date: data.date,
            order: typeof data.order === "number" ? data.order : 0,
          };
        })
        .sort((left, right) => {
          const leftNumber = Number.parseFloat(left.num);
          const rightNumber = Number.parseFloat(right.num);
          return Number.isFinite(rightNumber - leftNumber)
            ? rightNumber - leftNumber
            : right.order - left.order;
        });
      if (refreshedChapters) {
        try {
          chapterLinkWarning = await syncGeneratedChapterLinks(
            firestore,
            mangaSlug,
            isNovelSeries(currentManga || catalogManga || {}),
            refreshedChapters,
          );
        } catch (error) {
          chapterLinkWarning = `Managed chapter links could not be updated: ${getErrorMessage(error)}`;
          console.error("Chapter was saved, but generated links could not be synchronized.", error);
        }
      }
      const chapterNumbers = allChapters.docs.map((chapter) => chapter.id);
      const latestChapter = chapterNumbers.sort((left, right) => {
        const leftNumber = Number.parseFloat(left);
        const rightNumber = Number.parseFloat(right);
        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
          return rightNumber - leftNumber;
        }
        return right.localeCompare(left);
      })[0] ?? null;
      const nextCount = allChapters.size;
      const now = Date.now();
      const parentData = currentManga
        ? {
            title: currentManga.title,
            altTitle: currentManga.altTitle,
            cover: currentManga.cover,
            desc: currentManga.desc,
            type: currentManga.type,
            status: currentManga.status,
            author: currentManga.author,
            artist: currentManga.artist,
            circle: currentManga.circle,
            group: currentManga.group,
            series: currentManga.series,
            serialization: currentManga.serialization,
            publication: currentManga.publication,
            genres: currentManga.genres,
            tags: currentManga.tags,
            rating: currentManga.rating,
            githubSlug: currentManga.githubSlug || mangaSlug,
            origin: currentManga.origin === "github" ? "github" : "firestore",
            source: currentManga.origin === "github" ? "hybrid" : "firestore",
          }
        : {};
      const existingMangaData = firestoreMangaData;
      const metadataToRestore = mangaSnapshot.exists()
        ? Object.fromEntries(
            Object.entries(parentData).filter(([key]) => {
              const value = existingMangaData?.[key];
              return (
                value == null ||
                value === "" ||
                (Array.isArray(value) && value.length === 0)
              );
            }),
          )
        : parentData;
      await setDoc(
        mangaRef,
        {
          ...metadataToRestore,
          chapterCount: nextCount,
          lastChapter: latestChapter,
          lastChapterUpdated: latestChapter,
          chapterUpdatedAt: now,
          updatedAt: now,
          latestUpdate: now,
          metadataUpdatedAt: now,
          managedByAdmin: true,
        },
        { merge: true },
      );
      let sharedCatalogRefreshFailed = false;
      try {
        await refreshSharedMangaCatalogCache();
      } catch (error) {
        sharedCatalogRefreshFailed = true;
        console.error("The chapter was saved, but the shared manga catalog cache could not be refreshed.", error);
      } finally {
        notifyMangaMetadataUpdated();
      }
      if (currentManga) {
        nextManga = {
          ...currentManga,
          chapterCount: nextCount,
          lastChapter: latestChapter,
          lastChapterUpdated: latestChapter,
          updatedAt: now,
          managedByAdmin: true,
          source: currentManga.origin === "github" ? "hybrid" : currentManga.source,
        };
        try {
          await updateSummary(firestore, nextManga);
        } catch (error) {
          console.warn("[admin] summary after chapter save skipped", error);
        }
      }
      if (nextManga) {
        setManga((current) => {
          const next = current
            .map((item) => item.slug === mangaSlug ? nextManga! : item)
            .sort((left, right) => right.updatedAt - left.updatedAt);
          writeAdminMangaCache(next);
          return next;
        });
      }
      if (selectedManga?.slug === mangaSlug) {
        const nextChapters = refreshedChapters || [
          ...chapters.filter((chapter) =>
            chapter.num !== oldChapterNumber && chapter.num !== chapterNumber,
          ),
          record,
        ].sort((left, right) => {
          const leftNumber = Number.parseFloat(left.num);
          const rightNumber = Number.parseFloat(right.num);
          return Number.isFinite(rightNumber - leftNumber)
            ? rightNumber - leftNumber
            : right.order - left.order;
        });
        setChapters(nextChapters);
      }
      setChapterEditorOpen(false);
      const saveWarnings = [
        sharedCatalogRefreshFailed
          ? "The homepage catalog could not be refreshed. Check the browser console and retry the catalog refresh."
          : "",
        chapterLinkWarning,
      ].filter(Boolean);
      setMessage(saveWarnings.length
        ? `Chapter ${chapterNumber} saved. ${saveWarnings.join(" ")}`
        : `Chapter ${chapterNumber} saved successfully.`);
      setEditingChapterNumber(null);
      if (selectedManga?.slug === mangaSlug && nextManga) {
        setSelectedManga(nextManga);
      }
    } catch (error) {
      console.error("Failed to save the chapter.", error);
      setChapterError(`Failed to save chapter: ${getErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) {
    return (
      <main className={styles.loadingPage}>
        <p>Checking admin session...</p>
      </main>
    );
  }

  if (!user && activeSection === "moderation") {
    return <ModerationPage />;
  }

  if (!user) {
    return (
      <main className={styles.loginPage}>
        <form className={styles.loginCard} onSubmit={handleLogin}>
          <div className={styles.brandMark}>M</div>
          <p className={styles.eyebrow}>MIKOROKU</p>
          <h1>Admin Login</h1>
          <p className={styles.loginDescription}>Sign in to manage the manga catalog.</p>
          <label className={styles.field}>
            <span>Email</span>
            <input
              autoComplete="username"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Password</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {loginError && <p className={styles.error}>{loginError}</p>}
          <button className={styles.primaryButton} disabled={busy}>
            {busy ? "Memproses..." : "Login"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className={`${styles.adminShell} ${isLightMode ? styles.lightMode : ""} ${chapterEditorOpen ? styles.chapterEditorOpen : ""}`}>
      <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.mobileSidebarOpen : ""}`}>
        <a className={styles.brand} href="/">Mikoroku Admin</a>
        <nav id="admin-navigation" className={styles.navigation} aria-label="Admin navigation">
          <button
            className={activeSection === "dashboard" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("dashboard");
              setMobileNavOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Dashboard
          </button>
          <button
            className={activeSection === "manga-list" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("manga-list");
              setMobileNavOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            Manga List
          </button>
          <button
            className={activeSection === "metadata-json" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("metadata-json");
              setMobileNavOpen(false);
              if (!metadataJsonText) {
                void loadMetadataJson().then(() => {
                  if (!metadataSourceDebugCatalog) void loadMetadataSourceDebug();
                });
              } else if (!metadataSourceDebugCatalog) {
                void loadMetadataSourceDebug();
              }
            }}
            disabled={metadataJsonLoading || metadataJsonSaving}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 4H6a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h2" />
              <path d="M16 4h2a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-2" />
            </svg>
            metadata.json
          </button>
          <button onClick={() => {
            setMobileNavOpen(false);
            openNewManga();
          }}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            Add New Manga
          </button>
          <button
            className={activeSection === "reports" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("reports");
              setMobileNavOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/></svg>
            Report
          </button>
          <button
            className={activeSection === "announcements" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("announcements");
              setMobileNavOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11v2a2 2 0 0 0 2 2h2l7 4V5l-7 4H5a2 2 0 0 0-2 2Z"/><path d="m7 15 1.5 5h3L10 16"/><path d="M18 9a5 5 0 0 1 0 6"/></svg>
            Announcements
          </button>
          <button
            className={activeSection === "moderation" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("moderation");
              setMobileNavOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Moderation
          </button>
          <button
            className={activeSection === "advertisements" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("advertisements");
              setMobileNavOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h10M7 13h6" /></svg>
            Advertisements
          </button>
          <div className={styles.navigationDivider} />
          <button
            className={activeSection === "genres" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("genres");
              setMobileNavOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            Genres &amp; Tags
          </button>
          <button
            className={activeSection === "settings" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("settings");
              setMobileNavOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Settings
          </button>
          <button
            className={activeSection === "og-cover" ? styles.activeNav : ""}
            onClick={() => {
              setActiveSection("og-cover");
              setMobileNavOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            OG Cover Tool
          </button>
          <button className={styles.sidebarAction} type="button" onClick={toggleTheme}>
            {isLightMode ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            )}
            {isLightMode ? "Dark Mode" : "Light Mode"}
          </button>
        </nav>
        <div className={styles.sidebarFooter}>
          <button className={styles.logoutButton} onClick={handleLogout} disabled={busy}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </aside>
      {mobileNavOpen && (
        <button
          className={styles.mobileNavOverlay}
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <section className={styles.workspace}>
        {/* Search inline */}
        <div className={styles.inlineSearch}>
          <button
            className={styles.mobileMenuButton}
            type="button"
            aria-controls="admin-navigation"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileNavOpen
                ? <path d="m18 6-12 12M6 6l12 12" />
                : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
          {activeSection === "manga-detail" && (
            <button
              className={`${styles.secondaryButton} ${styles.backToListButton}`}
              onClick={() => setActiveSection("manga-list")}
            >
              Back to Manga List
            </button>
          )}
          {activeSection !== "moderation" && (
            <label className={styles.searchBox}>
              <input
                aria-label="Search manga"
                placeholder="Search title or slug..."
                value={queryText}
                onChange={(event) => {
                  setQueryText(event.target.value);
                  if (event.target.value) setActiveSection("manga-list");
                }}
              />
            </label>
          )}
        </div>

        <div className={styles.content}>
          
          {warning && <p className={styles.warning}>{warning}</p>}
          {syncStatus && <p className={styles.warning}>{syncStatus}</p>}
          {loadError && (
            <div className={styles.errorBanner}>
              <span>{loadError}</span>
              <button onClick={() => void loadManga(true)}>Try Again</button>
            </div>
          )}

          {activeSection === "dashboard" && (
            <section className={styles.dashboard}>
              <div className={styles.welcomeCard}>
                <h2>Dashboard</h2>
                <p>Open <strong>Manga List</strong> to manage content.</p>
                <button className={styles.secondaryButton} onClick={() => setActiveSection("manga-list")}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v17H7a3 3 0 0 1-3-3z" /><path d="M4 18a3 3 0 0 1 3-3h13" /></svg>
                  Open Manga List
                </button>
              </div>
            </section>
          )}

          {activeSection === "manga-list" && (
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <h2>Manga List</h2>
                  <p>
                    {filteredManga.length.toLocaleString("en-US")} manga
                    {catalogFromCache && <span className={styles.cacheBadge}>Local cache</span>}
                  </p>
                </div>
                <div className={styles.panelActions}>
                  <button className={styles.secondaryButton} onClick={loadMangaCache} disabled={loadingManga}>
                    Load Cache
                  </button>
                  <button className={styles.secondaryButton} onClick={() => void loadManga(true)} disabled={loadingManga}>
                    {loadingManga ? "Loading..." : "Force Refresh"}
                  </button>
                  <button className={styles.primaryButton} onClick={openNewManga}>＋ Add Manga</button>
                </div>
              </div>
              {loadingManga ? (
                <p className={styles.emptyState}>Loading manga catalog...</p>
              ) : filteredManga.length === 0 ? (
                <p className={styles.emptyState}>No matching manga found.</p>
              ) : (
                <div className={styles.mangaGrid}>
                  {filteredManga.map((item) => (
                    <article className={styles.mangaCard} key={item.slug}>
                      <button className={styles.mangaCoverButton} onClick={() => void openMangaChapters(item)} aria-label={`Open ${item.title}`}>
                        {item.cover ? (
                          <CoverImage src={item.cover} alt="" optimizePreset="coverAdmin" />
                        ) : <span className={styles.coverPlaceholder}>M</span>}
                        <span className={styles.mangaSource}>{item.source === "hybrid" ? "HYBRID" : item.source.toUpperCase()}</span>
                        {item.isDraft && <span className={styles.mangaDraftBadge}>DRAFT</span>}
                      </button>
                      <div className={styles.mangaCardBody}>
                        <button className={styles.mangaCardTitle} title={item.title} onClick={() => void openMangaChapters(item)}>{item.title}</button>
                        <span className={styles.mangaStatus} data-status={slugify(item.status)}>{item.isDraft ? "DRAFT" : item.status.toUpperCase()}</span>
                        <small>{item.chapterCount} Chapters</small>
                        <div className={styles.mangaCardActions}>
                          <button onClick={() => openEditor(item)}>Edit</button>
                          <button className={styles.deleteButton} onClick={() => void handleDeleteManga(item)} disabled={busy}>Delete</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === "metadata-json" && (
            <MetadataJsonEditor
              content={metadataJsonText}
              loading={metadataJsonLoading}
              saving={metadataJsonSaving}
              status={metadataJsonStatus}
              sourceMode={metadataSourceMode}
              sourceSaving={metadataSourceSaving}
              sourceError={metadataSourceError}
              sourceDebugOptions={metadataSourceDebugOptions}
              sourceDebugSlug={metadataSourceDebugSlug}
              sourceDebugInfo={metadataSourceDebugInfo}
              sourceDebugLoading={metadataSourceDebugLoading}
              sourceDebugError={metadataSourceDebugError}
              onChange={setMetadataJsonText}
              onFormat={formatMetadataJson}
              onReload={() => void loadMetadataJson()}
              onSave={() => void saveMetadataJson()}
              onSourceChange={(source) => void selectMetadataCatalogSource(source)}
              onSourceDebugSlugChange={setMetadataSourceDebugSlug}
              onSourceDebugReload={() => void loadMetadataSourceDebug()}
            />
          )}

          {activeSection === "manga-detail" && selectedManga && (
            <section className={styles.panel}>
              <div className={styles.detailHeader}>
                <div className={styles.detailCoverColumn}>
                  <div className={styles.detailCoverFrame}>
                    {(detailTab === "info" ? draft.cover : selectedManga.cover) ? (
                      <CoverImage
                        src={detailTab === "info" ? draft.cover : selectedManga.cover}
                        alt=""
                        loading="eager"
                        optimizePreset="coverAdmin"
                      />
                    ) : <span className={styles.coverPlaceholder}>M</span>}
                    {detailTab === "info" && (
                      <>
                        <button
                          type="button"
                          className={styles.coverEditButton}
                          aria-label="Change cover"
                          title="Change cover"
                          onClick={() => coverFileInput.current?.click()}
                          disabled={busy}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <input
                          ref={coverFileInput}
                          className={styles.detailCoverFileInput}
                          type="file"
                          accept="image/*"
                          aria-label="Choose a new cover image"
                          onChange={() => {
                            const file = coverFileInput.current?.files?.[0];
                            if (file) void uploadCoverFile(file);
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.detailMeta}>
                  <div className={styles.detailBadges}>
                    <span>{selectedManga.status}</span>
                    <span>{selectedManga.type}</span>
                    <span>{selectedManga.chapterCount} Chapter</span>
                    {selectedManga.isDraft && <span>Draft</span>}
                  </div>
                  <h2>{selectedManga.title || selectedManga.slug}</h2>
                  <p>{selectedManga.slug}</p>
                  <div className={styles.panelActions}>
                    <button className={styles.primaryButton} onClick={() => {
                      setChapterDraft({ ...emptyChapterDraft, mangaSlug: selectedManga.slug });
                      setEditingChapterNumber(null);
                      setUploadNotice(null);
                      setChapterEditorOpen(true);
                    }}>＋ Add Chapter</button>
                    <button className={styles.deleteButton} onClick={() => void handleDeleteManga(selectedManga)} disabled={busy}>Delete Manga</button>
                    <button className={styles.secondaryButton} onClick={() => void openMangaChapters(selectedManga)} disabled={loadingChapters}>Refresh</button>
                  </div>
                </div>
              </div>
              <div className={styles.detailTabs} role="tablist" aria-label="Manga details">
                <button
                  role="tab"
                  aria-selected={detailTab === "info"}
                  className={detailTab === "info" ? styles.activeDetailTab : ""}
                  onClick={() => void openEditor(selectedManga)}
                >✎ Info &amp; Metadata</button>
                <button
                  role="tab"
                  aria-selected={detailTab === "chapters"}
                  className={detailTab === "chapters" ? styles.activeDetailTab : ""}
                  onClick={() => setDetailTab("chapters")}
                >▤ Chapters</button>
                <button
                  role="tab"
                  aria-selected={detailTab === "covers"}
                  className={detailTab === "covers" ? styles.activeDetailTab : ""}
                  onClick={() => setDetailTab("covers")}
                >▧ Volumes</button>
              </div>
              {detailTab === "info" ? (
                <MangaMetadataEditor
                  draft={draft}
                  editing
                  busy={busy}
                  coverFileInput={coverFileInput}
                  showCoverUpload={false}
                  onChange={updateDraftField}
                  onUploadCover={() => void uploadCoverFile()}
                  onSubmit={handleSaveManga}
                  onUpdateTimestamp={() => void handleUpdateTimestamp()}
                  currentUpdatedAt={selectedManga.updatedAt}
                  onCancel={() => setDetailTab("chapters")}
                />
              ) : detailTab === "covers" ? (
                <section className={styles.coverGalleryPanel} aria-label="Series volumes">
                  <div className={styles.panelHeading}>
                    <div>
                      <h2>Series volumes</h2>
                      <p>Upload and arrange volumes shown in the series detail page.</p>
                    </div>
                    <div className={styles.volumeHeaderActions}>
                      <button
                        className={styles.primaryButton}
                        type="button"
                        onClick={() => coverGalleryFilesInput.current?.click()}
                        disabled={busy}
                      >＋ Add volumes</button>
                      <button
                        className={styles.primaryButton}
                        type="button"
                        onClick={() => void saveCoverOrder()}
                        disabled={busy || !coverOrderChanged}
                      >Save order</button>
                    </div>
                    <input
                      ref={coverGalleryFilesInput}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={() => void uploadAdditionalCovers()}
                      style={{ display: "none" }}
                    />
                  </div>
                  <p className={styles.coverGalleryHint}>Drag with a mouse or touch to reorder volumes, then select Save order. The last volume becomes the main cover.</p>
                  {selectedManga.covers?.length ? (
                    <div className={styles.coverGalleryGrid}>
                      {selectedManga.covers.map((coverUrl, index) => (
                        <article
                          className={`${styles.coverGalleryItem} ${draggingCoverUrl === coverUrl ? styles.coverGalleryItemDragging : ""}`}
                          key={coverUrl}
                          data-volume-index={index}
                          draggable={!busy}
                          onDragStart={(event) => handleVolumeDragStart(event, coverUrl)}
                          onDragOver={handleVolumeDragOver}
                          onDrop={(event) => handleVolumeDrop(event, index)}
                          onDragEnd={handleVolumeDragEnd}
                        >
                          <div className={styles.coverGalleryImage} title="Drag to reorder">
                            <CoverImage src={coverUrl} alt={`${selectedManga.title} volume ${selectedManga.coverNumbers?.[coverUrl] || index + 1}`} loading="lazy" optimizePreset="coverAdmin" />
                            <span className={styles.coverDragHint}>Drag</span>
                          </div>
                          <div className={styles.coverGalleryActions}>
                            <label className={styles.volumeNumberField}>
                              <span>Vol.</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={selectedManga.coverNumbers?.[coverUrl] || ""}
                                placeholder={String(index + 1)}
                                aria-label={`Volume number, current position ${index + 1}`}
                                disabled={busy}
                                draggable={false}
                                onDragStart={(event) => event.preventDefault()}
                                onPointerDown={(event) => event.stopPropagation()}
                                onChange={(event) => {
                                  const number = event.currentTarget.value;
                                  setSelectedManga((current) => current
                                    ? { ...current, coverNumbers: { ...current.coverNumbers, [coverUrl]: number } }
                                    : current);
                                }}
                                onBlur={(event) => void saveCoverNumber(coverUrl, event.currentTarget.value)}
                              />
                            </label>
                            <button
                              className={styles.volumeDeleteButton}
                              type="button"
                              onClick={() => void removeAdditionalCover(coverUrl)}
                              disabled={busy || (selectedManga.covers?.length ?? 0) <= 1}
                              aria-label={`Remove volume ${index + 1}`}
                              title="Remove volume"
                              draggable={false}
                              onDragStart={(event) => event.preventDefault()}
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyState}>No volumes uploaded yet.</p>
                  )}
                </section>
              ) : (
                <>
                  
                  <div className={styles.chapterTools}>
                    <button className={styles.successButton} onClick={() => {
                      setChapterDraft({ ...emptyChapterDraft, mangaSlug: selectedManga.slug });
                      setEditingChapterNumber(null);
                      setUploadNotice(null);
                      setChapterEditorOpen(true);
                    }}>＋ Add Chapter</button>
                    <button className={styles.secondaryButton} onClick={() => void saveChapterOrder()} disabled={busy || !chapters.length}>▣ Save Order</button>
                    <small>Drag or use arrows to reorder chapters.</small>
                  </div>
                  {loadingChapters ? <p className={styles.emptyState}>Loading chapters...</p> : chapters.length === 0 ? (
                    <p className={styles.emptyState}>This manga has no chapters yet.</p>
                  ) : (
                    <div className={styles.chapterGrid}>
                      {chapters.map((chapter, index) => (
                        <article
                          className={styles.chapterCard}
                          key={chapter.num}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", chapter.num);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const source = event.dataTransfer.getData("text/plain");
                            const from = chapters.findIndex((item) => item.num === source);
                            const reordered = [...chapters];
                            if (from < 0) return;
                            const [moved] = reordered.splice(from, 1);
                            reordered.splice(index, 0, moved);
                            setChapters(reordered);
                          }}
                        >
                          <div className={styles.chapterCardHeading}>
                            <strong title={chapter.title || `Chapter ${chapter.num}`}>Chapter {chapter.num}</strong>
                            {chapter.isDraft ? <small className={styles.chapterDraftBadge}>DRAFT</small> : null}
                          </div>
                          <span className={styles.chapterDate}>{chapter.date ? new Date(getTimestamp(chapter.date)).toLocaleDateString("en-US") : ""}</span>
                          <div className={styles.rowActions}>
                            {chapter.isDraft ? (
                              <button
                                type="button"
                                disabled
                                aria-label={`Chapter ${chapter.num} is hidden`}
                                title="Chapter is hidden from readers"
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                  <path d="m3 3 18 18" />
                                </svg>
                              </button>
                            ) : (
                              <a
                                href={generatedChapterPath(
                                  selectedManga.slug,
                                  chapter.num,
                                  isNovelSeries(selectedManga),
                                )}
                                className={styles.viewButton}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`View chapter ${chapter.num}`}
                                title="View live chapter"
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </a>
                            )}
                            <button
                              type="button"
                              aria-pressed={chapter.isDraft}
                              aria-label={`${chapter.isDraft ? "Show" : "Hide"} chapter ${chapter.num}`}
                              title={chapter.isDraft ? "Show chapter to readers" : "Hide chapter from readers"}
                              onClick={() => void toggleChapterDraft(chapter)}
                              disabled={busy}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="5" y="11" width="14" height="10" rx="2" />
                                {chapter.isDraft ? (
                                  <path d="M8 11V7a4 4 0 0 1 7.5-2" />
                                ) : (
                                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                )}
                                <circle cx="12" cy="16" r="1" />
                                <path d="M12 17v1" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className={styles.editButton}
                              aria-label={`Edit chapter ${chapter.num}`}
                              onClick={() => openExistingChapterEditor(chapter)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className={styles.deleteButton}
                              aria-label={`Delete chapter ${chapter.num}`}
                              onClick={() => void deleteChapter(chapter)}
                              disabled={busy}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="m19 6-1 14H6L5 6" />
                                <path d="M10 11v5M14 11v5" />
                              </svg>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {activeSection === "editor" && (
            <MangaMetadataEditor
              draft={draft}
              editing={Boolean(editing)}
              busy={busy}
              coverFileInput={coverFileInput}
              onChange={updateDraftField}
              onUploadCover={() => void uploadCoverFile()}
              onSubmit={handleSaveManga}
              onUpdateTimestamp={() => void handleUpdateTimestamp()}
              currentUpdatedAt={editing?.updatedAt}
              onCancel={() => setActiveSection("manga-list")}
            />
          )}

          {activeSection === "reports" && (
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <h2>Report Chapter Error</h2>
                  <p>List of chapter error reports from readers.</p>
                </div>
                <button className={styles.secondaryButton} onClick={() => void loadReports()} disabled={loadingReports}>
                  {loadingReports ? "Loading..." : "Refresh All Reports"}
                </button>
              </div>
              {reportStatus && <p className={styles.inlineStatus}>{reportStatus}</p>}
              {loadingReports ? <p className={styles.emptyState}>Loading reports...</p> : reportList.length === 0 ? (
                <p className={styles.emptyState}>There are no pending reports.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.mangaTable}>
                    <thead><tr><th>Date</th><th>Manga</th><th>Chapter</th><th>Error Type</th><th>Detail</th><th>URL</th><th>Actions</th></tr></thead>
                    <tbody>
                      {reportList.map((report) => (
                        <tr key={report.id}>
                          <td>{getTimestamp(report.createdAt) ? new Date(getTimestamp(report.createdAt)).toLocaleString("en-US") : "—"}</td>
                          <td>{report.slug}</td>
                          <td>{report.chapter}</td>
                          <td>{report.type}</td>
                          <td className={styles.reportReason}>{report.reason}</td>
                          <td>{report.url ? <a className={styles.reportLink} href={report.url} target="_blank" rel="noreferrer">Open ↗</a> : "—"}</td>
                          <td><button className={styles.resolveButton} onClick={() => void resolveReport(report)} disabled={busy}>Mark Resolved</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeSection === "announcements" && (
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <h2>Announcements</h2>
                  <p>Create and manage messages shown on the public announcements page.</p>
                </div>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => void loadAnnouncements()}
                  disabled={loadingAnnouncements || busy}
                >
                  {loadingAnnouncements ? "Loading..." : "Refresh"}
                </button>
              </div>
              {announcementStatus && <p className={styles.inlineStatus}>{announcementStatus}</p>}

              <form className={styles.announcementEditor} onSubmit={(event) => void saveAnnouncement(event)}>
                <h3>{editingAnnouncement ? "Edit announcement" : "Add announcement"}</h3>
                <label className={styles.field}>
                  <span>Title</span>
                  <input
                    value={announcementTitle}
                    onChange={(event) => setAnnouncementTitle(event.target.value)}
                    maxLength={160}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>Message</span>
                  <textarea
                    value={announcementContent}
                    onChange={(event) => setAnnouncementContent(event.target.value)}
                    placeholder={"Markdown supported: **bold**, *italic*, # headings, - lists, [links](https://example.com), and ```code```"}
                    rows={6}
                    required
                  />
                </label>
                <p className={styles.announcementMarkdownHint}>
                  Supports Markdown formatting. Raw HTML is displayed as text.
                </p>
                <label className={styles.announcementPublishToggle}>
                  <input
                    type="checkbox"
                    checked={announcementPublished}
                    onChange={(event) => setAnnouncementPublished(event.target.checked)}
                  />
                  <span>Publish announcement</span>
                </label>
                <div className={styles.panelActions}>
                  <button className={styles.primaryButton} type="submit" disabled={busy}>
                    {busy ? "Saving..." : editingAnnouncement ? "Save Changes" : "Create Announcement"}
                  </button>
                  {editingAnnouncement && (
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={resetAnnouncementForm}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {loadingAnnouncements ? (
                <p className={styles.emptyState}>Loading announcements...</p>
              ) : announcementList.length === 0 ? (
                <p className={styles.emptyState}>There are no announcements to manage.</p>
              ) : (
                <div className={styles.announcementAdminList}>
                  {announcementList.map((announcement) => (
                    <article className={styles.announcementAdminCard} key={announcement.id}>
                      <div className={styles.announcementAdminHeading}>
                        <div>
                          <h3>{announcement.title}</h3>
                          <p>
                            {announcement.published ? "Published" : "Draft"}
                            {getTimestamp(announcement.updatedAt || announcement.createdAt)
                              ? ` · Updated ${new Date(getTimestamp(announcement.updatedAt || announcement.createdAt)).toLocaleDateString("en-US")}`
                              : ""}
                          </p>
                        </div>
                        <div className={styles.panelActions}>
                          <button
                            className={styles.secondaryButton}
                            type="button"
                            onClick={() => editAnnouncement(announcement)}
                            disabled={busy}
                          >
                            Edit
                          </button>
                          <button
                            className={styles.deleteButton}
                            type="button"
                            onClick={() => void removeAnnouncement(announcement)}
                            disabled={busy}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <MarkdownContent value={announcement.content} />
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          {activeSection === "moderation" && (
            <ModerationPage embedded isLightMode={isLightMode} />
          )}

          {activeSection === "genres" && (
            <section className={styles.panel}>
              <div className={styles.panelHeading}><div><h2>Genres &amp; Tags</h2><p>Genres and tags used in the manga catalog.</p></div></div>
              <div className={styles.genreSummary}>
                <span><strong>{new Set(manga.flatMap((item) => item.genres)).size}</strong> genres</span>
                <span><strong>{new Set(manga.flatMap((item) => item.tags)).size}</strong> tags</span>
              </div>
              <p className={styles.emptyState}>Manage genres through each manga's metadata.</p>
            </section>
          )}

          {activeSection === "settings" && (
            <section className={styles.panel}>
              <div className={styles.panelHeading}><div><h2>Settings</h2><p>Catalog summary and Firestore backups.</p></div></div>
              <form className={styles.settingsSection} onSubmit={(event) => void saveReaderNoticeConfig(event)}>
                <h3>Reader Server Notice</h3>
                <p>Edit the single HTML/script block shown above the chapter list. Scripts run inside a sandboxed frame. Only add code from sources you trust.</p>
                {readerNoticeStatus && <p className={styles.inlineStatus} role="status">{readerNoticeStatus}</p>}
                <label className={styles.announcementPublishToggle}>
                  <input
                    type="checkbox"
                    checked={readerNoticeConfig.enabled}
                    onChange={(event) => setReaderNoticeConfig((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))}
                    disabled={!readerNoticeLoaded || loadingReaderNotice || busy}
                  />
                  <span>Show notice on detail pages</span>
                </label>
                <label className={styles.field}>
                  <span>Notice script or HTML</span>
                  <textarea
                    className={styles.advertisementScript}
                    value={readerNoticeConfig.code}
                    onChange={(event) => setReaderNoticeConfig((current) => ({
                      ...current,
                      code: event.target.value,
                    }))}
                    placeholder="<script>/* Build your notice here */</script>"
                    rows={20}
                    maxLength={50_000}
                    required
                    disabled={!readerNoticeLoaded || loadingReaderNotice || busy}
                  />
                </label>
                <div className={styles.panelActions}>
                  <button className={styles.primaryButton} type="submit" disabled={!readerNoticeLoaded || loadingReaderNotice || busy}>
                    {busy ? "Saving..." : "Save Reader Notice"}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => void loadReaderNoticeConfig()}
                    disabled={loadingReaderNotice || busy}
                  >
                    {loadingReaderNotice ? "Loading..." : "Reload"}
                  </button>
                </div>
              </form>
              <div className={styles.settingsSection}>
                <h3>Manga Summary Document</h3>
                <p>The Dashboard and Manga List use <code>meta/mangaSummary</code>. Rebuild it if the summary looks out of sync.</p>
                <button className={styles.secondaryButton} onClick={() => void rebuildSummary()} disabled={busy}>Rebuild Summary Document</button>
              </div>
              <div className={styles.settingsSection}>
                <h3>Backup Firestore</h3>
                <p>Download manga metadata only or a full backup including every chapter.</p>
                <div className={styles.panelActions}>
                  <button className={styles.secondaryButton} onClick={() => void backupFirestore(false)} disabled={busy}>Backup Metadata Manga</button>
                  <button className={styles.primaryButton} onClick={() => void backupFirestore(true)} disabled={busy}>Full Backup</button>
                  <button className={styles.secondaryButton} onClick={() => void exportAllStaticChapterSummaries()} disabled={busy}>Export All Chapter JSON</button>
                  <button className={styles.secondaryButton} onClick={() => void exportSeriesStatisticsJson()} disabled={busy}>Export Series Statistics JSON</button>
                </div>
                <p>To publish the latest counts, replace <code>public/series-statistics.json</code> with the downloaded file and deploy the site.</p>
              </div>
              {settingsStatus && <p className={styles.inlineStatus}>{settingsStatus}</p>}
            </section>
          )}
          {activeSection === "og-cover" && (
            <OgCoverTool firestore={getAdminFirebase().firestore} />
          )}
          {activeSection === "advertisements" && (
            <AdvertisementSettings firestore={getAdminFirebase().firestore} />
          )}
        </div>
      </section>

      <div className={styles.quickAddWrap} ref={quickAddRef}>
        {quickAddOpen && (
          <div className={styles.quickAddMenu} id="quick-add-menu">
            <button type="button" onClick={() => { setQuickAddOpen(false); openNewManga(); }}>＋ Add Manga</button>
            <button type="button" onClick={() => { setQuickAddOpen(false); openNewChapterEditor(); }}>▤ Upload Chapter</button>
          </div>
        )}
        <button
          className={styles.quickAddButton}
          type="button"
          onClick={() => setQuickAddOpen((current) => !current)}
          aria-label={quickAddOpen ? "Close quick add menu" : "Quick Add"}
          aria-expanded={quickAddOpen}
          aria-controls="quick-add-menu"
        >
          {quickAddOpen ? "×" : "+"}
        </button>
      </div>

      {message && (
        <div
          className={styles.uploadNoticeBackdrop}
          role="status"
          aria-live="polite"
          onClick={() => setMessage("")}
        >
          <div
            className={styles.uploadNoticeCard}
            data-status={
              /fail|error|could not|skipped \(firestore quota\)/i.test(message)
                ? "error"
                : "success"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <span className={styles.uploadNoticeIcon} aria-hidden="true">
              {/fail|error|could not/i.test(message) ? "!" : "✓"}
            </span>
            <div className={styles.uploadNoticeContent}>
              <strong>
                {/fail|error|could not/i.test(message)
                  ? "Notice"
                  : /skipped/i.test(message)
                    ? "Saved"
                    : "Success"}
              </strong>
              <p>{message}</p>
            </div>
            <button
              type="button"
              className={styles.uploadNoticeClose}
              onClick={() => setMessage("")}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {uploadNotice && (
        <div
          className={styles.uploadNoticeBackdrop}
          role={uploadNotice.status === "error" ? "alert" : "status"}
          aria-live={uploadNotice.status === "error" ? "assertive" : "polite"}
        >
          <div className={styles.uploadNoticeCard} data-status={uploadNotice.status}>
            {uploadNotice.status === "uploading" ? (
              <span className={styles.uploadNoticeSpinner} aria-hidden="true" />
            ) : (
              <span className={styles.uploadNoticeIcon} aria-hidden="true">
                {uploadNotice.status === "success" ? "✓" : "!"}
              </span>
            )}
            <div className={styles.uploadNoticeContent}>
              <strong>
                {uploadNotice.status === "uploading"
                  ? "Uploading..."
                  : uploadNotice.status === "success"
                    ? "Upload complete"
                    : "Upload failed"}
              </strong>
              <p>{uploadNotice.message}</p>
            </div>
            {uploadNotice.status !== "uploading" && (
              <button
                className={styles.uploadNoticeClose}
                type="button"
                aria-label="Dismiss upload message"
                onClick={() => setUploadNotice(null)}
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {chapterEditorOpen && (
        <div className={styles.chapterEditorPage} data-chapter-editor-page>
          <form className={styles.chapterEditorForm} onSubmit={saveChapter}>
            <div className={styles.chapterEditorHeading}>
              <button type="button" className={styles.secondaryButton} onClick={() => setChapterEditorOpen(false)}>← Back to Chapters</button>
              <h2>{editingChapterNumber ? `Edit Chapter ${editingChapterNumber}` : "Upload Chapter"}</h2>
            </div>
            {selectedManga && chapterDraft.mangaSlug === selectedManga.slug ? (
              <div className={styles.selectedMangaLabel}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H7a2 2 0 0 1-2-2z" /><path d="M5 17a2 2 0 0 1 2-2h12" /></svg>
                {selectedManga.title || selectedManga.slug}
              </div>
            ) : (
              <label className={styles.field}><span>Manga</span>
                <select required disabled={Boolean(editingChapterNumber)} value={chapterDraft.mangaSlug} onChange={(event) => setChapterDraft((current) => ({ ...current, mangaSlug: event.target.value }))}>
                  <option value="">Select Manga...</option>
                  {manga.map((item) => <option value={item.slug} key={item.slug}>{item.title || item.slug}</option>)}
                </select>
              </label>
            )}
            <div className={`${styles.formGrid} ${styles.chapterNumberFields}`}>
              <label className={styles.field}><span>Chapter Number</span><input required placeholder="e.g. 12 or 12.5" value={chapterDraft.number} onChange={(event) => setChapterDraft((current) => ({ ...current, number: event.target.value.trim() }))} /></label>
              <label className={styles.field}><span>Chapter Title</span><input placeholder="e.g. The Beginning" value={chapterDraft.title} onChange={(event) => setChapterDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            </div>
            {generatedReaderLink && (
              <div className={styles.field}>
                <span>Generated reader link</span>
                <div className={styles.fileUploadRow}>
                  <input readOnly value={generatedReaderLink} aria-label="Generated reader link" />
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void copyGeneratedReaderLink()}
                  >Copy</button>
                </div>
                <small>Link ini dibuat otomatis dan disimpan saat chapter disimpan.</small>
              </div>
            )}
            <div className={`${styles.field} ${styles.chapterThumbnailField}`}>
              <span>Thumbnail</span>
              <div className={styles.fileUploadRow}>
                <input ref={thumbnailFileInput} type="file" accept="image/*" />
                <button type="button" className={styles.secondaryButton} onClick={() => void uploadThumbnailFile()} disabled={busy}>Upload</button>
              </div>
              <input type="url" placeholder="Thumbnail URL" value={chapterDraft.thumbnail} onChange={(event) => setChapterDraft((current) => ({ ...current, thumbnail: event.target.value }))} />
              {chapterDraft.thumbnail && (
                <img className={styles.thumbnailPreview} src={chapterDraft.thumbnail} alt="Chapter thumbnail preview" referrerPolicy="no-referrer" decoding="async" />
              )}
            </div>
            <div className={`${styles.field} ${styles.chapterImagesField}`}>
              <span>Upload Chapter Images</span>
              <div className={styles.fileUploadRow}>
                <input ref={chapterFilesInput} type="file" accept="image/*" multiple />
                <button type="button" className={styles.secondaryButton} onClick={() => void uploadChapterFiles()} disabled={busy}>Upload All</button>
              </div>
              <textarea
                rows={3}
                placeholder="Paste image URLs or copied image markup here (1 image = 1 page). Then click Clean & List."
                value={chapterDraft.images}
                onPaste={pasteChapterImages}
                onChange={(event) => setChapterDraft((current) => ({ ...current, images: event.target.value }))}
              />
              <div className={styles.imageListToolbar}>
                <button type="button" className={styles.secondaryButton} onClick={addChapterImageUrls}>＋ Clean &amp; List</button>
                <button type="button" className={styles.secondaryButton} onClick={sortChapterImages}>⇅ Sort by Name</button>
                <button type="button" className={styles.secondaryButton} onClick={() => setChapterDraft((c) => ({ ...c, images: "", thumbnail: c.thumbnail }))}>Clear Images</button>
                <button type="button" className={styles.secondaryButton} onClick={() => setImageReloadKey((k) => k + 1)} title="Hard reload all preview images">↻ Reload Previews</button>
                <span>{chapterImageUrls.length ? `${chapterImageUrls.length} images` : ""}</span>
              </div>

              {/* Separate URL fields (one per image) — scrollable */}
              {chapterImageUrls.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    marginBottom: "12px",
                    maxHeight: "180px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {chapterImageUrls.map((url, index) => (
                    <div
                      key={`url-row-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: "1px solid rgba(128,128,128,0.25)",
                        background: "rgba(0,0,0,0.15)",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ minWidth: "22px", fontSize: "12px", fontWeight: 600, opacity: 0.8 }}>{index + 1}</span>
                      <input
                        type="text"
                        value={url}
                        onChange={(event) => updateChapterImageUrl(index, event.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: "12px",
                          padding: "5px 8px",
                          borderRadius: "5px",
                          border: "1px solid rgba(128,128,128,0.35)",
                          background: "rgba(0,0,0,0.2)",
                          color: "inherit",
                        }}
                        aria-label={`Image URL page ${index + 1}`}
                      />
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        style={{ padding: "4px 10px", fontSize: "11px", whiteSpace: "nowrap" }}
                        onClick={() => void copyChapterImageUrl(url)}
                        title="Copy URL"
                      >
                        Copy
                      </button>
                      <button type="button" className={styles.secondaryButton} style={{ padding: "4px 6px", fontSize: "12px" }} onClick={() => moveChapterImage(index, -1)} aria-label="Move up">↑</button>
                      <button type="button" className={styles.secondaryButton} style={{ padding: "4px 6px", fontSize: "12px" }} onClick={() => moveChapterImage(index, 1)} aria-label="Move down">↓</button>
                      <button type="button" className={styles.deleteButton} style={{ padding: "4px 6px", fontSize: "12px" }} onClick={() => removeChapterImage(index)} aria-label="Remove">×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Image previews (original style) */}
              <div className={styles.uploadedImageGrid}>
                {chapterImageUrls.map((url, index) => (
                  <div
                    className={styles.uploadedImage}
                    key={`page-${index}-${url.slice(-48)}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", String(index));
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = Number(event.dataTransfer.getData("text/plain"));
                      if (!Number.isInteger(from) || from === index) return;
                      const reordered = [...chapterImageUrls];
                      const [image] = reordered.splice(from, 1);
                      reordered.splice(index, 0, image);
                      setChapterDraft((current) => ({ ...current, images: reordered.join("\n") }));
                    }}
                  >
                    <img
                      src={adminPreviewSrc(url, imageReloadKey)}
                      alt={`Chapter page ${index + 1}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      decoding="async"
                      onError={(e) => {
                        const el = e.currentTarget;
                        const attempt = Number(el.dataset.attempt || "0");
                        if (attempt === 0) {
                          el.dataset.attempt = "1";
                          try {
                            const proxy = new URL("https://images.weserv.nl/");
                            proxy.searchParams.set("url", url);
                            proxy.searchParams.set("w", "600");
                            proxy.searchParams.set("q", "70");
                            proxy.searchParams.set("output", "webp");
                            proxy.searchParams.set("n", "-1");
                            proxy.searchParams.set("v", String(imageReloadKey + 1));
                            el.src = proxy.toString();
                          } catch {
                            el.src = adminPreviewSrc(url, imageReloadKey + 1);
                          }
                        } else if (attempt === 1) {
                          el.dataset.attempt = "2";
                          el.src = adminPreviewSrc(url, imageReloadKey + 2);
                        }
                      }}
                    />
                    <span className={styles.imageIndex}>{index + 1}</span>
                    <span className={styles.imageFileName} title={imageFileName(url)}>{imageFileName(url) || `page-${index + 1}`}</span>
                    <div className={styles.uploadedImageActions}>
                      <button type="button" aria-label={`Move page ${index + 1} up`} onClick={() => moveChapterImage(index, -1)}>↑</button>
                      <button type="button" aria-label={`Move page ${index + 1} down`} onClick={() => moveChapterImage(index, 1)}>↓</button>
                      <button type="button" aria-label={`Remove page ${index + 1}`} onClick={() => removeChapterImage(index)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.chapterContentField}>
              <div className={styles.field}>
                <span id="chapter-content-label">Text Content (optional, for novels)</span>
                <RichTextEditor kind="chapter" value={chapterDraft.content} onChange={(content) => setChapterDraft((current) => ({ ...current, content }))} />
              </div>
            </div>
            <label className={styles.checkboxField}><input type="checkbox" checked={chapterDraft.isDraft} onChange={(event) => setChapterDraft((current) => ({ ...current, isDraft: event.target.checked }))} /><span>Save as Draft</span></label>
            {chapterError && <p className={styles.error}>{chapterError}</p>}
            <div className={styles.formActions}><button className={styles.primaryButton} disabled={busy}>{busy ? "Saving..." : "Save Chapter"}</button><button type="button" className={styles.secondaryButton} onClick={() => setChapterEditorOpen(false)}>Cancel</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
