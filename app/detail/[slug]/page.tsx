import { permanentRedirect } from "next/navigation";

export default async function LegacyDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/series/${encodeURIComponent(slug)}`);
}
