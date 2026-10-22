import type { Metadata } from "next";
import ReaderPage from "../../../manga/reader-page";
import { getChapterSeoTitle } from "../../../../lib/seo-metadata";

export default async function MangaReaderRoute({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter } = await params;
  return <ReaderPage slug={slug} chapter={chapter} kind="manga" />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}): Promise<Metadata> {
  const { slug, chapter } = await params;
  const article = await getChapterSeoTitle(slug, chapter);
  const url = `https://mikoroku.com/manga/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;
  const image = { url: article.image, alt: article.title };

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [image.url],
    },
  };
}
