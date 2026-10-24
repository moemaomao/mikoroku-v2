"use client";

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
  getDocs,
  getFirestore,
  limit,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import "quill/dist/quill.snow.css";
import styles from "./admin.module.css";
import { CoverImage } from "../lib/cover-image";
import RichTextEditor from "./rich-text-editor";
import MangaMetadataEditor from "./manga-metadata-editor";

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
const ADMIN_MANGA_CACHE_KEY = "adminMangaCatalogCache";
const ADMIN_MANGA_CACHE_DURATION = 5 * 60 * 1000;
const GITHUB_JSON =
  "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json";
const IMGBB_API_KEY = "751e8d146b32b8a00499aef04f568e30";

type AdminFirebase = { auth: Auth; firestore: Firestore };

type MangaRecord = {
  [key: string]: unknown;
  slug: string;
  title: string;
  altTitle: string;
  cover: string;
  covers?: string[];
  coverNumbers?: Record<string, string>;
  desc: string;
  type: string;
  status: string;
  author: string;
  artist: string;
  circle: string;
  group: string;
  series: string;
  serialization: string;
  publication: string;
  genres: string[];
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
  altTitle: string;
  cover: string;
  desc: string;
  type: string;
  status: string;
  author: string;
  artist: string;
  circle: string;
  group: string;
  series: string;
  serialization: string;
  publication: string;
  genres: string;
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
  covers?: string[];
  coverNumbers?: Record<string, string>;
  type: string;
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

type UploadNotice = {
  status: "uploading" | "success" | "error";
  message: string;
};

const emptyDraft: MangaDraft = {
  slug: "",
  title: "",
  altTitle: "",
  cover: "",
  desc: "",
  type: "manga",
  status: "ongoing",
  author: "",
  artist: "",
  circle: "",
  group: "",
  series: "",
  serialization: "",
  publication: "",
  genres: "",
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

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).map(text).filter(Boolean);
  }
  return [];
}

function toDraft(manga?: MangaRecord): MangaDraft {
  if (!manga) return { ...emptyDraft };
  return {
    slug: manga.slug,
    title: manga.title,
    altTitle: manga.altTitle,
    cover: manga.cover,
    desc: manga.desc,
    type: manga.type || "manga",
    status: manga.status || "ongoing",
    author: manga.author,
    artist: manga.artist,
    circle: manga.circle,
    group: manga.group,
    series: manga.series,
    serialization: manga.serialization,
    publication: manga.publication,
    genres: manga.genres.join(", "),
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
  delete mangaData.chapters;
  return {
    ...mangaData,
    slug,
    title: text(data.title) || slug,
    altTitle: text(data.altTitle),
    cover: text(data.cover) || text(data.img),
    covers: stringList(data.covers),
    coverNumbers: data.coverNumbers && typeof data.coverNumbers === "object"
      ? Object.fromEntries(Object.entries(data.coverNumbers).map(([url, number]) => [url, text(number)]))
      : {},
    desc: text(data.desc),
    type: text(data.type) || "manga",
    status: text(data.status) || "unknown",
    author: text(data.author),
    artist: text(data.artist),
    circle: text(data.circle),
    group: text(data.group),
    series: text(data.series),
    serialization: text(data.serialization),
    publication: text(data.publication),
    genres: stringList(data.genres),
    femaleTags: stringList(data.femaleTags),
    maleTags: stringList(data.maleTags),
    tags: stringList(data.tags),
    characters: stringList(data.characters),
    rating: typeof data.rating === "number" ? data.rating : 0,
    chapterCount:
      typeof data.chapterCount === "number"
        ? data.chapterCount
        : data.chapters && typeof data.chapters === "object"
          ? Object.keys(data.chapters).length
          : 0,
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

function extractChapterImageUrls(content: string): string[] {
  const normalized = content
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&quot;|&#34;|&#x22;/gi, '"');
  const candidates: string[] = [];
  const imageTags = normalized.match(/<img\b[^>]*>/gi) || [];

  for (const tag of imageTags) {
    const attributes = [...tag.matchAll(/\b(src|data-src|data-original|data-lazy-src|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)];
    for (const attribute of attributes) {
      const value = attribute[2] || attribute[3] || attribute[4] || "";
      if (attribute[1].toLowerCase() === "srcset") {
        candidates.push(...value.split(",").map((item) => item.trim().split(/\s+/)[0]));
      } else {
        candidates.push(value);
      }
    }
  }

  if (!candidates.length) {
    candidates.push(...(normalized.match(/https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:\?[^\s"'<>]*)?/gi) || []));
  }
  if (!candidates.length) {
    candidates.push(...(normalized.match(/https?:\/\/[^\s"'<>]+/gi) || []));
  }

  return [...new Set(candidates
    .map((value) => value.replace(/["'<>),;}\]]+$/, "").trim())
    .filter((value) => /^https?:\/\//i.test(value))
    .map((value) => value
      .replace(/\/s\d+\//i, "/s800/")
      .replace(/\/w\d+-h\d+(?:-[a-z0-9-]+)?/i, "/s500")))];
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
    return decodeURIComponent(path.split("/").pop() || url);
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
    covers: manga.covers || [],
    coverNumbers: manga.coverNumbers || {},
    type: manga.type || "manga",
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
    return { items, time: cached.time };
  } catch (error) {
    console.warn("Admin catalog cache is invalid and will be ignored.", error);
    return null;
  }
}

function writeAdminMangaCache(items: MangaRecord[]): void {
  try {
    window.localStorage.setItem(
      ADMIN_MANGA_CACHE_KEY,
      JSON.stringify({ time: Date.now(), items }),
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

async function updateSummary(
  firestore: Firestore,
  manga: MangaRecord,
  remove = false,
): Promise<void> {
  const summaryRef = doc(firestore, "meta", "mangaSummary");
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(summaryRef);
    const rawList: unknown = snapshot.data()?.list;
    const list = Array.isArray(rawList) ? rawList.filter(isSummaryEntry) : [];
    const nextList = remove
      ? list.filter((entry) => entry.slug !== manga.slug)
      : [
          ...list.filter((entry) => entry.slug !== manga.slug),
          toSummaryEntry(manga),
        ].sort((left, right) => right.updatedAt - left.updatedAt);
    transaction.set(
      summaryRef,
      { list: nextList, count: nextList.length, updatedAt: Date.now() },
      { merge: true },
    );
  });
}

function mapGithubRecord(raw: Record<string, unknown>): MangaRecord | null {
  const title = text(raw.title) || text(raw.name);
  const slug = text(raw.slug) || slugify(title);
  if (!slug) return null;
  return {
    ...raw,
    slug,
    title: title || slug,
    altTitle: text(raw.altTitle) || text(raw.alternative) || text(raw.alt_title),
    cover: text(raw.cover) || text(raw.img),
    covers: stringList(raw.covers),
    coverNumbers: raw.coverNumbers && typeof raw.coverNumbers === "object"
      ? Object.fromEntries(Object.entries(raw.coverNumbers).map(([url, number]) => [url, text(number)]))
      : {},
    desc:
      text(raw.desc) ||
      text(raw.description) ||
      text(raw.synopsis) ||
      text(raw.sinopsis),
    type: text(raw.type) || "manga",
    status: text(raw.status) || "unknown",
    author: text(raw.author) || text(raw.authors),
    artist: text(raw.artist) || text(raw.artists),
    circle: text(raw.circle),
    group: text(raw.group),
    series: text(raw.series),
    serialization: text(raw.serialization),
    publication: text(raw.publication) || text(raw.year),
    genres: stringList(raw.genres ?? raw.genre),
    femaleTags: stringList(raw.femaleTags),
    maleTags: stringList(raw.maleTags),
    tags: stringList(raw.tags),
    characters: stringList(raw.characters),
    rating: typeof raw.rating === "number" ? raw.rating : 0,
    chapterCount: typeof raw.chapterCount === "number" ? raw.chapterCount : 0,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
    source: "github",
    origin: "github",
    githubSlug: slug,
  };
}

function mergeGithubMetadata(
  githubManga: MangaRecord[],
  firestoreManga: MangaRecord[],
): MangaRecord[] {
  const merged = new Map(firestoreManga.map((manga) => [manga.slug, manga]));
  const fill = <T,>(existing: T, incoming: T): T =>
    existing == null || existing === "" || (Array.isArray(existing) && existing.length === 0)
      ? incoming
      : existing;

  for (const remote of githubManga) {
    const current = merged.get(remote.slug);
    if (!current) {
      merged.set(remote.slug, remote);
      continue;
    }
    merged.set(remote.slug, {
      ...remote,
      ...current,
      title: fill(current.title, remote.title),
      altTitle: fill(current.altTitle, remote.altTitle),
      cover: fill(current.cover, remote.cover),
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
      tags: fill(current.tags, remote.tags),
      characters: fill(current.characters, remote.characters),
      rating: current.rating || remote.rating,
      githubSlug: remote.githubSlug,
      source: "hybrid",
    });
  }
  return [...merged.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manga, setManga] = useState<MangaRecord[]>([]);
  const [loadingManga, setLoadingManga] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [warning, setWarning] = useState("");
  const [queryText, setQueryText] = useState("");
  const [activeSection, setActiveSection] = useState<
    "dashboard" | "manga-list" | "editor" | "manga-detail" | "reports" | "announcements" | "genres" | "settings"
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
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
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
  const [settingsStatus, setSettingsStatus] = useState("");
  const [uploadNotice, setUploadNotice] = useState<UploadNotice | null>(null);
  const [draggingCoverUrl, setDraggingCoverUrl] = useState<string | null>(null);
  const coverFileInput = useRef<HTMLInputElement>(null);
  const coverGalleryFilesInput = useRef<HTMLInputElement>(null);
  const thumbnailFileInput = useRef<HTMLInputElement>(null);
  const chapterFilesInput = useRef<HTMLInputElement>(null);
  const loadingMangaRef = useRef(false);
  const chapterImageUrls = useMemo(
    () => extractChapterImageUrls(chapterDraft.images),
    [chapterDraft.images],
  );

  useEffect(() => {
    setIsLightMode(window.localStorage.getItem("theme") === "light");
  }, []);

  useEffect(() => {
    if (!uploadNotice || uploadNotice.status === "uploading") return;
    const timeout = window.setTimeout(() => setUploadNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [uploadNotice]);

  const loadManga = useCallback(async (force = false) => {
    if (loadingMangaRef.current) return;
    const cached = readAdminMangaCache();
    if (!force && cached && Date.now() - cached.time < ADMIN_MANGA_CACHE_DURATION) {
      setManga(cached.items);
      setLoadError("");
      setWarning("");
      return;
    }

    loadingMangaRef.current = true;
    setLoadingManga(true);
    setLoadError("");
    setWarning("");
    try {
      const { firestore } = getAdminFirebase();
      const [summaryResult, githubResult] = await Promise.allSettled([
        getDoc(doc(firestore, "meta", "mangaSummary")),
        fetch(GITHUB_JSON, { cache: force ? "no-cache" : "default" }).then(async (response) => {
          if (!response.ok) throw new Error(`GitHub mengembalikan ${response.status}.`);
          const remoteData: unknown = await response.json();
          if (!Array.isArray(remoteData)) {
            throw new Error("The GitHub manga data has an invalid format.");
          }
          return remoteData
            .filter(
              (entry): entry is Record<string, unknown> =>
                typeof entry === "object" && entry !== null,
            )
            .map(mapGithubRecord)
            .filter((entry): entry is MangaRecord => entry !== null);
        }),
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

      const githubManga = githubResult.status === "fulfilled" ? githubResult.value : [];
      if (githubResult.status === "rejected") {
        console.warn("Failed to load the GitHub manga catalog.", githubResult.reason);
      }
      if (!githubManga.length && !firestoreManga.length) {
        if (cached?.items.length) {
          setManga(cached.items);
          setWarning(
            `Could not load the latest catalog. Showing the local cache. ${summaryWarning} ${githubResult.status === "rejected" ? getErrorMessage(githubResult.reason) : ""}`.trim(),
          );
          return;
        }
        throw new Error(
          summaryWarning ||
            (githubResult.status === "rejected"
              ? getErrorMessage(githubResult.reason)
              : "No catalog data is available."),
        );
      }

      const loadedManga = mergeGithubMetadata(githubManga, firestoreManga);
      setManga(loadedManga);
      writeAdminMangaCache(loadedManga);
      const githubWarning = githubResult.status === "rejected"
        ? `GitHub data unavailable: ${getErrorMessage(githubResult.reason)}.`
        : "";
      setWarning([summaryWarning, githubWarning].filter(Boolean).join(" "));
    } catch (error) {
      console.error("Failed to load the admin manga list.", error);
      if (cached?.items.length) {
        setManga(cached.items);
        setWarning(`Could not load the latest catalog. Showing the local cache: ${getErrorMessage(error)}`);
      } else {
        setLoadError(`Failed to load manga: ${getErrorMessage(error)}`);
      }
    } finally {
      loadingMangaRef.current = false;
      setLoadingManga(false);
    }
  }, []);

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

    // Override layout body pt-14 (site header offset) — admin has no site header
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
    // Reports are refreshed whenever the Report section is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, user]);

  useEffect(() => {
    if (activeSection === "announcements" && user) void loadAnnouncements();
    // Announcements are refreshed whenever the section is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, user]);

  const filteredManga = useMemo(() => {
    const normalized = queryText.trim().toLowerCase();
    if (!normalized) return manga;
    return manga.filter(
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

  function openEditor(item: MangaRecord) {
    setEditing(item);
    setDraft(toDraft(item));
    setSelectedManga(item);
    setDetailTab("info");
    setMessage("");
    setActiveSection("manga-detail");
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
    if (key === "isDraft" && typeof value === "boolean") {
      updateDraft("isDraft", value);
    } else if (key !== "isDraft" && typeof value === "string") {
      updateDraft(key, value);
    }
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

      const updatedAt = Date.now();
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
      const data = {
        title: draft.title.trim(),
        altTitle: draft.altTitle.trim(),
        cover: mainCover,
        covers,
        coverNumbers,
        desc: draft.desc.trim(),
        type: draft.type,
        status: draft.status,
        author: draft.author.trim(),
        artist: draft.artist.trim(),
        circle: draft.circle.trim(),
        group: draft.group.trim(),
        series: draft.series.trim(),
        serialization: draft.serialization.trim(),
        publication: draft.publication.trim(),
        genres: splitList(draft.genres),
        femaleTags: splitList(draft.femaleTags),
        maleTags: splitList(draft.maleTags),
        tags: splitList(draft.tags),
        characters: splitList(draft.characters),
        rating: draft.rating.trim() ? Math.min(10, Math.max(0, parsedRating)) : 0,
        isDraft: draft.isDraft,
        managedByAdmin: true,
        origin: isGithub ? "github" : "firestore",
        source: isGithub ? "hybrid" : "firestore",
        ...(editing?.githubSlug ? { githubSlug: editing.githubSlug } : {}),
        ...(editing ? { chapterCount: editing.chapterCount } : { chapterCount: 0 }),
        updatedAt,
        latestUpdate: updatedAt,
      };
      await setDoc(mangaRef, data, { merge: true });

      const savedManga = fromFirestore(slug, {
        ...data,
        slug,
        source: data.source,
        origin: data.origin,
      });
      setManga((current) =>
        mergeGithubMetadata(
          current
            .filter((item) => item.slug !== editing?.slug && item.slug !== slug)
            .filter((item) => item.source !== "github" || item.slug !== slug),
          [savedManga],
        ),
      );
      invalidateAdminMangaCache();

      try {
        await updateSummary(firestore, savedManga);
        setMessage("Manga saved successfully.");
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
      console.error("Failed to save the manga.", error);
      setMessage(`Failed to save manga: ${getErrorMessage(error)}`);
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
      await deleteDoc(doc(firestore, "manga", item.slug));
      setManga((current) => current.filter((entry) => entry.slug !== item.slug));
      invalidateAdminMangaCache();
      try {
        await updateSummary(firestore, item, true);
        setMessage(`Manga "${item.slug}" and its chapters were deleted successfully.`);
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
    setSettingsStatus(includeChapters ? "Creating a manga and chapter backup..." : "Creating a manga backup...");
    try {
      const { firestore } = getAdminFirebase();
      const mangaSnapshot = await getDocs(collection(firestore, "manga"));
      const mangaData: Array<Record<string, unknown>> = [];
      let chapterCount = 0;
      for (const mangaDoc of mangaSnapshot.docs) {
        const record: Record<string, unknown> = { id: mangaDoc.id, ...mangaDoc.data() };
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
        `mikoroku-backup-${includeChapters ? "full" : "manga"}-${stamp}.json`,
        {
          exportedAt: now.toISOString(),
          exportedAtMs: now.getTime(),
          includeChapters,
          mangaCount: mangaData.length,
          ...(includeChapters ? { chapterCount } : {}),
          manga: mangaData,
        },
      );
      setSettingsStatus(
        includeChapters
          ? `Backup completed: ${mangaData.length} manga and ${chapterCount} chapters.`
          : `Backup completed: ${mangaData.length} manga.`,
      );
    } catch (error) {
      console.error("Firestore backup failed.", error);
      setSettingsStatus(`Backup failed: ${getErrorMessage(error)}`);
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

  function openChapterModal() {
    setEditingChapterNumber(null);
    setChapterDraft({ ...emptyChapterDraft });
    setChapterError("");
    setUploadNotice(null);
    setQuickAddOpen(false);
    setChapterModalOpen(true);
  }

  async function uploadCoverFile() {
    const file = coverFileInput.current?.files?.[0];
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
      if (coverFileInput.current) coverFileInput.current.value = "";
    } catch (error) {
      console.error("Failed to upload the cover.", error);
      setUploadNotice({ status: "error", message: `Cover upload failed: ${getErrorMessage(error)}` });
    } finally {
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
    await setDoc(
      doc(firestore, "manga", selectedManga.slug),
      {
        slug: selectedManga.slug,
        title: selectedManga.title,
        cover: nextCovers[nextCovers.length - 1] || selectedManga.cover,
        covers: nextCovers,
        coverNumbers: nextCoverNumbers,
      },
      { merge: true },
    );
    const updatedManga = {
      ...selectedManga,
      cover: nextCovers[nextCovers.length - 1] || selectedManga.cover,
      covers: nextCovers,
      coverNumbers: nextCoverNumbers,
    };
    await updateSummary(firestore, updatedManga);
    setSelectedManga(updatedManga);
    setSavedCoverOrder(nextCovers);
    const updatedCatalog = manga.map((item) => item.slug === updatedManga.slug ? updatedManga : item);
    setManga(updatedCatalog);
    writeAdminMangaCache(updatedCatalog);
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
    const uniqueUrls = extractChapterImageUrls(chapterDraft.images);
    setChapterDraft((current) => ({
      ...current,
      images: uniqueUrls.join("\n"),
      thumbnail: current.thumbnail || uniqueUrls[Math.min(2, uniqueUrls.length - 1)] || "",
    }));
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
    } catch (error) {
      console.error(`Failed to load chapters for ${item.slug}.`, error);
      setMessage(`Failed to load chapters: ${getErrorMessage(error)}`);
    } finally {
      setLoadingChapters(false);
    }
  }

  function openChapterEditor(chapter: AdminChapter) {
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
    setChapterModalOpen(true);
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
          updatedAt: now,
          latestUpdate: now,
        },
        { merge: true },
      );
      const nextManga = {
        ...selectedManga,
        chapterCount: remaining.length,
        lastChapter: latestChapter,
        updatedAt: now,
      };
      setSelectedManga(nextManga);
      setChapters(remaining);
      setManga((current) => current.map((item) => item.slug === nextManga.slug ? nextManga : item));
      invalidateAdminMangaCache();
      await updateSummary(firestore, nextManga);
      setMessage(`Chapter ${chapter.num} deleted successfully.`);
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
      setMessage("Chapter order saved successfully.");
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
      const currentManga = mangaSnapshot.exists()
        ? fromFirestore(mangaSlug, mangaSnapshot.data())
        : manga.find((item) => item.slug === mangaSlug);
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
      invalidateAdminMangaCache();

      const isNewChapter = !existingChapterSnapshot.exists();
      const isRenamedChapter = Boolean(
        oldChapterNumber && oldChapterNumber !== chapterNumber,
      );
      let nextManga = currentManga;
      let refreshedChapters: AdminChapter[] | null = null;
      if (isNewChapter || isRenamedChapter) {
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
        await setDoc(
          mangaRef,
          {
            ...parentData,
            chapterCount: nextCount,
            lastChapter: latestChapter,
            lastChapterUpdated: latestChapter,
            updatedAt: now,
            latestUpdate: now,
            managedByAdmin: true,
          },
          { merge: true },
        );
        if (currentManga) {
          nextManga = {
            ...currentManga,
            chapterCount: nextCount,
            lastChapter: latestChapter,
            updatedAt: now,
            managedByAdmin: true,
            source: currentManga.origin === "github" ? "hybrid" : currentManga.source,
          };
          await updateSummary(firestore, nextManga);
        }
      }
      if (nextManga) {
        setManga((current) => current.map((item) => item.slug === mangaSlug ? nextManga : item));
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
      setChapterModalOpen(false);
      setMessage(`Chapter ${chapterNumber} saved successfully.`);
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
    <main className={`${styles.adminShell} ${isLightMode ? styles.lightMode : ""}`}>
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
        </div>

        <div className={styles.content}>
          {message && <p className={styles.notice}>{message}</p>}
          {warning && <p className={styles.warning}>{warning}</p>}
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
                  <p>{filteredManga.length.toLocaleString("en-US")} manga</p>
                </div>
                <div className={styles.panelActions}>
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
                          <CoverImage src={item.cover} alt="" />
                        ) : <span className={styles.coverPlaceholder}>M</span>}
                        <span className={styles.mangaSource}>{item.source === "hybrid" ? "HYBRID" : item.source.toUpperCase()}</span>
                        {item.isDraft && <span className={styles.mangaDraftBadge}>DRAFT</span>}
                      </button>
                      <div className={styles.mangaCardBody}>
                        <button className={styles.mangaCardTitle} title={item.title} onClick={() => void openMangaChapters(item)}>{item.title || item.slug}</button>
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

          {activeSection === "manga-detail" && selectedManga && (
            <section className={styles.panel}>
              <div className={styles.detailHeader}>
                {selectedManga.cover ? (
                  <CoverImage src={selectedManga.cover} alt="" loading="eager" />
                ) : <span className={styles.coverPlaceholder}>M</span>}
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
                      setChapterModalOpen(true);
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
                  onClick={() => {
                    setDetailTab("info");
                    setEditing(selectedManga);
                    setDraft(toDraft(selectedManga));
                  }}
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
                  onChange={updateDraftField}
                  onUploadCover={() => void uploadCoverFile()}
                  onSubmit={handleSaveManga}
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
                            <CoverImage src={coverUrl} alt={`${selectedManga.title} volume ${selectedManga.coverNumbers?.[coverUrl] || index + 1}`} loading="lazy" />
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
                  {message && <p className={styles.notice}>{message}</p>}
                  <div className={styles.chapterTools}>
                    <button className={styles.successButton} onClick={() => {
                      setChapterDraft({ ...emptyChapterDraft, mangaSlug: selectedManga.slug });
                      setEditingChapterNumber(null);
                      setUploadNotice(null);
                      setChapterModalOpen(true);
                    }}>＋ Add Chapter</button>
                    <button className={styles.secondaryButton} onClick={() => void openMangaChapters(selectedManga)} disabled={loadingChapters}>⟳ Refresh</button>
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
                            <strong>{chapter.title || `Chapter ${chapter.num}`}</strong>
                            {chapter.isDraft ? <small className={styles.chapterDraftBadge}>DRAFT</small> : null}
                          </div>
                          <span className={styles.chapterDate}>{chapter.date ? new Date(getTimestamp(chapter.date)).toLocaleDateString("en-US") : ""}</span>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.editButton}
                              aria-label={`Edit chapter ${chapter.num}`}
                              onClick={() => openChapterEditor(chapter)}
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
                      <p className={styles.announcementAdminContent}>{announcement.content}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
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
              <div className={styles.settingsSection}>
                <h3>Manga Summary Document</h3>
                <p>The Dashboard and Manga List use <code>meta/mangaSummary</code>. Rebuild it if the summary looks out of sync.</p>
                <button className={styles.secondaryButton} onClick={() => void rebuildSummary()} disabled={busy}>Rebuild Summary Document</button>
              </div>
              <div className={styles.settingsSection}>
                <h3>Backup Firestore</h3>
                <p>Download a backup of all manga, with an option to include every chapter.</p>
                <div className={styles.panelActions}>
                  <button className={styles.secondaryButton} onClick={() => void backupFirestore(false)} disabled={busy}>Backup Manga</button>
                  <button className={styles.primaryButton} onClick={() => void backupFirestore(true)} disabled={busy}>Full Backup</button>
                </div>
              </div>
              {settingsStatus && <p className={styles.inlineStatus}>{settingsStatus}</p>}
            </section>
          )}
        </div>
      </section>

      <div className={styles.quickAddWrap}>
        {quickAddOpen && (
          <div className={styles.quickAddMenu}>
            <button onClick={() => { setQuickAddOpen(false); openNewManga(); }}>＋ Add Manga</button>
            <button onClick={openChapterModal}>▤ Upload Chapter</button>
          </div>
        )}
        <button className={styles.quickAddButton} onClick={() => setQuickAddOpen((current) => !current)} aria-label="Quick Add">
          {quickAddOpen ? "×" : "+"}
        </button>
      </div>

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

      {chapterModalOpen && (
        <div className={styles.modalBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setChapterModalOpen(false);
        }}>
          <form className={styles.chapterModal} onSubmit={saveChapter}>
            <button type="button" className={styles.modalClose} onClick={() => setChapterModalOpen(false)} aria-label="Close">×</button>
            <h2>{editingChapterNumber ? `Edit Chapter ${editingChapterNumber}` : "Upload Chapter"}</h2>
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
            <div className={`${styles.field} ${styles.chapterThumbnailField}`}>
              <span>Thumbnail</span>
              <div className={styles.fileUploadRow}>
                <input ref={thumbnailFileInput} type="file" accept="image/*" />
                <button type="button" className={styles.secondaryButton} onClick={() => void uploadThumbnailFile()} disabled={busy}>Upload</button>
              </div>
              <input type="url" placeholder="Thumbnail URL" value={chapterDraft.thumbnail} onChange={(event) => setChapterDraft((current) => ({ ...current, thumbnail: event.target.value }))} />
              {chapterDraft.thumbnail && (
                <img className={styles.thumbnailPreview} src={chapterDraft.thumbnail} alt="Chapter thumbnail preview" />
              )}
            </div>
            <div className={`${styles.field} ${styles.chapterImagesField}`}>
              <span>Upload Chapter Images</span>
              <div className={styles.fileUploadRow}>
                <input ref={chapterFilesInput} type="file" accept="image/*" multiple />
                <button type="button" className={styles.secondaryButton} onClick={() => void uploadChapterFiles()} disabled={busy}>Upload All</button>
              </div>
              <textarea rows={4} placeholder="Or paste image URLs here (1 line = 1 image)" value={chapterDraft.images} onChange={(event) => setChapterDraft((current) => ({ ...current, images: event.target.value }))} />
              <div className={styles.imageListToolbar}>
                <button type="button" className={styles.secondaryButton} onClick={addChapterImageUrls}>＋ Add to List</button>
                <button type="button" className={styles.secondaryButton} onClick={sortChapterImages}>⇅ Sort by Name</button>
                <span>{chapterImageUrls.length ? `${chapterImageUrls.length} images` : ""}</span>
              </div>
              <div className={styles.uploadedImageGrid}>
                {chapterImageUrls.map((url, index) => (
                  <div
                    className={styles.uploadedImage}
                    key={`${url}-${index}`}
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
                    <img src={url} alt={`Chapter page ${index + 1}`} loading="lazy" />
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
              <label className={styles.field}>
                <span>Text Content (optional, for novels)</span>
                <RichTextEditor kind="chapter" value={chapterDraft.content} onChange={(content) => setChapterDraft((current) => ({ ...current, content }))} />
              </label>
            </div>
            <label className={styles.checkboxField}><input type="checkbox" checked={chapterDraft.isDraft} onChange={(event) => setChapterDraft((current) => ({ ...current, isDraft: event.target.checked }))} /><span>Save as Draft</span></label>
            {chapterError && <p className={styles.error}>{chapterError}</p>}
            <div className={styles.formActions}><button className={styles.primaryButton} disabled={busy}>{busy ? "Saving..." : "Save Chapter"}</button><button type="button" className={styles.secondaryButton} onClick={() => setChapterModalOpen(false)}>Cancel</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
