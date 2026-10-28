import type { Metadata } from "next";
import CatalogClient from "../catalog/catalog-client";

export const metadata: Metadata = {
  title: "Hentai List - Mikoroku",
  description: "Jelajahi katalog doujinshi dan manga dewasa di Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/hentai-list" },
};

export default function HentaiListRoute() {
  return <CatalogClient kind="hentai" title="Hentai List" />;
}
