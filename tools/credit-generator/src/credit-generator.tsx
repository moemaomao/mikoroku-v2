"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  deleteCreditProject,
  deleteTeamPreset,
  listCreditProjects,
  listTeamPresets,
  loadGeneratorSetting,
  saveCreditProject,
  saveGeneratorSetting,
  saveTeamPreset,
} from "./storage/indexed-db";
import { loadMikorokuMangaCatalog } from "./metadata-sync/mikoroku-catalog";
import { renderCreditCard } from "./renderer/render-credit";
import { CREDIT_TEMPLATES } from "./templates/templates";
import {
  CREDIT_ROLES,
  createEmptyProject,
  FORMAT_DIMENSIONS,
  getCreditDimensions,
  normalizeCreditTemplate,
  type CreditFormat,
  type CreditProject,
  type CreditRole,
  type MangaMetadata,
  type TeamPreset,
} from "./types";
import styles from "./credit-generator.module.css";

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ||
    `credit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Choose an image file."));
  }
  if (file.size > 12 * 1024 * 1024) {
    return Promise.reject(new Error("Manual cover files must be 12 MB or smaller."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The selected cover could not be read."));
    };
    reader.onerror = () => reject(reader.error || new Error("The selected cover could not be read."));
    reader.readAsDataURL(file);
  });
}

function createTeamPreset(name: string, project: CreditProject): TeamPreset {
  return {
    id: createId(),
    name: name.trim(),
    credits: { ...project.credits },
  };
}

function downloadCanvas(canvas: HTMLCanvasElement, format: "png" | "jpeg"): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The image could not be exported. Check that the selected cover allows canvas export."));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mikoroku-credit.${format === "jpeg" ? "jpg" : "png"}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, format === "png" ? "image/png" : "image/jpeg", 0.96);
  });
}

export default function CreditGenerator() {
  const [project, setProject] = useState<CreditProject>(() => createEmptyProject());
  const [catalog, setCatalog] = useState<MangaMetadata[]>([]);
  const [searchText, setSearchText] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [presets, setPresets] = useState<TeamPreset[]>([]);
  const [projects, setProjects] = useState<CreditProject[]>([]);
  const [presetName, setPresetName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [metadataRefresh, setMetadataRefresh] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderSequenceRef = useRef(0);
  const renderPromiseRef = useRef<Promise<void>>(Promise.resolve());

  const searchResults = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    if (query.length < 2) return [];
    return catalog.filter((item) =>
      `${item.title} ${item.altTitle} ${item.slug}`.toLocaleLowerCase().includes(query),
    ).slice(0, 10);
  }, [catalog, searchText]);

  useEffect(() => {
    let active = true;
    const requestedSlug = new URLSearchParams(window.location.search).get("slug");
    void Promise.allSettled([
      loadMikorokuMangaCatalog(),
      listTeamPresets(),
      listCreditProjects(),
      loadGeneratorSetting<CreditProject>("draft"),
    ]).then((results) => {
      if (!active) return;
      const [catalogResult, presetsResult, projectsResult, draftResult] = results;
      const records = catalogResult.status === "fulfilled" ? catalogResult.value : [];
      if (catalogResult.status === "fulfilled") {
        setCatalog(records);
      } else {
        console.error("Credit Generator manga catalog could not be loaded.", catalogResult.reason);
        setCatalogError(catalogResult.reason instanceof Error
          ? catalogResult.reason.message
          : "The MikoRoku metadata catalog could not be loaded.");
      }

      const storageAvailable = presetsResult.status === "fulfilled" &&
        projectsResult.status === "fulfilled" &&
        draftResult.status === "fulfilled";
      if (storageAvailable) {
        setPresets(presetsResult.value);
        setProjects(projectsResult.value.sort((left, right) => right.id.localeCompare(left.id)));
      } else {
        const storageError = [presetsResult, projectsResult, draftResult]
          .find((result) => result.status === "rejected");
        const reason = storageError?.status === "rejected" ? storageError.reason : null;
        console.error("Credit Generator local storage could not be loaded.", reason);
        setStorageError(reason instanceof Error
          ? reason.message
          : "Local generator storage could not be loaded. Projects and presets may not persist.");
      }

      const empty = createEmptyProject();
      const savedDraft = draftResult.status === "fulfilled" ? draftResult.value : null;
      const draft = storageAvailable && savedDraft
        ? {
            ...empty,
            ...savedDraft,
            discord: savedDraft.discord?.trim() || empty.discord,
            facebook: savedDraft.facebook?.trim() || empty.facebook,
            trakteer: savedDraft.trakteer?.trim() || empty.trakteer,
            paypal: savedDraft.paypal?.trim() || empty.paypal,
            website: savedDraft.website?.trim() || empty.website,
            websiteAlternative: savedDraft.websiteAlternative?.trim() || empty.websiteAlternative,
            credits: { ...empty.credits, ...savedDraft.credits },
          }
        : empty;
      draft.template = normalizeCreditTemplate(draft.template);
      if (!draft.logoSource) {
        draft.logoSource = empty.logoSource;
      }
      const requestedManga = requestedSlug
        ? records.find((item) => item.slug === requestedSlug)
        : undefined;
      if (requestedManga) {
        draft.manga = requestedManga;
        draft.coverSource = requestedManga.cover || requestedManga.covers[0] || "";
        setSearchText(requestedManga.title);
      }
      setProject(draft);
      setProjectName(draft.name);
      setStorageReady(storageAvailable);
      setCatalogLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => {
      void saveGeneratorSetting("draft", project).catch((saveError: unknown) => {
        console.error("Credit Generator draft could not be saved.", saveError);
        setError(saveError instanceof Error ? saveError.message : "The generator draft could not be saved.");
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [project, storageReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderId = ++renderSequenceRef.current;
    const controller = new AbortController();
    setRendering(true);
    setError("");
    const request = renderCreditCard(canvas, project, controller.signal);
    renderPromiseRef.current = request;
    void request.then(() => {
      if (renderId === renderSequenceRef.current) setRendering(false);
    }).catch((renderError: unknown) => {
      if (renderId !== renderSequenceRef.current) return;
      console.error("Credit preview could not be rendered.", renderError);
      setRendering(false);
      setError(renderError instanceof Error ? renderError.message : "The credit preview could not be rendered.");
    });
    return () => controller.abort();
  }, [project]);

  function updateProject<K extends keyof CreditProject>(key: K, value: CreditProject[K]): void {
    setProject((current) => ({ ...current, [key]: value }));
  }

  function selectManga(manga: MangaMetadata): void {
    setProject((current) => ({
      ...current,
      manga,
      coverSource: manga.cover || manga.covers[0] || "",
    }));
    setSearchText(manga.title);
    setStatus(`Selected ${manga.title}. Metadata is read-only.`);
    setError("");
  }

  async function refreshMetadata(): Promise<void> {
    setMetadataRefresh(true);
    setCatalogError("");
    setStatus("");
    try {
      const freshCatalog = await loadMikorokuMangaCatalog(true);
      setCatalog(freshCatalog);
      const fresh = project.manga
        ? freshCatalog.find((item) => item.slug === project.manga?.slug)
        : undefined;
      if (fresh) {
        setProject((current) => ({
          ...current,
          manga: fresh,
          coverSource: current.coverSource.startsWith("data:")
            ? current.coverSource
            : fresh.cover || fresh.covers[0] || "",
        }));
        setStatus("Manga metadata and cover were refreshed from the MikoRoku catalog.");
      } else {
        setStatus(project.manga
          ? "Catalog refreshed. The selected manga was not found; current selection was kept."
          : "MikoRoku metadata catalog refreshed.");
      }
    } catch (refreshError) {
      console.error("MikoRoku metadata refresh failed.", refreshError);
      setCatalogError(refreshError instanceof Error ? refreshError.message : "Metadata refresh failed.");
    } finally {
      setMetadataRefresh(false);
    }
  }

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>,
    target: "coverSource" | "logoSource",
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      updateProject(target, dataUrl);
      setStatus(`${target === "coverSource" ? "Manual cover" : "Logo"} loaded: ${file.name}`);
      setError("");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Manual cover upload failed.");
    }
  }

  async function savePreset(): Promise<void> {
    const name = presetName.trim();
    if (!name) {
      setError("Enter a name for the team preset.");
      return;
    }
    const preset = createTeamPreset(name, project);
    try {
      await saveTeamPreset(preset);
      setPresets((current) => [...current.filter((item) => item.id !== preset.id), preset]);
      setPresetName("");
      setStatus(`Team preset "${name}" saved on this device.`);
      setError("");
    } catch (saveError) {
      console.error("Team preset could not be saved.", saveError);
      setError(saveError instanceof Error ? saveError.message : "Team preset could not be saved.");
    }
  }

  async function removePreset(id: string): Promise<void> {
    try {
      await deleteTeamPreset(id);
      setPresets((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      console.error("Team preset could not be deleted.", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Team preset could not be deleted.");
    }
  }

  async function saveProject(): Promise<void> {
    const name = projectName.trim();
    if (!name) {
      setError("Enter a name for the project.");
      return;
    }
    const saved = { ...project, id: project.id || createId(), name };
    try {
      await saveCreditProject(saved);
      setProject(saved);
      setProjects((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setStatus(`Project "${name}" saved on this device.`);
      setError("");
    } catch (saveError) {
      console.error("Credit project could not be saved.", saveError);
      setError(saveError instanceof Error ? saveError.message : "Credit project could not be saved.");
    }
  }

  function loadProject(id: string): void {
    const saved = projects.find((item) => item.id === id);
    if (!saved) return;
    const empty = createEmptyProject();
    setProject({
      ...empty,
      ...saved,
      template: normalizeCreditTemplate(saved.template),
      discord: saved.discord?.trim() || empty.discord,
      facebook: saved.facebook?.trim() || empty.facebook,
      trakteer: saved.trakteer?.trim() || empty.trakteer,
      paypal: saved.paypal?.trim() || empty.paypal,
      website: saved.website?.trim() || empty.website,
      websiteAlternative: saved.websiteAlternative?.trim() || empty.websiteAlternative,
      logoSource: saved.logoSource || empty.logoSource,
      credits: { ...empty.credits, ...saved.credits },
    });
    setProjectName(saved.name);
    setSearchText(saved.manga?.title || "");
    setStatus(`Loaded project "${saved.name}".`);
    setError("");
  }

  function resetDraft(): void {
    if (!window.confirm("Reset the current draft to its default settings? Saved projects and team presets will not be deleted.")) {
      return;
    }

    const empty = createEmptyProject();
    setProject(empty);
    setProjectName(empty.name);
    setSearchText("");
    setStatus("Draft reset to default settings.");
    setError("");
  }

  async function removeProject(id: string): Promise<void> {
    try {
      await deleteCreditProject(id);
      setProjects((current) => current.filter((item) => item.id !== id));
      if (project.id === id) {
        setProject((current) => ({ ...current, id: "" }));
      }
    } catch (deleteError) {
      console.error("Credit project could not be deleted.", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Credit project could not be deleted.");
    }
  }

  async function exportImage(format: "png" | "jpeg"): Promise<void> {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExporting(true);
    setError("");
    try {
      await renderPromiseRef.current;
      await downloadCanvas(canvas, format);
    } catch (exportError) {
      console.error("Credit image export failed.", exportError);
      setError(exportError instanceof Error ? exportError.message : "Image export failed.");
    } finally {
      setExporting(false);
    }
  }

  function updateCredit(role: CreditRole, value: string): void {
    setProject((current) => ({
      ...current,
      credits: { ...current.credits, [role]: value },
    }));
  }

  function applyPreset(event: ChangeEvent<HTMLSelectElement>): void {
    const preset = presets.find((item) => item.id === event.currentTarget.value);
    if (preset) setProject((current) => ({ ...current, credits: { ...preset.credits } }));
  }

  function chooseTemplate(template: CreditProject["template"]): void {
    updateProject("template", template);
  }

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <div>
          <a className={styles.backLink} href="/admin">← Admin Panel</a>
          <p className={styles.eyebrow}>MIKOROKU ADMIN TOOL</p>
          <h1>Credit Generator</h1>
          <p className={styles.subtitle}>Build manga credit cards in your browser. Metadata is read-only; projects and team presets stay on this device.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => void refreshMetadata()} disabled={metadataRefresh}>
            {metadataRefresh ? "Syncing catalog..." : "Sync metadata"}
          </button>
          <button type="button" className={styles.primaryButton} onClick={saveProject}>
            Save project
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.editor} aria-label="Credit card settings">
          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <span className={styles.step}>01</span>
              <div><h2>Manga metadata</h2><p>Search the existing MikoRoku catalog.</p></div>
            </div>
            <label className={styles.field}>
              <span>Search manga</span>
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Title, alternative title, or slug"
              />
            </label>
            {catalogLoading && <p className={styles.hint}>Loading the MikoRoku catalog...</p>}
            {catalogError && <p className={styles.error} role="alert">{catalogError}</p>}
            {searchResults.length > 0 && (
              <div className={styles.searchResults} role="listbox" aria-label="Manga search results">
                {searchResults.map((item) => (
                  <button
                    className={styles.searchResult}
                    type="button"
                    key={item.slug}
                    onClick={() => selectManga(item)}
                  >
                    {item.cover
                      ? <img src={item.cover} alt="" loading="lazy" />
                      : <span className={styles.coverFallback}>M</span>}
                    <span><strong>{item.title}</strong><small>{item.altTitle || item.slug}</small></span>
                  </button>
                ))}
              </div>
            )}
            {project.manga && (
              <div className={styles.selectedManga}>
                <strong>{project.manga.title}</strong>
                <small>{project.manga.slug} · {project.manga.author || "Author not listed"} · {project.manga.artist || "Artist not listed"}</small>
              </div>
            )}
            {project.manga && [project.manga.cover, ...project.manga.covers].filter(Boolean).length > 1 && (
              <label className={styles.field}>
                <span>Catalog cover</span>
                <select
                  value={project.coverSource.startsWith("data:") ? "__manual__" : project.coverSource}
                  onChange={(event) => {
                    if (event.currentTarget.value !== "__manual__") {
                      updateProject("coverSource", event.currentTarget.value);
                    }
                  }}
                >
                  {project.coverSource.startsWith("data:") && <option value="__manual__">Manual upload selected</option>}
                  {[...new Set([project.manga.cover, ...project.manga.covers].filter(Boolean))].map((cover) => (
                    <option key={cover} value={cover}>{cover === project.manga?.cover ? "Main cover" : "Alternative cover"}</option>
                  ))}
                </select>
              </label>
            )}
            <label className={styles.uploadButton}>
              Upload manual cover
              <input type="file" accept="image/*" onChange={(event) => void uploadImage(event, "coverSource")} />
            </label>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <span className={styles.step}>02</span>
              <div><h2>Team credits</h2><p>Reuse role presets across projects.</p></div>
            </div>
            <label className={styles.field}>
              <span>Apply team preset</span>
              <select defaultValue="" onChange={applyPreset}>
                <option value="">Choose a preset</option>
                {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
              </select>
            </label>
            <div className={styles.fieldGrid}>
              {CREDIT_ROLES.map(([role, label]) => (
                <label className={styles.field} key={role}>
                  <span>{label}</span>
                  <input value={project.credits[role]} onChange={(event) => updateCredit(role, event.target.value)} placeholder="Team member" />
                </label>
              ))}
            </div>
            <div className={styles.inlineSave}>
              <input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Preset name, e.g. Main team" aria-label="Team preset name" />
              <button type="button" className={styles.secondaryButton} onClick={() => void savePreset()}>Save preset</button>
            </div>
            {presets.length > 0 && (
              <ul className={styles.savedList}>
                {presets.map((preset) => (
                  <li key={preset.id}><span>{preset.name}</span><button type="button" onClick={() => void removePreset(preset.id)} aria-label={`Delete ${preset.name} preset`}>Delete</button></li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <span className={styles.step}>03</span>
              <div><h2>Design</h2><p>Change the layout, palette, and cover crop.</p></div>
            </div>
            <label className={styles.field}>
              <span>Template</span>
              <select value={project.template} onChange={(event) => chooseTemplate(event.currentTarget.value as CreditProject["template"])}>
                {CREDIT_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name} — {template.description}</option>)}
              </select>
            </label>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Export resolution</span>
                <select value={project.format} onChange={(event) => updateProject("format", event.currentTarget.value as CreditFormat)}>
                  {(Object.keys(FORMAT_DIMENSIONS) as CreditFormat[]).map((format) => {
                    const dimension = getCreditDimensions(format, project.template);
                    return (
                      <option key={format} value={format}>
                        {format === "standard" ? "Standard" : "High resolution"} — {dimension.width} × {dimension.height}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className={styles.field}>
                <span>Title font</span>
                <select value={project.titleFontFamily} onChange={(event) => updateProject("titleFontFamily", event.currentTarget.value)}>
                  <option value="Oswald">Oswald</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Impact">Impact</option><option value="Trebuchet MS">Trebuchet MS</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Body font</span>
                <select value={project.fontFamily} onChange={(event) => updateProject("fontFamily", event.currentTarget.value)}>
                  <option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Impact">Impact</option><option value="Trebuchet MS">Trebuchet MS</option>
                </select>
              </label>
              <label className={styles.colorField}><span>Accent</span><input type="color" value={project.accent} onChange={(event) => updateProject("accent", event.currentTarget.value)} /></label>
              <label className={styles.colorField}><span>Highlight</span><input type="color" value={project.highlight} onChange={(event) => updateProject("highlight", event.currentTarget.value)} /></label>
              <label className={styles.colorField}><span>Background</span><input type="color" value={project.background} onChange={(event) => updateProject("background", event.currentTarget.value)} /></label>
              <label className={styles.colorField}><span>Text color</span><input type="color" value={project.foreground} onChange={(event) => updateProject("foreground", event.currentTarget.value)} /></label>
              <label className={styles.field}>
                <span>Background source</span>
                <select
                  value={project.useCoverBackground ? "cover" : "gradient"}
                  onChange={(event) => updateProject("useCoverBackground", event.currentTarget.value === "cover")}
                >
                  <option value="cover">Cover image + gradient</option>
                  <option value="gradient">Gradient colors only</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Gradient strength ({project.coverGradientOpacity}%)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={project.coverGradientOpacity}
                  onChange={(event) => updateProject("coverGradientOpacity", Number(event.currentTarget.value))}
                />
              </label>
              <label className={styles.field}>
                <span>Background blur ({project.coverBackgroundBlur}px)</span>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={project.coverBackgroundBlur}
                  disabled={!project.useCoverBackground}
                  onChange={(event) => updateProject("coverBackgroundBlur", Number(event.currentTarget.value))}
                />
              </label>
            </div>
            <label className={styles.field}>
              <span>Logo / team name</span>
              <input value={project.logoText} onChange={(event) => updateProject("logoText", event.target.value)} />
            </label>
            <label className={styles.uploadButton}>
              Upload team / web logo
              <input type="file" accept="image/*" onChange={(event) => void uploadImage(event, "logoSource")} />
            </label>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Cover horizontal position ({project.coverFocusX}%)</span>
                <input type="range" min="0" max="100" value={project.coverFocusX} onChange={(event) => updateProject("coverFocusX", Number(event.target.value))} />
              </label>
              <label className={styles.field}>
                <span>Cover vertical position ({project.coverFocusY}%)</span>
                <input type="range" min="0" max="100" value={project.coverFocusY} onChange={(event) => updateProject("coverFocusY", Number(event.target.value))} />
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <span className={styles.step}>04</span>
              <div><h2>Project &amp; links</h2><p>Saved separately from manga metadata.</p></div>
            </div>
            <label className={styles.field}><span>Project name</span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
            <div className={styles.inlineSave}>
              <select value={project.id} aria-label="Load saved project" onChange={(event) => loadProject(event.currentTarget.value)}>
                <option value="">Load a saved project</option>
                {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {project.id && <button type="button" className={styles.textButton} onClick={() => void removeProject(project.id)}>Delete current</button>}
            </div>
            <div className={styles.fieldGrid}>
              <label className={styles.field}><span>Discord invite or label</span><input value={project.discord} onChange={(event) => updateProject("discord", event.target.value)} placeholder="discord.gg/..." /></label>
              <label className={styles.field}><span>Facebook link</span><input value={project.facebook} onChange={(event) => updateProject("facebook", event.target.value)} placeholder="facebook.com/..." /></label>
              <label className={styles.field}><span>Trakteer link</span><input value={project.trakteer} onChange={(event) => updateProject("trakteer", event.target.value)} placeholder="trakteer.id/..." /></label>
              <label className={styles.field}><span>PayPal link</span><input value={project.paypal} onChange={(event) => updateProject("paypal", event.target.value)} placeholder="paypal.me/..." /></label>
              <label className={styles.field}><span>Website</span><input value={project.website} onChange={(event) => updateProject("website", event.target.value)} placeholder="https://..." /></label>
              <label className={styles.field}><span>Alternative website</span><input value={project.websiteAlternative} onChange={(event) => updateProject("websiteAlternative", event.target.value)} placeholder="https://..." /></label>
            </div>
            <button type="button" className={`${styles.secondaryButton} ${styles.resetButton}`} onClick={resetDraft}>
              Reset draft
            </button>
          </section>
        </section>

        <aside className={styles.previewColumn} aria-label="Live preview and export">
          <div className={styles.previewHeading}>
            <div><h2>Live preview</h2><p>{getCreditDimensions(project.format, project.template).width} × {getCreditDimensions(project.format, project.template).height}</p></div>
            <span className={rendering ? styles.renderingBadge : styles.readyBadge}>{rendering ? "Rendering" : "Ready"}</span>
          </div>
          <div className={styles.canvasFrame}>
            <canvas ref={canvasRef} className={styles.canvas} aria-label="Rendered manga credit preview" />
          </div>
          <div className={styles.exportActions}>
            <button type="button" className={styles.primaryButton} disabled={exporting || rendering} onClick={() => void exportImage("png")}>{exporting ? "Exporting..." : "Export PNG"}</button>
            <button type="button" className={styles.secondaryButton} disabled={exporting || rendering} onClick={() => void exportImage("jpeg")}>Export JPG</button>
          </div>
          <p className={styles.hint}>Image rendering happens locally in your browser. Team presets and projects are stored in this browser only.</p>
        </aside>
      </div>
      {storageError && <p className={styles.error} role="alert">{storageError}</p>}
      {status && <p className={styles.status} role="status">{status}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </main>
  );
}
