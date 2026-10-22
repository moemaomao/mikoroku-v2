import { getSeriesSeoData } from "../../../../lib/seo-metadata";
import { createMikorokuOgImage } from "../../../../lib/og-image";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const series = await getSeriesSeoData(slug);

  return createMikorokuOgImage({
    title: series.title,
    description: series.description,
    image: series.image,
    label: "Manga & Series",
  });
}
