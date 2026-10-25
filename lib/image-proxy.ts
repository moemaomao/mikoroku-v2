import { readerImageUrlWithQuality } from "./reader-image-url";

const WESERV_ENDPOINT = "https://images.weserv.nl/";
export const COVER_IMAGE_QUALITY_KEY = "mikoroku_cover_image_quality_v1";
export const CHAPTER_THUMBNAIL_SIZE_KEY = "mikoroku_chapter_thumbnail_size_v1";
export const DEFAULT_CHAPTER_THUMBNAIL_SIZE = 40;
export const DEFAULT_COVER_IMAGE_CONVERSION = {
  enabled: true,
  preset: "medium",
  customWidth: 200,
} as const;

export type CoverImageConversionPreset = "low" | "medium" | "high" | "custom";
export type CoverImageConversionSettings = {
  enabled: boolean;
  preset: CoverImageConversionPreset;
  customWidth: number;
};

const COVER_IMAGE_WIDTHS: Record<Exclude<CoverImageConversionPreset, "custom">, number> = {
  low: 100,
  medium: 200,
  high: 300,
};

const IMAGE_PROXY_PRESETS = {
  cover: { width: 200, quality: 72, output: "webp" },
  coverDetail: { width: 1200, quality: 72, output: "webp" },
  coverVolume: { width: 100, quality: 72, output: "webp" },
  coverAdmin: { width: 200, quality: 72, output: "webp" },
  headerPreview: { width: 50, quality: 75, output: "webp" },
  postCatalog: { width: 120, quality: 60 },
  historyCover: { width: 100, quality: 80, output: "webp" },
  recommendation: { width: 140, quality: 65, output: "webp" },
  chapterThumbnail: {
    width: 80,
    height: 80,
    fit: "cover",
    quality: 70,
    output: "webp",
    noUpscale: true,
  },
  readerFallback: { noUpscale: true },
} as const;

export type ImageProxyPreset = keyof typeof IMAGE_PROXY_PRESETS;

export function readChapterThumbnailSize(): number {
  if (typeof window === "undefined") return DEFAULT_CHAPTER_THUMBNAIL_SIZE;
  try {
    const size = Number(window.localStorage.getItem(CHAPTER_THUMBNAIL_SIZE_KEY));
    return Number.isInteger(size) && size >= 10 && size <= 200
      ? size
      : DEFAULT_CHAPTER_THUMBNAIL_SIZE;
  } catch (error) {
    console.warn("Could not read the chapter thumbnail size preference.", error);
    return DEFAULT_CHAPTER_THUMBNAIL_SIZE;
  }
}

export function readCoverImageConversion(): CoverImageConversionSettings {
  if (typeof window === "undefined") return DEFAULT_COVER_IMAGE_CONVERSION;
  try {
    const stored = window.localStorage.getItem(COVER_IMAGE_QUALITY_KEY);
    if (!stored) return DEFAULT_COVER_IMAGE_CONVERSION;
    const parsed: unknown = JSON.parse(stored);
    if (parsed && typeof parsed === "object") {
      const value = parsed as Record<string, unknown>;
      const preset = ["low", "medium", "high", "custom"].includes(String(value.preset))
        ? value.preset as CoverImageConversionPreset
        : DEFAULT_COVER_IMAGE_CONVERSION.preset;
      const customWidth = Number(value.customWidth);
      return {
        enabled: typeof value.enabled === "boolean" ? value.enabled : true,
        preset,
        customWidth: Number.isInteger(customWidth) && customWidth >= 10 && customWidth <= 1000
          ? customWidth
          : DEFAULT_COVER_IMAGE_CONVERSION.customWidth,
      };
    }

    const legacyQuality = Number(stored);
    if (Number.isInteger(legacyQuality) && legacyQuality >= 10 && legacyQuality <= 100) {
      return {
        enabled: true,
        preset: "custom",
        customWidth: Math.min(1000, Math.round(600 + ((legacyQuality - 10) / 90) * 1400)),
      };
    }
    return DEFAULT_COVER_IMAGE_CONVERSION;
  } catch (error) {
    console.warn("Could not read the cover image conversion preference.", error);
    return DEFAULT_COVER_IMAGE_CONVERSION;
  }
}

const USER_COVER_PRESETS = new Set<ImageProxyPreset>([
  "cover",
  "coverDetail",
  "coverVolume",
  "headerPreview",
  "postCatalog",
  "historyCover",
  "recommendation",
]);

export function readCoverImageWidth(): number {
  const settings = readCoverImageConversion();
  return settings.preset === "custom"
    ? settings.customWidth
    : COVER_IMAGE_WIDTHS[settings.preset];
}

export function imageProxyUrl(
  source: string,
  preset: ImageProxyPreset,
  version?: number,
): string {
  const trimmedSource = source.trim();
  if (!trimmedSource || trimmedSource === "-" || /^(\/(?!\/)|data:|blob:)/i.test(trimmedSource)) {
    return trimmedSource;
  }
  const normalizedSource = trimmedSource.startsWith("//")
    ? `https:${trimmedSource}`
    : trimmedSource;

  const settings = IMAGE_PROXY_PRESETS[preset];
  const coverConversion = USER_COVER_PRESETS.has(preset) ? readCoverImageConversion() : null;
  const userQuality = coverConversion
    ? (coverConversion.preset === "custom" ? 80 : { low: 55, medium: 72, high: 85 }[coverConversion.preset])
    : null;
  const userWidth = coverConversion ? readCoverImageWidth() : null;
  let originalUrl: URL;
  let existingWidth = 0;
  let existingQuality = 0;

  try {
    originalUrl = new URL(normalizedSource);
    while (originalUrl.hostname.toLowerCase() === "images.weserv.nl") {
      const nestedUrl = originalUrl.searchParams.get("url");
      if (!nestedUrl) return trimmedSource;
      const currentWidth = Number(originalUrl.searchParams.get("w"));
      const currentQuality = Number(originalUrl.searchParams.get("q"));
      if (currentWidth > 0) existingWidth = existingWidth ? Math.min(existingWidth, currentWidth) : currentWidth;
      if (currentQuality > 0) existingQuality = existingQuality ? Math.min(existingQuality, currentQuality) : currentQuality;
      originalUrl = new URL(nestedUrl);
    }
  } catch {
    return normalizedSource;
  }

  if (!["http:", "https:"].includes(originalUrl.protocol)) return trimmedSource;
  if (coverConversion && !coverConversion.enabled) return originalUrl.toString();
  if (coverConversion && originalUrl.hostname.toLowerCase().endsWith("googleusercontent.com")) {
    return readerImageUrlWithQuality(
      originalUrl.toString(),
      userWidth || DEFAULT_COVER_IMAGE_CONVERSION.customWidth,
    );
  }

  const optimizedUrl = new URL(WESERV_ENDPOINT);
  optimizedUrl.searchParams.set("url", originalUrl.toString());
  if ("width" in settings) {
    const width = preset === "chapterThumbnail"
      ? readChapterThumbnailSize()
      : userWidth || (existingWidth ? Math.min(settings.width, existingWidth) : settings.width);
    optimizedUrl.searchParams.set("w", String(width));
  }
  if ("height" in settings) {
    optimizedUrl.searchParams.set(
      "h",
      String(preset === "chapterThumbnail" ? readChapterThumbnailSize() : settings.height),
    );
  }
  if ("fit" in settings) optimizedUrl.searchParams.set("fit", settings.fit);
  if ("quality" in settings) {
    const quality = userQuality ?? (existingQuality ? Math.min(settings.quality, existingQuality) : settings.quality);
    optimizedUrl.searchParams.set("q", String(quality));
  }
  if ("output" in settings) optimizedUrl.searchParams.set("output", settings.output);
  if ("noUpscale" in settings && settings.noUpscale) optimizedUrl.searchParams.set("n", "-1");
  if (version) optimizedUrl.searchParams.set("v", String(version));

  return optimizedUrl.toString();
}
