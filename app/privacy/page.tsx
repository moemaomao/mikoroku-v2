import type { Metadata } from "next";
import LegalPage from "../legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy - Mikoroku",
  description: "Kebijakan privasi Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/privacy" },
};

export default function PrivacyRoute() {
  return <LegalPage kind="privacy" />;
}
