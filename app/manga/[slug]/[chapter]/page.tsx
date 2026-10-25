import type { Metadata } from "next";
import ReaderPageClient from "../../../manga/reader-page-client";
import { getChapterSeoTitle } from "../../../../lib/seo-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}): Promise<Metadata> {
  const { slug, chapter } = await params;
  const article = await getChapterSeoTitle(slug, chapter);

  const url = `https://mikoroku.top/manga/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;
  const imageUrl = `https://mikoroku.top/og/manga/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url,
      siteName: "Mikoroku",
      locale: "id_ID",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [imageUrl],
    },
  };
}

export default async function MangaReaderRoute({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter } = await params;
  return <ReaderPageClient slug={slug} chapter={chapter} kind="manga" />;
}