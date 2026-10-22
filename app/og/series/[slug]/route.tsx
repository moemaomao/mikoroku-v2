import { getSeriesSeoData } from "../../../../lib/seo-metadata";
import { createMikorokuOgImage } from "../../../../lib/og-image";

export const runtime = "edge";
export const revalidate = 86400;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const series = await getSeriesSeoData(slug);

    return createMikorokuOgImage({
      title: series.title,
      description: series.description,
      image: series.image,
      label: "Manga & Series",
    });
  } catch (error) {
    console.error("[OG series] failed:", error);

    return createMikorokuOgImage({
      title: "Mikoroku",
      description: "Platform baca manga bahasa Indonesia.",
      image: null,
      label: "Manga & Series",
    });
  }
}