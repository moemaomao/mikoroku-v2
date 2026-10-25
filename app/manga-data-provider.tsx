"use client";

import { useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { initializeFirebaseClient } from "./lib/firebase-client";

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
    GITHUB_RAW?: string;
  }
}

const MANGA_CACHE_KEY = "manga_cache_v1";
const MANGA_CACHE_TIME = 15 * 60 * 1000;
const MANGA_JSON_URL = "/api/catalog/manga";
const GITHUB_RAW = "https://raw.githubusercontent.com/moemaomao/mymangadata/main/";
let initialization: Promise<void> | undefined;

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveCover(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim() === "-") return "";
  const cover = value.replace(/\.$/, "").trim();
  return /^https?:\/\//i.test(cover) ? cover : GITHUB_RAW + cover.replace(/^\//, "");
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
      img: resolveCover(item.img || item.cover),
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

async function loadGithubData() {
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

  let response = await fetch(MANGA_JSON_URL);
  if (!response.ok) {
    response = await fetch(`${GITHUB_RAW}all-manga.json`);
  }
  if (!response.ok) throw new Error(`Manga dataset returned HTTP ${response.status}.`);
  const items: unknown = await response.json();
  if (!Array.isArray(items)) throw new Error("Manga dataset response must be an array.");
  applyMangaList(items as Record<string, unknown>[]);
  try {
    localStorage.setItem(MANGA_CACHE_KEY, JSON.stringify({ time: Date.now(), data: items }));
  } catch (error) {
    console.warn("Manga dataset cache could not be saved.", error);
  }
}

async function loadFirestoreData(): Promise<void> {
  const { firestore } = initializeFirebaseClient();
  const snapshot = await getDocs(collection(firestore, "manga"));
  const data = window.mangaData || (window.mangaData = {});
  snapshot.forEach((document) => {
    const record = document.data();
    if (record.isDraft === true || typeof record.title !== "string") return;
    const manga: MangaMetadata = {
      ...record,
      slug: document.id,
      img: String(record.cover || record.img || ""),
      cover: String(record.cover || record.img || ""),
      title: record.title,
      firestore: true,
    };
    const key = normalizeTitle(manga.title);
    if (!key) return;
    data[key] = manga;
    data[document.id] = manga;
  });
}

async function initializeMangaData() {
  window.mangaData ||= {};
  window.MANGA_CACHE_KEY ||= MANGA_CACHE_KEY;
  window.MANGA_CACHE_TIME ||= MANGA_CACHE_TIME;
  window.GITHUB_RAW ||= GITHUB_RAW;
  window.__mangaDataLoaded = true;

  try {
    await loadGithubData();
  } catch (error) {
    console.error("GitHub manga dataset failed to load.", error);
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
