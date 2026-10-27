import { normalizeChapterNumber } from "../../lib/chapter-number";
import { initializeFirebaseClient } from "./firebase-client";
import {
  compactChapterCache,
  mergeSharedChapterCache,
  readSharedChapterCache,
  type SharedChapterSource,
} from "./chapter-cache";

export type GlobalAppearanceSettings = {
  hideHero: boolean;
  hideStatusBadge: boolean;
  hideTypeBadge: boolean;
  hideChapterBadge: boolean;
  hideDetailCoverBackground: boolean;
  cardDisplay: "default" | "list";
  accentColor: string | null;
};

export type GlobalAppearanceToggleSetting =
  | "hideHero"
  | "hideStatusBadge"
  | "hideTypeBadge"
  | "hideChapterBadge"
  | "hideDetailCoverBackground";

export const GLOBAL_APPEARANCE_KEY = "mikoroku_global_appearance_v1";

export const defaultGlobalAppearance: GlobalAppearanceSettings = {
  hideHero: false,
  hideStatusBadge: false,
  hideTypeBadge: false,
  hideChapterBadge: false,
  hideDetailCoverBackground: false,
  cardDisplay: "default",
  accentColor: null,
};

const appearanceTargets: Array<[GlobalAppearanceToggleSetting, string]> = [
  ["hideHero", "#heroSection"],
  ["hideStatusBadge", ".status-badge"],
  ["hideTypeBadge", ".type-badge"],
  ["hideChapterBadge", ".ch-badge"],
];

const cardContainers = ["#githubManga", "#firebaseManga", "#firebaseNovel"];
const cardElements = [".card", ".catalog-card"];
const cardCoverElements = [".thumb", ".catalog-cover"];
const cardOverlayElements = [".overlay"];
const cardTitleElements = [".title", ".catalog-card-title"];
const cardDetailsElements = [".global-card-details"];
const cardModeScopeSelector = cardContainers.join(",");
const cardModeClasses = {
  list: {
    container: ["!grid-cols-1", "!gap-1", "!p-1", "md:!grid-cols-4", "md:!gap-2", "md:!p-2"],
    card: ["!flex", "!flex-row", "!items-stretch", "!gap-0", "!overflow-hidden", "!rounded-xl", "!border", "!border-black/10", "!bg-white", "!p-0", "dark:!border-white/10", "dark:!bg-[#191a20]"],
    cover: ["!h-auto", "!w-[72px]", "!min-w-[72px]", "!max-w-[72px]", "!shrink-0", "!aspect-square", "!rounded-[8px]", "md:!w-[96px]", "md:!min-w-[96px]", "md:!max-w-[96px]", "md:!aspect-square"],
    overlay: ["!static", "!order-2", "!w-full", "!bg-none", "!p-0", "!pb-0", "!text-left"],
    title: [
      "!relative", "!inset-auto", "!m-0", "!min-h-0", "!max-h-none", "!w-full", "!self-start",
      "!overflow-hidden", "!rounded-none", "!bg-transparent", "!p-0", "!pb-0", "!mb-0",
      "!text-left", "!text-[12px]", "!leading-4", "!font-semibold", "!text-slate-900", "!shadow-none",
      "![text-shadow:none]", "!line-clamp-1", "!whitespace-nowrap", "!text-ellipsis", "!border-0",
      "md:!text-[13px]", "md:!leading-5", "md:!font-medium",
      "dark:!text-slate-100",
    ],
    details: ["!flex", "!min-w-0", "!flex-1", "!flex-col", "!items-start", "!gap-2", "!p-2.5", "md:!gap-1.5", "md:!p-2"],
    chapters: ["!grid", "!w-full", "!grid-cols-1", "!gap-1.5", "md:!gap-1"],
  },
} as const;


const chapterModeClasses = {
  chapters: ["!grid", "!w-full", "!grid-cols-1", "!gap-1"],
} as const;

const listUpBadgeClasses = ["!relative", "!static", "!ml-1.5", "!inline-block", "!animate-pulse", "!align-middle"];
const chapterLoadPromises = new Map<string, Promise<void>>();
const bloggerFeedPromises = new Map<string, Promise<ListBloggerEntry[]>>();
const BLOGGER_CHAPTER_SOURCES = {
  blogger: "https://www.mikodrive.my.id",
  blogger2: "https://www.yomidays.my.id",
} as const;
const LIST_CHAPTER_LIMIT = 1;
let appearanceObserver: MutationObserver | null = null;
let appear9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8 = false;
let chapterCardObserver: IntersectionObserver | null = null;
let currentAppearance = defaultGlobalAppearance;
const completedChapterSourceLoads = new Set<string>();

type ListChapterRecord = Record<string, unknown> & {
  id?: string;
  num?: string | number;
  title?: string;
  source?: string;
};

type ListBloggerEntry = {
  title?: { $t?: string };
  link?: Array<{ rel?: string; href?: string }>;
  updated?: { $t?: string };
  published?: { $t?: string };
};

type ListFirestoreApi = {
  collection: (...args: unknown[]) => unknown;
  getDocs: (reference: unknown) => Promise<{
    forEach: (callback: (document: { id: string; data: () => Record<string, unknown> }) => void) => void;
  }>;
};

type ListChapterWindow = Window & {
  firestore?: unknown;
  fs?: ListFirestoreApi;
};

function chapterNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : -1;
}

function dateValueToMillis(value: unknown): number {
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  }
  return 0;
}

function updateTimeFor(slug: string, chapter: string): number {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "null");
    const records = Array.isArray(cached)
      ? cached
      : cached && typeof cached === "object" && Array.isArray((cached as { data?: unknown }).data)
        ? (cached as { data: unknown[] }).data
        : [];
    const chapterRecord = records.find((record) => {
      if (!record || typeof record !== "object") return false;
      const item = record as Record<string, unknown>;
      return chapterNumber(item.num ?? item.chapter ?? item.id) === chapterNumber(chapter);
    });
    if (chapterRecord && typeof chapterRecord === "object") {
      const record = chapterRecord as Record<string, unknown>;
      for (const value of [record.updatedAt, record.date, record.timestamp, record.createdAt]) {
        const time = dateValueToMillis(value);
        if (time > 0) return time;
      }
    }
  } catch (error) {
    console.warn(`Chapter update date for ${slug} could not be read.`, error);
  }

  const mangaData = (window as Window & {
    mangaData?: Record<string, Record<string, unknown>>;
  }).mangaData;
  const manga = mangaData?.[slug];
  if (!manga) return 0;
  for (const value of [
    manga.lastChapterUpdated,
    manga.latestUpdate,
    manga.updatedAt,
    manga.lastUpdate,
    manga.updated,
    manga.date,
    manga.timestamp,
  ]) {
    const time = dateValueToMillis(value);
    if (time > 0) return time;
  }
  return 0;
}

function formatUpdateDate(timestamp: number): string {
  if (timestamp <= 0) return "";
  const ageDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (ageDays === 0) return "Today";
  if (ageDays < 7) return `${ageDays}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function getLatestChapters(slug: string, fallbackChapter: string, forceFirestore = false): string[] {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "null");
    const records = Array.isArray(cached)
      ? cached
      : cached && typeof cached === "object" && Array.isArray((cached as { data?: unknown }).data)
        ? (cached as { data: unknown[] }).data
        : [];
    const sourcePreference = forceFirestore ? "es" : localStorage.getItem("chapterSourceMode");
    const preferredSource = sourcePreference === "sv2" ? "blogger2" : "blogger";
    const eligible = records
      .filter((record): record is Record<string, unknown> => !!record && typeof record === "object")
      .filter((record) => record.isDraft !== true);
    const primaryRecords = sourcePreference === "es"
      ? eligible.filter((record) => record.source === "firestore")
      : eligible.filter((record) => record.source === preferredSource);
    const recordsToShow = primaryRecords.length
      ? primaryRecords
      : sourcePreference === "es"
        ? []
        : eligible.filter((record) => record.source === "firestore");
    const chapters = recordsToShow
      .map((record) => normalizeChapterNumber(record.num ?? record.chapter ?? record.id))
      .filter((number): number is string => number !== null)
      .sort((left, right) => chapterNumber(right) - chapterNumber(left));
    const uniqueChapters = [...new Set(chapters)];
    if (uniqueChapters.length) {
      return uniqueChapters.slice(0, LIST_CHAPTER_LIMIT);
    }
  } catch (error) {
    console.warn(`Chapter cache for ${slug} could not be read.`, error);
  }

  const fallback = normalizeChapterNumber(fallbackChapter);
  return fallback && chapterNumber(fallback) > 0 ? [fallback] : [];
}

function readCachedChapterRecords(slug: string): ListChapterRecord[] {
  try {
    const cached = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "null") as
      | ListChapterRecord[]
      | { data?: ListChapterRecord[] }
      | null;
    const records = Array.isArray(cached) ? cached : cached?.data || [];
    return records.filter((record) => record && typeof record === "object");
  } catch (error) {
    console.warn(`Chapter cache for ${slug} could not be read.`, error);
    return [];
  }
}

function toHomepageChapterRecord(record: ListChapterRecord): ListChapterRecord {
  const num = normalizeChapterNumber(record.num ?? record.chapter ?? record.id);
  return {
    num: num || record.num,
    id: typeof record.id === "string" ? record.id : undefined,
    title: typeof record.title === "string" ? record.title : undefined,
    postTitle: typeof record.postTitle === "string" ? record.postTitle : undefined,
    label: typeof record.label === "string"
      ? record.label
      : num
        ? `Chapter ${num}`
        : undefined,
    url: typeof record.url === "string" ? record.url : undefined,
    source: typeof record.source === "string" ? record.source : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    date: record.date,
    timestamp: record.timestamp,
  };
}

async function cacheListChapterRecords(slug: string, chapters: ListChapterRecord[]): Promise<void> {
  const current = readCachedChapterRecords(slug);
  const sourceValue = chapters[0]?.source;
  const source: SharedChapterSource = sourceValue === "blogger2" || sourceValue === "firestore"
    ? sourceValue
    : "blogger";
  let sharedChapters = chapters;
  try {
    sharedChapters = await mergeSharedChapterCache(slug, source, chapters);
  } catch (error) {
    console.warn(`IndexedDB chapter cache could not be updated for ${slug}.`, error);
  }
  const retained = current.filter((record) => record.source !== source && record.source !== "firestore");
  const lightweight = sharedChapters.map(toHomepageChapterRecord);
  const retainedLight = retained.map(toHomepageChapterRecord);
  const data = compactChapterCache([...lightweight, ...retainedLight]);
  try {
    localStorage.setItem(`chapters_${slug}`, JSON.stringify({ time: Date.now(), data }));
    window.dispatchEvent(new Event("mikoroku:chapters-updated"));
  } catch (error) {
    console.warn(`Chapter list for ${slug} could not be cached.`, error);
  }
}

function loadBloggerFeed(source: "blogger" | "blogger2"): Promise<ListBloggerEntry[]> {
  const cached = bloggerFeedPromises.get(source);
  if (cached) return cached;
  const callbackName = `mikorokuHomeChapters${Date.now()}${Math.random().toString(36).slice(2)}`;
  const script = document.createElement("script");
  const feedUrl = new URL("/feeds/posts/default", BLOGGER_CHAPTER_SOURCES[source]);
  feedUrl.searchParams.set("alt", "json-in-script");
  feedUrl.searchParams.set("max-results", "500");
  feedUrl.searchParams.set("callback", callbackName);

  const request = new Promise<ListBloggerEntry[]>((resolve, reject) => {
    const finish = (error?: Error, entries: ListBloggerEntry[] = []) => {
      window.clearTimeout(timeout);
      script.remove();
      Reflect.deleteProperty(window, callbackName);
      if (error) reject(error);
      else resolve(entries);
    };
    const timeout = window.setTimeout(
      () => finish(new Error("Timed out loading the shared Blogger chapter feed.")),
      10000,
    );
    Reflect.set(window, callbackName, (data: { feed?: { entry?: ListBloggerEntry[] } }) =>
      finish(undefined, data.feed?.entry || []),
    );
    script.onerror = () => finish(new Error("Failed to load the shared Blogger chapter feed."));
    script.src = feedUrl.href;
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    bloggerFeedPromises.delete(source);
    throw error;
  });
  bloggerFeedPromises.set(source, request);
  return request;
}

function bloggerChapterNumber(title: string, url: string): string | null {
  const match = title.match(/(?:chapter|chapters|ch\.?|chap\.?|ep\.?|episode)\s*[:\-]?\s*(\d+(?:[.,．]\d+)?)/i)
    || title.match(/第\s*(\d+(?:[.,．]\d+)?)\s*[話话回]?/)
    || title.match(/#\s*(\d+(?:[.,．]\d+)?)/)
    || [...title.matchAll(/(\d+(?:[.,．]\d+)?)/g)].at(-1)
    || url.match(/(?:chapter|ch)[_-]?(\d+(?:[.-]\d+)?)/i);
  return normalizeChapterNumber(match?.[1]);
}

async function loadFirestoreListChapters(slug: string): Promise<ListChapterRecord[]> {
  const browser = window as ListChapterWindow;
  if (!browser.firestore || !browser.fs) {
    initializeFirebaseClient();
  }
  if (!browser.firestore || !browser.fs) throw new Error("Firestore SDK is unavailable.");
  const snapshotPromise = browser.fs.getDocs(
    browser.fs.collection(browser.firestore, "manga", slug, "chapters"),
  );
  let timeout: number | undefined;
  const snapshot = await Promise.race([
    snapshotPromise,
    new Promise<never>((_, reject) => {
      timeout = window.setTimeout(
        () => reject(new Error(`Firestore chapter query timed out for ${slug}.`)),
        15000,
      );
    }),
  ]).finally(() => {
    if (timeout !== undefined) window.clearTimeout(timeout);
  });
  const chapters: ListChapterRecord[] = [];
  snapshot.forEach((document) => {
    const data = document.data();
    const num = normalizeChapterNumber(data.num ?? data.chapter ?? data.title ?? document.id);
    if (data.isDraft !== true && num) {
      chapters.push({ ...data, id: document.id, num, source: "firestore" });
    }
  });

  return chapters.sort((left, right) => chapterNumber(right.num) - chapterNumber(left.num));
}

async function loadListChapterSources(slug: string, title: string, source: "blogger" | "blogger2" | "firestore"): Promise<void> {
  let chapters: ListChapterRecord[] = [];

  try {
    const cached = await readSharedChapterCache<ListChapterRecord>(slug, source);
    if (cached?.length) {
      await cacheListChapterRecords(slug, cached);
      return;
    }
  } catch (error) {
    console.warn(`IndexedDB chapter cache could not be read for ${slug}.`, error);
  }

  if (source !== "firestore" && title.trim()) {
    try {
      const params = new URLSearchParams({
        title: title.trim(),
        source,
      });
      const response = await fetch(`/api/blogger/chapters?${params.toString()}`, {
        headers: { Accept: "application/json" },
        priority: "high",
      });
      if (response.ok) {
        const data = (await response.json()) as {
          chapters?: Array<{
            num?: string;
            title?: string;
            url?: string;
            createdAt?: string;
            source?: string;
          }>;
        };
        chapters = (data.chapters || [])
          .map((item) => {
            const num = normalizeChapterNumber(item.num);
            if (!num) return null;
            return {
              num,
              id: undefined,
              title: item.title || `Chapter ${num}`,
              postTitle: item.title || "",
              label: `Chapter ${num}`,
              url: item.url || "",
              source,
              createdAt: item.createdAt || "",
            } as ListChapterRecord;
          })
          .filter((item): item is ListChapterRecord => item !== null)
          .sort((left, right) => chapterNumber(right.num) - chapterNumber(left.num));
      } else {
        console.warn(`Blogger chapters API HTTP ${response.status} for homepage card ${slug}.`);
      }
    } catch (error) {
      console.warn(`Blogger chapters API failed for homepage card ${slug}.`, error);
    }
  }


  if (!chapters.length && source !== "firestore") {
    const titleKey = title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const slugKey = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
    try {
      chapters = (await loadBloggerFeed(source)).flatMap((entry) => {
        const postTitle = entry.title?.$t?.trim() || "";
        const postKey = postTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
        const url = entry.link?.find((link) => link.rel === "alternate")?.href || "";
        const num = bloggerChapterNumber(postTitle, url);
        if (!num || !((titleKey.length >= 8 && postKey.includes(titleKey)) ||
          (slugKey.length >= 8 && postKey.includes(slugKey)))) return [];
        return [{
          num,
          id: undefined,
          title: postTitle,
          postTitle,
          label: `Chapter ${num}`,
          url,
          source,
          createdAt: entry.updated?.$t || entry.published?.$t || "",
        }];
      }).sort((left, right) => chapterNumber(right.num) - chapterNumber(left.num));
    } catch (error) {
      console.warn(`Blogger feed fallback failed for homepage card ${slug}.`, error);
    }
  }

  if (!chapters.length) {
    try {
      chapters = await loadFirestoreListChapters(slug);
    } catch (error) {
      console.warn(`Firestore fallback failed for homepage card ${slug}.`, error);
    }
  }
  if (chapters.length) await cacheListChapterRecords(slug, chapters);
}

function ensureListChapterSources(card: HTMLElement, slug: string, title: string, forceFirestore: boolean): void {
  const selected = localStorage.getItem("chapterSourceMode");
  const source = forceFirestore || selected === "es"
    ? "firestore"
    : selected === "sv2" ? "blogger2" : "blogger";
  const key = `${slug}:${source}`;
  if (completedChapterSourceLoads.has(key)) return;
  const cached = readCachedChapterRecords(slug);
  if (cached.filter((record) => record.source === source).length >= LIST_CHAPTER_LIMIT) {
    completedChapterSourceLoads.add(key);
    if (source !== "firestore") {
      const matching = cached.filter((record) => record.source === source);
      void mergeSharedChapterCache(slug, source, matching).catch((error: unknown) => {
        console.warn(`Existing chapter cache could not be migrated to IndexedDB for ${slug}.`, error);
      });
    }
    return;
  }
  if (chapterLoadPromises.has(key)) return;
  const start = () => {
    if (chapterLoadPromises.has(key)) return;
    card.dataset.chapterSourceLoading = "true";
    const request = loadListChapterSources(slug, title, source)
      .catch((error: unknown) => console.warn(`Homepage chapters failed for ${slug}.`, error))
      .finally(() => {
        chapterLoadPromises.delete(key);
        completedChapterSourceLoads.add(key);
        card.dataset.chapterSourceLoading = "false";
        window.dispatchEvent(new Event("mikoroku:chapters-updated"));
      });
    chapterLoadPromises.set(key, request);
  };
  if (card.dataset.chapterSourceVisible === "true" || typeof IntersectionObserver === "undefined") {
    card.dataset.chapterSourceVisible = "true";
    start();
    return;
  }
  if (!chapterCardObserver) {
    chapterCardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!(entry.target instanceof HTMLElement) || !entry.isIntersecting) return;
        const target = entry.target;
        target.dataset.chapterSourceVisible = "true";
        chapterCardObserver?.unobserve(target);
        const targetSlug = target.dataset.slug;
        const targetTitle = target.querySelector<HTMLElement>(".title")?.textContent?.trim();
        if (targetSlug && targetTitle) {
          ensureListChapterSources(target, targetSlug, targetTitle, Boolean(target.closest("#firebaseNovel")));
        }
      });
    }, { rootMargin: "800px 0px" });
  }
  chapterCardObserver.observe(card);
}

function bindChapterNavigation(item: HTMLElement, card: HTMLElement, slug: string, chapter: string): void {
  item.setAttribute("role", "link");
  item.tabIndex = 0;
  item.setAttribute("aria-label", `Open ${chapter} in reader`);
  item.dataset.readerNavigationBound = "true";

  const navigateToReader = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    const route = card.closest("#firebaseNovel") ? "novel" : "manga";
    const sourcePreference = localStorage.getItem("chapterSourceMode");
    const preferredSource = route === "novel" || sourcePreference === "es"
      ? "firestore"
      : sourcePreference === "sv1"
        ? "blogger"
        : sourcePreference === "sv2"
          ? "blogger2"
          : "blogger";
    const chapterRecord = (() => {
      try {
        const cached: unknown = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "null");
        const records = Array.isArray(cached)
          ? cached
          : cached && typeof cached === "object" && Array.isArray((cached as { data?: unknown }).data)
            ? (cached as { data: unknown[] }).data
            : [];
        const matchingRecords = records.filter((record): record is Record<string, unknown> =>
          !!record && typeof record === "object" &&
          normalizeChapterNumber(record.num ?? record.chapter ?? record.id) === chapter,
        );
        return matchingRecords.find((record) => record.source === preferredSource) ||
          matchingRecords.find((record) => record.source === "firestore") ||
          matchingRecords[0];
      } catch (error) {
        console.warn(`Chapter data for ${slug} could not be read before navigation.`, error);
        return undefined;
      }
    })();
    const seriesTitle = card.querySelector<HTMLElement>(".title")?.textContent?.trim() || slug;
    localStorage.setItem("currentChapter", JSON.stringify({
      ...chapterRecord,
      slug,
      id: typeof chapterRecord?.id === "string" ? chapterRecord.id : undefined,
      num: chapter,
      title: seriesTitle,
      label: chapterRecord?.label || chapterRecord?.chapterTitle || chapterRecord?.title || `Chapter ${chapter}`,
      source: route === "novel" ? "firestore" : chapterRecord?.source || "firestore",
      isNovel: route === "novel" || chapterRecord?.isNovel === true,
    }));
    window.location.assign(`/${route}/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`);
  };

  item.addEventListener("click", navigateToReader);
  item.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") navigateToReader(event);
  });
}

function isChapterRead(title: string, chapter: string): boolean {
  if (!title) return false;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(`read_${title}`) || "[]");
    return Array.isArray(saved) && saved.some((value) =>
      chapterNumber(value) === chapterNumber(chapter),
    );
  } catch (error) {
    console.warn(`Reading status for ${title} could not be read.`, error);
    return false;
  }
}

function updateListChapterLinks(card: HTMLElement, details: HTMLElement, isList: boolean): void {
  const existing = details.querySelector<HTMLElement>(".global-card-chapters");
  if (!isList) {
    existing?.remove();
    return;
  }

  const slug = card.dataset.slug || "";
  const fallbackChapter = card.querySelector<HTMLElement>(".ch-badge")?.textContent || "";
  if (!slug) return;

  const title = card.querySelector<HTMLElement>(".title")?.textContent?.trim() || slug;
  const forceFirestore = Boolean(card.closest("#firebaseNovel"));
  ensureListChapterSources(card, slug, title, forceFirestore);
  const chapters = getLatestChapters(slug, fallbackChapter, forceFirestore);
  const upBadge = card.querySelector<HTMLElement>(".up-badge");
  let list = existing;
  if (!list) {
    list = document.createElement("div");
    list.className = "global-card-chapters";
  }
  const currentItems = [...list.querySelectorAll<HTMLElement>(".global-card-chapter-item")];
  currentItems.forEach((item, index) => {
    if (item.dataset.readerNavigationBound !== "true") {
      bindChapterNavigation(item, card, slug, chapters[index] || "");
    }
    item.querySelector<HTMLElement>(".global-card-chapter-label")
      ?.classList.toggle("opacity-50", isChapterRead(title, chapters[index] || ""));
  });
  if (
    currentItems.length === chapters.length &&
    currentItems.every((item, index) =>
      item.querySelector(".global-card-chapter-label")?.textContent === `Chapter ${chapters[index]}` &&
      item.querySelector(".global-card-update-date")?.textContent === formatUpdateDate(updateTimeFor(slug, chapters[index])),
    )
  ) {
    if (upBadge && currentItems[0]) {
      const chapterInfo = currentItems[0].querySelector<HTMLElement>(".global-card-chapter-info")
        || currentItems[0].querySelector<HTMLElement>(".global-card-chapter-label")?.parentElement;
      if (chapterInfo && upBadge.parentElement !== chapterInfo) {
        listUpBadgeClasses.forEach((className) => upBadge.classList.add(className));
        const label = chapterInfo.querySelector(".global-card-chapter-label");
        if (label && label.nextSibling !== upBadge) {
          label.insertAdjacentElement("afterend", upBadge);
        } else if (!label) {
          chapterInfo.append(upBadge);
        }
      }
    }
    return;
  }

  if (chapters.length < LIST_CHAPTER_LIMIT && card.dataset.chapterSourceLoading === "true") {
    list.replaceChildren();
    for (let index = 0; index < LIST_CHAPTER_LIMIT; index++) {
      const placeholder = document.createElement("div");
      placeholder.className = "global-card-chapter-loading flex min-h-8 w-full items-center rounded-md bg-black/5 px-2.5 py-1.5 dark:bg-white/[0.06]";
      placeholder.setAttribute("aria-hidden", "true");
      const bar = document.createElement("span");
      bar.className = "h-3 w-2/3 animate-pulse rounded bg-slate-300/70 dark:bg-slate-600/70";
      placeholder.append(bar);
      list.append(placeholder);
    }
    details.append(list);
    return;
  }

  list.replaceChildren();
  chapters.forEach((chapter) => {
    const item = document.createElement("div");
    item.className = "global-card-chapter-item flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-black/5 px-2.5 py-1.5 text-[13px] text-slate-700 transition hover:ring-1 hover:ring-[var(--mikoroku-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mikoroku-accent)] dark:bg-white/[0.06] dark:text-slate-300 md:gap-1 md:px-1.5 md:py-1 md:text-[12px]";
    bindChapterNavigation(item, card, slug, chapter);
    const chapterInfo = document.createElement("span");
    chapterInfo.className = "global-card-chapter-info flex min-w-0 flex-1 items-center gap-1";
    const label = document.createElement("span");
    label.className = `global-card-chapter-label truncate${isChapterRead(title, chapter) ? " opacity-50" : ""}`;
    label.textContent = `Chapter ${chapter}`;
    chapterInfo.append(label);
    if (chapters[0] === chapter && upBadge) {
      listUpBadgeClasses.forEach((className) => upBadge.classList.add(className));
      chapterInfo.append(upBadge);
    }
    item.append(chapterInfo);
    const chapterUpdateDate = formatUpdateDate(updateTimeFor(slug, chapter));
    if (chapterUpdateDate) {
      const date = document.createElement("span");
      date.className = "global-card-update-date shrink-0 text-right text-[11px] text-slate-500 md:text-[11px] dark:text-slate-400";
      date.textContent = chapterUpdateDate;
      item.append(date);
    }
    list?.append(item);
  });
  if (chapters.length) details.append(list);
  else list.remove();

}

function clearListInlineStyles(el: HTMLElement): void {
  el.style.removeProperty("display");
  el.style.removeProperty("flex-direction");
  el.style.removeProperty("align-items");
  el.style.removeProperty("gap");
  el.style.removeProperty("width");
  el.style.removeProperty("min-width");
  el.style.removeProperty("max-width");
  el.style.removeProperty("flex");
  el.style.removeProperty("flex-shrink");
  el.style.removeProperty("flex-grow");
  el.style.removeProperty("aspect-ratio");
  el.style.removeProperty("height");
  el.style.removeProperty("order");
  el.style.removeProperty("position");
  el.style.removeProperty("background");
  el.style.removeProperty("padding");
  el.style.removeProperty("text-align");
  el.style.removeProperty("border-radius");
  el.style.removeProperty("align-self");
  el.style.removeProperty("min-height");
  el.style.removeProperty("max-height");
  el.style.removeProperty("overflow");
  el.style.removeProperty("border-bottom");
  el.style.removeProperty("margin");
  el.style.removeProperty("color");
  el.style.removeProperty("font-size");
  el.style.removeProperty("font-weight");
  el.style.removeProperty("line-height");
  el.style.removeProperty("box-sizing");
}

function updateListCardStructure(root: ParentNode, isList: boolean): void {
  const cards = [
    ...root.querySelectorAll<HTMLElement>(".card"),
    ...(root instanceof HTMLElement && root.matches(".card") ? [root] : []),
  ].filter((card) => card.closest(cardModeScopeSelector));
  cards.forEach((card) => {
    const cover = card.querySelector<HTMLElement>(".thumb");
    const overlay = card.querySelector<HTMLElement>(".overlay");
    if (!cover || !overlay) return;

    let details = card.querySelector<HTMLElement>(".global-card-details");
    if (isList) {
      if (!details) {
        details = document.createElement("div");
        details.className = "global-card-details";
      }

      let badgesRow = details.querySelector<HTMLElement>(".global-card-badges");
      if (!badgesRow) {
        badgesRow = document.createElement("div");
        badgesRow.className = "global-card-badges";
      }
  
      badgesRow.style.display = "flex";
      badgesRow.style.flexWrap = "wrap";
      badgesRow.style.alignItems = "center";
      badgesRow.style.gap = "5px";
      badgesRow.style.margin = "0 0 4px 0";
      badgesRow.style.padding = "0";
      badgesRow.style.order = "0";

      const statusBadge = cover.querySelector<HTMLElement>(".status-badge");
      const typeBadge = cover.querySelector<HTMLElement>(".type-badge");
      const chBadge = cover.querySelector<HTMLElement>(".ch-badge");
      if (chBadge) chBadge.style.display = "none";

      if (statusBadge) {
        statusBadge.style.position = "static";
        statusBadge.style.left = "auto";
        statusBadge.style.top = "auto";
        statusBadge.style.zIndex = "1";
        statusBadge.style.fontSize = "9px";
        statusBadge.style.padding = "2px 6px";
        statusBadge.style.borderRadius = "4px";
        badgesRow.append(statusBadge);
      }
      if (typeBadge) {
        typeBadge.style.position = "static";
        typeBadge.style.left = "auto";
        typeBadge.style.bottom = "auto";
        typeBadge.style.zIndex = "1";
        typeBadge.style.fontSize = "9px";
        typeBadge.style.padding = "2px 6px";
        typeBadge.style.borderRadius = "4px";
        badgesRow.append(typeBadge);
      }

      if (overlay.parentElement !== details) {
        details.append(overlay);
      }
      details.insertBefore(badgesRow, details.firstChild);
      if (overlay.previousElementSibling !== badgesRow) {
        details.insertBefore(overlay, badgesRow.nextSibling);
      }

      if (cover.parentElement !== card) card.insertBefore(cover, card.firstChild);
      if (details.parentElement !== card) card.append(details);
      else if (details.previousElementSibling !== cover) {
        card.insertBefore(cover, details);
      }

      card.style.display = "flex";
      card.style.flexDirection = "row";
      card.style.alignItems = "flex-start";
      card.style.gap = "0";
      card.style.overflow = "hidden";
      card.style.boxSizing = "border-box";
      card.style.borderRadius = "12px";

      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const coverSize = isMobile ? 72 : 96;
      const coverRadius = isMobile ? "8px" : "10px";
      cover.style.flex = `0 0 ${coverSize}px`;
      cover.style.width = `${coverSize}px`;
      cover.style.minWidth = `${coverSize}px`;
      cover.style.maxWidth = `${coverSize}px`;
      cover.style.height = `${coverSize}px`;
      cover.style.aspectRatio = "1 / 1";
      cover.style.alignSelf = "flex-start";
      cover.style.borderRadius = coverRadius;
      cover.style.overflow = "hidden";
      cover.style.margin = isMobile ? "6px 0 6px 6px" : "8px 0 8px 8px";
      const coverImg = cover.querySelector<HTMLImageElement>("img");
      if (coverImg) {
        coverImg.style.width = "100%";
        coverImg.style.height = "100%";
        coverImg.style.objectFit = "cover";
        coverImg.style.display = "block";
        coverImg.style.borderRadius = coverRadius;
      }

      details.style.display = "flex";
      details.style.flexDirection = "column";
      details.style.flex = "1 1 auto";
      details.style.minWidth = "0";
      details.style.alignItems = "stretch";
      details.style.justifyContent = "flex-start";
      details.style.gap = isMobile ? "2px" : "4px";
      details.style.padding = isMobile ? "6px 8px 6px 8px" : "8px 12px 8px 10px";
      details.style.boxSizing = "border-box";
      details.style.alignSelf = "stretch";

      // badges ABOVE title
      badgesRow.style.order = "0";
      badgesRow.style.display = "flex";
      badgesRow.style.flexWrap = "wrap";
      badgesRow.style.gap = "5px";
      badgesRow.style.margin = "0";
      badgesRow.style.padding = "0";

      overlay.style.position = "static";
      overlay.style.order = "1";
      overlay.style.width = "100%";
      overlay.style.background = "none";
      overlay.style.padding = "0";
      overlay.style.margin = "0";
      overlay.style.textAlign = "left";
      overlay.style.boxShadow = "none";
      overlay.style.textShadow = "none";
      overlay.style.filter = "none";

      const badgeColorMap: Record<string, string> = {
        ongoing: "#4ade80",
        completed: "#60a5fa",
        hiatus: "#fbbf24",
        dropped: "#f87171",
        canceled: "#a8a29e",
        manga: "#f87171",
        manhwa: "#60a5fa",
        manhua: "#4ade80",
        novel: "#c084fc",
        "light-novel": "#818cf8",
        "web-novel": "#e879f9",
        doujinshi: "#fb7185",
        webtoon: "#34d399",
        cg: "#2dd4bf",
      };
      const badgeTint = (color: string) =>
        `color-mix(in srgb, ${color} 30%, transparent)`;
      badgesRow.style.gap = isMobile ? "3px" : "5px";
      details.querySelectorAll<HTMLElement>(".status-badge, .type-badge").forEach((b) => {
        const label = (b.textContent || "").trim().toLowerCase().replace(/\s+/g, "-");
        const color = badgeColorMap[label] || "#94a3b8";
        b.className = b.className
          .split(/\s+/)
          .filter((c) => c && !c.startsWith("bg-") && !c.startsWith("!bg-"))
          .join(" ");
        const tint = badgeTint(color);
        b.style.setProperty("background", tint, "important");
        b.style.setProperty("background-color", tint, "important");
        b.style.setProperty("background-image", "none", "important");
        b.style.setProperty("border", `1px solid color-mix(in srgb, ${color} 55%, transparent)`, "important");
        b.style.setProperty("color", color, "important");
        b.style.setProperty("border-radius", "3px", "important");
        b.style.fontSize = isMobile ? "8px" : "9px";
        b.style.padding = isMobile ? "1px 6px" : "2px 7px";
        b.style.lineHeight = "1.2";
        b.style.fontWeight = "600";
        b.style.letterSpacing = "0.02em";
        b.style.textShadow = "none";
        b.style.boxShadow = "none";
      });

      const title = overlay.querySelector<HTMLElement>(".title, .catalog-card-title");
      if (title) {
        title.style.position = "relative";
        title.style.inset = "auto";
        title.style.margin = "0";
        title.style.minHeight = "0";
        title.style.maxHeight = "none";
        title.style.width = "100%";
        title.style.overflow = "hidden";
        title.style.textAlign = "left";
        title.style.fontSize = isMobile ? "12px" : "13px";
        title.style.fontWeight = "600";
        title.style.lineHeight = "1.3";
        title.style.borderBottom = "none";
        title.style.paddingBottom = "0";
        title.style.color = "#f1f5f9";
        title.style.display = "block";
        title.style.webkitLineClamp = "1";
        title.style.webkitBoxOrient = "vertical";
        title.style.whiteSpace = "nowrap";
        title.style.textOverflow = "ellipsis";
        title.style.textShadow = "none";
        title.style.boxShadow = "none";
        title.style.filter = "none";
      }

      updateListChapterLinks(card, details, true);

      badgesRow.style.order = "0";
      overlay.style.order = "1";
      const chapterList = details.querySelector<HTMLElement>(".global-card-chapters");
      if (chapterList) {
        chapterList.style.order = "2";
        chapterList.style.width = "100%";
        chapterList.style.marginTop = isMobile ? "2px" : "4px";
        chapterList.querySelectorAll<HTMLElement>(".global-card-chapter-item").forEach((item) => {
          item.style.padding = isMobile ? "3px 6px" : "6px 10px";
          item.style.fontSize = isMobile ? "11px" : "13px";
          item.style.minHeight = "0";
        });
        chapterList.querySelectorAll<HTMLElement>(".global-card-update-date").forEach((d) => {
          d.style.fontSize = isMobile ? "10px" : "11px";
        });
      }

      details.insertBefore(badgesRow, details.firstChild);
      if (overlay.parentElement === details) {
        details.insertBefore(overlay, badgesRow.nextSibling);
      }
      return;
    }

    clearListInlineStyles(card);
    clearListInlineStyles(cover);
    clearListInlineStyles(overlay);
    const title = overlay.querySelector<HTMLElement>(".title, .catalog-card-title");
    if (title) clearListInlineStyles(title);

    if (details) {
      clearListInlineStyles(details);
      const upBadge = details.querySelector<HTMLElement>(".up-badge");
      if (upBadge) {
        listUpBadgeClasses.forEach((className) => upBadge.classList.remove(className));
        cover.append(upBadge);
      }
      details.querySelectorAll<HTMLElement>(".status-badge, .type-badge").forEach((badge) => {
        badge.style.position = "";
        badge.style.left = "";
        badge.style.top = "";
        badge.style.bottom = "";
        badge.style.zIndex = "";
        badge.style.fontSize = "";
        badge.style.padding = "";
        badge.style.borderRadius = "";
        cover.append(badge);
      });
      const chBadge = cover.querySelector<HTMLElement>(".ch-badge");
      if (chBadge) chBadge.style.display = "";
      if (overlay.parentElement === details) cover.append(overlay);
      details.remove();
    }
    if (details) updateListChapterLinks(card, details, false);
  });
}

export function readGlobalAppearance(): GlobalAppearanceSettings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(GLOBAL_APPEARANCE_KEY) || "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return defaultGlobalAppearance;
    }

    const settings = value as Record<string, unknown>;
    return {
      hideHero: typeof settings.hideHero === "boolean" ? settings.hideHero : false,
      hideStatusBadge: typeof settings.hideStatusBadge === "boolean" ? settings.hideStatusBadge : false,
      hideTypeBadge: typeof settings.hideTypeBadge === "boolean" ? settings.hideTypeBadge : false,
      hideChapterBadge: typeof settings.hideChapterBadge === "boolean" ? settings.hideChapterBadge : false,
      hideDetailCoverBackground: typeof settings.hideDetailCoverBackground === "boolean"
        ? settings.hideDetailCoverBackground
        : false,
      cardDisplay: settings.cardDisplay === "list"
        ? "list"
        : "default",
      accentColor: typeof settings.accentColor === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(settings.accentColor) &&
        settings.accentColor.toLowerCase() !== "#9d1018"
        ? settings.accentColor
        : null,
    };
  } catch (error) {
    console.warn("Preferensi appearance global tidak dapat dibaca.", error);
    return defaultGlobalAppearance;
  }
}

export function saveGlobalAppearance(settings: GlobalAppearanceSettings): void {
  localStorage.setItem(GLOBAL_APPEARANCE_KEY, JSON.stringify(settings));
}

export function applyGlobalAppearance(settings: GlobalAppearanceSettings): void {
  currentAppearance = settings;
  document.documentElement.dataset.cardDisplay = settings.cardDisplay;
  const accent = settings.accentColor;
  const rootStyle = document.documentElement.style;
  const setAccentVariable = (name: string, customValue: string | null, defaultValue: string) => {
    rootStyle.setProperty(name, customValue || defaultValue);
  };
  const accentSoft = accent ? `color-mix(in srgb, ${accent} 10%, transparent)` : null;
  const accentBorder = accent ? `color-mix(in srgb, ${accent} 28%, transparent)` : null;
  const readerAccent = accent || "#e8798f";
  const readerAccentSoft = accentSoft || "rgba(232, 121, 143, 0.12)";
  const readerAccentBorder = accentBorder || "rgba(232, 121, 143, 0.3)";
  setAccentVariable("--mikoroku-accent", accent, "#9d1018");
  setAccentVariable("--mikoroku-accent-soft", accentSoft, "rgba(239, 68, 68, 0.1)");
  setAccentVariable("--mikoroku-accent-border", accentBorder, "rgba(220, 152, 75, 0.4)");
  setAccentVariable("--mikoroku-home-section-accent", accent, "#aaa");
  setAccentVariable("--mikoroku-home-section-text", accent, "currentColor");
  setAccentVariable("--mikoroku-home-load-more", accent, "#8b0000");
  setAccentVariable("--mikoroku-home-load-more-hover", accent, "#a0152a");
  setAccentVariable("--mikoroku-home-up", accent, "red");
  setAccentVariable("--mikoroku-hero-nav", accent, "rgba(0, 0, 0, 0.45)");
  setAccentVariable("--mikoroku-hero-dot", accent, "rgba(255, 255, 255, 0.3)");
  setAccentVariable("--mikoroku-hero-dot-active", accent, "#fff");
  setAccentVariable("--mikoroku-detail-section-accent", accent, "#aaa");
  setAccentVariable("--mikoroku-detail-section-text", accent, "currentColor");
  setAccentVariable("--mikoroku-detail-tab-accent", accent, "#d99000");
  setAccentVariable("--mikoroku-detail-cover-accent", accent, "#e59a00");
  setAccentVariable("--mikoroku-detail-chapter-hover", accent, "transparent");
  setAccentVariable("--mikoroku-detail-female-border", accentBorder, "rgba(216, 27, 96, 0.3)");
  setAccentVariable("--mikoroku-detail-female-bg", accentSoft, "rgba(255, 77, 141, 0.12)");
  setAccentVariable("--mikoroku-detail-female-text", accent, "#d81b60");
  setAccentVariable("--mikoroku-detail-male-border", accentBorder, "rgba(37, 99, 235, 0.3)");
  setAccentVariable("--mikoroku-detail-male-bg", accentSoft, "rgba(77, 125, 255, 0.12)");
  setAccentVariable("--mikoroku-detail-male-text", accent, "#2563eb");
  setAccentVariable("--mikoroku-detail-tag-icon", accent, "currentColor");
  setAccentVariable("--mikoroku-detail-bookmark-border", accentBorder, "rgba(0, 0, 0, 0.15)");
  setAccentVariable("--mikoroku-detail-bookmark-text", accent, "currentColor");
  setAccentVariable("--mikoroku-detail-bookmark-hover", accentSoft, "rgba(0, 0, 0, 0.06)");
  setAccentVariable("--mikoroku-detail-bookmark-hover-border", accentBorder, "rgba(0, 0, 0, 0.1)");
  setAccentVariable("--mikoroku-source-one", accent, "#3b82f6");
  setAccentVariable("--mikoroku-source-two", accent, "#f59e0b");
  setAccentVariable("--mikoroku-source-emergency", accent, "#ef4444");
  setAccentVariable("--mikoroku-view-grid", accent, "#ef4444");
  setAccentVariable("--mikoroku-view-text-grid", accent, "#3b82f6");
  setAccentVariable("--mikoroku-view-list", accent, "#22c55e");
  setAccentVariable("--mikoroku-sort-newest", accent, "#ed74f8");
  setAccentVariable("--mikoroku-sort-newest-border", accent, "#fd6dfd");
  setAccentVariable("--mikoroku-sort-oldest", accent, "#f59e0b");
  rootStyle.setProperty("--mikoroku-reader-accent", readerAccent);
  rootStyle.setProperty("--mikoroku-reader-accent-soft", readerAccentSoft);
  rootStyle.setProperty("--mikoroku-reader-accent-border", readerAccentBorder);
  setAccentVariable("--mikoroku-reader-page-accent", accent, "#e8798f");
  rootStyle.setProperty("--mikoroku-reader-page-soft", readerAccentSoft);
  const updateTargets = (root: ParentNode) => {
    const findElements = (selector: string): HTMLElement[] => [
      ...root.querySelectorAll<HTMLElement>(selector),
      ...(root instanceof HTMLElement && root.matches(selector) ? [root] : []),
    ];

    appearanceTargets.forEach(([key, selector]) => {
      findElements(selector).forEach((element) => {
        const hidden = key === "hideChapterBadge"
          ? currentAppearance.hideChapterBadge || currentAppearance.cardDisplay === "list"
          : currentAppearance[key];
        element.classList.toggle("hidden", hidden);
      });
    });

    const applyMode = (
      selectors: string[],
      modeKey: keyof (typeof cardModeClasses)["list"],
      classes: readonly string[],
    ) => {
      selectors.forEach((selector) => {
        const elements = [
          ...root.querySelectorAll<HTMLElement>(selector),
          ...(root instanceof HTMLElement && root.matches(selector) ? [root] : []),
        ].filter((element) => element.closest(cardModeScopeSelector));
        elements.forEach((element) => {
          Object.values(cardModeClasses).forEach((mode) => {
            mode[modeKey].forEach((className) => element.classList.remove(className));
          });
          classes.forEach((className) => element.classList.add(className));
        });
      });
    };

    const mode = currentAppearance.cardDisplay;
    const classes = mode === "default" ? null : cardModeClasses[mode];
    applyMode(cardContainers, "container", classes?.container ?? []);
    applyMode(cardElements, "card", classes?.card ?? []);
    applyMode(cardCoverElements, "cover", classes?.cover ?? []);
    applyMode(cardOverlayElements, "overlay", classes?.overlay ?? []);
    applyMode(cardTitleElements, "title", classes?.title ?? []);
    applyMode(cardDetailsElements, "details", classes?.details ?? []);

            const chapterElements = findElements(".global-card-chapters");
    chapterElements.forEach((element) => {
      chapterModeClasses.chapters.forEach((className) => element.classList.remove(className));
      if (mode === "list") chapterModeClasses.chapters.forEach((className) => element.classList.add(className));
    });
    updateListCardStructure(root, mode === "list");
  };

  updateTargets(document);
  if (!appearanceObserver && document.body) {
    appearanceObserver = new MutationObserver((mutations) => {
      mutations.forEach(({ addedNodes }) => {
        addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            updateTargets(node);
            appearanceTargets.forEach(([key, selector]) => {
              if (node.matches(selector)) {
                const hidden = key === "hideChapterBadge"
                  ? currentAppearance.hideChapterBadge || currentAppearance.cardDisplay === "list"
                  : currentAppearance[key];
                node.classList.toggle("hidden", hidden);
              }
            });
          }
        });
      });
    });
    appearanceObserver.observe(document.body, { childList: true, subtree: true });
  }
  if (!appear9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8) {
    const refreshListCards = () => {
      if (currentAppearance.cardDisplay === "list") updateListCardStructure(document, true);
    };
    window.addEventListener("storage", (event) => {
      if (event.key?.startsWith("chapters_") || event.key?.startsWith("read_")) refreshListCards();
    });
    window.addEventListener("pageshow", refreshListCards);
    window.addEventListener("mikoroku:chapter-read", refreshListCards);
    window.addEventListener("mikoroku:chapters-updated", refreshListCards);
    appear9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8 = true;
  }
}
