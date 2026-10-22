import { getChapterSeoTitle } from "../../../../../lib/seo-metadata";
import { createMikorokuOgImage } from "../../../../../lib/og-image";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; chapter: string }> },
) {
  const { slug, chapter } = await params;
  const article = await getChapterSeoTitle(slug, chapter);

  return createMikorokuOgImage({
    title: article.title,
    description: article.description,
    image: article.image,
    label: "Manga Chapter",
  });
}
