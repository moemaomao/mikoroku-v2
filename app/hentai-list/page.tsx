import type { Metadata } from "next";
import CatalogPage from "../catalog/catalog-page";

export const metadata: Metadata = {
  title: "Hentai List - Mikoroku",
  description: "Jelajahi katalog doujinshi dan manga dewasa di Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/hentai-list" },
};

export default function HentaiListRoute() {
  return <CatalogPage kind="hentai" title="Hentai List" />;
}
