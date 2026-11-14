export function isNovelSeries(value: Record<string, unknown> | null | undefined): boolean {
  if (!value) return false;
  const info = value.info && typeof value.info === "object"
    ? value.info as Record<string, unknown>
    : {};
  const metadata = value.metadata && typeof value.metadata === "object"
    ? value.metadata as Record<string, unknown>
    : {};
  return [
    value.type, value.format, value.contentType, value.category, value.genres,
    metadata.type, metadata.format, metadata.contentType, metadata.category, metadata.genres,
    info.type, info.format, info.contentType, info.category, info.genres,
  ].some((item) => {
    const labels = Array.isArray(item) ? item : [item];
    return labels.some((label) =>
      typeof label === "string" && /\bnovel\b/i.test(label.replace(/[_-]+/g, " ")),
    );
  });
}
