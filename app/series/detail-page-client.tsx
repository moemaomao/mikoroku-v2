"use client";

import dynamic from "next/dynamic";
import { BannerAdSlot } from "../advertisement-manager";
import SiteHeader from "../site-header";

const DetailPageContent = dynamic(() => import("./detail-page-content"), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-screen place-items-center" role="status" aria-label="Memuat detail manga">
      <span
        className="h-[42px] w-[42px] animate-spin rounded-full border-4 border-[rgba(128,128,128,0.25)] border-t-current"
        aria-hidden="true"
      />
    </main>
  ),
});

export default function DetailPageClient({ slug }: { slug: string }) {
  return (
    <>
      <SiteHeader />
      <BannerAdSlot placement="site-top" />
      <DetailPageContent slug={slug} />
    </>
  );
}
