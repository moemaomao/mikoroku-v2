"use client";

import { useEffect, useState } from "react";
import SiteChrome from "../site-chrome";
import {
  applyGlobalAppearance,
  defaultGlobalAppearance,
  readGlobalAppearance,
  saveGlobalAppearance,
  type GlobalAppearanceSettings,
  type GlobalAppearanceToggleSetting,
} from "../lib/global-appearance";

const appearanceOptions: Array<{
  key: GlobalAppearanceToggleSetting;
  title: string;
  description: string;
}> = [
  { key: "hideHero", title: "Hide hero", description: "Sembunyikan banner hero di halaman utama." },
  { key: "hideStatusBadge", title: "Hide status badge", description: "Sembunyikan badge status seperti ongoing atau completed." },
  { key: "hideTypeBadge", title: "Hide type badge", description: "Sembunyikan badge jenis konten seperti manga atau manhwa." },
  { key: "hideChapterBadge", title: "Hide chapter badge", description: "Sembunyikan badge jumlah chapter pada kartu manga." },
];

function AppearanceToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/70 p-4 transition hover:border-[var(--mikoroku-accent)] dark:border-white/10 dark:bg-white/[0.04]">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--mikoroku-accent)] after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition-transform ${checked ? "bg-[var(--mikoroku-accent)] after:translate-x-5" : "bg-slate-300 dark:bg-slate-600"}`}
      />
    </label>
  );
}

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState(defaultGlobalAppearance);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = readGlobalAppearance();
    setSettings(saved);
    applyGlobalAppearance(saved);
  }, []);

  function updateAppearance(key: GlobalAppearanceToggleSetting, value: boolean) {
    const updated = { ...settings, [key]: value };
    try {
      saveGlobalAppearance(updated);
      applyGlobalAppearance(updated);
      setSettings(updated);
      setNotice("Appearance settings saved.");
    } catch (error) {
      console.error("Preferensi appearance global gagal disimpan.", error);
      setNotice("Settings could not be saved. Check your browser storage permissions.");
    }
  }

  function updateAccentColor(accentColor: string | null) {
    const updated: GlobalAppearanceSettings = { ...settings, accentColor };
    try {
      saveGlobalAppearance(updated);
      applyGlobalAppearance(updated);
      setSettings(updated);
      setNotice("Appearance settings saved.");
    } catch (error) {
      console.error("Preferensi appearance global gagal disimpan.", error);
      setNotice("Settings could not be saved. Check your browser storage permissions.");
    }
  }

  return (
    <>
      <SiteChrome showFooter={false} />
      <main className="min-h-[calc(100vh-56px)] bg-slate-100 px-4 py-8 text-slate-900 dark:bg-[#111216] dark:text-slate-100 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <header className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--mikoroku-accent)]">Mikoroku</p>
            <h1 className="mt-2 text-3xl font-bold">Global Settings</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Atur elemen tampilan katalog untuk perangkat dan browser ini.</p>
          </header>

          <section className="rounded-3xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-[#191a20] sm:p-6" aria-labelledby="appearance-heading">
            <div className="mb-4">
              <h2 id="appearance-heading" className="text-lg font-bold">Appearance</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pilih elemen katalog yang ingin disembunyikan.</p>
            </div>
            <div className="grid gap-3">
              {appearanceOptions.map((option) => (
                <AppearanceToggle
                  key={option.key}
                  title={option.title}
                  description={option.description}
                  checked={settings[option.key]}
                  onChange={(value) => updateAppearance(option.key, value)}
                />
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Custom accent color</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Pilih warna aksen untuk highlight tampilan Mikoroku.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Custom accent color"
                  value={settings.accentColor || "#9d1018"}
                  onChange={(event) => updateAccentColor(event.currentTarget.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent p-1 accent-[var(--mikoroku-accent)] dark:border-white/15"
                />
                <span className="min-w-16 font-mono text-xs uppercase text-slate-600 dark:text-slate-300">{settings.accentColor || "Default"}</span>
                <button
                  type="button"
                  onClick={() => updateAccentColor(null)}
                  disabled={settings.accentColor === null}
                  className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold transition hover:border-[var(--mikoroku-accent)] dark:border-white/15"
                >
                  Reset
                </button>
              </div>
            </div>
            <p className="mt-3 min-h-5 text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">{notice}</p>
          </section>

          <section className="mt-5 rounded-3xl border border-dashed border-black/15 bg-white/50 p-4 dark:border-white/15 dark:bg-white/[0.02] sm:p-6" aria-labelledby="upcoming-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="upcoming-heading" className="text-lg font-bold">More appearance options</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pilih tampilan kartu manga di katalog.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Manga card display">
              {([
                ["default", "Default", "Tampilan standar."],
                ["list", "List", "Empat kolom di desktop, dengan cover, judul, badge, dan tiga chapter terbaru."],
              ] as const).map(([value, title, description]) => {
                const selected = settings.cardDisplay === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      const updated = { ...settings, cardDisplay: value };
                      try {
                        saveGlobalAppearance(updated);
                        applyGlobalAppearance(updated);
                        setSettings(updated);
                        setNotice("Appearance settings saved.");
                      } catch (error) {
                        console.error("Preferensi appearance global gagal disimpan.", error);
                        setNotice("Settings could not be saved. Check your browser storage permissions.");
                      }
                    }}
                    className={`rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mikoroku-accent)] ${selected ? "border-[var(--mikoroku-accent)] text-[var(--mikoroku-accent)]" : "border-black/10 bg-white/60 hover:border-[var(--mikoroku-accent)] dark:border-white/10 dark:bg-white/[0.03]"}`}
                  >
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-1 block text-xs text-slate-600 dark:text-slate-400">{description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
