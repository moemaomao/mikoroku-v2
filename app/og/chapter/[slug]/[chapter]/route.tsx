import { getChapterSeoTitle } from "../../../../../lib/seo-metadata";
import { createMikorokuOgImage } from "../../../../../lib/og-image";

export const runtime = "edge";
export const revalidate = 86400;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; chapter: string }> },
) {
  try {
    const { slug, chapter } = await params;
    const article = await getChapterSeoTitle(slug, chapter);

    return createMikorokuOgImage({
      title: article.title,
      description: article.description,
      image: article.image,
      label: "Manga Chapter",
    });
  } catch (error) {
    console.error("[OG chapter] failed:", error);

    return createMikorokuOgImage({
      title: "Chapter - Mikoroku",
      description: "Baca manga di Mikoroku.",
      image: null,
      label: "Manga Chapter",
    });
  }
}