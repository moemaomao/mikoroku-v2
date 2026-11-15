"use client";

import { useEffect } from "react";
import { loadFirestoreMangaCatalog } from "./lib/firebase-client";
import { fetchMangaMetadataPayload } from "./lib/manga-metadata";

type MangaMetadata = Record<string, unknown> & {
  slug: string;
  title: string;
};

declare global {
  interface Window {
    mangaData?: Record<string, unknown>;
    __mangaDataLoaded?: boolean;
    MANGA_CACHE_KEY?: string;
    MANGA_CACHE_TIME?: number;
  }
}

const MANGA_CACHE_KEY = "manga_metadata_cache_v2";
const MANGA_CACHE_TIME = 15 * 60 * 1000;
let initialization: Promise<void> | undefined;

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveCover(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim() === "-") return "";
  const cover = value.replace(/\.$/, "").trim();
  return /^https?:\/\//i.test(cover) ? cover : "";
}

function applyMangaList(list: Record<string, unknown>[]) {
  const data = window.mangaData || (window.mangaData = {});
  for (const item of list) {
    if (!item || typeof item.title !== "string" || !item.title) continue;
    const title = item.title;
    const key = normalizeTitle(title);
    const slug = typeof item.slug === "string" && item.slug
      ? item.slug
      : title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    const manga: MangaMetadata = {
      ...item,
      title,
      slug,
      img: resolveCover(item.cover || item.img),
      cover: resolveCover(item.cover || item.img),
      desc: item.desc || "",
      genres: Array.isArray(item.genres) ? item.genres : [],
      rating: item.rating ?? "-",
      status: String(item.status || "").toLowerCase(),
      type: String(item.type || "manga").toLowerCase(),
      altTitle: item.altTitle || "",
      author: item.author || "-",
      artist: item.artist || "-",
      publication: item.publication || "-",
      serialization: item.serialization || "-",
      demographic: item.demographic || "-",
      github: true,
      info: item,
    };
    data[key] = manga;
    data[slug] = manga;
  }
}

async function loadMetadataData() {
  let cached: { time?: number; data?: Record<string, unknown>[] } | undefined;
  try {
    const saved = localStorage.getItem(MANGA_CACHE_KEY);
    if (saved) cached = JSON.parse(saved) as typeof cached;
  } catch (error) {
    console.warn("Manga dataset cache is invalid and will be ignored.", error);
    localStorage.removeItem(MANGA_CACHE_KEY);
  }
  if (Array.isArray(cached?.data) && Date.now() - (cached.time || 0) < MANGA_CACHE_TIME) {
    applyMangaList(cached.data);
    return;
  }

  const { manga } = await fetchMangaMetadataPayload();
  applyMangaList(manga);
  try {
    localStorage.setItem(MANGA_CACHE_KEY, JSON.stringify({ time: Date.now(), data: manga }));
  } catch (error) {
    console.warn("Manga dataset cache could not be saved.", error);
  }
}

async function loadFirestoreData(): Promise<void> {
  const records = await loadFirestoreMangaCatalog();
  const data = window.mangaData || (window.mangaData = {});
  records.forEach((record) => {
    if (record.isDraft === true || typeof record.title !== "string") return;
    const manga: MangaMetadata = {
      ...record,
      slug: record.slug,
      img: String(record.cover || record.img || ""),
      cover: String(record.cover || record.img || ""),
      title: record.title,
      firestore: true,
    };
    const key = normalizeTitle(manga.title);
    if (!key) return;
    data[key] = manga;
    data[record.slug] = manga;
  });
}

async function initializeMangaData() {
  window.mangaData ||= {};
  window.MANGA_CACHE_KEY ||= MANGA_CACHE_KEY;
  window.MANGA_CACHE_TIME ||= MANGA_CACHE_TIME;
  window.__mangaDataLoaded = true;

  try {
    await loadMetadataData();
  } catch (error) {
    console.error("Manga metadata failed to load.", error);
  }

  try {
    await loadFirestoreData();
  } catch (error) {
    console.error("Firestore manga dataset failed to load; retrying shortly.", error);
    window.setTimeout(() => {
      void loadFirestoreData()
        .then(() => window.dispatchEvent(new Event("mangaDataReady")))
        .catch((retryError: unknown) => console.error("Firestore manga dataset retry failed.", retryError));
    }, 5000);
  }
  window.dispatchEvent(new Event("mangaDataReady"));
}

export default function MangaDataProvider() {
  useEffect(() => {
    initialization ||= initializeMangaData();
    void initialization.catch((error: unknown) => {
      console.error("Manga data provider failed to initialize.", error);
    });
  }, []);

  return null;
}
