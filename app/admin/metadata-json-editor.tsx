"use client";

import styles from "./admin.module.css";

type MetadataCatalogSourceMode = "effective" | "baseline";
type MetadataSourceDebugOption = {
  slug: string;
  title: string;
};

type MetadataJsonEditorProps = {
  content: string;
  loading: boolean;
  saving: boolean;
  status: string;
  sourceMode: MetadataCatalogSourceMode;
  sourceSaving: boolean;
  sourceError: string;
  sourceDebugOptions: MetadataSourceDebugOption[];
  sourceDebugSlug: string;
  sourceDebugInfo: string[];
  sourceDebugLoading: boolean;
  sourceDebugError: string;
  onChange: (value: string) => void;
  onFormat: () => void;
  onReload: () => void;
  onSave: () => void;
  onSourceChange: (source: MetadataCatalogSourceMode) => void;
  onSourceDebugSlugChange: (slug: string) => void;
  onSourceDebugReload: () => void;
};

export default function MetadataJsonEditor({
  content,
  loading,
  saving,
  status,
  sourceMode,
  sourceSaving,
  sourceError,
  sourceDebugOptions,
  sourceDebugSlug,
  sourceDebugInfo,
  sourceDebugLoading,
  sourceDebugError,
  onChange,
  onFormat,
  onReload,
  onSave,
  onSourceChange,
  onSourceDebugSlugChange,
  onSourceDebugReload,
}: MetadataJsonEditorProps) {
  return (
    <section className={styles.panel}>
      <section className={styles.metadataSourceDebug} aria-labelledby="metadata-source-debug-heading">
        <div className={styles.metadataSourceDebugHeading}>
          <div>
            <h2 id="metadata-source-debug-heading">Metadata source debug</h2>
            <p>
              Choose the catalog source for {process.env.NODE_ENV === "development" ? "this browser" : "all visitors"} and inspect a manga&apos;s metadata sources.
            </p>
          </div>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onSourceDebugReload}
            disabled={sourceDebugLoading || sourceSaving}
          >
            {sourceDebugLoading ? "Refreshing..." : "Refresh details"}
          </button>
        </div>
        <div className={styles.metadataSourceControls}>
          <div className={styles.metadataSourceButtons} role="group" aria-label="Choose global catalog source">
            <button
              className={`${styles.secondaryButton} ${sourceMode === "effective" ? styles.selectedMetadataSource : ""}`}
              type="button"
              aria-pressed={sourceMode === "effective"}
              disabled={sourceSaving || sourceDebugLoading}
              onClick={() => onSourceChange("effective")}
            >
              {sourceSaving
                ? "Applying..."
                : sourceMode === "effective"
                  ? `Effective catalog (${process.env.NODE_ENV === "development" ? "local" : "global"})`
                  : "Effective catalog"}
            </button>
            <button
              className={`${styles.secondaryButton} ${sourceMode === "baseline" ? styles.selectedMetadataSource : ""}`}
              type="button"
              aria-pressed={sourceMode === "baseline"}
              disabled={sourceSaving || sourceDebugLoading}
              onClick={() => onSourceChange("baseline")}
            >
              {sourceSaving
                ? "Applying..."
                : sourceMode === "baseline"
                  ? `Catalog baseline (${process.env.NODE_ENV === "development" ? "local" : "global"})`
                  : "Catalog baseline"}
            </button>
          </div>
          <label className={`${styles.field} ${styles.metadataSourceMangaSelect}`}>
            <span>Inspect manga</span>
            <select
              value={sourceDebugSlug}
              onChange={(event) => onSourceDebugSlugChange(event.target.value)}
              disabled={sourceDebugLoading || sourceDebugOptions.length === 0}
            >
              {sourceDebugOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        {sourceError && <p className={styles.error} role="alert">{sourceError}</p>}
        {sourceDebugError && <p className={styles.error} role="alert">{sourceDebugError}</p>}
        {sourceDebugLoading
          ? <p className={styles.metadataSourceDebugStatus}>Loading source details...</p>
          : sourceDebugInfo.length > 0
            ? <ul className={styles.metadataSourceDebugList}>
                {sourceDebugInfo.map((item) => <li key={item}>{item}</li>)}
              </ul>
            : <p className={styles.metadataSourceDebugStatus}>No source details available for this catalog.</p>}
      </section>
      <div className={styles.panelHeading}>
        <div>
          <h2>metadata.json</h2>
          <p>Edit the catalog JSON here. Saving updates the catalog and only changed manga records in Firestore.</p>
        </div>
        <div className={styles.panelActions}>
          <button className={styles.secondaryButton} type="button" onClick={onReload} disabled={loading || saving}>
            {loading ? "Loading..." : "Reload"}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onFormat} disabled={loading || saving || !content.trim()}>
            Format JSON
          </button>
          <button className={styles.primaryButton} type="button" onClick={onSave} disabled={loading || saving || !content.trim()}>
            {saving ? "Saving..." : "Save metadata.json"}
          </button>
        </div>
      </div>
      {status && <p className={styles.inlineStatus} role="status" aria-live="polite">{status}</p>}
      <textarea
        className={styles.metadataJsonTextarea}
        aria-label="metadata.json contents"
        spellCheck={false}
        value={content}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || saving}
      />
      <p className={styles.metadataJsonHint}>
        The deployed JSON file remains as a fallback. The Firestore copy is used as the current catalog after saving.
      </p>
    </section>
  );
}
