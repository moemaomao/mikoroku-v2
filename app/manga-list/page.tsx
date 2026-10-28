import type { Metadata } from "next";
import CatalogClient from "../catalog/catalog-client";

export const metadata: Metadata = {
  title: "Manga List - Mikoroku",
  description: "Jelajahi katalog manga, manhwa, dan manhua di Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/manga-list" },
};

export default function MangaListRoute() {
  return <CatalogClient kind="manga" title="Manga List" />;
}
