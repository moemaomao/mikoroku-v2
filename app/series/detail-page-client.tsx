"use client";

import { BannerAdSlot } from "../advertisement-manager";
import SiteHeader from "../site-header";
import DetailPageContent from "./detail-page-content";

export default function DetailPageClient({ slug }: { slug: string }) {
  return (
    <>
      <SiteHeader />
      <BannerAdSlot placement="site-top" />
      <DetailPageContent slug={slug} />
    </>
  );
}
