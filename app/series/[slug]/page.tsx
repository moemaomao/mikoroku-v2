import type { Metadata } from "next";
import DetailPageClient from "../detail-page-client";
import { getSeriesSeoData } from "../../../lib/seo-metadata";
import catalog from "../../../public/catalog/metadata.json";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const catalogRecord = catalog.manga.find((record) =>
    record.slug === slug || record.id === slug,
  );
  const series = catalogRecord
    ? null
    : await getSeriesSeoData(slug);
  const title = String(catalogRecord?.title || series?.title || slug);
  const description = String(
    catalogRecord?.desc ||
    catalogRecord?.metadata?.desc ||
    series?.description ||
    `Baca ${title} di Mikoroku.`,
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

export default async function DetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DetailPageClient slug={slug} />;
}
