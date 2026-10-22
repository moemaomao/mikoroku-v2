import { getSeriesSeoData } from "../../../../../lib/seo-metadata";
import { createMikorokuOgImage } from "../../../../../lib/og-image";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; chapter: string }> },
) {
  try {
    const { slug, chapter } = await params;
    const series = await getSeriesSeoData(slug);

    const title = `Chapter ${chapter} - ${series.title}`;
    const description =
      series.description ||
      `Baca Chapter ${chapter} ${series.title} di Mikoroku.`;

    return createMikorokuOgImage({
      title,
      description,
      label: "Manga Chapter",
      coverUrl: series.image,
    });
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