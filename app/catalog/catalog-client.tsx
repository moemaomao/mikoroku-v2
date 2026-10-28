"use client";

import dynamic from "next/dynamic";
import type { CatalogKind } from "./catalog-page";

const CatalogPage = dynamic(() => import("./catalog-page"), {
  ssr: false,
  loading: () => (
    <main className="catalog-page" aria-busy="true">
      <section className="catalog-content">
        <h1>Katalog</h1>
        <p role="status">Memuat katalog...</p>
      </section>
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
