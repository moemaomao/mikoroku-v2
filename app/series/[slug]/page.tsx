import type { Metadata } from "next";
import { connection } from "next/server";
import DetailPageClient from "../detail-page-client";
import { getSeriesInitialData, getMangaFromCatalog } from "../../../lib/series-data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalogRecord = getMangaFromCatalog(slug);

  const title = String(
    catalogRecord?.title ||
      slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  );
  const description = String(
    catalogRecord?.desc || `Baca ${title} di Mikoroku.`,
  );
  const imagePath = `https://mikoroku.top/og/series/${encodeURIComponent(slug)}`;
  const pageTitle = `${title} - Mikoroku`;
  const isHybrid = catalogRecord?.source === "hybrid";
  const siteUrl = isHybrid ? "https://mikoroku.top" : "https://mikoroku.com";
  const url = `${siteUrl}/series/${encodeURIComponent(slug)}`;

  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: pageTitle,
      description,
      type: "article",
      url,
      siteName: "Mikoroku",
      locale: "id_ID",
      images: [
        {
          url: imagePath,
          width: 1200,
          height: 630,
          alt: pageTitle,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [imagePath],
    },
  };
}

export default async function DetailRoute({ params }: PageProps) {
  const { slug } = await params;
  await connection();
  const initial = await getSeriesInitialData(slug);

  return (
    <DetailPageClient
      slug={slug}
      initialManga={initial.manga}
      initialChapters={initial.chapters}
      initialChapterSource={initial.chapterSource}
      initialChaptersManaged={initial.chaptersManaged}
    />
  );
}
