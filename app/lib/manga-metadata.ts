export type MangaMetadataPayload = {
  exportedAtMs: number;
  manga: Record<string, unknown>[];
};

type FetchMangaMetadataOptions = {
  signal?: AbortSignal;
  force?: boolean;
};

const MANGA_METADATA_URL = "/catalog/metadata.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function fetchMangaMetadataPayload({
  signal,
  force = false,
}: FetchMangaMetadataOptions = {}): Promise<MangaMetadataPayload> {
  const url = force ? `${MANGA_METADATA_URL}?t=${Date.now()}` : MANGA_METADATA_URL;
  const response = await fetch(url, {
    signal,
    cache: force ? "no-store" : "default",
  });
  if (!response.ok) {
    throw new Error(`Manga metadata returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    typeof payload.exportedAtMs !== "number" ||
    !Number.isFinite(payload.exportedAtMs) ||
    !Array.isArray(payload.manga)
  ) {
    throw new Error("Manga metadata response has an invalid format.");
  }

  return {
    exportedAtMs: payload.exportedAtMs,
    manga: payload.manga.filter(isRecord),
  };
}
