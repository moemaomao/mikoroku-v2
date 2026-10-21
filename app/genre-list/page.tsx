import type { Metadata } from "next";
import CatalogPage from "../catalog/catalog-page";

export const metadata: Metadata = {
  title: "Genre List - Mikoroku",
  description: "Jelajahi manga Mikoroku berdasarkan genre.",
  alternates: { canonical: "https://mikoroku.com/genre-list" },
};

export default function GenreListRoute() {
  return <CatalogPage kind="genre" title="Genre List" />;
}
