import type { Metadata } from "next";
import LoginPage from "./login-page";

export const metadata: Metadata = {
  title: "Sign In or Sign Up - Mikoroku",
  description: "Sign in to or create your Mikoroku account.",
  robots: { index: false, follow: false },
};

export default function LoginRoute() {
  return <LoginPage />;
}
