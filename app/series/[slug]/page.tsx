import type { Metadata } from "next";
import "../series.css";
import DetailPageContent from "../detail-page-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let title = decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
  let description = `Baca manga ${title} di Mikoroku.`;
  let image: string | undefined;

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/moemaomao/mymangadata/main/all-manga.json",
      { next: { revalidate: 900 } },
    );
    if (!response.ok) throw new Error(`Dataset manga merespons HTTP ${response.status}.`);
    const mangaList = await response.json() as Array<{
      slug?: string;
      title?: string;
      desc?: string;
      img?: string;
      cover?: string;
    }>;
    const manga = mangaList.find((item) =>
      item.slug === slug ||
      item.title?.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-") === slug,
    );
    if (manga) {
      title = manga.title || title;
      description = (manga.desc || description).slice(0, 200);
      image = manga.img || manga.cover;
    }
  } catch (error) {
    console.error("Metadata manga tidak dapat diambil dari dataset.", error);
  }

  return {
    title: `${title} - Mikoroku`,
    description,
    alternates: {
      canonical: `https://mikoroku.com/series/${encodeURIComponent(slug)}`,
    },
    openGraph: {
      title: `${title} - Mikoroku`,
      description,
      type: "article",
      url: `https://mikoroku.com/series/${encodeURIComponent(slug)}`,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - Mikoroku`,
      description,
      images: image ? [image] : undefined,
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
