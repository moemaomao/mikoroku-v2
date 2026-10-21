import type { Metadata } from "next";
import CatalogPage from "../catalog/catalog-page";

export const metadata: Metadata = {
  title: "Manga List - Mikoroku",
  description: "Jelajahi katalog manga, manhwa, dan manhua di Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/manga-list" },
};

export default function MangaListRoute() {
  return <CatalogPage kind="manga" title="Manga List" />;
}
