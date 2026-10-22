import { getChapterSeoTitle } from "../../../../../lib/seo-metadata";
import { createMikorokuOgImage } from "../../../../../lib/og-image";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; chapter: string }> },
) {
  try {
    const { slug, chapter } = await params;
    const article = await getChapterSeoTitle(slug, chapter);

    try {
      return createMikorokuOgImage({
        title: article.title,
        description: article.description,
        label: "Manga Chapter",
        coverUrl: article.image,
      });
    } catch {
      return createMikorokuOgImage({
        title: article.title,
        description: article.description,
        label: "Manga Chapter",
        coverUrl: null,
      });
    }
  } catch (error) {
    console.error("[OG chapter]", error);
    return createMikorokuOgImage({
      title: "Chapter - Mikoroku",
      description: "Baca manga di Mikoroku.",
      label: "Manga Chapter",
      coverUrl: null,
    });
  }
}