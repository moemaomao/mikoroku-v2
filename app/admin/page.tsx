import type { Metadata } from "next";
import AdminPage from "./admin-page";

export const metadata: Metadata = {
  title: "Admin Panel - Mikoroku",
  description: "Manage Mikoroku manga content.",
  robots: { index: false, follow: false },
};

export default function AdminRoute() {
  return <AdminPage />;
}
