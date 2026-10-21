import type { Metadata } from "next";
import CommissionPage from "./commission-page";

export const metadata: Metadata = {
  title: "Commission - Mikoroku",
  description: "Informasi dan formulir commission Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/commission" },
};

export default function CommissionRoute() {
  return <CommissionPage />;
}
