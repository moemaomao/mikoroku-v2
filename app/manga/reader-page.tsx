"use client";

import JSZip from "jszip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommunityWidgets from "../community-widgets";
import SiteChrome from "../site-chrome";
import { isNovelSeries } from "../../lib/reader-kind";
import "./reader.css";

type ReaderKind = "manga" | "novel";
type ChapterRecord = {
  num?: string | number;
  title?: string;
  label?: string;
  images?: unknown;
  pages?: unknown;
  content?: unknown;
  text?: unknown;
  html?: unknown;
  isNovel?: boolean;
  source?: string;
  order?: number;
};

type ReaderData = {
  kind: ReaderKind;
  title: string;
  chapterTitle: string;
  images: string[];
  text: string;
  chapters: string[];
  chapter: string;
};

const firestoreBase = "https://firestore.googleapis.com/v1/projects/mikoroku/databases/(default)/documents";
const mangaReportTypes = [
  { value: "Chapter Tidak Muncul", label: "Chapter Not Showing" },
  { value: "Chapter Acak", label: "Wrong Chapter Order" },
  { value: "Chapter Double", label: "Duplicate Chapter" },
  { value: "Typo", label: "Typo" },
  { value: "Gambar Rusak", label: "Broken Images" },
  { value: "Gambar Tidak Lengkap", label: "Missing Pages" },
  { value: "Urutan Halaman Salah", label: "Wrong Page Order" },
  { value: "Terjemahan Salah", label: "Incorrect Translation" },
  { value: "Lainnya", label: "Other" },
];
const novelReportTypes = [
  { value: "Chapter Error", label: "Chapter Error" },
  { value: "Tidak Bisa Dibuka", label: "Cannot Open" },
  { value: "Konten Rusak", label: "Corrupted Content" },
  { value: "Terjemahan Salah", label: "Incorrect Translation" },
  { value: "Lainnya", label: "Other" },
];

function decodeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if ("stringValue" in record) return record.stringValue;
  if ("integerValue" in record) return Number(record.integerValue);
  if ("doubleValue" in record) return Number(record.doubleValue);
  if ("booleanValue" in record) return record.booleanValue;
  if ("timestampValue" in record) return record.timestampValue;
  if ("nullValue" in record) return null;
  if ("arrayValue" in record) {
    const array = record.arrayValue as { values?: unknown[] } | undefined;
    return (array?.values || []).map(decodeFirestoreValue);
  }
  if ("mapValue" in record) {
    const map = record.mapValue as { fields?: Record<string, unknown> } | undefined;
    return Object.fromEntries(Object.entries(map?.fields || {}).map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return record;
}

function decodeDocument(document: { fields?: Record<string, unknown> }): Record<string, unknown> {
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function imageList(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.flatMap((value) => {
      if (typeof value === "string") return [value];
      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        const url = record.url || record.src;
        return typeof url === "string" ? [url] : [];
      }
      return [];
    }).filter((url) => /^https?:\/\//i.test(url));
  }
  if (typeof input !== "string") return [];
  const htmlImages = [...input.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
  if (htmlImages.length) return htmlImages.filter((url) => /^https?:\/\//i.test(url));
  if (/^https?:\/\//i.test(input.trim())) return [input.trim()];
  return input.match(/https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|gif|webp|bmp)(?:\?[^\s"'<>]*)?/gi) || [];
}

function novelText(value: unknown): string {
  if (typeof value !== "string") return "";
  const parsed = new DOMParser().parseFromString(value, "text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed").forEach((element) => element.remove());
  parsed.querySelectorAll("br").forEach((element) => element.replaceWith("\n"));
  parsed.querySelectorAll("p,div,li,h1,h2,h3").forEach((element) => {
    element.append("\n\n");
  });
  return parsed.body.textContent?.replace(/\n{3,}/g, "\n\n").trim() || value.trim();
}

function chapterValue(value: string | number): number {
  return Number.parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
}

function imageWithQuality(url: string, quality: number): string {
  if (/blogger\.googleusercontent\.com|lh3\.googleusercontent\.com/i.test(url)) {
    return url.replace(/\/s\d+(-c)?\//, `/s${quality}/`);
  }
  return url;
}

function getCurrentChapterCache(slug: string): ChapterRecord | null {
  try {
    const value = JSON.parse(localStorage.getItem("currentChapter") || "null") as (ChapterRecord & { slug?: string }) | null;
    return value && (!value.slug || value.slug === slug) ? value : null;
  } catch (error) {
    console.warn("Stored chapter data is invalid.", error);
    return null;
  }
}

function getCachedChapters(slug: string): ChapterRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "[]") as unknown;
    if (Array.isArray(value)) return value as ChapterRecord[];
    if (value && typeof value === "object") {
      const data = (value as { data?: unknown }).data;
      return Array.isArray(data) ? data as ChapterRecord[] : [];
    }
  } catch (error) {
    console.warn("Stored chapter list is invalid.", error);
  }
  return [];
}

async function getFirestoreDocument(path: string, signal: AbortSignal): Promise<Record<string, unknown> | null> {
  let restError: unknown;
  try {
    const response = await fetch(`${firestoreBase}/${path}`, { signal });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Firestore REST returned HTTP ${response.status}.`);
    return decodeDocument(await response.json());
  } catch (error) {
    if (signal.aborted) throw error;
    restError = error;
    console.warn("Firestore REST failed in the reader; trying Firebase SDK.", error);
  }

  try {
    await waitForReaderFirestore(signal);
    if (!window.firestore || !window.fs?.doc || !window.fs.getDoc) {
      throw new Error("Firebase Firestore SDK is unavailable.");
    }
    const reference = window.fs.doc(window.firestore, ...path.split("/"));
    const snapshot = await window.fs.getDoc(reference);
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      `Firestore failed to load the document: ${error instanceof Error ? error.message : String(error)}`,
      { cause: restError },
    );
  }
}

async function waitForReaderFirestore(signal: AbortSignal): Promise<void> {
  if (window.firestore && window.fs?.doc && window.fs.getDoc) return;
  const sdkUrl = new URL("/firebase.js", window.location.href).href;
  let script = [...document.scripts].find((item) => item.src === sdkUrl);
  if (!script) {
    script = document.createElement("script");
    script.type = "module";
    script.src = sdkUrl;
    document.head.appendChild(script);
  }

  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      signal.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve();
    };
    const timeout = window.setTimeout(
      () => finish(new Error("Timed out while initializing Firestore.")),
      15000,
    );
    const interval = window.setInterval(() => {
      if (window.firestore && window.fs?.doc && window.fs.getDoc) finish();
    }, 100);
    const onAbort = () => finish(new DOMException("Firestore request was cancelled.", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    script?.addEventListener("error", () => finish(new Error("Failed to load Firebase Firestore.")), { once: true });
  });
}

async function getFirestoreChapters(
  slug: string,
  signal: AbortSignal,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  await waitForReaderFirestore(signal);
  if (!window.firestore || !window.fs?.collection || !window.fs.getDocs) {
    throw new Error("The Firebase Firestore chapter-list API is unavailable.");
  }
  const reference = window.fs.collection(window.firestore, "manga", slug, "chapters");
  const snapshot = await window.fs.getDocs(reference);
  const documents: Array<{ id: string; data: Record<string, unknown> }> = [];
  snapshot.forEach((document) => documents.push({ id: document.id, data: document.data() }));
  return documents;
}

async function loadReaderData(
  slug: string,
  chapter: string,
  kind: ReaderKind,
  signal: AbortSignal,
): Promise<ReaderData> {
  const cachedCurrent = getCurrentChapterCache(slug);
  const cachedChapters = getCachedChapters(slug);
  const targetChapter = chapter || String(cachedCurrent?.num || "1");
  let manga: Record<string, unknown> | null = null;
  let chapterData: Record<string, unknown> | null = null;

  const cachedMatch = cachedChapters.find((item) => String(item.num) === targetChapter);
  if (cachedMatch) chapterData = cachedMatch as Record<string, unknown>;
  if (cachedCurrent && String(cachedCurrent.num) === targetChapter) {
    chapterData = { ...(chapterData || {}), ...cachedCurrent };
  }

  try {
    manga = await getFirestoreDocument(`manga/${encodeURIComponent(slug)}`, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    if (!chapterData) throw error;
    console.warn("Series info could not be loaded; using the cached chapter.", error);
  }

  let resolvedKind: ReaderKind = isNovelSeries(manga) || cachedCurrent?.isNovel ? "novel" : kind;
  if (resolvedKind !== kind) {
    return {
      kind: resolvedKind,
      title: String(manga?.title || manga?.name || cachedCurrent?.title || slug.replace(/-/g, " ")),
      chapterTitle: `Chapter ${targetChapter}`,
      images: [],
      text: "",
      chapters: [targetChapter],
      chapter: targetChapter,
    };
  }
  const cachedContent = chapterData?.content || chapterData?.text || chapterData?.html;
  if (resolvedKind === "manga" && !imageList(chapterData?.images || chapterData?.pages).length) {
    try {
      chapterData = await getFirestoreDocument(
        `manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(targetChapter)}`,
        signal,
      ) || chapterData;
    } catch (error) {
      if (signal.aborted) throw error;
      if (!chapterData) throw error;
      console.warn("Firestore chapter could not be loaded; using the cached chapter.", error);
    }
  } else if (resolvedKind === "novel" &&
    (typeof cachedContent !== "string" || !cachedContent.trim())) {
    chapterData = await getFirestoreDocument(
      `manga/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(targetChapter)}`,
      signal,
    ) || chapterData;
  }

  if (!chapterData) {
    const map = manga?.chapters;
    if (map && typeof map === "object") {
      const fromMap = (map as Record<string, unknown>)[targetChapter];
      if (fromMap && typeof fromMap === "object") chapterData = fromMap as Record<string, unknown>;
      else if (typeof fromMap === "string") chapterData = { content: fromMap };
    }
  }

  let chapters = cachedChapters.map((item) => String(item.num ?? item.order ?? "")).filter(Boolean);
  if (!chapters.length) {
    try {
      const response = await fetch(
        `${firestoreBase}/manga/${encodeURIComponent(slug)}/chapters?pageSize=1000`,
        { signal },
      );
      if (response.ok) {
        const result = await response.json() as { documents?: Array<{ name?: string; fields?: Record<string, unknown> }> };
        const documents = (result.documents || []).map((document) => ({
          id: document.name?.split("/").at(-1) || "",
          data: decodeDocument(document),
        }));
        chapters = documents.map(({ id, data }) => String(data.num ?? data.order ?? id)).filter(Boolean);
        const current = documents.find(({ id, data }) =>
          id === targetChapter ||
          String(data.num ?? "") === targetChapter ||
          String(data.order ?? "") === targetChapter,
        );
        if (!chapterData && current) chapterData = current.data;
        if (!documents.length) throw new Error("The Firestore REST chapter list is empty.");
      } else {
        throw new Error(`The chapter list returned HTTP ${response.status}.`);
      }
    } catch (error) {
      if (signal.aborted) throw error;
      try {
        const documents = await getFirestoreChapters(slug, signal);
        chapters = documents.map(({ id, data }) => String(data.num ?? data.order ?? id)).filter(Boolean);
        const current = documents.find(({ id, data }) =>
          id === targetChapter ||
          String(data.num ?? "") === targetChapter ||
          String(data.order ?? "") === targetChapter,
        );
        if (!chapterData && current) chapterData = current.data;
        if (!chapters.length && !chapterData) throw new Error("Firestore has no readable chapters.");
      } catch (sdkError) {
        if (signal.aborted) throw sdkError;
        if (!chapterData) {
          throw new Error(
            `The chapter list failed to load through REST and Firebase SDK: ${
              sdkError instanceof Error ? sdkError.message : String(sdkError)
            }`,
            { cause: error },
          );
        }
        console.warn("The chapter list failed through REST and Firebase SDK; using the available chapter.", sdkError);
      }
    }
  }
  if (!chapters.includes(targetChapter)) chapters.push(targetChapter);
  chapters = [...new Set(chapters)].sort((a, b) => chapterValue(a) - chapterValue(b));

  if (!chapterData) {
    const map = manga?.chapters;
    if (map && typeof map === "object") {
      const fromMap = (map as Record<string, unknown>)[targetChapter];
      if (fromMap && typeof fromMap === "object") chapterData = fromMap as Record<string, unknown>;
      else if (typeof fromMap === "string") chapterData = { content: fromMap };
    }
  }

  const title = String(manga?.title || manga?.name || cachedCurrent?.title || slug.replace(/-/g, " "));
  const content = chapterData?.content || chapterData?.text || chapterData?.html ||
    (typeof chapterData?.data === "object" && chapterData.data
      ? (chapterData.data as Record<string, unknown>).content
      : "");
  const rawImages = chapterData?.images || chapterData?.pages;
  const images = [...new Set([...imageList(rawImages), ...imageList(content)])];
  const text = novelText(content);
  if (resolvedKind === "manga" && !images.length && text) resolvedKind = "novel";
  if (!chapterData) throw new Error(`Chapter ${targetChapter} tidak ditemukan.`);
  if (resolvedKind === "manga" && !images.length) throw new Error(`No images found for chapter ${targetChapter}.`);
  if (resolvedKind === "novel" && !text) throw new Error(`Chapter ${targetChapter} has no text content.`);

  return {
    kind: resolvedKind,
    title,
    chapterTitle: String(chapterData.label || chapterData.chapterTitle || chapterData.title || `Chapter ${targetChapter}`),
    images,
    text,
    chapters,
    chapter: targetChapter,
  };
}

export default function ReaderPage({
  slug,
  chapter,
  kind,
  preferStoredChapter = false,
}: {
  slug: string;
  chapter?: string;
  kind: ReaderKind;
  preferStoredChapter?: boolean;
}) {
  const [data, setData] = useState<ReaderData | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<"long-strip" | "single">("long-strip");
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("Georgia, serif");
  const [columnWidth, setColumnWidth] = useState<"narrow" | "medium" | "wide">("medium");
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(50);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [readerNotice, setReaderNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chapterListOpen, setChapterListOpen] = useState(false);
  const [bottomChapterListOpen, setBottomChapterListOpen] = useState(false);
  const bottomChaptersRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!bottomChapterListOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = bottomChaptersRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setBottomChapterListOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [bottomChapterListOpen]);

  const [dataSaver, setDataSaver] = useState(false);
  const [imageQuality, setImageQuality] = useState(600);
  const [readerProgress, setReaderProgress] = useState(0);
  const activeKind = data?.kind || kind;

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (activeKind === "manga") {
      setMode(localStorage.getItem("readerMode") === "page" ? "single" : "long-strip");
      return;
    }
    const storedFontSize = Number(localStorage.getItem("novelFontSize"));
    if (storedFontSize >= 14 && storedFontSize <= 28) setFontSize(storedFontSize);
    setFontFamily(localStorage.getItem("novelFontFamily") || "Georgia, serif");
    const storedColumn = localStorage.getItem("novelColumn");
    if (storedColumn === "narrow" || storedColumn === "medium" || storedColumn === "wide") {
      setColumnWidth(storedColumn);
    }
    const storedSpeed = Number(localStorage.getItem("novelAutoScrollSpeed"));
    if (storedSpeed >= 10 && storedSpeed <= 100) setAutoScrollSpeed(storedSpeed);
  }, [activeKind]);

  useEffect(() => {
    const controller = new AbortController();
    let targetChapter = chapter || "";
    if (preferStoredChapter || !targetChapter) {
      const cached = getCurrentChapterCache(slug);
      if (cached?.num) targetChapter = String(cached.num);
    }
    setData(null);
    setError("");
    loadReaderData(slug, targetChapter, kind, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.kind !== kind) {
          const route = result.kind === "novel" ? "/read" : "/reader";
          window.location.replace(`${route}/${encodeURIComponent(slug)}/${encodeURIComponent(result.chapter)}`);
          return;
        }
        setData(result);
        setPage(1);
        localStorage.setItem("currentChapter", JSON.stringify({
          ...getCurrentChapterCache(slug),
          slug,
          num: result.chapter,
          title: result.title,
          label: result.chapterTitle,
          images: result.images,
          source: "firestore",
        }));
        localStorage.setItem(`read_${result.title}`, JSON.stringify([
          ...new Set([
            ...(() => {
              try {
                const saved = JSON.parse(localStorage.getItem(`read_${result.title}`) || "[]") as string[];
                return Array.isArray(saved) ? saved : [];
              } catch { return []; }
            })(),
            result.chapter,
          ]),
        ]));
        document.title = `${result.chapterTitle} - ${result.title} | Mikoroku`;
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Reader failed to load the chapter.", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load chapter.");
      });
    return () => controller.abort();
  }, [chapter, kind, preferStoredChapter, slug]);

  const chapterIndex = useMemo(
    () => data?.chapters.indexOf(data.chapter) ?? -1,
    [data],
  );

  const changeChapter = useCallback((target: string) => {
    const path = activeKind === "novel" ? "/read" : "/reader";
    window.location.href = `${path}/${encodeURIComponent(slug)}/${encodeURIComponent(target)}`;
  }, [activeKind, slug]);

  function toggleMode() {
    const nextMode = mode === "long-strip" ? "single" : "long-strip";
    setMode(nextMode);
    localStorage.setItem("readerMode", nextMode === "single" ? "page" : "webtoon");
    setPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!data || kind !== "manga") return;
    const start = mode === "single" ? page : 1;
    data.images.slice(start, start + 4).forEach((src) => {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
    });
  }, [data, kind, mode, page]);

  useEffect(() => {
    if (!data || kind !== "manga" || mode !== "long-strip") return;
    const images = [...document.querySelectorAll<HTMLImageElement>(".reader-images.long-strip img")];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
      if (!visible) return;
      const index = images.indexOf(visible.target as HTMLImageElement);
      if (index >= 0) setPage(index + 1);
    }, { rootMargin: "-40% 0px -40% 0px" });
    images.forEach((image) => observer.observe(image));
    return () => observer.disconnect();
  }, [data, kind, mode]);

  useEffect(() => {
    if (!data || kind !== "manga" || mode !== "single") return;
    const imageCount = data.images.length;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft" && page > 1) {
        event.preventDefault();
        setPage((current) => Math.max(1, current - 1));
      } else if (event.key === "ArrowRight" && page < imageCount) {
        event.preventDefault();
        setPage((current) => Math.min(imageCount, current + 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [data, kind, mode, page]);

  useEffect(() => {
    setDataSaver(localStorage.getItem("dataSaver") === "true");
    const savedQuality = Number(localStorage.getItem("imageQuality"));
    if ([600, 700, 800, 900, 1000, 1100, 1200].includes(savedQuality)) setImageQuality(savedQuality);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setChapterListOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  useEffect(() => {
    if (!data) return;
    const scrollKey = `scrollPos_${slug}_${data.chapter}`;
    const savedPosition = Number(localStorage.getItem(scrollKey));
    if (savedPosition > 0 && mode === "long-strip") {
      window.setTimeout(() => window.scrollTo({ top: savedPosition }), 120);
    }
    let saveTimer = 0;
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setReaderProgress(scrollable > 0 ? Math.min(100, Math.round((window.scrollY / scrollable) * 100)) : 0);
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        localStorage.setItem(scrollKey, String(window.scrollY));
      }, 250);
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    return () => {
      window.clearTimeout(saveTimer);
      window.removeEventListener("scroll", updateProgress);
    };
  }, [data, mode, slug]);

  useEffect(() => {
    if (!autoScrolling || kind !== "novel") return;
    const timer = window.setInterval(() => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setAutoScrolling(false);
        return;
      }
      window.scrollBy(0, 1);
    }, 101 - autoScrollSpeed);
    return () => window.clearInterval(timer);
  }, [autoScrollSpeed, autoScrolling, kind]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  function updateFontSize(value: number) {
    setFontSize(value);
    localStorage.setItem("novelFontSize", String(value));
  }

  function updateFontFamily(value: string) {
    setFontFamily(value);
    localStorage.setItem("novelFontFamily", value);
  }

  function updateColumnWidth(value: "narrow" | "medium" | "wide") {
    setColumnWidth(value);
    localStorage.setItem("novelColumn", value);
  }

  function updateAutoScrollSpeed(value: number) {
    setAutoScrollSpeed(value);
    localStorage.setItem("novelAutoScrollSpeed", String(value));
  }

  function toggleSpeech() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!data || !("speechSynthesis" in window)) {
      setReaderNotice("Text-to-speech is not available in this browser.");
      return;
    }
    setReaderNotice("");
    const utterance = new SpeechSynthesisUtterance(data.text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  async function sendReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !reportType) {
      setReportMessage("Please select a report type.");
      return;
    }
    if (!window.fs?.collection || !window.fs.addDoc || !window.fs.serverTimestamp || !window.firestore) {
      setReportMessage("The report service is unavailable. Reload the page and try again.");
      return;
    }
    setSendingReport(true);
    setReportMessage("");
    try {
      await window.fs.addDoc(window.fs.collection(window.firestore, "chapterReports"), {
        chapter: data.chapter,
        slug,
        url: window.location.href,
        type: reportType,
        reason: reportReason.trim() || "-",
        status: "pending",
        createdAt: window.fs.serverTimestamp(),
      });
      setReportMessage("Report submitted successfully.");
      setReportType("");
      setReportReason("");
      window.setTimeout(() => setReportOpen(false), 900);
    } catch (reportError) {
      console.error("Failed to submit chapter report.", reportError);
      setReportMessage(reportError instanceof Error ? reportError.message : "Failed to submit report.");
    } finally {
      setSendingReport(false);
    }
  }

  async function downloadChapter() {
    if (!data || !data.images.length || downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus(`Downloading 0/${data.images.length} images...`);
    const archive = new JSZip();
    let succeeded = 0;
    let failed = 0;

    try {
      for (const [index, imageUrl] of data.images.entries()) {
        let imageBlob: Blob | undefined;
        const candidates = [
          imageUrl,
          `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&n=-1`,
        ];
        for (const candidate of candidates) {
          for (let attempt = 0; attempt < 2 && !imageBlob; attempt += 1) {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 40000);
            try {
              const response = await fetch(candidate, {
                mode: "cors",
                credentials: "omit",
                cache: "no-store",
                signal: controller.signal,
                referrerPolicy: "no-referrer",
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const blob = await response.blob();
              if (blob.size < 100) throw new Error("Image is empty or invalid.");
              imageBlob = blob;
            } catch (downloadError) {
              if (attempt === 1 && candidate === candidates[candidates.length - 1]) {
                console.warn(`Failed to download page ${index + 1}.`, downloadError);
              }
              if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 500));
            } finally {
              window.clearTimeout(timeout);
            }
          }
          if (imageBlob) break;
        }
        if (imageBlob) {
          let extension = imageBlob.type.split("/")[1]?.replace("jpeg", "jpg") || "";
          if (!/^[a-z0-9]{2,5}$/i.test(extension)) {
            extension = new URL(imageUrl).pathname.split(".").pop()?.match(/^[a-z0-9]{2,5}$/i)?.[0] || "jpg";
          }
          archive.file(`${String(index + 1).padStart(3, "0")}.${extension}`, imageBlob);
          succeeded += 1;
        } else {
          failed += 1;
        }
        setDownloadStatus(`Downloading ${index + 1}/${data.images.length} images · ${succeeded} succeeded`);
        setDownloadProgress(Math.round(((index + 1) / data.images.length) * 100));
      }

      if (!succeeded) throw new Error("No images could be downloaded. Check your connection and try again.");
      const zipBlob = await archive.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      const safeName = `${data.title} - ${data.chapterTitle}`.replace(/[\\/:*?"<>|]/g, "").trim();
      anchor.href = objectUrl;
      anchor.download = `${safeName || "Chapter"}.zip`;
      anchor.click();
      setDownloadProgress(100);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 20000);
      setDownloadStatus(failed ? `ZIP ready · ${succeeded} succeeded, ${failed} failed` : `ZIP ready · ${succeeded} images`);
    } catch (downloadError) {
      console.error("Chapter download failed.", downloadError);
      setDownloadStatus(downloadError instanceof Error ? downloadError.message : "Chapter download failed.");
    } finally {
      setDownloading(false);
    }
  }

  function goToPage(targetPage: number) {
    if (!data || targetPage < 1 || targetPage > data.images.length) return;
    setPage(targetPage);
    if (mode === "long-strip") {
      document.querySelectorAll(".reader-images.long-strip img")[targetPage - 1]
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function toggleDataSaver() {
    setDataSaver((current) => {
      localStorage.setItem("dataSaver", String(!current));
      return !current;
    });
  }

  function updateImageQuality(value: number) {
    setImageQuality(value);
    localStorage.setItem("imageQuality", String(value));
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector(".reader-page")?.requestFullscreen();
    } catch (fullscreenError) {
      console.error("Failed to enter fullscreen mode.", fullscreenError);
      setReaderNotice("Fullscreen is not supported in this browser.");
    }
  }

  function handleImageError(event: React.SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    if (image.dataset.fallbackTried) {
      image.classList.add("reader-image-failed");
      return;
    }
    image.dataset.fallbackTried = "true";
    image.src = `https://images.weserv.nl/?url=${encodeURIComponent(image.src)}&n=-1`;
  }

  return (
    <>
      <SiteChrome showChrome showFooter={false} />
      <main className={`reader-page ${activeKind === "novel" ? "novel-reader" : "manga-reader"}`}>
      <header className="reader-toolbar">
        <div className="reader-heading-row">
          <a className="reader-home-link" href={`/series/${encodeURIComponent(slug)}`} aria-label="Back to series details" title="Back to series details">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
            </svg>
          </a>
          <div className="reader-title-block">
            <span className="reader-kind-label">{activeKind === "novel" ? "Novel Reader" : "Manga Reader"}</span>
            <strong>{data ? data.title : "Loading series..."}</strong>
            <span>{data ? data.chapterTitle : `Chapter ${chapter || ""}`}</span>
          </div>
          <span className="reader-header-actions">
            <button className="reader-icon-button reader-fullscreen-button" type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              <i className={`fas ${isFullscreen ? "fa-compress" : "fa-expand"}`} aria-hidden="true" />
            </button>
          </span>
        </div>
      </header>
      <div className="reader-progress-track" aria-hidden="true"><span style={{ width: `${readerProgress}%` }} /></div>
      {downloadStatus && <div className="reader-download-status" role="status">
        <div><i className={`fas ${downloading ? "fa-cloud-arrow-down" : "fa-circle-check"}`} aria-hidden="true" /><span>{downloadStatus}</span><strong>{downloadProgress}%</strong></div>
        <span className="reader-download-progress"><span style={{ width: `${downloadProgress}%` }} /></span>
      </div>}
      {readerNotice && <p className="reader-feedback" role="status">{readerNotice}</p>}

      {error ? <section className="reader-message" role="alert"><h1>Unable to load chapter</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></section>
        : !data ? <p className="reader-message" role="status">Loading chapter...</p>
        : activeKind === "manga" ? (
          <section className={`reader-images ${mode}`}>
            {mode === "long-strip" ? data.images.map((image, index) => (
              <img key={`${image}:${index}`} src={imageWithQuality(image, dataSaver ? imageQuality : 0)} alt={`Page ${index + 1}`} loading={dataSaver && index > 0 ? "lazy" : index < 2 ? "eager" : "lazy"} onError={handleImageError} />
            )) : (
              <>
                <div className="reader-single-page-frame">
                  <img src={imageWithQuality(data.images[page - 1], dataSaver ? imageQuality : 0)} alt={`Page ${page}`} onError={handleImageError} />
                  <button className="reader-image-nav reader-image-nav-previous" type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)} aria-label="Previous page" title="Previous page">
                    <i className="fas fa-chevron-left" aria-hidden="true" />
                  </button>
                  <button className="reader-image-nav reader-image-nav-next" type="button" disabled={page >= data.images.length} onClick={() => goToPage(page + 1)} aria-label="Next page" title="Next page">
                    <i className="fas fa-chevron-right" aria-hidden="true" />
                  </button>
                </div>
                <div className="reader-page-navigation"><span>Page {page} / {data.images.length}</span></div>
              </>
            )}
          </section>
        ) : (
          <article className={`reader-novel-text novel-column-${columnWidth}`} style={{ fontSize: `${fontSize}px`, fontFamily }}>
            {data.text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {data.images.map((image, index) => <img key={`${image}:${index}`} src={image} alt={`Illustration ${index + 1}`} loading="lazy" onError={handleImageError} />)}
          </article>
        )}

      {data && <nav className="reader-bottom-nav" aria-label="Chapter navigation">
        <button className="reader-bottom-button reader-bottom-previous" type="button" onClick={() => chapterIndex > 0 && changeChapter(data.chapters[chapterIndex - 1])} disabled={chapterIndex <= 0}>
          <i className="fas fa-arrow-left" aria-hidden="true" /><span><small>Previous chapter</small><strong>{chapterIndex > 0 ? `Chapter ${data.chapters[chapterIndex - 1]}` : "Unavailable"}</strong></span>
        </button>
        <div className="reader-bottom-chapters" ref={bottomChaptersRef}>
          <button className={`reader-bottom-button reader-bottom-list ${bottomChapterListOpen ? "is-active" : ""}`} type="button" onClick={() => setBottomChapterListOpen((open) => !open)} aria-expanded={bottomChapterListOpen}>
            <i className="fas fa-list" aria-hidden="true" /><span><small>Browse</small><strong>Chapter list</strong></span><i className={`fas ${bottomChapterListOpen ? "fa-chevron-up" : "fa-chevron-down"} reader-bottom-chevron`} aria-hidden="true" />
          </button>
          {bottomChapterListOpen && <div className="reader-bottom-chapter-menu" role="listbox" aria-label="Chapter list">
            <div className="reader-bottom-menu-heading"><strong>{data.chapters.length} chapters</strong><button type="button" onClick={() => setBottomChapterListOpen(false)} aria-label="Close chapter list">×</button></div>
            {[...data.chapters].reverse().map((item) => (
              <button type="button" role="option" aria-selected={item === data.chapter} key={item} className={item === data.chapter ? "is-current" : ""} onClick={() => changeChapter(item)}>
                <span>Chapter {item}</span>{item === data.chapter && <i className="fas fa-check" aria-hidden="true" />}
              </button>
            ))}
          </div>}
        </div>
        <button className="reader-bottom-button reader-bottom-next" type="button" onClick={() => chapterIndex < data.chapters.length - 1 && changeChapter(data.chapters[chapterIndex + 1])} disabled={chapterIndex >= data.chapters.length - 1}>
          <span><small>Next chapter</small><strong>{chapterIndex < data.chapters.length - 1 ? `Chapter ${data.chapters[chapterIndex + 1]}` : "Unavailable"}</strong></span><i className="fas fa-arrow-right" aria-hidden="true" />
        </button>
      </nav>}
      <div className="reader-floating-controls">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" title="Back to top"><i className="fas fa-arrow-up" aria-hidden="true" /></button>
        <button type="button" className={settingsOpen ? "is-active" : ""} onClick={() => {
          setSettingsOpen((open) => !open);
          setChapterListOpen(false);
        }} aria-label="Reader settings" aria-expanded={settingsOpen} title="Reader settings">
          <i className="fas fa-sliders" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setReportOpen(true)} aria-label="Report chapter" title="Report chapter"><i className="fas fa-flag" aria-hidden="true" /></button>
      </div>
      {settingsOpen && <div className="reader-settings-backdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setSettingsOpen(false);
          setChapterListOpen(false);
        }
      }}>
      <div className="reader-settings-panel" role="dialog" aria-label="Reader settings" aria-modal="true">
        <div className="reader-settings-heading">
          <div><span>READER</span><strong>Reading settings</strong></div>
          <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
        </div>
        {activeKind === "manga" ? <>
          <div className="reader-setting-row">
            <div><strong>Reading mode</strong><small>Choose how pages are displayed</small></div>
            <button type="button" className="reader-setting-action" onClick={toggleMode}>
              {mode === "long-strip" ? "Single page" : "Scroll"}
            </button>
          </div>
          <label className="reader-setting-block">
            <span><strong>Go to page</strong><small>{data ? `${page} of ${data.images.length}` : "Loading pages"}</small></span>
            <select aria-label="Select page" value={page} disabled={!data} onChange={(event) => goToPage(Number(event.target.value))}>
              {data?.images.map((_, index) => <option key={index + 1} value={index + 1}>Page {index + 1}</option>)}
            </select>
          </label>
          <label className="reader-setting-row">
            <div><strong>Data saver</strong><small>Reduce image quality</small></div>
            <input type="checkbox" checked={dataSaver} onChange={toggleDataSaver} />
          </label>
          {dataSaver && <label className="reader-setting-block">
            <span><strong>Image quality</strong><small>{imageQuality}px</small></span>
            <input type="range" min="600" max="1200" step="100" value={imageQuality} onChange={(event) => updateImageQuality(Number(event.target.value))} />
          </label>}
          <button type="button" className="reader-setting-row reader-setting-button" onClick={() => void downloadChapter()} disabled={!data || downloading}>
            <div><strong>{downloading ? "Downloading chapter..." : "Download chapter"}</strong><small>Save all pages as a ZIP file</small></div>
            <i className="fas fa-download" aria-hidden="true" />
          </button>
        </> : <>
          <label className="reader-setting-block">
            <span><strong>Font size</strong><small>{fontSize}px</small></span>
            <input type="range" min="14" max="28" value={fontSize} onChange={(event) => updateFontSize(Number(event.target.value))} />
          </label>
          <label className="reader-setting-block">
            <span><strong>Font family</strong></span>
            <select value={fontFamily} onChange={(event) => updateFontFamily(event.target.value)}>
              <option value="Georgia, serif">Classic (Georgia)</option>
              <option value="Lora, serif">Lora</option>
              <option value="Merriweather, serif">Merriweather</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Open Sans, sans-serif">Open Sans</option>
              <option value="Nunito, sans-serif">Nunito</option>
              <option value="Patrick Hand, cursive">Patrick Hand</option>
              <option value="Caveat, cursive">Caveat</option>
            </select>
          </label>
          <label className="reader-setting-block">
            <span><strong>Column width</strong></span>
            <select value={columnWidth} onChange={(event) => updateColumnWidth(event.target.value as "narrow" | "medium" | "wide")}>
              <option value="narrow">Narrow</option>
              <option value="medium">Medium</option>
              <option value="wide">Wide</option>
            </select>
          </label>
          <label className="reader-setting-block">
            <span><strong>Auto-scroll speed</strong><small>{autoScrollSpeed}</small></span>
            <input type="range" min="10" max="100" value={autoScrollSpeed} onChange={(event) => updateAutoScrollSpeed(Number(event.target.value))} />
          </label>
          <button type="button" className="reader-setting-row reader-setting-button" onClick={() => setAutoScrolling((active) => !active)}>
            <div><strong>{autoScrolling ? "Stop auto-scroll" : "Start auto-scroll"}</strong><small>Scroll through the text automatically</small></div>
            <i className={`fas ${autoScrolling ? "fa-pause" : "fa-play"}`} aria-hidden="true" />
          </button>
          <button type="button" className="reader-setting-row reader-setting-button" onClick={toggleSpeech}>
            <div><strong>{speaking ? "Stop text-to-speech" : "Text-to-speech"}</strong><small>Listen to the chapter</small></div>
            <i className={`fas ${speaking ? "fa-stop" : "fa-volume-high"}`} aria-hidden="true" />
          </button>
        </>}
        <div className="reader-settings-divider" />
        <button type="button" className="reader-setting-row reader-setting-button" onClick={() => setChapterListOpen((open) => !open)} disabled={!data} aria-expanded={chapterListOpen}>
          <div><strong>Chapter list</strong><small>{data ? `${data.chapters.length} chapters available` : "Loading chapter list"}</small></div>
          <i className={`fas ${chapterListOpen ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
        </button>
        {chapterListOpen && data && <div className="reader-settings-chapter-list">
          {[...data.chapters].reverse().map((item) => (
            <button type="button" key={item} className={item === data.chapter ? "is-current" : ""} onClick={() => changeChapter(item)}>
              <span>Chapter {item}</span>{item === data.chapter && <i className="fas fa-check" aria-hidden="true" />}
            </button>
          ))}
        </div>}
      </div>
      </div>}
      {data && <CommunityWidgets className="reader-community" pageId={`reader_${slug}_${data.chapter}`} />}
      {reportOpen && <div className="reader-report-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setReportOpen(false);
      }}>
        <form className="reader-report-dialog" role="dialog" aria-modal="true" aria-labelledby="reader-report-title" onSubmit={sendReport}>
          <h2 id="reader-report-title">Report chapter</h2>
          <p>Help us improve this chapter.</p>
          <div className="reader-report-types">
            {(activeKind === "manga" ? mangaReportTypes : novelReportTypes).map((type) => (
              <button key={type.value} type="button" className={reportType === type.value ? "active" : ""} onClick={() => setReportType(type.value)}>{type.label}</button>
            ))}
          </div>
          <label htmlFor="reader-report-reason">Additional details</label>
          <textarea id="reader-report-reason" placeholder="Describe the issue (optional)" value={reportReason} maxLength={1000} onChange={(event) => setReportReason(event.target.value)} />
          {reportMessage && <p role={reportMessage.includes("successfully") ? "status" : "alert"}>{reportMessage}</p>}
          <div className="reader-report-actions">
            <button type="button" onClick={() => setReportOpen(false)}>Cancel</button>
            <button type="submit" disabled={sendingReport}>{sendingReport ? "Submitting..." : "Submit report"}</button>
          </div>
        </form>
      </div>}
      </main>
      <SiteChrome showChrome={false} />
    </>
  );
}
