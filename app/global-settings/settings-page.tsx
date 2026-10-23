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

const BOOKMARKS_KEY = "mangaBookmarks";
const HISTORY_KEY = "readingHistory";
const HISTORY_LIMIT = 50;
const LOCAL_CACHE_KEYS = new Set([
  "manga_cache_v5",
  "mangaGithubCache",
  "mangaFsMetaCache",
  "mangaGithubLightCache",
  "mk_hero_v2",
  "currentManga",
  "currentChapter",
]);
const CACHE_PREFIXES = ["chapters_", "detail_"];

type StorageReport = {
  localStorageBytes: number;
  chapterCacheBytes: number;
  coverImageCacheBytes: number;
  originUsageBytes: number | null;
  originQuotaBytes: number | null;
};

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "Tidak tersedia";
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

function clearLocalAppCaches(): number {
  const keys = Object.keys(localStorage).filter((key) =>
    LOCAL_CACHE_KEYS.has(key) || CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
  keys.forEach((key) => localStorage.removeItem(key));
  return keys.length;
}

const appearanceOptions: Array<{
  key: GlobalAppearanceToggleSetting;
  title: string;
  description: string;
}> = [
  { key: "hideHero", title: "Hide hero", description: "Sembunyikan banner hero di halaman utama." },
  { key: "hideStatusBadge", title: "Hide status badge", description: "Sembunyikan badge status seperti ongoing atau completed." },
  { key: "hideTypeBadge", title: "Hide type badge", description: "Sembunyikan badge jenis konten seperti manga atau manhwa." },
  { key: "hideChapterBadge", title: "Hide chapter badge", description: "Sembunyikan badge jumlah chapter pada kartu manga." },
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

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState(defaultGlobalAppearance);
  const [notice, setNotice] = useState("");
  const [storageReport, setStorageReport] = useState<StorageReport | null>(null);
  const [storageBusy, setStorageBusy] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = readGlobalAppearance();
    setSettings(saved);
    applyGlobalAppearance(saved);
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
      console.warn("Ukuran localStorage tidak dapat dihitung.", error);
    }

    let coverImageCacheBytes = 0;
    try {
      coverImageCacheBytes = await getCoverImageCacheBytes();
    } catch (error) {
      console.error("Ukuran cache gambar tidak dapat dihitung.", error);
    }

    let originUsageBytes: number | null = null;
    let originQuotaBytes: number | null = null;
    try {
      const estimate = await navigator.storage?.estimate();
      originUsageBytes = typeof estimate?.usage === "number" ? estimate.usage : null;
      originQuotaBytes = typeof estimate?.quota === "number" ? estimate.quota : null;
    } catch (error) {
      console.warn("Estimasi storage browser tidak tersedia.", error);
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
      setNotice("Bookmark dan riwayat berhasil diekspor.");
    } catch (error) {
      console.error("Data bookmark dan riwayat gagal diekspor.", error);
      setNotice("Ekspor gagal. Periksa izin penyimpanan browser.");
    }
  }

  async function importUserData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran file ekspor maksimal 5 MB.");
      const payload: unknown = JSON.parse(await file.text());
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("File JSON harus berisi objek ekspor Mikoroku.");
      }
      const data = payload as Record<string, unknown>;
      if (data.format !== "mikoroku-user-data" || data.version !== 1 ||
        !Array.isArray(data.bookmarks) || !Array.isArray(data.history)) {
        throw new Error("Format file bukan ekspor bookmark dan riwayat Mikoroku yang didukung.");
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
      setNotice(`${incomingBookmarks.length} bookmark dan ${incomingHistory.length} riwayat diproses; data digabung tanpa menghapus data lama.`);
      await refreshStorageReport();
    } catch (error) {
      console.error("Data bookmark dan riwayat gagal diimpor.", error);
      setNotice(error instanceof Error ? error.message : "Impor gagal. Pastikan file JSON valid.");
    } finally {
      if (importFileRef.current) importFileRef.current.value = "";
    }
  }

  async function clearFirestoreCache() {
    if (!window.confirm("Hapus cache offline Firestore di browser ini? Halaman akan dimuat ulang setelah cache dibersihkan.")) return;
    setStorageBusy(true);
    setNotice("Menghapus cache offline Firestore...");
    try {
      await clearFirestoreOfflineCache();
      setNotice("Cache Firestore dihapus. Halaman dimuat ulang...");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error("Cache offline Firestore gagal dihapus.", error);
      setNotice("Cache Firestore gagal dihapus. Tutup tab Mikoroku lain; halaman akan dimuat ulang agar Firestore aktif kembali.");
      setStorageBusy(false);
      window.setTimeout(() => window.location.reload(), 2500);
    }
  }

  async function clearLocalCaches() {
    if (!window.confirm("Hapus cache aplikasi dari localStorage? Bookmark, riwayat, dan preferensi tidak ikut terhapus.")) return;
    try {
      const removed = clearLocalAppCaches();
      setNotice(`${removed} cache aplikasi dihapus. Bookmark, riwayat, dan preferensi tetap tersimpan.`);
      await refreshStorageReport();
    } catch (error) {
      console.error("Cache aplikasi localStorage gagal dibersihkan.", error);
      setNotice("Cache localStorage gagal dibersihkan.");
    }
  }

  async function clearImageCache() {
    if (!window.confirm("Hapus cache gambar cover yang tersimpan di browser?")) return;
    setStorageBusy(true);
    try {
      await clearCoverImageCache();
      setNotice("Cache gambar cover berhasil dihapus.");
      await refreshStorageReport();
    } catch (error) {
      console.error("Cache gambar cover gagal dibersihkan.", error);
      setNotice("Cache gambar cover gagal dihapus.");
    } finally {
      setStorageBusy(false);
    }
  }

  function updateAppearance(key: GlobalAppearanceToggleSetting, value: boolean) {
    const updated = { ...settings, [key]: value };
    try {
      saveGlobalAppearance(updated);
      applyGlobalAppearance(updated);
      setSettings(updated);
      setNotice("Appearance settings saved.");
    } catch (error) {
      console.error("Preferensi appearance global gagal disimpan.", error);
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
      console.error("Preferensi appearance global gagal disimpan.", error);
      setNotice("Settings could not be saved. Check your browser storage permissions.");
    }
  }

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="min-h-[calc(100vh-56px)] bg-slate-100 px-4 py-8 text-slate-900 dark:bg-[#111216] dark:text-slate-100 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <header className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--mikoroku-accent)]">Mikoroku</p>
            <h1 className="mt-2 text-3xl font-bold">Global Settings</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Atur elemen tampilan katalog untuk perangkat dan browser ini.</p>
          </header>

          <section className="rounded-3xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-[#191a20] sm:p-6" aria-labelledby="appearance-heading">
            <div className="mb-4">
              <h2 id="appearance-heading" className="text-lg font-bold">Appearance</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pilih elemen katalog yang ingin disembunyikan.</p>
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
            <div className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Custom accent color</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Pilih warna aksen untuk highlight tampilan Mikoroku.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Custom accent color"
                  value={settings.accentColor || "#9d1018"}
                  onChange={(event) => updateAccentColor(event.currentTarget.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent p-1 accent-[var(--mikoroku-accent)] dark:border-white/15"
                />
                <span className="min-w-16 font-mono text-xs uppercase text-slate-600 dark:text-slate-300">{settings.accentColor || "Default"}</span>
                <button
                  type="button"
                  onClick={() => updateAccentColor(null)}
                  disabled={settings.accentColor === null}
                  className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold transition hover:border-[var(--mikoroku-accent)] dark:border-white/15"
                >
                  Reset
                </button>
              </div>
            </div>
            <p className="mt-3 min-h-5 text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">{notice}</p>
          </section>

          <section className="mt-5 rounded-3xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-[#191a20] sm:p-6" aria-labelledby="storage-heading">
            <div className="mb-4">
              <h2 id="storage-heading" className="text-lg font-bold">Data &amp; storage tools</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Periksa dan kelola cache lokal browser. Cache offline Firestore mencakup data chapter; bookmark, riwayat, dan preferensi tidak ikut terhapus saat membersihkan cache aplikasi.</p>
            </div>

            <div className="mb-5 grid gap-3 rounded-2xl bg-black/[0.03] p-4 text-sm dark:bg-white/[0.04] sm:grid-cols-2">
              <p>localStorage: <strong>{formatBytes(storageReport?.localStorageBytes ?? null)}</strong></p>
              <p>Cache daftar chapter: <strong>{formatBytes(storageReport?.chapterCacheBytes ?? null)}</strong></p>
              <p>Cache gambar cover: <strong>{formatBytes(storageReport?.coverImageCacheBytes ?? null)}</strong></p>
              <p>Seluruh storage origin (termasuk Firestore): <strong>{formatBytes(storageReport?.originUsageBytes ?? null)}</strong>
                {storageReport?.originQuotaBytes != null && <> / {formatBytes(storageReport.originQuotaBytes)}</>}
              </p>
              <button
                type="button"
                onClick={() => void refreshStorageReport()}
                className="w-fit rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold transition hover:border-[var(--mikoroku-accent)] dark:border-white/15"
              >
                Hitung ulang ukuran
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={storageBusy} onClick={() => void clearFirestoreCache()} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left text-sm font-semibold transition hover:bg-amber-500/20 disabled:opacity-50">
                Clear Firestore offline &amp; chapter cache
                <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-400">Menghapus data offline termasuk dokumen chapter. Tab Mikoroku lain mungkin perlu ditutup.</span>
              </button>
              <button type="button" disabled={storageBusy} onClick={() => void clearLocalCaches()} className="rounded-xl border border-black/10 p-3 text-left text-sm font-semibold transition hover:border-[var(--mikoroku-accent)] disabled:opacity-50 dark:border-white/10">
                Clear local app caches
                <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-400">Bersihkan cache katalog, detail, dan daftar chapter; data akun lokal tetap disimpan.</span>
              </button>
              <button type="button" disabled={storageBusy} onClick={() => void clearImageCache()} className="rounded-xl border border-black/10 p-3 text-left text-sm font-semibold transition hover:border-[var(--mikoroku-accent)] disabled:opacity-50 dark:border-white/10">
                Clear cached cover images
                <span className="mt-1 block text-xs font-normal text-slate-600 dark:text-slate-400">Menghapus cache gambar cover lokal. Gambar akan diunduh kembali saat diperlukan.</span>
              </button>
              <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                <p className="text-sm font-semibold">Bookmark &amp; reading history</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Impor akan menggabungkan data dan mempertahankan item lokal yang ada.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={exportUserData} className="rounded-lg bg-[var(--mikoroku-accent)] px-3 py-2 text-xs font-semibold text-white">Export JSON</button>
                  <button type="button" onClick={() => importFileRef.current?.click()} className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold dark:border-white/15">Import JSON</button>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => void importUserData(event.currentTarget.files?.[0])}
                  />
                </div>
              </div>
            </div>
            <p className="mt-4 min-h-5 text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">{notice}</p>
          </section>

          <section className="mt-5 rounded-3xl border border-dashed border-black/15 bg-white/50 p-4 dark:border-white/15 dark:bg-white/[0.02] sm:p-6" aria-labelledby="upcoming-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="upcoming-heading" className="text-lg font-bold">More appearance options</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pilih tampilan kartu manga di katalog.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Manga card display">
              {([
                ["default", "Default", "Tampilan standar."],
                ["list", "List", "Empat kolom di desktop, dengan cover, judul, badge, dan tiga chapter terbaru."],
              ] as const).map(([value, title, description]) => {
                const selected = settings.cardDisplay === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const updated = { ...settings, cardDisplay: value };
                      try {
                        saveGlobalAppearance(updated);
                        applyGlobalAppearance(updated);
                        setSettings(updated);
                        setNotice("Appearance settings saved.");
                      } catch (error) {
                        console.error("Preferensi appearance global gagal disimpan.", error);
                        setNotice("Settings could not be saved. Check your browser storage permissions.");
                      }
                    }}
                    className={`rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent)] ${selected ? "border-[var(--mikoroku-accent)] text-[var(--mikoroku-accent)]" : "border-black/10 bg-white/60 hover:border-[var(--mikoroku-accent)] dark:border-white/10 dark:bg-white/[0.03]"}`}
                  >
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-1 block text-xs text-slate-600 dark:text-slate-400">{description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
