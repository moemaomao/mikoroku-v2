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

  const url = `https://mikoroku.top/manga/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;
  const imageUrl = `https://mikoroku.top/og/chapter/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url,
      images: [{ url: imageUrl, width: 600, height: 315, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [imageUrl],
    },
  };
}