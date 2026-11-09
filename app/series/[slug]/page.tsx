import type { Metadata } from "next";
import DetailPageClient from "../detail-page-client";
import { getSeriesSeoData } from "../../../lib/seo-metadata";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const series = await getSeriesSeoData(slug);
  const title = series.title;
  const description = series.description || `Baca ${title} di Mikoroku.`;
  const imagePath = `https://mikoroku.top/og/series/${encodeURIComponent(slug)}`;
  const pageTitle = `${title} - Mikoroku`;
  const url = `https://mikoroku.top/series/${encodeURIComponent(slug)}`;

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

export default async function DetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DetailPageClient slug={slug} />;
}
