"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { BannerAdSlot } from "../advertisement-manager";
import CenteredLoadingSpinner from "../centered-loading-spinner";
import SiteHeader from "../site-header";

const DetailPageContent = dynamic(() => import("./detail-page-content"), {
  ssr: false,
  loading: () => <CenteredLoadingSpinner label="Memuat detail manga" />,
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
