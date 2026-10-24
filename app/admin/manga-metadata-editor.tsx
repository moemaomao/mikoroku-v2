"use client";

import type { FormEventHandler, RefObject } from "react";
import type { MangaDraft } from "./admin-page";
import { CoverImage } from "../lib/cover-image";
import RichTextEditor from "./rich-text-editor";
import styles from "./admin.module.css";

type MangaMetadataEditorProps = {
  draft: MangaDraft;
  editing: boolean;
  busy: boolean;
  coverFileInput: RefObject<HTMLInputElement | null>;
  onChange: (key: keyof MangaDraft, value: string | boolean) => void;
  onUploadCover: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onUpdateTimestamp: () => void;
  onCancel: () => void;
  currentUpdatedAt?: number;
};

export default function MangaMetadataEditor({
  draft,
  editing,
  busy,
  coverFileInput,
  onChange,
  onUploadCover,
  onSubmit,
  onUpdateTimestamp,
  onCancel,
  currentUpdatedAt,
}: MangaMetadataEditorProps) {
  return (
    <form className={styles.panel} onSubmit={onSubmit}>
      <div className={styles.panelHeading}>
        <div>
          <h2>{editing ? "Info & Metadata" : "Add New Manga"}</h2>
          <p>Manage manga details, description, tags, and cover art.</p>
        </div>
      </div>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Title *</span>
          <input required value={draft.title} onChange={(event) => onChange("title", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Slug *</span>
          <input required readOnly={editing} value={draft.slug} onChange={(event) => onChange("slug", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Alternative Title</span>
          <input value={draft.altTitle} onChange={(event) => onChange("altTitle", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Cover URL</span>
          <input type="url" value={draft.cover} onChange={(event) => onChange("cover", event.target.value)} />
        </label>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <span>Upload Cover</span>
          <div className={styles.fileUploadRow}>
            <input ref={coverFileInput} type="file" accept="image/*" />
            <button type="button" className={styles.secondaryButton} onClick={onUploadCover} disabled={busy}>Upload Cover</button>
          </div>
          {draft.cover && (
            <CoverImage className={styles.coverPreview} src={draft.cover} alt="Cover preview" loading="eager" optimizeWidth={200} />
          )}
        </div>
        <label className={styles.field}>
          <span>Type</span>
          <select value={draft.type} onChange={(event) => onChange("type", event.target.value)}>
            {["manga", "manhua", "manhwa", "doujinshi", "oneshot", "cg_collection", "light_novel", "web_novel", "novel"].map((type) => (
              <option value={type} key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Status</span>
          <select value={draft.status} onChange={(event) => onChange("status", event.target.value)}>
            {["ongoing", "completed", "hiatus", "dropped", "canceled"].map((status) => (
              <option value={status} key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Publication Year</span>
          <input value={draft.publication} onChange={(event) => onChange("publication", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Series</span>
          <input value={draft.series} onChange={(event) => onChange("series", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Author</span>
          <input value={draft.author} onChange={(event) => onChange("author", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Artist</span>
          <input value={draft.artist} onChange={(event) => onChange("artist", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Circle</span>
          <input value={draft.circle} onChange={(event) => onChange("circle", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Group</span>
          <input value={draft.group} onChange={(event) => onChange("group", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Serialization</span>
          <input value={draft.serialization} onChange={(event) => onChange("serialization", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Rating (0–10)</span>
          <input type="number" min="0" max="10" step="0.1" value={draft.rating} onChange={(event) => onChange("rating", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Characters</span>
          <input value={draft.characters} onChange={(event) => onChange("characters", event.target.value)} />
        </label>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <span>Description</span>
          <RichTextEditor kind="description" value={draft.desc} onChange={(value) => onChange("desc", value)} />
        </div>
        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Genres (comma-separated)</span>
          <textarea rows={2} value={draft.genres} onChange={(event) => onChange("genres", event.target.value)} />
        </label>
        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Female Tags</span>
          <textarea rows={2} value={draft.femaleTags} onChange={(event) => onChange("femaleTags", event.target.value)} />
        </label>
        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Male Tags</span>
          <textarea rows={2} value={draft.maleTags} onChange={(event) => onChange("maleTags", event.target.value)} />
        </label>
        <label className={`${styles.field} ${styles.fullWidth}`}>
          <span>Tags</span>
          <textarea rows={2} value={draft.tags} onChange={(event) => onChange("tags", event.target.value)} />
        </label>
      </div>
      <label className={styles.checkboxField}>
        <input type="checkbox" checked={draft.isDraft} onChange={(event) => onChange("isDraft", event.target.checked)} />
        <span>Save as Draft</span>
      </label>
      <section className={styles.timestampSection} aria-label="Update timestamp">
        <div className={styles.panelHeading}>
          <div>
            <h3>Update Timestamp</h3>
            {currentUpdatedAt ? (
              <p>Current: {new Date(currentUpdatedAt).toLocaleString()}</p>
            ) : null}
          </div>
        </div>
        <div className={styles.timestampControls}>
          <label className={styles.field}>
            <span>Date &amp; Time</span>
            <input
              type="datetime-local"
              value={draft.updateDate}
              onChange={(event) => onChange("updateDate", event.target.value)}
            />
          </label>
          <div className={styles.timestampActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onChange("updateDate", new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16))}
              disabled={busy}
            >
              Now
            </button>
            {editing && (
              <button
                type="button"
                className={styles.timestampUpdateButton}
                onClick={onUpdateTimestamp}
                disabled={busy}
              >
                {busy ? "Updating..." : "Update"}
              </button>
            )}
          </div>
        </div>
      </section>
      <div className={styles.formActions}>
        <button className={styles.primaryButton} disabled={busy}>{busy ? "Saving..." : "Save Manga"}</button>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
