import type { Metadata } from "next";
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
  const description = (manga.description || `Baca ${manga.title} di Mikoroku.`).slice(0, 200);
  const url = `https://mikoroku.top/series/${encodeURIComponent(slug)}`;
  const imageUrl = `https://mikoroku.top/og/series/${encodeURIComponent(slug)}`;
  const cover = manga.image && manga.image.startsWith("http") ? manga.image : undefined;

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
        ...(cover
          ? [{ url: cover, width: 400, height: 600, alt: title }]
          : []),
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
  return <DetailPageContent slug={slug} />;
}
