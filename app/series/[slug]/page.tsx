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

  const imageUrl =
    manga.image && manga.image.startsWith("http")
      ? manga.image
      : "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s1000/MIKOROKU.png";

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      images: [{ url: imageUrl, alt: title }],
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