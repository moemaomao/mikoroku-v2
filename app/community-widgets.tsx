"use client";

import { useEffect, useState } from "react";
import "./community-widgets.css";

declare global {
  interface Window {
    DOMPurify?: unknown;
    md5?: unknown;
  }
}

type CommunityWidgetsProps = {
  pageId: string;
  className?: string;
};

const widgets = [
  { id: "emoji-widget", path: "/Features/emoji-reaction.html" },
  { id: "custom-comment-widget", path: "/Features/Hakoroku/comment.html" },
];

const PORTAL_MODAL_IDS = [
  "user-settings-modal",
  "email-auth-modal",
  "dm-modal",
  "report-modal",
  "reply-notif-overlay",
  "user-profile-modal",
];

function sanitizeWidgetHtml(raw: string): string {
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let bodyHtml = bodyMatch ? bodyMatch[1] : raw;

  const headMatch = raw.match(/<head[^>]*>([\s\S]*)<\/head>/i);
  let headAssets = "";
  if (headMatch) {
    const head = headMatch[1]
      .replace(/<title[\s\S]*?<\/title>/gi, "")
      .replace(/<meta[\s\S]*?>/gi, "");
    const styles = head.match(/<style[\s\S]*?<\/style>/gi) || [];
    const links = head.match(/<link[^>]*>/gi) || [];
    headAssets = [...styles, ...links].join("\n");
  } else {
    bodyHtml = bodyHtml.replace(/<title[\s\S]*?<\/title>/gi, "");
  }

  bodyHtml = bodyHtml
    .replace(/<!DOCTYPE[\s\S]*?>/i, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "");

  return `${headAssets}\n${bodyHtml}`;
}

function portalModalsToBody() {
  for (const id of PORTAL_MODAL_IDS) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
  }
}

export default function CommunityWidgets({ pageId, className = "" }: CommunityWidgetsProps) {
  const [widgetError, setWidgetError] = useState("");
  const communityPageId = pageId.replace(/[^a-zA-Z0-9_-]/g, "_");

  useEffect(() => {
    let cancelled = false;
    document.documentElement.dataset.communityPageId = communityPageId;

    async function loadWidgets() {
      try {
        const deadline = Date.now() + 15000;
        while (!window.firebase?.firestore && Date.now() < deadline) {
          await new Promise((resolve) => window.setTimeout(resolve, 100));
        }
        if (!window.firebase?.firestore) throw new Error("Comments are currently unavailable.");

        for (const widget of widgets) {
          const container = document.getElementById(widget.id);
          if (!container || cancelled) return;
          const response = await fetch(widget.path);
          if (!response.ok) throw new Error(`Widget ${widget.id} returned HTTP ${response.status}.`);

          const raw = await response.text();
          const html = sanitizeWidgetHtml(raw);

          const template = document.createElement("template");
          template.innerHTML = html;
          const scripts = [...template.content.querySelectorAll("script")];
          scripts.forEach((script) => script.remove());
          template.content.querySelectorAll("title").forEach((t) => t.remove());
          container.replaceChildren(template.content);

          if (widget.id === "custom-comment-widget") {
            portalModalsToBody();
          }

          for (const original of scripts) {
            if (cancelled) return;
            if (original.src && isLibraryAvailable(original.src)) continue;

            const script = document.createElement("script");
            if (original.type) script.type = original.type;
            if (original.src) {
              script.src = original.src;
              script.async = false;
            } else {
              script.textContent = original.textContent;
            }
            document.body.appendChild(script);
            if (original.src) {
              await new Promise<void>((resolve, reject) => {
                script.addEventListener("load", () => resolve(), { once: true });
                script.addEventListener("error", () => reject(new Error(`Failed to load ${original.src}`)), { once: true });
              });
            }
          }

          if (widget.id === "custom-comment-widget") {
            requestAnimationFrame(() => portalModalsToBody());
          }
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Community widgets failed to load.", error);
        setWidgetError(error instanceof Error ? error.message : "Community widgets failed to load.");
      }
    }

    void loadWidgets();
    return () => {
      cancelled = true;
      if (document.documentElement.dataset.communityPageId === communityPageId) {
        delete document.documentElement.dataset.communityPageId;
      }
    };
  }, [communityPageId]);

  return (
    <section className={`community-widgets ${className}`.trim()} aria-label="Comments and reactions">
      <div id="emoji-widget" className="community-reactions" />
      <div id="custom-comment-widget" className="community-comments" />
      {widgetError && <p className="community-widget-error" role="status">{widgetError}</p>}
    </section>
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
