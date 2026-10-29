"use client";

import dynamic from "next/dynamic";
import type { CatalogKind } from "./catalog-page";
import CenteredLoadingSpinner from "../centered-loading-spinner";

const CatalogPage = dynamic(() => import("./catalog-page"), {
  ssr: false,
  loading: () => (
    <main className="catalog-page" aria-busy="true">
      <CenteredLoadingSpinner label="Loading Catalog..." />
    </main>
  ),
});

export default function CatalogClient({
  kind,
  title,
}: {
  kind: CatalogKind;
  title: string;
}) {
  return <CatalogPage kind={kind} title={title} />;
}