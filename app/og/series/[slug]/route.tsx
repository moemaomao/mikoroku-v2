import { getSeriesSeoData } from "../../../../lib/seo-metadata";
import { createMikorokuOgImage, fetchCoverAsDataUrl } from "../../../../lib/og-image";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const series = await getSeriesSeoData(slug);
    const coverDataUrl = await fetchCoverAsDataUrl(series.image);

    return createMikorokuOgImage({
      title: series.title,
      description: series.description,
      label: "Manga & Series",
      coverDataUrl,
    });
  } catch (error) {
    console.error("[OG series]", error);
    return createMikorokuOgImage({
      title: "Mikoroku",
      description: "Platform baca manga bahasa Indonesia.",
      label: "Manga & Series",
      coverDataUrl: null,
    });
  }
}