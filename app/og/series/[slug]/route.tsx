import { getSeriesSeoData } from "../../../../lib/seo-metadata";
import { createMikorokuOgImage } from "../../../../lib/og-image";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const series = await getSeriesSeoData(slug);

    try {
      return createMikorokuOgImage({
        title: series.title,
        description: series.description,
        label: "Manga & Series",
        coverUrl: series.image,
      });
    } catch {
      return createMikorokuOgImage({
        title: series.title,
        description: series.description,
        label: "Manga & Series",
        coverUrl: null,
      });
    }
  } catch (error) {
    console.error("[OG series]", error);
    return createMikorokuOgImage({
      title: "Mikoroku",
      description: "Platform baca manga bahasa Indonesia.",
      label: "Manga & Series",
      coverUrl: null,
    });
  }
}