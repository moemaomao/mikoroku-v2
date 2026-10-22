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
  const image = {
    url: `https://mikoroku.com/og/series/${encodeURIComponent(slug)}`,
    alt: `${manga.title} - Mikoroku`,
  };

  return {
    title,
    description,
    alternates: {
      canonical: `https://mikoroku.com/series/${encodeURIComponent(slug)}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://mikoroku.com/series/${encodeURIComponent(slug)}`,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
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
