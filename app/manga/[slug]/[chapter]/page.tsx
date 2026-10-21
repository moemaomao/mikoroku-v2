import ReaderPage from "../../../manga/reader-page";

export default async function MangaReaderRoute({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter } = await params;
  return <ReaderPage slug={slug} chapter={chapter} kind="manga" />;
}
