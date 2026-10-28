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

  let title = slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let description = `Baca ${title} di Mikoroku.`;
  let updatedAt: number | undefined;
  let imagePath = `https://mikoroku.top/og/series/${encodeURIComponent(slug)}`;

  try {
    const manga = await getSeriesSeoData(slug);
    title = manga.title || title;
    description = (manga.description || `Baca ${title} di Mikoroku.`).slice(0, 200);
    updatedAt = manga.updatedAt;
    const v = updatedAt ? `?v=${updatedAt}` : "";
    imagePath = `https://mikoroku.top/og/series/${encodeURIComponent(slug)}${v}`;
  } catch {
  }

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
