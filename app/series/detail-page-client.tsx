"use client";

import dynamic from "next/dynamic";

const DetailPageContent = dynamic(() => import("./detail-page-content"), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-dvh bg-[#f8f9fa] dark:bg-[#0b0b0b]"
      aria-hidden="true"
    />
  ),
});

export default function DetailPageClient({ slug }: { slug: string }) {
  return <DetailPageContent slug={slug} />;
}
