export function normalizeChapterNumber(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const match = raw.match(/(?:chapter|chapters|ch\.?|chap\.?|ep\.?|episode)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i)
    || raw.match(/^\s*(\d+(?:[.,]\d+)?)\s*$/)
    || raw.match(/#\s*(\d+(?:[.,]\d+)?)/);
  if (!match?.[1]) return null;

  const number = Number(match[1].replace(",", "."));
  return Number.isFinite(number) ? String(number) : null;
}

export function chapterNumberFromRecord(data: Record<string, unknown>, fallback: string): string {
  const title = String(data.label || data.chapterTitle || data.title || "").trim();
  const match = title.match(/(?:chapter|chapters|ch\.?|chap\.?|ep\.?|episode)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i)
    || title.match(/^\s*(\d+(?:[.,]\d+)?)\s*$/)
    || title.match(/#\s*(\d+(?:[.,]\d+)?)/);
  if (match?.[1]) return match[1].replace(",", ".");

  const number = typeof data.num === "string" || typeof data.num === "number"
    ? String(data.num).trim()
    : "";
  if (number) return number;

  const order = data.order;
  return order != null && String(order).trim() ? String(order) : fallback;
}
