import type { Metadata } from "next";
import "../series.css";
import DetailPageContent from "../detail-page-content";
import { getSeriesSeoData } from "../../../lib/seo-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const manga = await getSeriesSeoData(slug);
  const title = `${manga.title} - Mikoroku`;
  const description = manga.description;
  const url = `https://mikoroku.top/series/${encodeURIComponent(slug)}`;
  const imageUrl = `https://mikoroku.top/og/series/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      images: [{ url: imageUrl, width: 600, height: 315, alt: title }],
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
  return <DetailPageContent slug={slug} />;
}