export function isNovelSeries(value: Record<string, unknown> | null | undefined): boolean {
  if (!value) return false;
  const info = value.info && typeof value.info === "object"
    ? value.info as Record<string, unknown>
    : {};
  return [
    value.type, value.format, value.contentType, value.category, value.genres,
    info.type, info.format, info.contentType, info.category, info.genres,
  ].some((item) => {
    const labels = Array.isArray(item) ? item : [item];
    return labels.some((label) => typeof label === "string" && /\bnovel\b/i.test(label));
  });
}
