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
  if (bySlug && typeof bySlug === "object" && (bySlug as Record<string, unknown>).nsfw === true) {
    return true;
  }
  const titleKey = title?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const byTitle = titleKey ? window.mangaData[titleKey] : undefined;
  return Boolean(
    byTitle &&
    typeof byTitle === "object" &&
    (byTitle as Record<string, unknown>).nsfw === true,
  );
}
