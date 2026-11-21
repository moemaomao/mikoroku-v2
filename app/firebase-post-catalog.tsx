"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadFirestoreMangaCatalog } from "./lib/firebase-client";
import { latestChapterFromRecord } from "../lib/latest-chapter";
import { imageProxyUrl } from "../lib/image-proxy";
import {
  getHomepageMangaSection,
  getHomepageMangaType,
  splitHomepageMangaSections,
} from "./lib/homepage-manga-sections";
import { CoverImage } from "./lib/cover-image";
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
import { getSeriesCoverPreference } from "./lib/series-cover-preferences";
import { setLocalStorageCacheItem } from "./lib/local-storage-cache";
import { markHomepageSeriesNavigation } from "./lib/home-navigation";
import { preloadDetailPageContent } from "./series/detail-page-client";

type MangaRecord = Record<string, unknown> & {
  slug: string;
  title: string;
  updatedAt?: number;
  info?: Record<string, unknown>;
};

const CACHE_KEY = "manga_cache_v5";
const CACHE_TIME = 60 * 60 * 1000;
const PAGE_SIZE = 12;
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
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as {
      time?: number;
      data?: Record<string, MangaRecord>;
    };
    if (!cached.data || typeof cached.data !== "object") return null;
    return {
      data: cached.data,
      expired: Date.now() - (cached.time || 0) > CACHE_TIME,
    };
  } catch (error) {
    console.warn("Firestore manga cache is invalid and will be ignored.", error);
    localStorage.removeItem(CACHE_KEY);
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
  setLocalStorageCacheItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data }));
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
  const href = `/series/${encodeURIComponent(record.slug)}`;

  return (
    <Link
      className={cardClass}
      data-slug={record.slug}
      data-section={section}
      href={href}
      prefetch={true}
      onMouseEnter={preloadDetailPageContent}
      onFocus={preloadDetailPageContent}
      onClick={(event) => {
        try {
          localStorage.setItem("currentManga", JSON.stringify(record));
        } catch {
          setLocalStorageCacheItem("currentManga", JSON.stringify(record));
        }
        markHomepageSeriesNavigation(href, event);
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
    </Link>
  );
}

export default function FirebasePostCatalog() {
  const [records, setRecords] = useState<MangaRecord[]>([]);
  const [randomManga, setRandomManga] = useState<MangaRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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
        )) : isLoading ? Array.from({ length: PAGE_SIZE }, (_, index) => (
          <CatalogSkeleton key={`random-skeleton-${index}`} />
        )) : null}
      </div>
      <button
        id="loadMoreFirebase"
        className={homepageLoadMoreClass}
        type="button"
        hidden={!hasMoreManga}
        disabled={!hasMoreManga}
        onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
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
        )) : isLoading ? Array.from({ length: PAGE_SIZE }, (_, index) => (
          <CatalogSkeleton key={`novel-skeleton-${index}`} />
        )) : null}
      </div>
      {loadError && records.length === 0 && <p role="alert">{loadError}</p>}
    </>
  );
}
