import type { Metadata } from "next";
import ReadingStatsPage from "../stats-page";

export const metadata: Metadata = {
  title: "Reading Stats - Mikoroku",
  description: "Reading progress and activity on Mikoroku.",
  robots: { index: false, follow: true },
};

export default async function ReadingStatsRoute({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return <ReadingStatsPage uid={uid} />;
}
