"use client";

import dynamic from "next/dynamic";

const DetailPageContent = dynamic(() => import("./detail-page-content"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Loading…
    </div>
  ),
});

export default function DetailPageClient({ slug }: { slug: string }) {
  return <DetailPageContent slug={slug} />;
}
