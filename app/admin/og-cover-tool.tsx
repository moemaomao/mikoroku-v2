"use client";

import { useState, type FormEvent } from "react";
import { doc, getDoc, type Firestore } from "firebase/firestore";
import styles from "./admin.module.css";

type OgCoverData = {
  slug: string;
  title: string;
  cover: string;
  description: string;
  updatedAt: number;
  source: string;
};

function parseSlug(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return raw.replace(/^\/+|\/+$/g, "");

  const url = new URL(raw);
  const match = url.pathname.match(/\/(?:series|manga)\/([^/]+)/i);
  if (match) return decodeURIComponent(match[1]);
  return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) || "");
}

function titleFromSlug(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function pickCover(record: Record<string, unknown> | null): string {
  if (!record) return "";
  const candidates = [
    record.cover,
    record.img,
    record.image,
    record.thumbnail,
    record.thumb,
    ...(Array.isArray(record.covers) ? record.covers : []),
  ].filter(isHttpUrl).map((value) => value.trim());
  return candidates.find((url) => /i\.ibb\.co/i.test(url)) ||
    candidates.find((url) => /ibb\.co|imgbb/i.test(url)) ||
    candidates[0] ||
    "";
}

function stripHtml(value: unknown): string {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildOgUrl(data: OgCoverData): string {
  const query = new URLSearchParams({
    v: String(data.updatedAt),
    title: data.title.slice(0, 72),
    description: data.description.slice(0, 120),
    cover: data.cover,
  });
  const origin = typeof window === "undefined" ? "https://mikoroku.top" : window.location.origin;
  return `${origin}/og/series/${encodeURIComponent(data.slug)}?${query.toString()}`;
}

export default function OgCoverTool({ firestore }: { firestore: Firestore }) {
  const [seriesInput, setSeriesInput] = useState("");
  const [coverOverride, setCoverOverride] = useState("");
  const [result, setResult] = useState<OgCoverData | null>(null);
  const [status, setStatus] = useState("Paste a series URL or slug, then fetch its metadata.");
  const [busy, setBusy] = useState<"fetch" | "sync" | null>(null);

  async function fetchMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("fetch");
    setResult(null);
    setStatus("Fetching Firestore admin metadata...");

    try {
      const slug = parseSlug(seriesInput);
      if (!slug) throw new Error("Enter a valid series URL or slug.");

      let record: Record<string, unknown> | null = null;
      let source = "Firestore admin";
      let firestoreError = "";
      try {
        const snapshot = await getDoc(doc(firestore, "manga", slug));
        if (snapshot.exists()) record = snapshot.data();
      } catch (error) {
        firestoreError = error instanceof Error ? error.message : String(error);
        console.warn("OG tool could not fetch Firestore metadata.", error);
      }

      if (!record) {
        const response = await fetch("/api/catalog/manga", { credentials: "same-origin" });
        if (!response.ok) {
          throw new Error(
            `Series not found in Firestore${firestoreError ? ` (${firestoreError})` : ""}; catalog returned HTTP ${response.status}.`,
          );
        }
        const payload: unknown = await response.json();
        const catalog = Array.isArray(payload)
          ? payload
          : payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)
            ? payload.data
            : [];
        const normalize = (value: unknown) =>
          String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
        const match = catalog.find((item: unknown) =>
          Boolean(item) &&
          typeof item === "object" &&
          (normalize((item as Record<string, unknown>).slug) === normalize(slug) ||
            normalize((item as Record<string, unknown>).title) === normalize(slug)),
        );
        if (!match || typeof match !== "object") {
          throw new Error("Series metadata was not found in Firestore or the catalog.");
        }
        record = match as Record<string, unknown>;
        source = "Catalog fallback";
      }

      const override = coverOverride.trim();
      if (override && !isHttpUrl(override)) {
        throw new Error("Cover override must be a valid HTTP or HTTPS URL.");
      }
      const cover = override || pickCover(record);
      if (!cover) {
        throw new Error("No public cover URL found. Paste the cover URL from the admin metadata.");
      }

      const title = stripHtml(record.title || record.name) || titleFromSlug(slug);
      const data: OgCoverData = {
        slug,
        title,
        cover,
        description:
          stripHtml(record.desc || record.description || record.synopsis || record.sinopsis).slice(0, 300) ||
          `Baca ${title} di Mikoroku.`,
        updatedAt: Date.now(),
        source: override ? "Manual cover override" : source,
      };
      setResult(data);
      setStatus("Cover found. You can sync it or open the OG preview.");
    } catch (error) {
      console.error("OG cover metadata lookup failed.", error);
      setStatus(error instanceof Error ? error.message : "Could not load series metadata.");
    } finally {
      setBusy(null);
    }
  }

  async function syncToCache() {
    if (!result) return;
    setBusy("sync");
    setStatus("Syncing metadata to the OG cache...");
    try {
      const response = await fetch("/api/admin/sync-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(result),
      });
      const payload = await response.json().catch(() => null) as
        | { error?: string; detail?: string; ogUrl?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.detail || payload?.error || `Sync failed (HTTP ${response.status}).`);
      }

      setStatus(`Sync complete. ${payload?.ogUrl || buildOgUrl(result)}`);
    } catch (error) {
      console.error("OG cover sync failed.", error);
      setStatus(error instanceof Error ? error.message : "Could not sync OG metadata.");
    } finally {
      setBusy(null);
    }
  }

  const ogUrl = result ? buildOgUrl(result) : "";

  async function copyOgUrl() {
    if (!ogUrl) return;
    try {
      await navigator.clipboard.writeText(ogUrl);
      setStatus("OG URL copied.");
    } catch (error) {
      console.error("Could not copy the OG URL.", error);
      setStatus("Could not copy the URL. Check clipboard permission.");
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>OG Cover Tool</h2>
          <p>Load the current admin cover, sync its OG metadata, or preview the generated image.</p>
        </div>
      </div>
      <form className={styles.settingsSection} onSubmit={(event) => void fetchMetadata(event)}>
        <label className={styles.field}>
          <span>Series URL or slug</span>
          <input
            value={seriesInput}
            onChange={(event) => {
              setSeriesInput(event.target.value);
              setResult(null);
            }}
            placeholder="https://mikoroku.top/series/series-slug"
            autoComplete="url"
          />
        </label>
        <label className={`${styles.field} mt-4`}>
          <span>Cover override (optional)</span>
          <input
            value={coverOverride}
            onChange={(event) => {
              setCoverOverride(event.target.value);
              setResult(null);
            }}
            placeholder="https://image-host.example/cover.jpg"
            autoComplete="url"
          />
        </label>
        <p>Firestore is checked first for the latest admin metadata. Use an override only when the stored cover URL is unavailable.</p>
        <div className={styles.panelActions}>
          <button className={styles.primaryButton} type="submit" disabled={busy !== null}>
            {busy === "fetch" ? "Fetching..." : "1. Fetch metadata"}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={() => void syncToCache()} disabled={!result || busy !== null}>
            {busy === "sync" ? "Syncing..." : "2. Sync to KV"}
          </button>
          {result ? (
            <a className={styles.secondaryButton} href={ogUrl} target="_blank" rel="noopener noreferrer">
              3. Open OG
            </a>
          ) : (
            <button className={styles.secondaryButton} type="button" disabled>
              3. Open OG
            </button>
          )}
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => void copyOgUrl()}
            disabled={!result}
          >
            Copy URL
          </button>
        </div>
      </form>

      <p className={styles.inlineStatus} role="status" aria-live="polite">{status}</p>
      {result && (
        <div className={styles.settingsSection}>
          <div className="flex flex-wrap items-center gap-4">
            <img className={styles.coverPreview} src={result.cover} alt={`${result.title} cover`} />
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-base font-semibold">{result.title}</h3>
              <p className="my-2 text-sm opacity-75">Cover source: {result.source}</p>
              <p className="break-all text-xs opacity-70">{result.cover}</p>
            </div>
          </div>
          <label className={`${styles.field} mt-4`}>
            <span>Generated OG URL</span>
            <textarea readOnly rows={3} value={ogUrl} />
          </label>
        </div>
      )}
    </section>
  );
}
