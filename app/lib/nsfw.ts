"use client";

import { useCallback, useSyncExternalStore } from "react";

export const NSFW_VISIBILITY_KEY = "mikoroku_show_nsfw_v1";
const NSFW_VISIBILITY_EVENT = "mikorokuNsfwVisibilityChange";
let cachedVisibility: boolean | null = null;

export function readNsfwVisibility(): boolean {
  try {
    cachedVisibility = window.localStorage.getItem(NSFW_VISIBILITY_KEY) === "true";
    return cachedVisibility;
  } catch (error) {
    console.warn("Preferensi tampilan NSFW tidak dapat dibaca.", error);
    return cachedVisibility ?? false;
  }
}

function subscribeToNsfwVisibility(onChange: () => void): () => void {
  const handleVisibilityChange = (event: Event) => {
    if (event instanceof CustomEvent && typeof event.detail === "boolean") {
      cachedVisibility = event.detail;
    } else {
      cachedVisibility = null;
    }
    onChange();
  };

  window.addEventListener(NSFW_VISIBILITY_EVENT, handleVisibilityChange);
  window.addEventListener("storage", handleVisibilityChange);
  return () => {
    window.removeEventListener(NSFW_VISIBILITY_EVENT, handleVisibilityChange);
    window.removeEventListener("storage", handleVisibilityChange);
  };
}

export function useNsfwVisibility(): [boolean, (visible: boolean) => void] {
  const visible = useSyncExternalStore(
    subscribeToNsfwVisibility,
    readNsfwVisibility,
    () => false,
  );
  const updateVisibility = useCallback((nextVisible: boolean) => {
    try {
      window.localStorage.setItem(NSFW_VISIBILITY_KEY, String(nextVisible));
    } catch (error) {
      console.warn("Preferensi tampilan NSFW tidak dapat disimpan.", error);
    }
    cachedVisibility = nextVisible;
    window.dispatchEvent(new CustomEvent(NSFW_VISIBILITY_EVENT, { detail: nextVisible }));
  }, []);

  return [visible, updateVisibility];
}

export function isNsfwManga(slug?: string, title?: string): boolean {
  if (typeof window === "undefined" || !window.mangaData) return false;
  const bySlug = slug ? window.mangaData[slug] : undefined;
  if (bySlug && typeof bySlug === "object") {
    const nsfw = (bySlug as Record<string, unknown>).nsfw;
    if (typeof nsfw === "boolean") return nsfw;
  }
  const titleKey = title?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const byTitle = titleKey ? window.mangaData[titleKey] : undefined;
  if (!byTitle || typeof byTitle !== "object") return false;
  return (byTitle as Record<string, unknown>).nsfw === true;
}

export function isNsfwMangaRecord(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const nested = [record.metadata, record.info].filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
  if (typeof record.nsfw === "boolean") return record.nsfw;
  const explicitNestedValue = nested.find((item) => typeof item.nsfw === "boolean")?.nsfw;
  if (typeof explicitNestedValue === "boolean") return explicitNestedValue;

  const sources = [record, ...nested];
  const tags = sources.flatMap((source) =>
    ["genres", "genre", "tags", "labels", "category", "type"].flatMap((key) => {
      const item = source[key];
      if (Array.isArray(item)) return item;
      return item === undefined || item === null ? [] : [item];
    }),
  );
  return tags.some((tag) => {
    const normalized = String(tag).trim().toLowerCase().replace(/[_-]+/g, " ");
    return normalized === "cg" ||
      normalized.includes("cg collection") ||
      ["hentai", "doujin", "smut", "adult"].some((term) => normalized.includes(term));
  });
}
