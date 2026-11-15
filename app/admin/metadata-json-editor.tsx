"use client";

import styles from "./admin.module.css";

type MetadataJsonEditorProps = {
  content: string;
  loading: boolean;
  saving: boolean;
  status: string;
  onChange: (value: string) => void;
  onFormat: () => void;
  onReload: () => void;
  onSave: () => void;
};

export default function MetadataJsonEditor({
  content,
  loading,
  saving,
  status,
  onChange,
  onFormat,
  onReload,
  onSave,
}: MetadataJsonEditorProps) {
  return (
    <section className={styles.panel}>
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
