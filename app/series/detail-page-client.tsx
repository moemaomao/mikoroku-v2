"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { BannerAdSlot } from "../advertisement-manager";
import SiteHeader from "../site-header";

// Keep chunk split, but do NOT show a full-page spinner here.
// Instant metadata comes from currentManga / caches inside detail-page-content.
const DetailPageContent = dynamic(() => import("./detail-page-content"), {
  ssr: false,
  loading: () => null,
});

export function preloadDetailPageContent(): void {
  void import("./detail-page-content").catch((error: unknown) => {
    console.error("Could not preload series details.", error);
  });
}

export default function DetailPageClient({ slug }: { slug: string }) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <SiteHeader />
      <BannerAdSlot placement="site-top" />
      <DetailPageContent key={slug} slug={slug} />
    </>
  );
}
