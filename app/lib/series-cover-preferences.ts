export const SERIES_COVER_PREFERENCE_STORAGE_KEY = "mikoroku-series-cover:";

export function getSeriesCoverPreference(slug: string): string {
  if (!slug || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(`${SERIES_COVER_PREFERENCE_STORAGE_KEY}${slug}`) || "";
  } catch (error) {
    console.warn("Could not read the saved series cover preference.", error);
    return "";
  }
}
