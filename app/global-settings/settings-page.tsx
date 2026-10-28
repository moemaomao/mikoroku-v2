"use client";

import { useEffect, useRef, useState } from "react";
import SiteChrome from "../site-chrome";
import { clearCoverImageCache, getCoverImageCacheBytes } from "../lib/cover-image";
import { clearFirestoreOfflineCache } from "../lib/firebase-client";
import {
  applyGlobalAppearance,
  defaultGlobalAppearance,
  readGlobalAppearance,
  saveGlobalAppearance,
  type GlobalAppearanceSettings,
  type GlobalAppearanceToggleSetting,
} from "../lib/global-appearance";
import {
  COVER_IMAGE_QUALITY_KEY,
  CHAPTER_THUMBNAIL_SIZE_KEY,
  DEFAULT_CHAPTER_THUMBNAIL_SIZE,
  DEFAULT_COVER_IMAGE_CONVERSION,
  readChapterThumbnailSize,
  readCoverImageConversion,
  type CoverImageConversionPreset,
  type CoverImageConversionSettings,
} from "../../lib/image-proxy";
import { clearSharedChapterCache } from "../lib/chapter-cache";

const BOOKMARKS_KEY = "mangaBookmarks";
const HISTORY_KEY = "readingHistory";
const HISTORY_LIMIT = 50;
const LOCAL_CACHE_KEYS = new Set([
  "manga_cache_v1",
  "manga_cache_v5",
  "mangaGithubCache",
  "mangaFsMetaCache",
  "mangaGithubLightCache",
  "mk_hero_v2",
  "currentManga",
  "currentChapter",
]);
const CACHE_PREFIXES = ["chapters_", "detail_", "manga_cache_", "mangaGithub", "mk_hero_"];
const PROTECTED_LOCAL_STORAGE_KEYS = new Set([
  BOOKMARKS_KEY,
  HISTORY_KEY,
  "mikoroku_global_appearance_v1",
  COVER_IMAGE_QUALITY_KEY,
  CHAPTER_THUMBNAIL_SIZE_KEY,
  "darkMode",
  "chapterSourceMode",
  "chapterSortMode",
  "chapterViewMode",
  "seriesCoverPreferences",
]);
const PROTECTED_LOCAL_STORAGE_PREFIXES = [
  "firebase:",
  "firebaseui:",
  "firebaseLocalStorageDb",
];

type StorageReport = {
  localStorageBytes: number;
  chapterCacheBytes: number;
  coverImageCacheBytes: number;
  originUsageBytes: number | null;
  originQuotaBytes: number | null;
};

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "Unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function localStorageData(key: string): unknown[] {
  const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
  return Array.isArray(value) ? value : [];
}

function readBookmarks(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [{ title: item.trim() }];
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const bookmark = item as Record<string, unknown>;
    return typeof bookmark.title === "string" && bookmark.title.trim()
      ? [{ ...bookmark, title: bookmark.title.trim() }]
      : [];
  });
}

function readHistory(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const entry = item as Record<string, unknown>;
    if (typeof entry.url !== "string" || !entry.url.trim()) return [];
    const url = entry.url.trim();
    if (!url.startsWith("/") || url.startsWith("//")) {
      try {
        if (!["http:", "https:"].includes(new URL(url).protocol)) return [];
      } catch {
        return [];
      }
    }
    return [{ ...entry, url, time: Number(entry.time) || 0 }];
  });
}

function mergeBy<T extends Record<string, unknown>>(current: T[], incoming: T[], key: (item: T) => string): T[] {
  const merged = new Map<string, T>();
  for (const item of [...current, ...incoming]) {
    const itemKey = key(item);
    if (itemKey && !merged.has(itemKey)) merged.set(itemKey, item);
  }
  return [...merged.values()];
}

function isProtectedLocalStorageKey(key: string): boolean {
  if (PROTECTED_LOCAL_STORAGE_KEYS.has(key)) return true;
  return PROTECTED_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function isLocalAppCacheKey(key: string): boolean {
  if (isProtectedLocalStorageKey(key)) return false;
  if (LOCAL_CACHE_KEYS.has(key)) return true;
  if (CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) return true;
  return false;
}

function clearLocalAppCaches(): number {
  const keys = Object.keys(localStorage).filter(isLocalAppCacheKey);
  keys.forEach((key) => localStorage.removeItem(key));
  return keys.length;
}

function clearAllLocalStorageExceptAccount(): number {
  const keys = Object.keys(localStorage).filter((key) => !isProtectedLocalStorageKey(key));
  keys.forEach((key) => localStorage.removeItem(key));
  return keys.length;
}

const appearanceOptions: Array<{
  key: GlobalAppearanceToggleSetting;
  title: string;
  description: string;
}> = [
  { key: "hideHero", title: "Hide hero", description: "Hide the hero banner on the home page." },
  { key: "hideStatusBadge", title: "Hide status badge", description: "Hide status badges such as ongoing or completed." },
  { key: "hideTypeBadge", title: "Hide type badge", description: "Hide content type badges such as manga or manhwa." },
  { key: "hideChapterBadge", title: "Hide chapter badge", description: "Hide the chapter count badge on manga cards." },
  { key: "hideDetailCoverBackground", title: "Disable detail cover background", description: "Hide the cover image used as the background on series detail pages." },
];

function AppearanceToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/70 p-4 transition hover:border-[var(--mikoroku-accent)] dark:border-white/10 dark:bg-white/[0.04]">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--mikoroku-accent)] after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition-transform ${checked ? "bg-[var(--mikoroku-accent)] after:translate-x-5" : "bg-slate-300 dark:bg-slate-600"}`}
      />
    </label>
  );
}


function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const s = max === 0 ? 0 : d / max;
  return { h: h * 360, s, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const hh = ((h % 360) + 360) % 360 / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function AccentColorWheel({
  value,
  onChange,
  onReset,
}: {
  value: string | null;
  onChange: (hex: string) => void;
  onReset: () => void;
}) {
  const size = 148;
  const radius = size / 2;
  const innerR = 42;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const hsv = hexToHsv(value || "#7c3aed");
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(Math.max(hsv.s, 0.55));
  const [val, setVal] = useState(Math.max(hsv.v, 0.75));

  useEffect(() => {
    const next = hexToHsv(value || "#7c3aed");
    setHue(next.h);
    setSat(Math.max(next.s, 0.15));
    setVal(Math.max(next.v, 0.35));
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 0.5) {
      const start = ((angle - 0.6) * Math.PI) / 180;
      const end = ((angle + 0.6) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(radius + Math.cos(start) * innerR, radius + Math.sin(start) * innerR);
      ctx.arc(radius, radius, radius - 2, start, end);
      ctx.arc(radius, radius, innerR, end, start, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    const rad = (hue * Math.PI) / 180;
    const markerR = (innerR + radius - 2) / 2;
    const mx = radius + Math.cos(rad) * markerR;
    const my = radius + Math.sin(rad) * markerR;
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = hsvToHex(hue, 1, 1);
    ctx.fill();
  }, [hue]);

  function pickFromEvent(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - radius;
    const y = clientY - rect.top - radius;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < innerR - 4 || dist > radius) return;
    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    setHue(angle);
    onChange(hsvToHex(angle, sat, val));
  }

  const preview = hsvToHex(hue, sat, val);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
      <div className="relative" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="cursor-crosshair touch-none rounded-full"
          style={{ width: size, height: size }}
          aria-label="Accent color wheel"
          onPointerDown={(event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            pickFromEvent(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (!dragging.current) return;
            pickFromEvent(event.clientX, event.clientY);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 flex size-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 shadow-inner dark:border-white/15"
          style={{ background: preview }}
          aria-hidden="true"
        />
      </div>
      <div className="flex w-full min-w-[10rem] flex-col gap-2 sm:w-auto">
        <label className="text-xs text-slate-600 dark:text-slate-400">
          Saturation
          <input
            type="range"
            min={0.15}
            max={1}
            step={0.01}
            value={sat}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              setSat(next);
              onChange(hsvToHex(hue, next, val));
            }}
            className="mt-1 w-full accent-[var(--mikoroku-accent)]"
          />
        </label>
        <label className="text-xs text-slate-600 dark:text-slate-400">
          Brightness
          <input
            type="range"
            min={0.25}
            max={1}
            step={0.01}
            value={val}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              setVal(next);
              onChange(hsvToHex(hue, sat, next));
            }}
            className="mt-1 w-full accent-[var(--mikoroku-accent)]"
          />
        </label>
        <div className="flex items-center gap-2">
          <span className="min-w-16 font-mono text-xs uppercase text-slate-600 dark:text-slate-300">
            {value || "Default"}
          </span>
          <button
            type="button"
            onClick={onReset}
            disabled={value === null}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--mikoroku-accent)] disabled:opacity-40 dark:border-white/15"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}


export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState(defaultGlobalAppearance);
  const [coverConversion, setCoverConversion] = useState<CoverImageConversionSettings>(
    DEFAULT_COVER_IMAGE_CONVERSION,
  );
  const [chapterThumbnailSize, setChapterThumbnailSize] = useState(DEFAULT_CHAPTER_THUMBNAIL_SIZE);
  const [notice, setNotice] = useState("");
  const [storageReport, setStorageReport] = useState<StorageReport | null>(null);
  const [storageBusy, setStorageBusy] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = readGlobalAppearance();
    setSettings(saved);
    applyGlobalAppearance(saved);
    setCoverConversion(readCoverImageConversion());
    setChapterThumbnailSize(readChapterThumbnailSize());
    void refreshStorageReport();
  }, []);

  async function refreshStorageReport() {
    let localStorageBytes = 0;
    let chapterCacheBytes = 0;
    try {
      for (const key of Object.keys(localStorage)) {
        const value = localStorage.getItem(key) || "";
        const bytes = (key.length + value.length) * 2;
        localStorageBytes += bytes;
        if (key.startsWith("chapters_")) chapterCacheBytes += bytes;
      }
    } catch (error) {
      console.warn("Could not measure localStorage size.", error);
    }

    let coverImageCacheBytes = 0;
    try {
      coverImageCacheBytes = await getCoverImageCacheBytes();
    } catch (error) {
      console.error("Could not measure cover image cache size.", error);
    }

    let originUsageBytes: number | null = null;
    let originQuotaBytes: number | null = null;
    try {
      const estimate = await navigator.storage?.estimate();
      originUsageBytes = typeof estimate?.usage === "number" ? estimate.usage : null;
      originQuotaBytes = typeof estimate?.quota === "number" ? estimate.quota : null;
    } catch (error) {
      console.warn("Browser storage estimate is unavailable.", error);
    }

    setStorageReport({
      localStorageBytes,
      chapterCacheBytes,
      coverImageCacheBytes,
      originUsageBytes,
      originQuotaBytes,
    });
  }

  function exportUserData() {
    try {
      const payload = {
        format: "mikoroku-user-data",
        version: 1,
        exportedAt: new Date().toISOString(),
        bookmarks: readBookmarks(localStorageData(BOOKMARKS_KEY)),
        history: readHistory(localStorageData(HISTORY_KEY)),
      };
      const file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mikoroku-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Bookmarks and reading history exported successfully.");
    } catch (error) {
      console.error("Failed to export bookmarks and history.", error);
      setNotice("Export failed. Check your browser storage permissions.");
    }
  }

  async function importUserData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Export file size must be 5 MB or less.");
      const payload: unknown = JSON.parse(await file.text());
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("JSON file must contain a Mikoroku export object.");
      }
      const data = payload as Record<string, unknown>;
      if (data.format !== "mikoroku-user-data" || data.version !== 1 ||
        !Array.isArray(data.bookmarks) || !Array.isArray(data.history)) {
        throw new Error("Unsupported file format. Use a Mikoroku bookmarks and history export.");
      }

      const incomingBookmarks = readBookmarks(data.bookmarks);
      const incomingHistory = readHistory(data.history);
      const bookmarks = mergeBy(
        readBookmarks(localStorageData(BOOKMARKS_KEY)),
        incomingBookmarks,
        (item) => String(item.slug || item.title).toLowerCase(),
      );
      const history = mergeBy(
        readHistory(localStorageData(HISTORY_KEY)),
        incomingHistory,
        (item) => String(item.url),
      ).sort((left, right) => Number(right.time) - Number(left.time)).slice(0, HISTORY_LIMIT);

      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      window.dispatchEvent(new Event("bookmarkUpdated"));
      setNotice(`${incomingBookmarks.length} bookmarks and ${incomingHistory.length} history items processed; existing local data was kept.`);
      await refreshStorageReport();
    } catch (error) {
      console.error("Failed to import bookmarks and history.", error);
      setNotice(error instanceof Error ? error.message : "Import failed. Make sure the JSON file is valid.");
    } finally {
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  async function clearFirestoreCache() {
    if (!window.confirm("Clear Firestore offline cache in this browser? The page will reload after the cache is cleared.")) return;
    setStorageBusy(true);
    setNotice("Clearing Firestore offline cache...");
    try {
      await clearSharedChapterCache();
      await clearFirestoreOfflineCache();
      setNotice("Firestore cache cleared. Reloading page...");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error("Failed to clear Firestore offline cache.", error);
      setNotice(error instanceof Error ? error.message : "Failed to clear Firestore offline cache.");
      setStorageBusy(false);
    }
  }

  async function clearLocalCaches() {
    if (!window.confirm("Clear local app caches (catalog, detail, and chapter lists)? Account data will be kept.")) return;
    setStorageBusy(true);
    try {
      const removed = clearLocalAppCaches();
      await clearSharedChapterCache();
      setNotice(`Cleared ${removed} local cache entries.`);
      await refreshStorageReport();
    } catch (error) {
      console.error("Failed to clear local app caches.", error);
      setNotice("Failed to clear local app caches.");
    } finally {
      setStorageBusy(false);
    }
  }

  async function clearAllLocalExceptAccount() {
    if (
      !window.confirm(
        "Clear ALL localStorage except bookmarks, history, appearance, and login-related keys? This removes every other cached key in this browser.",
      )
    ) {
      return;
    }
    setStorageBusy(true);
    try {
      const removed = clearAllLocalStorageExceptAccount();
      setNotice(`Cleared ${removed} localStorage keys. Account data and preferences were kept.`);
      await refreshStorageReport();
    } catch (error) {
      console.error("Failed to clear localStorage.", error);
      setNotice("Failed to clear localStorage.");
    } finally {
      setStorageBusy(false);
    }
  }

  async function clearImageCache() {
    if (!window.confirm("Clear cached cover images? Images will be downloaded again when needed.")) return;
    setStorageBusy(true);
    try {
      await clearCoverImageCache();
      setNotice("Cover image cache cleared.");
      await refreshStorageReport();
    } catch (error) {
      console.error("Failed to clear cover image cache.", error);
      setNotice("Failed to clear cover image cache.");
    } finally {
      setStorageBusy(false);
    }
  }

  function updateAppearance(key: GlobalAppearanceToggleSetting, value: boolean) {
    const updated: GlobalAppearanceSettings = { ...settings, [key]: value };
    try {
      saveGlobalAppearance(updated);
      applyGlobalAppearance(updated);
      setSettings(updated);
      setNotice("Appearance settings saved.");
    } catch (error) {
      console.error("Failed to save global appearance preferences.", error);
      setNotice("Settings could not be saved. Check your browser storage permissions.");
    }
  }

  function updateAccentColor(accentColor: string | null) {
    const updated: GlobalAppearanceSettings = { ...settings, accentColor };
    try {
      saveGlobalAppearance(updated);
      applyGlobalAppearance(updated);
      setSettings(updated);
      setNotice("Appearance settings saved.");
    } catch (error) {
      console.error("Failed to save global appearance preferences.", error);
      setNotice("Settings could not be saved. Check your browser storage permissions.");
    }
  }

  function updateCardDisplay(cardDisplay: GlobalAppearanceSettings["cardDisplay"]) {
    const updated: GlobalAppearanceSettings = { ...settings, cardDisplay };
    try {
      saveGlobalAppearance(updated);
      applyGlobalAppearance(updated);
      setSettings(updated);
      setNotice("Layout settings saved.");
    } catch (error) {
      console.error("Failed to save global appearance preferences.", error);
      setNotice("Settings could not be saved. Check your browser storage permissions.");
    }
  }

  function updateCoverConversion(updated: CoverImageConversionSettings) {
    try {
      localStorage.setItem(COVER_IMAGE_QUALITY_KEY, JSON.stringify(updated));
      setCoverConversion(updated);
      setNotice("Cover image conversion settings saved.");
    } catch (error) {
      console.error("Failed to save cover image conversion settings.", error);
      setNotice("Image settings could not be saved. Check your browser storage permissions.");
    }
  }

  function selectCoverConversionPreset(preset: CoverImageConversionPreset) {
    updateCoverConversion({ ...coverConversion, preset });
  }

  function updateChapterThumbnailSize(size: number) {
    try {
      localStorage.setItem(CHAPTER_THUMBNAIL_SIZE_KEY, String(size));
      setChapterThumbnailSize(size);
      setNotice("Chapter list thumbnail size saved.");
    } catch (error) {
      console.error("Failed to save chapter thumbnail size.", error);
      setNotice("Thumbnail size could not be saved. Check your browser storage permissions.");
    }
  }

  function resetGlobalSettings() {
    if (!window.confirm("Reset Global Settings to their defaults? Bookmarks, history, and caches will not be deleted.")) {
      return;
    }

    try {
      saveGlobalAppearance(defaultGlobalAppearance);
      localStorage.setItem(COVER_IMAGE_QUALITY_KEY, JSON.stringify(DEFAULT_COVER_IMAGE_CONVERSION));
      localStorage.setItem(CHAPTER_THUMBNAIL_SIZE_KEY, String(DEFAULT_CHAPTER_THUMBNAIL_SIZE));
      applyGlobalAppearance(defaultGlobalAppearance);
      setSettings(defaultGlobalAppearance);
      setCoverConversion(DEFAULT_COVER_IMAGE_CONVERSION);
      setChapterThumbnailSize(DEFAULT_CHAPTER_THUMBNAIL_SIZE);
      setNotice("Global Settings reset to defaults.");
    } catch (error) {
      console.error("Failed to reset Global Settings.", error);
      setNotice("Settings could not be reset. Check your browser storage permissions.");
    }
  }

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="route-page-background min-h-[calc(100vh-56px)] bg-slate-100 px-4 py-8 text-slate-900 dark:bg-[#111216] dark:text-slate-100 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <header className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--mikoroku-accent)]">Mikoroku</p>
            <h1 className="mt-2 text-3xl font-bold">Global Settings</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Configure catalog layout and display options for this device and browser.
            </p>
          </header>

          {/* Layout — moved to top */}
          <section
            className="rounded-3xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-[#191a20] sm:p-6"
            aria-labelledby="layout-heading"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="layout-heading" className="text-lg font-bold">Layout</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Choose how manga cards appear in the catalog.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Manga card display">
              {([
                ["default", "Default", "Standard grid layout."],
                [
                  "list",
                  "List",
                  "Horizontal cards with cover, title, and the three latest chapters.",
                ],
              ] as const).map(([value, title, description]) => {
                const selected = settings.cardDisplay === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateCardDisplay(value)}
                    className={`rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent)] ${
                      selected
                        ? "border-[var(--mikoroku-accent)] text-[var(--mikoroku-accent)]"
                        : "border-black/10 bg-white/60 hover:border-[var(--mikoroku-accent)] dark:border-white/10 dark:bg-white/[0.03]"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-1 block text-xs text-slate-600 dark:text-slate-400">{description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            className="mt-5 rounded-3xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-[#191a20] sm:p-6"
            aria-labelledby="cover-quality-heading"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="cover-quality-heading" className="text-lg font-bold">Cover image data saver</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Convert cover images to smaller versions, like the reader. Admin cover previews are not affected.
                </p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2">
                <span className="text-xs font-semibold">{coverConversion.enabled ? "On" : "Off"}</span>
                <input
                  type="checkbox"
                  checked={coverConversion.enabled}
                  onChange={(event) => updateCoverConversion({
                    ...coverConversion,
                    enabled: event.currentTarget.checked,
                  })}
                  aria-label="Enable cover image data saver"
                  className="size-5 accent-[var(--mikoroku-accent)]"
                />
              </label>
            </div>
            <div className={`rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03] ${coverConversion.enabled ? "" : "opacity-50"}`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Cover conversion quality">
                {([
                  ["low", "Low", "100 px · save most data"],
                  ["medium", "Medium", "200 px · balanced"],
                  ["high", "High", "300 px · sharper"],
                  ["custom", "Custom", `${coverConversion.customWidth} px`],
                ] as const).map(([preset, title, description]) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={coverConversion.preset === preset}
                    disabled={!coverConversion.enabled}
                    onClick={() => selectCoverConversionPreset(preset)}
                    className={`rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent)] disabled:cursor-not-allowed ${
                      coverConversion.preset === preset
                        ? "border-[var(--mikoroku-accent)] bg-[var(--mikoroku-accent-soft)] text-[var(--mikoroku-accent)]"
                        : "border-black/10 hover:border-[var(--mikoroku-accent)] dark:border-white/10"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-slate-600 dark:text-slate-400">{description}</span>
                  </button>
                ))}
              </div>
              {coverConversion.preset === "custom" && (
                <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Custom image size</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Reader-style source width: {coverConversion.customWidth}px
                      </p>
                    </div>
                    <output className="min-w-16 rounded-lg bg-[var(--mikoroku-accent-soft)] px-2 py-1 text-center text-sm font-bold text-[var(--mikoroku-accent)]">
                      {coverConversion.customWidth}px
                    </output>
                  </div>
                  <label className="mt-4 block">
                    <span className="sr-only">Custom cover image width</span>
                    <input
                      type="range"
                      min={10}
                      max={1000}
                      step={10}
                      value={coverConversion.customWidth}
                      disabled={!coverConversion.enabled}
                      onChange={(event) => updateCoverConversion({
                        ...coverConversion,
                        customWidth: Number(event.currentTarget.value),
                      })}
                      aria-valuetext={`${coverConversion.customWidth} pixels`}
                      className="h-2 w-full cursor-pointer accent-[var(--mikoroku-accent)] disabled:cursor-not-allowed"
                    />
                  </label>
                  <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    <span>10 px</span>
                    <span>1000 px</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section
            className="mt-5 rounded-3xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-[#191a20] sm:p-6"
            aria-labelledby="chapter-thumbnail-heading"
          >
            <div>
              <h2 id="chapter-thumbnail-heading" className="text-lg font-bold">Chapter list thumbnail size</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Set the converted source size for chapter thumbnails. Default: 40 px.
              </p>
            </div>
            <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="chapter-thumbnail-size" className="text-sm font-semibold">
                  Custom size
                </label>
                <output
                  htmlFor="chapter-thumbnail-size"
                  className="min-w-16 rounded-lg bg-[var(--mikoroku-accent-soft)] px-2 py-1 text-center text-sm font-bold text-[var(--mikoroku-accent)]"
                >
                  {chapterThumbnailSize}px
                </output>
              </div>
              <input
                id="chapter-thumbnail-size"
                type="range"
                min={10}
                max={200}
                step={10}
                value={chapterThumbnailSize}
                onChange={(event) => updateChapterThumbnailSize(Number(event.currentTarget.value))}
                aria-valuetext={`${chapterThumbnailSize} pixels`}
                className="mt-4 h-2 w-full cursor-pointer accent-[var(--mikoroku-accent)]"
              />
              <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
                <span>10 px</span>
                <span>200 px</span>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section
            className="mt-5 rounded-3xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-[#191a20] sm:p-6"
            aria-labelledby="appearance-heading"
          >
            <div className="mb-4">
              <h2 id="appearance-heading" className="text-lg font-bold">Appearance</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Choose which catalog elements to hide.
              </p>
            </div>
            <div className="grid gap-3">
              {appearanceOptions.map((option) => (
                <AppearanceToggle
                  key={option.key}
                  title={option.title}
                  description={option.description}
                  checked={settings[option.key]}
                  onChange={(value) => updateAppearance(option.key, value)}
                />
              ))}
            </div>
            <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
              <div className="mb-3">
                <h3 className="text-sm font-semibold">Custom accent color</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Drag on the color wheel to pick a hue, then fine-tune saturation and brightness.
                </p>
              </div>
              <AccentColorWheel
                value={settings.accentColor}
                onChange={(hex) => updateAccentColor(hex)}
                onReset={() => updateAccentColor(null)}
              />
            </div>
            <p className="mt-3 min-h-5 text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
              {notice}
            </p>
          </section>

          {/* Data & storage tools */}
          <section
            className="mt-5 rounded-3xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-[#191a20] sm:p-6"
            aria-labelledby="storage-heading"
          >
            <div className="mb-4">
              <h2 id="storage-heading" className="text-lg font-bold">Data &amp; storage tools</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Inspect and manage local browser cache. Firestore offline data lives mostly in IndexedDB
                (shown under total origin storage). localStorage also holds bookmarks, history, theme,
                and preferences — those are kept unless you use &quot;Clear all localStorage&quot;.
              </p>
            </div>

            <div className="mb-5 grid gap-3 rounded-2xl bg-black/[0.03] p-4 text-sm dark:bg-white/[0.04] sm:grid-cols-2">
              <p>
                localStorage: <strong>{formatBytes(storageReport?.localStorageBytes ?? null)}</strong>
              </p>
              <p>
                Chapter list cache: <strong>{formatBytes(storageReport?.chapterCacheBytes ?? null)}</strong>
              </p>
              <p>
                Cover image cache: <strong>{formatBytes(storageReport?.coverImageCacheBytes ?? null)}</strong>
              </p>
              <p>
                Total origin storage (including Firestore):{" "}
                <strong>{formatBytes(storageReport?.originUsageBytes ?? null)}</strong>
                {storageReport?.originQuotaBytes != null && <> / {formatBytes(storageReport.originQuotaBytes)}</>}
              </p>
              <button
                type="button"
                onClick={() => void refreshStorageReport()}
                className="w-fit rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold transition hover:border-[var(--mikoroku-accent)] dark:border-white/15"
              >
                Recalculate sizes
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={storageBusy}
                onClick={() => void clearFirestoreCache()}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left text-sm font-semibold transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                Clear Firestore offline &amp; chapter cache
                <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-400">
                  Removes offline data including chapter documents. Other Mikoroku tabs may need to be closed.
                </span>
              </button>
              <button
                type="button"
                disabled={storageBusy}
                onClick={() => void clearLocalCaches()}
                className="rounded-xl border border-black/10 p-3 text-left text-sm font-semibold transition hover:border-[var(--mikoroku-accent)] disabled:opacity-50 dark:border-white/10"
              >
                Clear local app caches
                <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-400">
                  Clears catalog, detail, chapter list, and related caches. Bookmarks, history, and preferences are kept.
                </span>
              </button>
              <button
                type="button"
                disabled={storageBusy}
                onClick={() => void clearAllLocalExceptAccount()}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-left text-sm font-semibold transition hover:bg-rose-500/20 disabled:opacity-50"
              >
                Clear all localStorage (keep account)
                <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-400">
                  Removes every localStorage key except bookmarks, history, appearance, theme, and Firebase login data. Use this if the size stays high after a normal cache clear.
                </span>
              </button>
              <button
                type="button"
                disabled={storageBusy}
                onClick={() => void clearImageCache()}
                className="rounded-xl border border-black/10 p-3 text-left text-sm font-semibold transition hover:border-[var(--mikoroku-accent)] disabled:opacity-50 dark:border-white/10"
              >
                Clear cached cover images
                <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-400">
                  Removes local cover image cache. Images will be downloaded again when needed.
                </span>
              </button>
              <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="text-sm font-semibold">Bookmark &amp; reading history</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Import merges data and keeps existing local items.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportUserData}
                    className="rounded-lg bg-[var(--mikoroku-accent)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => importFileRef.current?.click()}
                    className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold dark:border-white/15"
                  >
                    Import JSON
                  </button>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => void importUserData(event.target.files?.[0])}
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            className="mt-5 rounded-3xl border border-rose-500/30 bg-rose-500/[0.04] p-4 shadow-sm sm:p-6"
            aria-labelledby="reset-settings-heading"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 id="reset-settings-heading" className="text-lg font-bold">Reset settings</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Restore Global Settings to their defaults. Bookmarks, reading history, and caches are kept.
                </p>
              </div>
              <button
                type="button"
                onClick={resetGlobalSettings}
                className="shrink-0 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300"
              >
                Reset settings
              </button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
