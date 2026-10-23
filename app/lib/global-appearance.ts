export type GlobalAppearanceSettings = {
  hideHero: boolean;
  hideStatusBadge: boolean;
  hideTypeBadge: boolean;
  hideChapterBadge: boolean;
  cardDisplay: "default" | "list";
  accentColor: string | null;
};

export type GlobalAppearanceToggleSetting =
  | "hideHero"
  | "hideStatusBadge"
  | "hideTypeBadge"
  | "hideChapterBadge";

export const GLOBAL_APPEARANCE_KEY = "mikoroku_global_appearance_v1";

export const defaultGlobalAppearance: GlobalAppearanceSettings = {
  hideHero: false,
  hideStatusBadge: false,
  hideTypeBadge: false,
  hideChapterBadge: false,
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
    container: ["!grid-cols-1", "!gap-1.5", "!p-1.5", "md:!grid-cols-4", "md:!gap-2", "md:!p-2"],
    card: ["!flex", "!flex-row", "!items-stretch", "!gap-0", "!overflow-visible", "!rounded-xl", "!border", "!border-black/10", "!bg-white", "!p-0", "dark:!border-white/10", "dark:!bg-[#191a20]"],
    cover: ["!h-auto", "!w-[28%]", "!shrink-0", "!aspect-[3/4]", "!rounded-l-xl", "!rounded-r-none", "md:!w-[32%]", "md:!aspect-[2/3]"],
    overlay: ["!static", "!order-first", "!w-full", "!bg-none", "!p-0", "!text-left"],
    title: ["!relative", "!inset-auto", "!m-0", "!min-h-0", "!max-h-none", "!flex-1", "!self-center", "!overflow-hidden", "!rounded-none", "!bg-transparent", "!p-0", "!text-left", "!text-xs", "!text-slate-900", "!shadow-none", "!line-clamp-2", "md:!text-xs", "dark:!text-slate-100"],
    details: ["!flex", "!min-w-0", "!flex-1", "!flex-col", "!items-start", "!gap-1.5", "!p-1.5", "md:!gap-1.5", "md:!p-2"],
    chapters: ["!grid", "!w-full", "!grid-cols-1", "!gap-1"],
  },
} as const;

const chapterModeClasses = {
  chapters: ["!grid", "!w-full", "!grid-cols-1", "!gap-1"],
} as const;

const listUpBadgeClasses = ["!relative", "!static", "!ml-1.5", "!inline-block", "!animate-[blink_1s_infinite]", "!align-middle"];
let appearanceObserver: MutationObserver | null = null;
let appearanceRefreshListenersAttached = false;
let currentAppearance = defaultGlobalAppearance;

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

function getLatestChapters(slug: string, fallbackChapter: string): string[] {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "null");
    const records = Array.isArray(cached)
      ? cached
      : cached && typeof cached === "object" && Array.isArray((cached as { data?: unknown }).data)
        ? (cached as { data: unknown[] }).data
        : [];
    const chapters = records
      .filter((record): record is Record<string, unknown> => !!record && typeof record === "object")
      .map((record) => String(record.num ?? record.chapter ?? record.id ?? ""))
      .filter((number) => chapterNumber(number) >= 0)
      .sort((left, right) => chapterNumber(right) - chapterNumber(left));
    const uniqueChapters = [...new Set(chapters)];
    if (uniqueChapters.length >= 3) return uniqueChapters.slice(0, 3);

    const latest = Math.max(
      chapterNumber(fallbackChapter),
      ...uniqueChapters.map(chapterNumber),
    );
    if (latest >= 0) {
      for (let chapter = Math.floor(latest); uniqueChapters.length < 3 && chapter >= 0; chapter -= 1) {
        const value = String(chapter);
        if (!uniqueChapters.some((cachedChapter) => chapterNumber(cachedChapter) === chapter)) {
          uniqueChapters.push(value);
        }
      }
      return uniqueChapters
        .sort((left, right) => chapterNumber(right) - chapterNumber(left))
        .slice(0, 3);
    }
    if (uniqueChapters.length) return uniqueChapters.slice(0, 3);
  } catch (error) {
    console.warn(`Chapter cache for ${slug} could not be read.`, error);
  }

  const latest = chapterNumber(fallbackChapter);
  if (latest < 0) return [];
  return Array.from({ length: 3 }, (_, index) => String(latest - index))
    .filter((number) => chapterNumber(number) >= 0);
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

  const chapters = getLatestChapters(slug, fallbackChapter);
  const title = card.querySelector<HTMLElement>(".title")?.textContent?.trim() || "";
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
    if (upBadge && currentItems[0] && upBadge.parentElement !== currentItems[0]) {
      listUpBadgeClasses.forEach((className) => upBadge.classList.add(className));
      currentItems[0].append(upBadge);
    }
    return;
  }

  list.replaceChildren();
  chapters.forEach((chapter) => {
    const item = document.createElement("div");
    item.className = "global-card-chapter-item flex w-full cursor-pointer items-center justify-between gap-1 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] text-slate-700 transition hover:ring-1 hover:ring-[var(--mikoroku-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mikoroku-accent)] dark:bg-white/[0.06] dark:text-slate-300 md:gap-0.5 md:px-1 md:py-0.5 md:text-[10px]";
    bindChapterNavigation(item, card, slug, chapter);
    const chapterInfo = document.createElement("span");
    chapterInfo.className = "flex min-w-0 flex-1 items-center";
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
      date.className = "global-card-update-date shrink-0 text-right text-[9px] text-slate-500 md:text-[9px] dark:text-slate-400";
      date.textContent = chapterUpdateDate;
      item.append(date);
    }
    list?.append(item);
  });
  if (chapters.length) details.append(list);
  else list.remove();

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
      card.querySelectorAll<HTMLElement>(".global-card-badges .status-badge, .global-card-badges .type-badge")
        .forEach((badge) => cover.append(badge));
      card.querySelector(".global-card-badges")?.remove();
      if (overlay.parentElement !== details) details.append(overlay);
      if (details.parentElement !== card) card.append(details);
      updateListChapterLinks(card, details, true);
      return;
    }

    if (details) {
      const upBadge = details.querySelector<HTMLElement>(".up-badge");
      if (upBadge) {
        listUpBadgeClasses.forEach((className) => upBadge.classList.remove(className));
        cover.append(upBadge);
      }
      details.querySelectorAll<HTMLElement>(".status-badge, .type-badge").forEach((badge) => {
        cover.append(badge);
      });
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
  if (!appearanceRefreshListenersAttached) {
    const refreshListCards = () => {
      if (currentAppearance.cardDisplay === "list") updateListCardStructure(document, true);
    };
    window.addEventListener("storage", (event) => {
      if (event.key?.startsWith("chapters_") || event.key?.startsWith("read_")) refreshListCards();
    });
    window.addEventListener("pageshow", refreshListCards);
    window.addEventListener("mikoroku:chapter-read", refreshListCards);
    appearanceRefreshListenersAttached = true;
  }
}
