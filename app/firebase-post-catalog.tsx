"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { initializeFirebaseClient } from "./lib/firebase-client";
import {
  cardClass,
  cardCoverClass,
  cardImageClass,
  cardOverlayClass,
  cardTitleClass,
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

function shuffleRecords<T>(list: T[]): T[] {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
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
  const { firestore } = initializeFirebaseClient();
  const source = collection(firestore, "manga");
  let snapshot;
  try {
    snapshot = await getDocs(
      query(source, orderBy("updatedAt", "desc"), limit(100)),
    );
  } catch (error) {
    console.warn(
      "Ordered Firestore catalog query failed; retrying without sorting.",
      error,
    );
    snapshot = await getDocs(source);
  }

  const records: Record<string, MangaRecord> = {};
  snapshot.forEach((document) => {
    const data = document.data() as MangaRecord;
    if (data.isDraft === true) return;
    records[document.id] = { ...data, slug: document.id };
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
  const chapter = latestChapter(record);
  const type = seriesType(record);
  const selectedCover = getSeriesCoverPreference(record.slug);
  const cover = String(
    selectedCover || value(record, "cover") || value(record, "img") || "",
  );
  const thumbnail = cover
    ? `https://images.weserv.nl/?url=${encodeURIComponent(cover)}&w=120&q=60`
    : "https://via.placeholder.com/80x110?text=No+Image";
  const status = String(value(record, "status") || "");
  const updatedAt = Number(record.updatedAt || 0);

  return (
    <a
      className={cardClass}
      data-slug={record.slug}
      data-section={section}
      href={`/series/${encodeURIComponent(record.slug)}`}
    >
      <div className={cardCoverClass}>
        {status && (
          <div
            className={`${statusBadgeClass} ${statusBadgeColors[status.toLowerCase()] || "bg-[#616161]"}`}
          >
            {status.toUpperCase()}
          </div>
        )}
        {type && (
          <div
            className={`${typeBadgeClass} ${typeBadgeColors[type.replace(/\s+/g, "-")] || typeBadgeColors.default}`}
          >
            {type.toUpperCase()}
          </div>
        )}
        {chapter !== null && (
          <div className={chapterBadgeClass}>Ch. {chapter}</div>
        )}
        {updatedAt > 0 && Date.now() - updatedAt < 86400000 && (
          <div className={upBadgeClass}>UP</div>
        )}
        <img
          key={`${section}-${record.slug}-${thumbnail}`}
          className={cardImageClass}
          src={thumbnail}
          alt={record.title}
          loading="lazy"
          decoding="async"
          style={{ backgroundColor: "#1a1a1a" }}
          onError={(event) => {
            event.currentTarget.src =
              "https://via.placeholder.com/80x110?text=No+Image";
          }}
        />
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
    setRandomManga(shuffleRecords(mangaOnly));
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

  const novels = records.filter(isNovel);
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
