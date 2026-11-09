"use client";

import { useCallback, useEffect, useState } from "react";

export const NSFW_VISIBILITY_KEY = "mikoroku_show_nsfw_v1";
const NSFW_VISIBILITY_EVENT = "mikorokuNsfwVisibilityChange";

export function readNsfwVisibility(): boolean {
  try {
    return window.localStorage.getItem(NSFW_VISIBILITY_KEY) === "true";
  } catch (error) {
    console.warn("Preferensi tampilan NSFW tidak dapat dibaca.", error);
    return false;
  }
}

export function useNsfwVisibility(): [boolean, (visible: boolean) => void] {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readNsfwVisibility());
    const handleVisibilityChange = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "boolean") {
        setVisible(event.detail);
      } else {
        setVisible(readNsfwVisibility());
      }
    };

    window.addEventListener(NSFW_VISIBILITY_EVENT, handleVisibilityChange);
    window.addEventListener("storage", handleVisibilityChange);
    return () => {
      window.removeEventListener(NSFW_VISIBILITY_EVENT, handleVisibilityChange);
      window.removeEventListener("storage", handleVisibilityChange);
    };
  }, []);

  const updateVisibility = useCallback((nextVisible: boolean) => {
    try {
      window.localStorage.setItem(NSFW_VISIBILITY_KEY, String(nextVisible));
    } catch (error) {
      console.warn("Preferensi tampilan NSFW tidak dapat disimpan.", error);
    }
    window.dispatchEvent(new CustomEvent(NSFW_VISIBILITY_EVENT, { detail: nextVisible }));
    setVisible(nextVisible);
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
