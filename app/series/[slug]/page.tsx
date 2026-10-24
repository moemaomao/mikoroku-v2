import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getSeriesSeoData } from "../../../lib/seo-metadata";

const DetailPageContent = dynamic(() => import("../detail-page-content"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Loading…
    </div>
  ),
});

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
  const cover =
    typeof manga.image === "string" && manga.image.startsWith("http")
      ? manga.image
      : undefined;

  const images = [
    {
      url: imageUrl,
      width: 1200,
      height: 630,
      alt: title,
      type: "image/png" as const,
    },
    ...(cover
      ? [
          {
            url: cover,
            width: 400,
            height: 600,
            alt: title,
          },
        ]
      : []),
  ];

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
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl, ...(cover ? [cover] : [])],
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
