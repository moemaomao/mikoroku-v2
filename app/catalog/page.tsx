import type { Metadata } from "next";
import CatalogPage from "./catalog-page";

export const metadata: Metadata = {
  title: "Katalog Manga - Mikoroku",
  description: "Jelajahi katalog manga, manhwa, dan manhua di Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/catalog" },
};

export default function CatalogRoute() {
  return <CatalogPage kind="manga" title="Katalog Manga" />;
}
