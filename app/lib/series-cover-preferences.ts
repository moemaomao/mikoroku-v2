export const SERIES_COVER_PREFERENCE_STORAGE_KEY = "mikoroku-series-cover:";
export const SERIES_COVER_PREFERENCE_UPDATED_AT_KEY = "mikoroku-series-cover-updated-at:";

export function getSeriesCoverPreference(slug: string): string {
  if (!slug || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(`${SERIES_COVER_PREFERENCE_STORAGE_KEY}${slug}`) || "";
  } catch (error) {
    console.warn("Could not read the saved series cover preference.", error);
    return "";
  }
}

export function getSeriesCoverPreferenceUpdatedAt(slug: string): number {
  if (!slug || typeof window === "undefined") return 0;
  try {
    const value = Number(window.localStorage.getItem(`${SERIES_COVER_PREFERENCE_UPDATED_AT_KEY}${slug}`));
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    console.warn("Could not read the saved series cover preference timestamp.", error);
    return 0;
  }
}
