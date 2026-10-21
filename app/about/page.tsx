import type { Metadata } from "next";
import LegalPage from "../legal-page";

export const metadata: Metadata = {
  title: "Tentang Mikoroku",
  description: "Informasi tentang Mikoroku dan layanan kami.",
  alternates: { canonical: "https://mikoroku.com/about" },
};

export default function AboutRoute() {
  return <LegalPage kind="about" />;
}
