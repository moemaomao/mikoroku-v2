export type MangaMetadataPayload = Record<string, unknown> & {
  exportedAtMs: number;
  manga: Record<string, unknown>[];
};

export const MANGA_METADATA_UPDATED_EVENT = "mikoroku:manga-metadata-updated";
export const MANGA_METADATA_UPDATED_STORAGE_KEY = "mikoroku_manga_metadata_updated_at";

type FetchMangaMetadataOptions = {
  signal?: AbortSignal;
  force?: boolean;
};

const MANGA_METADATA_URL = "/catalog/metadata.json";
export const MANGA_METADATA_SOURCE_PATH = ["meta", "mangaMetadataCatalog"] as const;
const FIRESTORE_METADATA_MEMORY_TTL = 60 * 1000;

let firestoreMetadataCache: {
  payload: MangaMetadataPayload;
  loadedAt: number;
} | null = null;

export function notifyMangaMetadataUpdated(): void {
  firestoreMetadataCache = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MANGA_METADATA_UPDATED_STORAGE_KEY, String(Date.now()));
  } catch (error) {
    console.warn("Manga metadata cache invalidation could not be shared across tabs.", error);
  }
  window.dispatchEvent(new Event(MANGA_METADATA_UPDATED_EVENT));
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== MANGA_METADATA_UPDATED_STORAGE_KEY) return;
    firestoreMetadataCache = null;
    window.dispatchEvent(new Event(MANGA_METADATA_UPDATED_EVENT));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseMangaMetadataPayload(value: unknown): MangaMetadataPayload {
  if (
    !isRecord(value) ||
    typeof value.exportedAtMs !== "number" ||
    !Number.isFinite(value.exportedAtMs) ||
    !Array.isArray(value.manga)
  ) {
    throw new Error("Manga metadata response has an invalid format.");
  }

  const exportedAtMs = value.exportedAtMs;
  return {
    ...value,
    exportedAtMs,
    manga: value.manga.filter(isRecord),
  };
}

async function fetchFirestoreMetadataPayload(
  force: boolean,
): Promise<MangaMetadataPayload | null> {
  if (typeof window === "undefined") return null;
  if (
    !force &&
    firestoreMetadataCache &&
    Date.now() - firestoreMetadataCache.loadedAt < FIRESTORE_METADATA_MEMORY_TTL
  ) {
    return firestoreMetadataCache.payload;
  }

  let documentData: Record<string, unknown> | null;
  try {
    const { firestore } = (await import("./firebase-client")).initializeFirebaseClient();
    const { doc, getDoc, getDocFromServer } = await import("firebase/firestore");
    const sourceRef = doc(firestore, ...MANGA_METADATA_SOURCE_PATH);
    const snapshot = force
      ? await getDocFromServer(sourceRef)
      : await getDoc(sourceRef);
    documentData = snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.warn("Admin-managed manga metadata could not be loaded; using the catalog backup.", error);
    return null;
  }

  if (!documentData) return null;
  if (typeof documentData.content !== "string") {
    throw new Error("Admin-managed manga metadata is missing its JSON content.");
  }

  const payload = parseMangaMetadataPayload(JSON.parse(documentData.content));
  firestoreMetadataCache = { payload, loadedAt: Date.now() };
  return payload;
}

export async function fetchMangaMetadataPayload({
  signal,
  force = false,
}: FetchMangaMetadataOptions = {}): Promise<MangaMetadataPayload> {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
  const firestorePayload = await fetchFirestoreMetadataPayload(force);
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
  if (firestorePayload) return firestorePayload;

  const url = force ? `${MANGA_METADATA_URL}?t=${Date.now()}` : MANGA_METADATA_URL;
  const response = await fetch(url, {
    signal,
    cache: force ? "no-store" : "default",
  });
  if (!response.ok) {
    throw new Error(`Manga metadata returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  return parseMangaMetadataPayload(payload);
}
