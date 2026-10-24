"use client";

import dynamic from "next/dynamic";

const DetailPageContent = dynamic(() => import("./detail-page-content"), {
  ssr: false,
  loading: () => null,
});

export default function DetailPageClient({ slug }: { slug: string }) {
  return <DetailPageContent slug={slug} />;
}
