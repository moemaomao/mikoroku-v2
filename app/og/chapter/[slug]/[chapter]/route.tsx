import { getChapterSeoTitle } from "../../../../../lib/seo-metadata";
import { createMikorokuOgImage, fetchCoverAsDataUrl } from "../../../../../lib/og-image";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; chapter: string }> },
) {
  try {
    const { slug, chapter } = await params;
    const article = await getChapterSeoTitle(slug, chapter);
    const coverDataUrl = await fetchCoverAsDataUrl(article.image);

    return createMikorokuOgImage({
      title: article.title,
      description: article.description,
      label: "Manga Chapter",
      coverDataUrl,
    });
  } catch (error) {
    console.error("[OG chapter]", error);
    return createMikorokuOgImage({
      title: "Chapter - Mikoroku",
      description: "Baca manga di Mikoroku.",
      label: "Manga Chapter",
      coverDataUrl: null,
    });
  }
}