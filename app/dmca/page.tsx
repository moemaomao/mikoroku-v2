import type { Metadata } from "next";
import LegalPage from "../legal-page";

export const metadata: Metadata = {
  title: "DMCA - Mikoroku",
  description: "Kebijakan hak cipta dan permintaan penghapusan konten Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/dmca" },
};

export default function DmcaRoute() {
  return <LegalPage kind="dmca" />;
}
