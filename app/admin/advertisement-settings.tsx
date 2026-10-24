"use client";

import { useEffect, useState, type FormEvent } from "react";
import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import {
  AD_PLACEMENTS,
  DEFAULT_ADVERTISEMENTS,
  parseAdvertisements,
  type Advertisement,
} from "../lib/advertisements";
import styles from "./admin.module.css";

type AdvertisementSettingsProps = {
  firestore: Firestore;
};

type AdvertisementDraft = Omit<Advertisement, "id">;

const emptyDraft: AdvertisementDraft = {
  name: "",
  type: "page",
  enabled: true,
  code: "",
  pathPattern: "/",
  placement: "site-top",
  height: 250,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred.";
}

export default function AdvertisementSettings({ firestore }: AdvertisementSettingsProps) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [draft, setDraft] = useState<AdvertisementDraft>({ ...emptyDraft });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getDoc(doc(firestore, "meta", "mangaSummary"))
      .then((snapshot) => {
        if (!active) return;
        if (!snapshot.exists() || !Object.prototype.hasOwnProperty.call(snapshot.data(), "siteAds")) {
          setAdvertisements(DEFAULT_ADVERTISEMENTS.map((advertisement) => ({ ...advertisement })));
        } else {
          setAdvertisements(parseAdvertisements(snapshot.data().siteAds));
        }
      })
      .catch((loadError: unknown) => {
        console.error("Failed to load advertisement settings.", loadError);
        if (active) setError(`Failed to load advertisements: ${getErrorMessage(loadError)}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [firestore]);

  async function persistAdvertisements(nextAdvertisements: Advertisement[]): Promise<boolean> {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await setDoc(
        doc(firestore, "meta", "mangaSummary"),
        { siteAds: nextAdvertisements, siteAdsUpdatedAt: serverTimestamp() },
        { merge: true },
      );
      setAdvertisements(nextAdvertisements);
      setStatus("Advertisement settings saved.");
      return true;
    } catch (saveError) {
      console.error("Failed to save advertisement settings.", saveError);
      setError(`Failed to save advertisements: ${getErrorMessage(saveError)}`);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveAdvertisement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    const code = draft.code.trim();
    const pathPattern = draft.pathPattern.trim() || "/";
    if (!name || !code) {
      setError("Enter an advertisement name and script.");
      return;
    }
    if (name.length > 100 || pathPattern.length > 200) {
      setError("The name must be at most 100 characters and the URL pattern at most 200 characters.");
      return;
    }
    if (code.length > 50_000) {
      setError("The script is too large. Keep it under 50,000 characters.");
      return;
    }
    const savedCodeSize = advertisements.reduce(
      (total, advertisement) => total + (advertisement.id === editingId ? 0 : advertisement.code.length),
      0,
    );
    if (savedCodeSize + code.length > 50_000) {
      setError("The combined advertisement scripts must stay under 50,000 characters.");
      return;
    }
    if (draft.type === "page" && !pathPattern.startsWith("/")) {
      setError("Page path must start with /.");
      return;
    }
    if (draft.type === "page" && (!Number.isInteger(draft.height) || draft.height < 100 || draft.height > 800)) {
      setError("Banner height must be between 100 and 800 pixels.");
      return;
    }
    if (!editingId && advertisements.length >= 50) {
      setError("A maximum of 50 advertisements can be configured.");
      return;
    }

    const nextAdvertisement: Advertisement = {
      ...draft,
      id: editingId || globalThis.crypto.randomUUID(),
      name,
      code,
      pathPattern,
    };
    const nextAdvertisements = editingId
      ? advertisements.map((advertisement) =>
        advertisement.id === editingId ? nextAdvertisement : advertisement)
      : [...advertisements, nextAdvertisement];

    if (await persistAdvertisements(nextAdvertisements)) {
      setDraft({ ...emptyDraft });
      setEditingId(null);
    }
  }

  function editAdvertisement(advertisement: Advertisement) {
    setEditingId(advertisement.id);
    setDraft({
      name: advertisement.name,
      type: advertisement.type,
      enabled: advertisement.enabled,
      code: advertisement.code,
      pathPattern: advertisement.pathPattern,
      placement: advertisement.placement,
      height: advertisement.height,
    });
    setError("");
    setStatus("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ ...emptyDraft });
    setError("");
  }

  async function toggleAdvertisement(advertisement: Advertisement) {
    const nextAdvertisements = advertisements.map((item) =>
      item.id === advertisement.id ? { ...item, enabled: !item.enabled } : item);
    await persistAdvertisements(nextAdvertisements);
  }

  async function removeAdvertisement(advertisement: Advertisement) {
    if (!window.confirm(`Delete "${advertisement.name}"?`)) return;
    if (await persistAdvertisements(advertisements.filter((item) => item.id !== advertisement.id)) &&
      editingId === advertisement.id) {
      cancelEdit();
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>Advertisements</h2>
          <p>Manage site-wide scripts and page banners.</p>
        </div>
      </div>
      <p className={styles.inlineStatus}>
        Global scripts run on public pages (for example, pop-under ads). Page ads render in a sandboxed banner at the selected location and URL pattern; use * as a wildcard, such as /series/*. The existing homepage banner is preloaded here. Only add scripts from providers you trust.
      </p>

      {error && <p className={styles.errorBanner} role="alert">{error}</p>}
      {status && <p className={styles.inlineStatus} role="status">{status}</p>}
      {loading ? (
        <p className={styles.emptyState}>Loading advertisements...</p>
      ) : (
        <>
          <div className={styles.advertisementList}>
            {advertisements.length ? advertisements.map((advertisement) => (
              <article className={styles.advertisementCard} key={advertisement.id}>
                <div>
                  <strong>{advertisement.name}</strong>
                  <p>
                    {advertisement.type === "global"
                      ? "Global script"
                      : `${advertisement.pathPattern} · ${AD_PLACEMENTS.find((item) => item.value === advertisement.placement)?.label}`}
                    {" · "}{advertisement.enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div className={styles.panelActions}>
                  <button className={styles.secondaryButton} type="button" onClick={() => void toggleAdvertisement(advertisement)} disabled={saving}>
                    {advertisement.enabled ? "Disable" : "Enable"}
                  </button>
                  <button className={styles.secondaryButton} type="button" onClick={() => editAdvertisement(advertisement)} disabled={saving}>
                    Edit
                  </button>
                  <button className={styles.deleteButton} type="button" onClick={() => void removeAdvertisement(advertisement)} disabled={saving}>
                    Delete
                  </button>
                </div>
              </article>
            )) : <p className={styles.emptyState}>No advertisements configured yet.</p>}
          </div>

          <form className={styles.advertisementEditor} onSubmit={(event) => void saveAdvertisement(event)}>
            <h3>{editingId ? "Edit advertisement" : "Add advertisement"}</h3>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Name</span>
                <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} maxLength={100} required />
              </label>
              <label className={styles.field}>
                <span>Type</span>
                <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as Advertisement["type"] }))}>
                  <option value="page">Page banner</option>
                  <option value="global">Global script (pop-under)</option>
                </select>
              </label>
            </div>

            {draft.type === "page" && (
              <>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>URL pattern</span>
                    <input value={draft.pathPattern} onChange={(event) => setDraft((current) => ({ ...current, pathPattern: event.target.value }))} placeholder="/series/*" required />
                  </label>
                  <label className={styles.field}>
                    <span>Banner location</span>
                    <select value={draft.placement} onChange={(event) => setDraft((current) => ({ ...current, placement: event.target.value as Advertisement["placement"] }))}>
                      {AD_PLACEMENTS.map((placement) => <option key={placement.value} value={placement.value}>{placement.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className={styles.field}>
                  <span>Banner height (px)</span>
                  <input type="number" min={100} max={800} step={10} value={draft.height} onChange={(event) => setDraft((current) => ({ ...current, height: Number(event.target.value) }))} />
                </label>
              </>
            )}

            <label className={styles.field}>
              <span>{draft.type === "global" ? "Global script" : "Banner script or HTML"}</span>
              <textarea
                className={styles.advertisementScript}
                value={draft.code}
                onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
                placeholder={draft.type === "global" ? "<script src=\"https://...\"></script>" : "<script>...</script>"}
                maxLength={50_000}
                rows={12}
                required
              />
            </label>
            <label className={styles.announcementPublishToggle}>
              <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
              <span>Enable this advertisement</span>
            </label>
            <div className={styles.panelActions}>
              <button className={styles.primaryButton} type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save Changes" : "Add Advertisement"}
              </button>
              {editingId && <button className={styles.secondaryButton} type="button" onClick={cancelEdit} disabled={saving}>Cancel</button>}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
