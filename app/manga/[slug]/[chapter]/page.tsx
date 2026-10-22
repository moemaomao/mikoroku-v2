import type { Metadata } from "next";
import ReaderPage from "../../../manga/reader-page";
import { getChapterSeoTitle } from "../../../../lib/seo-metadata";

export default async function MangaReaderRoute({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter } = await params;
  return <ReaderPage slug={slug} chapter={chapter} kind="manga" />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}): Promise<Metadata> {
  const { slug, chapter } = await params;
  const article = await getChapterSeoTitle(slug, chapter);

  const url = `https://mikoroku.top/manga/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;

  const imageUrl =
    article.image && article.image.startsWith("http")
      ? article.image
      : "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s1000/MIKOROKU.png";

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url,
      images: [{ url: imageUrl, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [imageUrl],
    },
  };
}