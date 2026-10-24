"use client";

import DetailPageContent from "./detail-page-content";

export default function DetailPageClient({ slug }: { slug: string }) {
  return <DetailPageContent slug={slug} />;
}
