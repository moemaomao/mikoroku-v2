"use client";

import { useCallback, useEffect, useState } from "react";
import { loadFirestoreMangaCatalog } from "./lib/firebase-client";
import { imageProxyUrl } from "../lib/image-proxy";
import {
  cardClass,
  cardCoverClass,
  cardImageClass,
  cardOverlayClass,
  cardTitleClass,
  bottomBadgeBarClass,
  catalogGridClass,
  chapterBadgeClass,
  homepageLoadMoreClass,
  homepageSectionHeadingClass,
  statusBadgeClass,
  statusBadgeColors,
  typeBadgeClass,
  typeBadgeColors,
  upBadgeClass,
} from "./lib/homepage-classes";
import { getSeriesCoverPreference } from "./lib/series-cover-preferences";

type MangaRecord = Record<string, unknown> & {
  slug: string;
  title: string;
  updatedAt?: number;
  info?: Record<string, unknown>;
};

const CACHE_KEY = "manga_cache_v5";
const CACHE_TIME = 60 * 60 * 1000;
const PAGE_SIZE = 12;

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

function latestChapter(record: MangaRecord): string | null {
  const candidates: unknown[] = [record.lastChapter, record.lastChapterUpdated];
  if (typeof record.chapter !== "object") candidates.push(record.chapter);
  const chapterMap = record.chapters && typeof record.chapters === "object"
    ? record.chapters as Record<string, unknown>
    : typeof record.chapter === "object" && record.chapter
      ? record.chapter as Record<string, unknown>
      : {};
  candidates.push(...Object.keys(chapterMap));
  const chapters = candidates.flatMap((candidate) => {
    if (candidate === null || candidate === undefined || typeof candidate === "object") return [];
    const raw = String(candidate).trim();
    const number = Number.parseFloat(raw.replace(/[^\d.]/g, ""));
    return raw && Number.isFinite(number) && number >= 0 ? [{ raw, number }] : [];
  });
  return chapters.length
    ? chapters.reduce((latest, chapter) =>
        chapter.number > latest.number ? chapter : latest,
      ).raw
    : null;
}

function seriesType(record: MangaRecord): string {
  const rawType = String(value(record, "type") || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
  if (rawType && rawType !== "manga") return rawType;
  const genres = value(record, "genres", []);
  const genreList = Array.isArray(genres)
    ? genres.map((genre) => String(genre).toLowerCase())
    : [];
  return (
    ["doujinshi", "cg", "manhwa", "manhua", "novel"].find((type) =>
      genreList.includes(type),
    ) || "manga"
  );
}

function isNovel(record: MangaRecord): boolean {
  return seriesType(record).includes("novel");
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

function cacheRecords(records: Record<string, MangaRecord>) {
  const data = Object.fromEntries(
    Object.entries(records).map(([slug, record]) => {
      const lastChapter = latestChapter(record);
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
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data }));
  } catch (error) {
    console.warn("Firestore manga cache could not be saved.", error);
  }
}

async function fetchRecords(): Promise<Record<string, MangaRecord>> {
  const snapshot = await loadFirestoreMangaCatalog();

  const records: Record<string, MangaRecord> = {};
  snapshot.forEach((document) => {
    const data = document.data() as MangaRecord;
    if (data.isDraft === true) return;
    records[document.id] = { ...data, slug: document.id };
  });
  return records;
}

const volumeCoverCache = new Map<string, string>();
const volumeCoverPending = new Map<string, Promise<string>>();

function coverFileKey(url: string): string {
  try {
    const clean = url.split("?")[0].split("#")[0];
    const parts = clean.split("/");
    return (parts[parts.length - 1] || clean).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function pickDifferentCover(candidates: string[], mainCover: string): string {
  const mainKey = coverFileKey(mainCover);
  const main = mainCover.trim().toLowerCase();
  for (const raw of candidates) {
    if (!raw || !raw.trim()) continue;
    const c = raw.trim();
    if (coverFileKey(c) === mainKey) continue;
    if (c.toLowerCase() === main) continue;
    return c;
  }
  return "";
}

function pickVolumeCover(record: MangaRecord, mainCover: string): string {
  const list = value(record, "covers", []);
  const covers = Array.isArray(list) ? list.map(String) : [];
  const numbers = value(record, "coverNumbers", null);
  if (numbers && typeof numbers === "object") {
    covers.push(...Object.keys(numbers as Record<string, unknown>));
  }
  for (const key of ["cover", "img", "image"]) {
    const v = value(record, key, "");
    if (typeof v === "string" && v) covers.push(v);
  }
  return pickDifferentCover(covers, mainCover);
}

function decodeFirestoreString(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const field = value as { stringValue?: string };
  return typeof field.stringValue === "string" ? field.stringValue : "";
}

async function fetchVolumeCover(slug: string, mainCover: string): Promise<string> {
  if (!slug) return "";
  if (volumeCoverCache.has(slug)) return volumeCoverCache.get(slug) || "";
  const pending = volumeCoverPending.get(slug);
  if (pending) return pending;

  const job = (async () => {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/mikoroku/databases/(default)/documents/manga/${encodeURIComponent(slug)}`;
      const res = await fetch(url);
      if (!res.ok) {
        volumeCoverCache.set(slug, "");
        return "";
      }
      const doc = await res.json() as { fields?: Record<string, unknown> };
      const fields = doc.fields || {};
      const out: string[] = [];
      const coversField = fields.covers as
        | { arrayValue?: { values?: unknown[] }; stringValue?: string }
        | undefined;
      if (coversField?.arrayValue?.values) {
        for (const entry of coversField.arrayValue.values) {
          const s = decodeFirestoreString(entry);
          if (s) out.push(s);
        }
      }
      for (const key of ["cover", "img", "image", "thumbnail"]) {
        const s = decodeFirestoreString(fields[key]);
        if (s) out.push(s);
      }
      const numbers = fields.coverNumbers as
        | { mapValue?: { fields?: Record<string, unknown> } }
        | undefined;
      if (numbers?.mapValue?.fields) {
        out.push(...Object.keys(numbers.mapValue.fields));
      }
      const found = pickDifferentCover(out, mainCover);
      volumeCoverCache.set(slug, found);
      return found;
    } catch {
      volumeCoverCache.set(slug, "");
      return "";
    } finally {
      volumeCoverPending.delete(slug);
    }
  })();

  volumeCoverPending.set(slug, job);
  return job;
}

function CatalogCard({
  record,
  section,
}: {
  record: MangaRecord;
  section: "random" | "novel";
}) {
  const chapter = latestChapter(record);
  const type = seriesType(record);
  const selectedCover = getSeriesCoverPreference(record.slug);
  const cover = String(
    selectedCover || value(record, "cover") || value(record, "img") || "",
  );
  const thumbnail = cover
    ? imageProxyUrl(cover, "postCatalog")
    : "https://via.placeholder.com/80x110?text=No+Image";
  const [volumeCover, setVolumeCover] = useState(() => pickVolumeCover(record, cover));
  const [flipped, setFlipped] = useState(false);
  const volumeThumb = volumeCover ? imageProxyUrl(volumeCover, "postCatalog") : "";
  const backSrc = volumeThumb || thumbnail;
  const status = String(value(record, "status") || "");
  const updatedAt = Number(record.updatedAt || 0);

  const onEnter = () => {
    if (typeof window !== "undefined" && window.innerWidth < 769) return;
    setFlipped(true);
    if (!volumeCover) {
      void fetchVolumeCover(record.slug, cover).then((url) => {
        if (url) setVolumeCover(url);
      });
    }
  };

  return (
    <a
      className={cardClass}
      data-slug={record.slug}
      data-section={section}
      href={`/series/${encodeURIComponent(record.slug)}`}
      onMouseEnter={onEnter}
      onMouseLeave={() => setFlipped(false)}
    >
      <div className={cardCoverClass} style={{ perspective: 900 }}>
        {chapter !== null && (
          <div className={chapterBadgeClass}>Ch. {chapter}</div>
        )}
        {updatedAt > 0 && Date.now() - updatedAt < 86400000 && (
          <div className={upBadgeClass}>UP</div>
        )}
        {(type || status) && (
          <div className={bottomBadgeBarClass}>
            {type ? (
              <div
                className={`${typeBadgeClass} ${typeBadgeColors[type.replace(/\s+/g, "-")] || typeBadgeColors.default}`}
              >
                {type.toUpperCase()}
              </div>
            ) : (
              <div className={`${typeBadgeClass} text-[#bdbdbd]`} />
            )}
            {status ? (
              <div
                className={`${statusBadgeClass} ${statusBadgeColors[status.toLowerCase()] || "text-[#bdbdbd]"}`}
              >
                {status.toUpperCase()}
              </div>
            ) : (
              <div className={`${statusBadgeClass} text-[#bdbdbd]`} />
            )}
          </div>
        )}
        <div
          className="relative h-full w-full"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <img
            key={`${section}-${record.slug}-${thumbnail}`}
            className={cardImageClass}
            src={thumbnail}
            alt={record.title}
            loading="lazy"
            decoding="async"
            style={{
              backgroundColor: "#1a1a1a",
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
            onError={(event) => {
              event.currentTarget.src =
                "https://via.placeholder.com/80x110?text=No+Image";
            }}
          />
          <img
            className={cardImageClass}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              backgroundColor: "#1a1a1a",
            }}
            src={backSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className={cardOverlayClass}>
          <div className={cardTitleClass}>{record.title}</div>
        </div>
      </div>
    </a>
  );
}

export default function FirebasePostCatalog() {
  const [records, setRecords] = useState<MangaRecord[]>([]);
  const [randomManga, setRandomManga] = useState<MangaRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadError, setLoadError] = useState("");

  const applyRecords = useCallback((list: MangaRecord[]) => {
    const cleaned = list
      .filter(
        (record) =>
          !["github"].includes(String(record.origin || "").toLowerCase()),
      )
      .filter(
        (record) =>
          !["github"].includes(String(record.source || "").toLowerCase()),
      )
      .filter((record) => Boolean(record.title));

    setRecords(cleaned);

    const mangaOnly = cleaned.filter((record) => !isNovel(record));
    setRandomManga(mangaOnly.sort((left, right) =>
      updatedAtMillis(right) - updatedAtMillis(left) ||
      left.slug.localeCompare(right.slug),
    ));
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
      }
    },
    [applyRecords],
  );

  useEffect(() => {
    const cache = readCache();
    if (cache) {
      applyRecords(
        Object.values(cache.data).filter((record) => record && record.title),
      );
    }
    const controller = new AbortController();
    void refresh(controller.signal);
    const interval = window.setInterval(() => void refresh(), 10 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
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
      <div id="firebaseManga" className={catalogGridClass}>
        {randomManga.slice(0, visibleCount).map((record) => (
          <CatalogCard
            key={`random-${record.slug}`}
            section="random"
            record={record}
          />
        ))}
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
      <div id="firebaseNovel" className={catalogGridClass}>
        {novels.slice(0, visibleCount).map((record) => (
          <CatalogCard
            key={`novel-${record.slug}`}
            section="novel"
            record={record}
          />
        ))}
      </div>
      {loadError && records.length === 0 && <p role="alert">{loadError}</p>}
    </>
  );
}
