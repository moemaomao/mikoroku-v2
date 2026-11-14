export function latestChapterFromRecord(record: Record<string, unknown>): string | null {
  const candidates: unknown[] = [record.lastChapter, record.lastChapterUpdated];
  if (typeof record.chapter !== "object") candidates.push(record.chapter);

  const chapterMap = record.chapters && typeof record.chapters === "object"
    ? record.chapters as Record<string, unknown>
    : typeof record.chapter === "object" && record.chapter
      ? record.chapter as Record<string, unknown>
      : {};
  candidates.push(...Object.keys(chapterMap));

  const chapters = candidates.flatMap((candidate) => {
    if (candidate === null || candidate === undefined || typeof candidate === "object") return [];
    const raw = String(candidate).trim();
    const number = Number.parseFloat(raw.replace(/[^\d.]/g, ""));
    return raw && Number.isFinite(number) && number >= 0 ? [{ raw, number }] : [];
  });

  return chapters.length
    ? chapters.reduce((latest, chapter) =>
        chapter.number > latest.number ? chapter : latest,
      ).raw
    : null;
}
