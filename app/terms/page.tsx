import type { Metadata } from "next";
import LegalPage from "../legal-page";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan - Mikoroku",
  description: "Syarat penggunaan layanan Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/terms" },
};

export default function TermsRoute() {
  return <LegalPage kind="terms" />;
}
