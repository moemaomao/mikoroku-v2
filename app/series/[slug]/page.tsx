import type { Metadata } from "next";
import DetailPageClient from "../detail-page-client";
import { getSeriesSeoData } from "../../../lib/seo-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const manga = await getSeriesSeoData(slug);
  const title = `${manga.title} - Mikoroku`;
  const description = (
    manga.description || `Baca ${manga.title} di Mikoroku.`
  ).slice(0, 200);
  const url = `https://mikoroku.top/series/${encodeURIComponent(slug)}`;
  const v = manga.updatedAt ? `?v=${manga.updatedAt}` : "";
  const imageUrl = `https://mikoroku.top/og/series/${encodeURIComponent(slug)}${v}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      siteName: "Mikoroku",
      locale: "id_ID",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function DetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DetailPageClient slug={slug} />;
}
