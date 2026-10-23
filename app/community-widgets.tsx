"use client";

import { useEffect, useRef, useState } from "react";
import "./community-widgets.css";

declare global {
  interface Window {
    DOMPurify?: unknown;
    md5?: unknown;
    setCommentCommunityPageId?: (pageId: string) => void;
    setEmojiCommunityPageId?: (pageId: string) => void;
    __mikorokuCommunityWidgets?: CommunityWidgetRuntime;
  }
}

type CommunityWidgetsProps = {
  pageId: string;
  className?: string;
};

type CommunityWidgetRuntime = {
  root: HTMLElement;
  parking: HTMLElement;
  pageId: string;
  initialization: Promise<void> | null;
};

const widgets = [
  { id: "custom-comment-widget", path: "/Features/Hakoroku/comment.html" },
  { id: "emoji-widget", path: "/Features/emoji-reaction.html" },
];

const STYLE_ATTR = "data-mikoroku-widget-style";

function parseWidgetHtml(raw: string): { bodyHtml: string; styleHtml: string; scriptsHtml: string[] } {
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let bodyHtml = bodyMatch ? bodyMatch[1] : raw;

  const styles = raw.match(/<style[\s\S]*?<\/style>/gi) || [];
  const links = raw.match(/<link[^>]*>/gi) || [];
  const scriptsHtml = raw.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
  const styleHtml = [...styles, ...links].join("\n");

  bodyHtml = bodyHtml
    .replace(/<!DOCTYPE[\s\S]*?>/i, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  return { bodyHtml, styleHtml, scriptsHtml };
}

function injectWidgetStyles(styleHtml: string, owner: string) {
  if (!styleHtml.trim()) return;
  if (document.head.querySelector(`[${STYLE_ATTR}="${owner}"]`)) return;

  const wrap = document.createElement("div");
  wrap.innerHTML = styleHtml;
  [...wrap.childNodes].forEach((node) => {
    if (node.nodeType !== 1) return;
    const element = node as HTMLElement;
    element.setAttribute(STYLE_ATTR, owner);
    document.head.appendChild(element);
  });
}

function getCommunityRuntime(): CommunityWidgetRuntime {
  const existing = window.__mikorokuCommunityWidgets;
  if (existing) return existing;

  const root = document.createElement("section");
  root.className = "community-widgets";
  root.setAttribute("aria-label", "Comments and reactions");
  root.innerHTML = `
    <div id="emoji-widget" class="community-reactions"></div>
    <div id="custom-comment-widget" class="community-comments"></div>
  `;

  const parking = document.createElement("div");
  parking.hidden = true;
  parking.setAttribute("data-community-widget-parking", "");
  document.body.appendChild(parking);
  parking.appendChild(root);

  const runtime: CommunityWidgetRuntime = {
    root,
    parking,
    pageId: "",
    initialization: null,
  };
  window.__mikorokuCommunityWidgets = runtime;
  return runtime;
}

async function loadWidget(widget: (typeof widgets)[number], runtime: CommunityWidgetRuntime) {
  const container = runtime.root.querySelector<HTMLElement>(`#${widget.id}`);
  if (!container) throw new Error(`Widget container ${widget.id} was not found.`);

  const response = await fetch(widget.path);
  if (!response.ok) throw new Error(`Widget ${widget.id} returned HTTP ${response.status}.`);

  const raw = await response.text();
  const { bodyHtml, styleHtml, scriptsHtml } = parseWidgetHtml(raw);
  injectWidgetStyles(styleHtml, widget.id);

  const template = document.createElement("template");
  template.innerHTML = bodyHtml;
  template.content.querySelectorAll("title").forEach((title) => title.remove());
  container.replaceChildren(template.content);

  const scriptsTemplate = document.createElement("template");
  scriptsTemplate.innerHTML = scriptsHtml.join("\n");
  const scripts = [...scriptsTemplate.content.querySelectorAll("script")];
  for (const original of scripts) {
    if (original.src && isLibraryAvailable(original.src)) continue;

    const script = document.createElement("script");
    if (original.type) script.type = original.type;
    if (original.src) {
      script.src = original.src;
      script.async = false;
    } else {
      script.textContent = original.textContent;
    }

    const loaded = original.src || original.type === "module"
      ? new Promise<void>((resolve, reject) => {
        script.addEventListener("load", () => resolve(), { once: true });
        script.addEventListener("error", () => reject(new Error(`Failed to load ${original.src || widget.path}`)), { once: true });
      })
      : null;
    document.body.appendChild(script);
    if (loaded) await loaded;
  }
}

async function initializeWidgets(runtime: CommunityWidgetRuntime) {
  for (const widget of widgets) {
    await loadWidget(widget, runtime);
  }
}

export default function CommunityWidgets({ pageId, className = "" }: CommunityWidgetsProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [widgetError, setWidgetError] = useState("");
  const communityPageId = pageId.replace(/[^a-zA-Z0-9_-]/g, "_");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const runtime = getCommunityRuntime();
    document.documentElement.dataset.communityPageId = communityPageId;
    runtime.pageId = communityPageId;
    runtime.root.className = `community-widgets ${className}`.trim();
    runtime.root.hidden = false;
    mount.appendChild(runtime.root);

    let active = true;
    if (!runtime.initialization) {
      runtime.initialization = initializeWidgets(runtime);
    } else {
      window.setCommentCommunityPageId?.(communityPageId);
      window.setEmojiCommunityPageId?.(communityPageId);
    }

    void runtime.initialization
      .then(() => {
        if (!active) return;
        window.setCommentCommunityPageId?.(communityPageId);
        window.setEmojiCommunityPageId?.(communityPageId);
        setWidgetError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Community widgets failed to load.", error);
        setWidgetError(error instanceof Error ? error.message : "Community widgets failed to load.");
      });

    return () => {
      active = false;
      runtime.root.hidden = true;
      runtime.parking.appendChild(runtime.root);
      if (document.documentElement.dataset.communityPageId === communityPageId) {
        delete document.documentElement.dataset.communityPageId;
      }
    };
  }, [communityPageId, className]);

  return (
    <div
      ref={mountRef}
      className="community-widget-mount"
      aria-label={widgetError ? "Community widgets unavailable" : undefined}
    >
      {widgetError && <p className="community-widget-error" role="status">{widgetError}</p>}
    </div>
  );
}

function isLibraryAvailable(src: string): boolean {
  if (src.includes("firebase-app-compat.js")) return Boolean(window.firebase?.apps?.length);
  if (src.includes("firebase-auth-compat.js")) return Boolean(window.firebase?.auth);
  if (src.includes("firebase-firestore-compat.js")) return Boolean(window.firebase?.firestore);
  if (src.includes("purify.min.js")) return Boolean(window.DOMPurify);
  if (src.includes("md5.min.js")) return Boolean(window.md5);
  return false;
}
