import type { Metadata } from "next";
import CatalogClient from "../catalog/catalog-client";

export const metadata: Metadata = {
  title: "Genre List - Mikoroku",
  description: "Jelajahi manga Mikoroku berdasarkan genre.",
  alternates: { canonical: "https://mikoroku.com/genre-list" },
};

export default function GenreListRoute() {
  return <CatalogClient kind="genre" title="Genre List" />;
}
