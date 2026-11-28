"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getAdminFirebase } from "../admin-firebase";
import { hasAdminPanelAccess } from "../../lib/admin-access";
import CreditGenerator from "../../../tools/credit-generator/src/credit-generator";

export default function CreditGeneratorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    try {
      return onAuthStateChanged(
        getAdminFirebase().auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthReady(true);
          setAuthError("");
        },
        (error) => {
          console.error("Could not verify the credit generator admin session.", error);
          setAuthError("Could not verify your admin session. Return to Admin and sign in again.");
          setAuthReady(true);
        },
      );
    } catch (error) {
      console.error("Could not initialize the credit generator admin session.", error);
      setAuthError("Could not initialize the admin session. Return to Admin and try again.");
      setAuthReady(true);
      return;
    }
  }, []);

  if (!authReady) {
    return <main className="grid min-h-screen place-items-center bg-[#0b0b0b] p-6 text-white">Checking admin session...</main>;
  }

  if (authError || !hasAdminPanelAccess(user)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b0b0b] p-6 text-white">
        <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#15161b] p-7 text-center shadow-2xl">
          <h1 className="text-xl font-bold">Admin access required</h1>
          <p className="mt-3 text-sm text-slate-300">
            {authError || (user
              ? "This account is not authorized to use the Credit Generator."
              : "Sign in with your existing MikoRoku Admin account to continue.")}
          </p>
          <a
            className="mt-6 inline-flex rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white no-underline hover:bg-rose-500"
            href="/admin"
          >
            Return to Admin
          </a>
        </section>
      </main>
    );
  }

  return <CreditGenerator />;
}
