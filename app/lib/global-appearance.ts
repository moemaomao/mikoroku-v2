import { normalizeChapterNumber } from "../../lib/chapter-number";
import { getBloggerChapterNumber, type BloggerChapterSource } from "../../lib/blogger-chapters";
import { schedulePrefetch } from "../../lib/prefetch-budget";
import { setLocalStorageCacheItem } from "./local-storage-cache";

export type GlobalAppearanceSettings = {
  hideHero: boolean;
  hideStatusBadge: boolean;
  hideTypeBadge: boolean;
  hideChapterBadge: boolean;
  hideDetailCoverBackground: boolean;
  cardDisplay: "default" | "list";
  accentColor: string | null;
  themeGradient: {
    dark: { start: string; end: string };
    light: { start: string; end: string };
  };
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
  themeGradient: {
    dark: { start: "#481126", end: "#120d14" },
    light: { start: "#fff1f4", end: "#e9eaff" },
  },
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
    container: ["!grid-cols-1", "!gap-1", "!p-1", "md:!grid-cols-3", "md:!gap-2", "md:!p-2"],
    card: ["!flex", "!flex-row", "!items-stretch", "!gap-0", "!overflow-hidden", "!rounded-xl", "!border", "!border-gray-400/60", "!bg-transparent", "!p-0", "dark:!border-gray-500/60"],
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

const LIST_CHAPTER_LIMIT = 1;
let appearanceObserver: MutationObserver | null = null;
let themeObserver: MutationObserver | null = null;
let chapterPrefetchObserver: IntersectionObserver | null = null;
let appear9yMnTm4NSzvG9rrwjM2ec8xZgh1cafXH8 = false;
let currentAppearance = defaultGlobalAppearance;
const chapterPrefetchTargets = new WeakMap<HTMLElement, { slug: string; title: string }>();
const chapterSummaryPrefetches = new Set<string>();

type BloggerSummaryEntry = {
  title?: { $t?: string };
  link?: Array<{ rel?: string; href?: string }>;
  updated?: { $t?: string };
  published?: { $t?: string };
};

type BloggerSummaryFeed = {
  feed?: { entry?: BloggerSummaryEntry[] };
};

const BLOGGER_SUMMARY_DOMAINS: Record<BloggerChapterSource, string> = {
  blogger: "https://www.mikodrive.my.id",
  blogger2: "https://www.yomidays.my.id",
};

function chapterNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : -1;
}

function dateValueToMillis(value: unknown): number {
  const numeric = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : Number.NaN;
  if (Number.isFinite(numeric)) {
    if (numeric < 1e8) return 0;
    return numeric < 1e11 ? numeric * 1000 : numeric;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.seconds === "number") return dateValueToMillis(timestamp.seconds);
  }
  return 0;
}

function updateTimeFor(slug: string, chapter: string, useMangaFallback = true): number {
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

  if (!useMangaFallback) return 0;
  const mangaData = (window as Window & {
    mangaData?: Record<string, Record<string, unknown>>;
  }).mangaData;
  const manga = mangaData?.[slug] ||
    Object.values(mangaData || {}).find((item) => item.slug === slug);
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

export function getLatestChapterUpdateTimestamp(slug: string, fallbackChapter: string): number {
  if (typeof window === "undefined") return 0;
  const latestChapter = getLatestChapters(slug, fallbackChapter)[0];
  return latestChapter ? updateTimeFor(slug, latestChapter) : 0;
}

function readCachedChapterRecords(slug: string): Record<string, unknown>[] {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "null");
    const records = Array.isArray(cached)
      ? cached
      : cached && typeof cached === "object" && Array.isArray((cached as { data?: unknown }).data)
        ? (cached as { data: unknown[] }).data
        : [];
    return records.filter((record): record is Record<string, unknown> =>
      Boolean(record) && typeof record === "object",
    );
  } catch (error) {
    console.warn(`Chapter cache for ${slug} could not be read before prefetch.`, error);
    return [];
  }
}

function fetchBloggerSummary(
  title: string,
  source: BloggerChapterSource,
): Promise<BloggerSummaryEntry[]> {
  const callbackName = `mikorokuChapterSummary${Date.now()}${Math.random().toString(36).slice(2)}`;
  const script = document.createElement("script");
  const feedUrl = new URL("/feeds/posts/default", BLOGGER_SUMMARY_DOMAINS[source]);
  feedUrl.searchParams.set("alt", "json-in-script");
  feedUrl.searchParams.set("max-results", "50");
  feedUrl.searchParams.set("q", title);
  feedUrl.searchParams.set("callback", callbackName);

  return new Promise<BloggerSummaryEntry[]>((resolve, reject) => {
    const finish = (error?: Error, entries: BloggerSummaryEntry[] = []) => {
      window.clearTimeout(timeout);
      script.remove();
      Reflect.deleteProperty(window, callbackName);
      if (error) reject(error);
      else resolve(entries);
    };
    const timeout = window.setTimeout(
      () => finish(new Error("Timed out loading the Blogger chapter summary.")),
      10000,
    );
    Reflect.set(window, callbackName, (data: BloggerSummaryFeed) =>
      finish(undefined, data.feed?.entry || []),
    );
    script.onerror = () => finish(new Error("Failed to load the Blogger chapter summary."));
    script.src = feedUrl.href;
    document.head.appendChild(script);
  });
}

function prefetchChapterSummary(slug: string, title: string): void {
  let sourcePreference: string | null = null;
  try {
    sourcePreference = localStorage.getItem("chapterSourceMode");
  } catch (error) {
    console.warn("Chapter source preference could not be read before prefetch.", error);
    return;
  }
  if (sourcePreference === "es") return;
  const source: BloggerChapterSource = sourcePreference === "sv2" ? "blogger2" : "blogger";
  const key = `${source}:${slug}`;
  if (chapterSummaryPrefetches.has(key)) return;
  chapterSummaryPrefetches.add(key);

  schedulePrefetch(key, async () => {
    try {
      const entries = await fetchBloggerSummary(title, source);
      const titleKey = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const slugKey = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
      const chapter = entries
        .flatMap((entry) => {
          const postTitle = entry.title?.$t?.trim() || "";
          const url = entry.link?.find((link) => link.rel === "alternate")?.href || "";
          const num = normalizeChapterNumber(getBloggerChapterNumber(postTitle, url));
          if (!num) return [];
          const postKey = postTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (!((titleKey.length >= 8 && postKey.includes(titleKey)) ||
            (slugKey.length >= 8 && postKey.includes(slugKey)))) return [];
          return [{
            num,
            title: postTitle,
            label: `Chapter ${num}`,
            url,
            source,
            createdAt: entry.updated?.$t || entry.published?.$t || "",
          }];
        })
        .sort((left, right) => chapterNumber(right.num) - chapterNumber(left.num))[0];
      if (!chapter) return;

      const records = readCachedChapterRecords(slug);
      const data = [
        chapter,
        ...records.filter((record) =>
          record.source !== source ||
          normalizeChapterNumber(record.num ?? record.chapter ?? record.id) !== chapter.num,
        ),
      ];
      const cached = setLocalStorageCacheItem(
        `chapters_${slug}`,
        JSON.stringify({ time: Date.now(), summaryOnlySource: source, data }),
      );
      if (!cached) {
        console.warn(`Latest chapter summary for ${slug} could not be saved to browser cache.`);
      }
      window.dispatchEvent(new Event("mikoroku:chapters-updated"));
    } catch (error) {
      chapterSummaryPrefetches.delete(key);
      console.warn(`Latest chapter summary prefetch failed for ${slug}.`, error);
    }
  });
}

function observeChapterSummaryPrefetch(card: HTMLElement, slug: string, title: string): void {
  if (card.dataset.chapterSummaryPrefetch === "true") return;
  card.dataset.chapterSummaryPrefetch = "true";
  chapterPrefetchTargets.set(card, { slug, title });
  if (typeof IntersectionObserver === "undefined") {
    prefetchChapterSummary(slug, title);
    return;
  }
  if (!chapterPrefetchObserver) {
    chapterPrefetchObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!(entry.target instanceof HTMLElement) || !entry.isIntersecting) return;
        const target = entry.target;
        const details = chapterPrefetchTargets.get(target);
        chapterPrefetchObserver?.unobserve(target);
        if (details) prefetchChapterSummary(details.slug, details.title);
      });
    }, { rootMargin: "200px 0px" });
  }
  chapterPrefetchObserver.observe(card);
}

function bindChapterNavigation(item: HTMLAnchorElement, card: HTMLElement, slug: string, chapter: string): void {
  const route = card.closest("#firebaseNovel") ? "novel" : "manga";
  const readerHref = `/${route}/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;
  item.href = readerHref;
  item.setAttribute("aria-label", `Open ${chapter} in reader`);
  item.dataset.readerNavigationBound = "true";
  item.dataset.readerHref = readerHref;

  const cacheReaderNavigation = () => {
    let sourcePreference: string | null = null;
    try {
      sourcePreference = localStorage.getItem("chapterSourceMode");
    } catch (error) {
      console.warn("Chapter source preference could not be read before navigation.", error);
    }
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
    try {
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
    } catch (error) {
      console.warn("Chapter data could not be cached before reader navigation.", error);
    }
  };

  item.addEventListener("click", cacheReaderNavigation);
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
  const chapters = getLatestChapters(slug, fallbackChapter, forceFirestore);
  if (!chapters.length && !forceFirestore) {
    observeChapterSummaryPrefetch(card, slug, title);
  }
  const syncUpBadge = (chapterInfo: HTMLElement) => {
    const source = card.querySelector<HTMLElement>(".up-badge");
    const existingBadge = chapterInfo.querySelector<HTMLElement>(".global-card-up-badge");
    if (!source) {
      existingBadge?.remove();
      return;
    }

    source.style.display = "none";
    if (existingBadge) {
      existingBadge.classList.add("animate-pulse");
      existingBadge.textContent = source.textContent || "UP";
      return;
    }

    const badge = source.cloneNode(true) as HTMLElement;
    badge.className = "global-card-up-badge animate-pulse";
    badge.removeAttribute("id");
    badge.setAttribute("aria-hidden", "true");
    badge.style.position = "static";
    badge.style.display = "inline-flex";
    badge.style.alignItems = "center";
    badge.style.flex = "0 0 auto";
    badge.style.marginLeft = "5px";
    badge.style.padding = "2px 6px";
    badge.style.borderRadius = "4px";
    badge.style.backgroundColor = "#dc2626";
    badge.style.color = "#fff";
    badge.style.fontSize = "8px";
    badge.style.fontWeight = "700";
    badge.style.lineHeight = "1";
    chapterInfo.append(badge);
  };
  let list = existing;
  if (!list) {
    list = document.createElement("div");
    list.className = "global-card-chapters";
  }
  const currentItems = [...list.querySelectorAll<HTMLAnchorElement>(".global-card-chapter-item")];
  currentItems.forEach((item, index) => {
    if (item.dataset.readerNavigationBound !== "true") {
      bindChapterNavigation(item, card, slug, chapters[index] || "");
    }
    item.querySelector<HTMLElement>(".global-card-chapter-label")
      ?.classList.toggle("opacity-50", isChapterRead(title, chapters[index] || ""));
    if (index === 0) {
      const chapterInfo = item.querySelector<HTMLElement>(".global-card-chapter-info");
      if (chapterInfo) syncUpBadge(chapterInfo);
    }
  });
  if (
    currentItems.length === chapters.length &&
    currentItems.every((item, index) =>
      item.tagName === "A" &&
      item.querySelector(".global-card-chapter-label")?.textContent === `Chapter ${chapters[index]}` &&
      item.querySelector(".global-card-update-date")?.textContent === formatUpdateDate(updateTimeFor(slug, chapters[index])),
    )
  ) {
    return;
  }

  list.replaceChildren();
  chapters.forEach((chapter) => {
    const item = document.createElement("a");
    item.className = "global-card-chapter-item flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-black/5 px-2.5 py-1.5 text-[13px] text-slate-700 transition hover:ring-1 hover:ring-[var(--mikoroku-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mikoroku-accent)] dark:bg-white/[0.06] dark:text-slate-300 md:gap-1 md:px-1.5 md:py-1 md:text-[12px]";
    bindChapterNavigation(item, card, slug, chapter);
    const chapterInfo = document.createElement("span");
    chapterInfo.className = "global-card-chapter-info flex min-w-0 flex-1 items-center gap-1";
    const label = document.createElement("span");
    label.className = `global-card-chapter-label truncate${isChapterRead(title, chapter) ? " opacity-50" : ""}`;
    label.textContent = `Chapter ${chapter}`;
    chapterInfo.append(label);
    if (chapters[0] === chapter) syncUpBadge(chapterInfo);
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
  el.style.removeProperty("background-color");
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

      card.style.setProperty("background-color", "transparent", "important");
      card.style.setProperty("background", "transparent", "important");
  
      badgesRow.style.display = "flex";
      badgesRow.style.flexWrap = "wrap";
      badgesRow.style.alignItems = "center";
      badgesRow.style.width = "100%";
      badgesRow.style.minWidth = "0";
      badgesRow.style.boxSizing = "border-box";
      badgesRow.style.gap = "3px";
      badgesRow.style.margin = "0 0 4px 0";
      badgesRow.style.padding = "0";
      badgesRow.style.order = "0";

      const statusBadge = cover.querySelector<HTMLElement>(".status-badge");
      const typeBadge = cover.querySelector<HTMLElement>(".type-badge");
      const commissionBadge = cover.querySelector<HTMLElement>(".commission-badge");
      const chBadge = cover.querySelector<HTMLElement>(".ch-badge");
      const upBadge = cover.querySelector<HTMLElement>(".up-badge");
      const sourceBadges = [statusBadge, typeBadge].filter(
        (badge): badge is HTMLElement => Boolean(badge),
      );
      badgesRow.replaceChildren(...sourceBadges.map((badge) => {
        const clone = badge.cloneNode(true) as HTMLElement;
        clone.removeAttribute("id");
        clone.style.removeProperty("display");
        clone.style.position = "static";
        clone.style.left = "auto";
        clone.style.top = "auto";
        clone.style.bottom = "auto";
        clone.style.zIndex = "1";
        return clone;
      }));
      sourceBadges.forEach((badge) => {
        badge.style.display = "none";
      });
      if (chBadge) chBadge.style.display = "none";
      if (upBadge) upBadge.style.display = "none";
      if (commissionBadge) {
        commissionBadge.style.removeProperty("display");
        commissionBadge.style.position = "absolute";
        commissionBadge.style.left = "0";
        commissionBadge.style.bottom = "0";
        commissionBadge.style.width = "100%";
        commissionBadge.style.zIndex = "20";
        commissionBadge.style.borderBottomLeftRadius = cover.style.borderRadius;
        commissionBadge.style.borderBottomRightRadius = cover.style.borderRadius;
      }
      const listBadges = [...badgesRow.querySelectorAll<HTMLElement>(".status-badge, .type-badge, .commission-badge")];
      listBadges.forEach((badge) => {
        badge.style.width = "auto";
        badge.style.minWidth = "0";
        badge.style.maxWidth = "none";
        badge.style.height = "20px";
        badge.style.flex = "0 1 auto";
        badge.style.overflow = "hidden";
        badge.style.whiteSpace = "nowrap";
        badge.style.justifyContent = "center";
        badge.style.textAlign = "center";
        badge.style.boxSizing = "border-box";
        badge.style.border = "1px solid rgba(255,255,255,0.2)";
        badge.style.fontSize = "8px";
        badge.style.padding = "1px 4px";
        badge.style.borderRadius = "4px";
      });

      let listTitle = details.querySelector<HTMLAnchorElement>(".global-card-list-title");
      if (!listTitle) {
        listTitle = document.createElement("a");
        listTitle.className = "global-card-list-title";
      }
      listTitle.href = `/series/${encodeURIComponent(card.dataset.slug || "")}`;
      const sourceTitle = overlay.querySelector<HTMLElement>(".title, .catalog-card-title");
      listTitle.textContent = sourceTitle?.textContent?.trim() || "";
      overlay.style.display = "none";

      if (details.firstElementChild !== badgesRow) details.insertBefore(badgesRow, details.firstChild);
      if (badgesRow.nextElementSibling !== listTitle) details.insertBefore(listTitle, badgesRow.nextSibling);
      if (details.parentElement !== card) card.append(details);

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
      badgesRow.style.width = "100%";
      badgesRow.style.minWidth = "0";
      badgesRow.style.boxSizing = "border-box";
      badgesRow.style.gap = "3px";
      badgesRow.style.margin = "0";
      badgesRow.style.padding = "0";

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
        b.style.fontSize = isMobile ? "clamp(7px, 2.1vw, 8px)" : "9px";
        b.style.padding = isMobile ? "1px clamp(3px, 1.5vw, 6px)" : "2px 7px";
        b.style.lineHeight = "1.2";
        b.style.fontWeight = "600";
        b.style.letterSpacing = "0.02em";
        b.style.textShadow = "none";
        b.style.boxShadow = "none";
      });

      updateListChapterLinks(card, details, true);

      badgesRow.style.order = "0";
      listTitle.style.position = "relative";
      listTitle.style.display = "block";
      listTitle.style.order = "1";
      listTitle.style.width = "100%";
      listTitle.style.background = "none";
      listTitle.style.textDecoration = "none";
      listTitle.style.padding = "0";
      listTitle.style.margin = "0";
      listTitle.style.textAlign = "left";
      listTitle.style.fontSize = isMobile ? "12px" : "13px";
      listTitle.style.fontWeight = "600";
      listTitle.style.lineHeight = "1.3";
      listTitle.style.color = document.documentElement.classList.contains("dark") ? "#f1f5f9" : "#1e293b";
      listTitle.style.overflow = "hidden";
      listTitle.style.textOverflow = "ellipsis";
      listTitle.style.whiteSpace = "nowrap";
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

      if (details.firstElementChild !== badgesRow) details.insertBefore(badgesRow, details.firstChild);
      if (badgesRow.nextElementSibling !== listTitle) details.insertBefore(listTitle, badgesRow.nextSibling);
      return;
    }

    clearListInlineStyles(card);
    clearListInlineStyles(cover);
    clearListInlineStyles(overlay);
    const title = overlay.querySelector<HTMLElement>(".title, .catalog-card-title");
    if (title) clearListInlineStyles(title);

    if (details) {
      [".status-badge", ".type-badge", ".commission-badge", ".ch-badge", ".up-badge"].forEach((selector) => {
        cover.querySelectorAll<HTMLElement>(selector).forEach((badge) => {
          badge.style.removeProperty("display");
        });
      });
      cover.querySelectorAll<HTMLElement>(".commission-badge").forEach((badge) => {
        [
          "position",
          "left",
          "bottom",
          "width",
          "z-index",
          "border-bottom-left-radius",
          "border-bottom-right-radius",
        ].forEach((property) => badge.style.removeProperty(property));
      });
      clearListInlineStyles(details);
      details.remove();
    }
  });
}

function readThemeGradient(value: unknown): GlobalAppearanceSettings["themeGradient"] {
  const gradient = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const readColor = (mode: "dark" | "light", stop: "start" | "end") => {
    const palette = gradient[mode];
    if (!palette || typeof palette !== "object" || Array.isArray(palette)) {
      return defaultGlobalAppearance.themeGradient[mode][stop];
    }
    const color = (palette as Record<string, unknown>)[stop];
    return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)
      ? color
      : defaultGlobalAppearance.themeGradient[mode][stop];
  };
  return {
    dark: { start: readColor("dark", "start"), end: readColor("dark", "end") },
    light: { start: readColor("light", "start"), end: readColor("light", "end") },
  };
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
      themeGradient: readThemeGradient(settings.themeGradient),
    };
  } catch (error) {
    console.warn("Preferensi appearance global tidak dapat dibaca.", error);
    return defaultGlobalAppearance;
  }
}

export function saveGlobalAppearance(settings: GlobalAppearanceSettings): void {
  localStorage.setItem(GLOBAL_APPEARANCE_KEY, JSON.stringify(settings));
}

function getContrastSafeAccent(hexColor: string): string {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(hexColor.slice(offset, offset + 2), 16),
  );
  const luminance = () => {
    const linear = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };

  while (1.05 / (luminance() + 0.05) < 10) {
    channels.forEach((channel, index) => {
      channels[index] = Math.floor(channel * 0.9);
    });
  }

  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function getThemeGradientColor(hexColor: string, mode: "dark" | "light"): string {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === channels[0]) hue = ((channels[1] - channels[2]) / delta + (channels[1] < channels[2] ? 6 : 0)) / 6;
    else if (max === channels[1]) hue = ((channels[2] - channels[0]) / delta + 2) / 6;
    else hue = ((channels[0] - channels[1]) / delta + 4) / 6;
  }
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const tonedLightness = mode === "dark"
    ? Math.min(lightness, 0.2)
    : Math.min(Math.max(lightness, 0.9), 0.97);
  const tonedSaturation = Math.min(saturation, mode === "dark" ? 0.55 : 0.38);
  const chroma = (1 - Math.abs(2 * tonedLightness - 1)) * tonedSaturation;
  const section = hue * 6;
  const secondary = chroma * (1 - Math.abs(section % 2 - 1));
  const offset = tonedLightness - chroma / 2;
  let rgb: [number, number, number];
  if (section < 1) rgb = [chroma, secondary, 0];
  else if (section < 2) rgb = [secondary, chroma, 0];
  else if (section < 3) rgb = [0, chroma, secondary];
  else if (section < 4) rgb = [0, secondary, chroma];
  else if (section < 5) rgb = [secondary, 0, chroma];
  else rgb = [chroma, 0, secondary];
  return `#${rgb.map((value) => Math.round((value + offset) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function applyGlobalAppearance(settings: GlobalAppearanceSettings): void {
  currentAppearance = settings;
  document.documentElement.dataset.cardDisplay = settings.cardDisplay;
  const rawAccent = settings.accentColor;
  const isDark = document.documentElement.classList.contains("dark");
  const accent = rawAccent
    ? `color-mix(in srgb, ${rawAccent} ${isDark ? "65%" : "78%"}, ${isDark ? "#ffffff" : "#64748b"})`
    : null;
  const rootStyle = document.documentElement.style;
  const theme = isDark
    ? settings.themeGradient.dark
    : settings.themeGradient.light;
  const pageBackground = isDark ? "#0b0b0b" : "#f8f9fa";
  const gradientStart = getThemeGradientColor(theme.start, isDark ? "dark" : "light");
  const gradientEnd = getThemeGradientColor(theme.end, isDark ? "dark" : "light");
  const gradient = `linear-gradient(180deg, ${gradientStart} 0%, ${gradientEnd} 60%, ${pageBackground} 100%)`;
  rootStyle.setProperty("--mikoroku-sidebar-gradient-start", gradientStart);
  rootStyle.setProperty("--mikoroku-sidebar-gradient-end", gradientEnd);
  rootStyle.setProperty(
    "--mikoroku-theme-gradient",
    gradient,
  );
  rootStyle.setProperty("--mk-page-bg", pageBackground);
  const applyGradientSurface = (element: HTMLElement) => {
    element.style.setProperty("background-image", gradient, "important");
    element.style.setProperty("background-position", "top center", "important");
    element.style.setProperty("background-repeat", "no-repeat", "important");
    element.style.setProperty("background-size", "100% 100vh", "important");
  };
  applyGradientSurface(document.documentElement);
  if (document.body) applyGradientSurface(document.body);
  document.querySelectorAll<HTMLElement>(".route-page-background, .reader-page")
    .forEach(applyGradientSurface);
  const setAccentVariable = (name: string, customValue: string | null, defaultValue: string) => {
    rootStyle.setProperty(name, customValue || defaultValue);
  };
  const accentSoft = accent ? `color-mix(in srgb, ${accent} 10%, transparent)` : null;
  const accentBorder = accent ? `color-mix(in srgb, ${accent} 28%, transparent)` : null;
  const globalAccent = rawAccent || "#9d1018";
  const readerAccent = rawAccent || "#e8798f";
  const globalAccentSurface = getContrastSafeAccent(globalAccent);
  const readerAccentSurface = getContrastSafeAccent(readerAccent);
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
  rootStyle.setProperty("--mikoroku-accent-surface", globalAccentSurface);
  rootStyle.setProperty("--mikoroku-accent-foreground", "#ffffff");
  rootStyle.setProperty("--mikoroku-reader-accent", readerAccent);
  rootStyle.setProperty("--mikoroku-reader-accent-surface", readerAccentSurface);
  rootStyle.setProperty("--mikoroku-reader-accent-foreground", "#ffffff");
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
  if (!themeObserver) {
    themeObserver = new MutationObserver(() => {
      if (currentAppearance.cardDisplay !== "list") return;
      const color = document.documentElement.classList.contains("dark") ? "#f1f5f9" : "#1e293b";
      document.querySelectorAll<HTMLElement>(".global-card-list-title")
        .forEach((title) => { title.style.color = color; });
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
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

export function refreshGlobalAppearance(): void {
  applyGlobalAppearance(currentAppearance);
}
