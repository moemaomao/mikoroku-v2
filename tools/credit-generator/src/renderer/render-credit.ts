import { imageProxyUrl } from "../../../../lib/image-proxy";
import discordLogo from "../assets/sosial/discord.webp";
import facebookLogo from "../assets/sosial/facebook.webp";
import paypalLogo from "../assets/sosial/paypal.png";
import websiteLogo from "../assets/sosial/website.webp";
import { CREDIT_ROLES, getCreditDimensions, type CreditProject, type CreditRole } from "../types";

const BASE_WIDTH = 1080;
const BASE_HEIGHT = 1440;
const SPLIT_HEIGHT = 540;
const MINIMAL_HEIGHT = 1080;
const coverRequests = new Map<string, Promise<HTMLImageElement>>();

type SocialIconKind = "discord" | "facebook" | "trakteer" | "paypal" | "website";

const SOCIAL_LOGO_URLS: Partial<Record<SocialIconKind, string>> = {
  discord: typeof discordLogo === "string" ? discordLogo : discordLogo.src,
  facebook: typeof facebookLogo === "string" ? facebookLogo : facebookLogo.src,
  paypal: typeof paypalLogo === "string" ? paypalLogo : paypalLogo.src,
  website: typeof websiteLogo === "string" ? websiteLogo : websiteLogo.src,
};

const socialLogoCache = new Map<string, HTMLImageElement | null>();
let socialLogosReady: Promise<void> | null = null;

function loadSocialLogos(): Promise<void> {
  if (socialLogosReady) return socialLogosReady;

  socialLogosReady = Promise.all(
    Object.entries(SOCIAL_LOGO_URLS).map(async ([kind, url]) => {
      try {
        const img = await loadCover(url);
        socialLogoCache.set(kind, img);
      } catch (error) {
        console.warn(`Could not load the ${kind} social icon; using its drawn fallback.`, error);
        socialLogoCache.set(kind, null);
      }
    }),
  ).then(() => undefined);

  return socialLogosReady;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function drawCoverGradientBackground(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  image: HTMLImageElement | null,
  width: number,
  height: number,
): void {
  if (project.useCoverBackground && image) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) * (project.coverFocusX / 100);
    const sourceY = (image.naturalHeight - sourceHeight) * (project.coverFocusY / 100);
    const bleed = project.coverBackgroundBlur * 2;
    context.save();
    context.filter = `blur(${project.coverBackgroundBlur}px)`;
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -bleed,
      -bleed,
      width + bleed * 2,
      height + bleed * 2,
    );
    context.restore();
  } else {
    context.fillStyle = project.background;
    context.fillRect(0, 0, width, height);
  }

  const strength = Math.min(1, Math.max(0, project.coverGradientOpacity / 100));
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, project.accent);
  gradient.addColorStop(0.48, project.background);
  gradient.addColorStop(1, project.background);
  context.save();
  context.globalAlpha = strength * 0.62;
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.globalAlpha = strength * 0.24;
  context.fillStyle = project.background;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function loadCover(source: string): Promise<HTMLImageElement> {
  const cached = coverRequests.get(source);
  if (cached) return cached;

  const request = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Cover could not be loaded. Try syncing the cover again or upload it manually."));
    const sourceUrl = /^https?:\/\//i.test(source) ? new URL(source) : null;
    image.src = sourceUrl
      ? sourceUrl.origin === window.location.origin
        ? sourceUrl.href
        : imageProxyUrl(source, "coverDetail", undefined, false)
      : source;
  });
  coverRequests.set(source, request);
  void request.catch(() => coverRequests.delete(source));
  return request;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
  render = true,
): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      if (render) context.fillText(line, x, y + lines * lineHeight, maxWidth);
      line = word;
      lines += 1;
      if (lines >= maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines < maxLines) {
    if (render) context.fillText(line, x, y + lines * lineHeight, maxWidth);
    lines += 1;
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/*  Role Icons (refined geometric)                                    */
/* ------------------------------------------------------------------ */

function drawRoleIcon(
  context: CanvasRenderingContext2D,
  role: CreditRole,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const s = size;

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(1.6, s * 0.07);
  context.lineCap = "round";
  context.lineJoin = "round";

  switch (role) {
    case "translator": {
      // Dual speech bubbles (EN + JP)
      // Left bubble
      context.beginPath();
      context.roundRect(x + s * 0.06, y + s * 0.1, s * 0.52, s * 0.42, s * 0.1);
      context.stroke();
      // Left tail
      context.beginPath();
      context.moveTo(x + s * 0.2, y + s * 0.52);
      context.lineTo(x + s * 0.12, y + s * 0.66);
      context.lineTo(x + s * 0.32, y + s * 0.52);
      context.closePath();
      context.fill();
      // Right bubble
      context.beginPath();
      context.roundRect(x + s * 0.42, y + s * 0.38, s * 0.52, s * 0.42, s * 0.1);
      context.stroke();
      // Right tail
      context.beginPath();
      context.moveTo(x + s * 0.72, y + s * 0.8);
      context.lineTo(x + s * 0.84, y + s * 0.92);
      context.lineTo(x + s * 0.86, y + s * 0.8);
      context.closePath();
      context.fill();
      // Letters
      context.font = `800 ${s * 0.28}px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("A", x + s * 0.32, y + s * 0.31);
      context.font = `700 ${s * 0.24}px Arial`;
      context.fillText("文", x + s * 0.68, y + s * 0.59);
      break;
    }

    case "typesetter": {
      // Document with clean text lines
      context.beginPath();
      context.roundRect(x + s * 0.16, y + s * 0.08, s * 0.68, s * 0.84, s * 0.08);
      context.stroke();
      // Text lines
      const lineWidths = [0.48, 0.38, 0.48, 0.3];
      lineWidths.forEach((lineWidth, index) => {
        const ly = y + s * (0.28 + index * 0.16);
        context.beginPath();
        context.moveTo(x + s * 0.26, ly);
        context.lineTo(x + s * 0.26 + s * lineWidth, ly);
        context.stroke();
      });
      break;
    }

    case "cleaner": {
      // Eraser with a clear dividing seam
      context.save();
      context.translate(cx, cy);
      context.rotate(-Math.PI / 4);
      context.beginPath();
      context.roundRect(-s * 0.21, -s * 0.35, s * 0.42, s * 0.7, s * 0.06);
      context.stroke();
      context.beginPath();
      context.moveTo(-s * 0.21, s * 0.02);
      context.lineTo(s * 0.21, s * 0.02);
      context.stroke();
      context.restore();
      break;
    }

    case "redrawer": {
      // Picture frame + pencil
      // Frame
      context.beginPath();
      context.roundRect(x + s * 0.08, y + s * 0.12, s * 0.58, s * 0.6, s * 0.06);
      context.stroke();
      // Mountain / landscape
      context.beginPath();
      context.moveTo(x + s * 0.14, y + s * 0.62);
      context.lineTo(x + s * 0.28, y + s * 0.42);
      context.lineTo(x + s * 0.4, y + s * 0.52);
      context.lineTo(x + s * 0.52, y + s * 0.38);
      context.lineTo(x + s * 0.62, y + s * 0.6);
      context.stroke();
      // Sun
      context.beginPath();
      context.arc(x + s * 0.5, y + s * 0.28, s * 0.06, 0, Math.PI * 2);
      context.stroke();
      // Pencil body
      context.beginPath();
      context.moveTo(x + s * 0.48, y + s * 0.78);
      context.lineTo(x + s * 0.78, y + s * 0.28);
      context.lineTo(x + s * 0.88, y + s * 0.36);
      context.lineTo(x + s * 0.58, y + s * 0.86);
      context.closePath();
      context.stroke();
      // Pencil tip
      context.beginPath();
      context.moveTo(x + s * 0.78, y + s * 0.28);
      context.lineTo(x + s * 0.9, y + s * 0.22);
      context.lineTo(x + s * 0.88, y + s * 0.36);
      context.closePath();
      context.fill();
      break;
    }

    case "qualityChecker": {
      // Shield with checkmark
      context.beginPath();
      context.moveTo(cx, y + s * 0.1);
      context.lineTo(x + s * 0.82, y + s * 0.28);
      context.lineTo(x + s * 0.82, y + s * 0.55);
      context.quadraticCurveTo(x + s * 0.82, y + s * 0.78, cx, y + s * 0.9);
      context.quadraticCurveTo(x + s * 0.18, y + s * 0.78, x + s * 0.18, y + s * 0.55);
      context.lineTo(x + s * 0.18, y + s * 0.28);
      context.closePath();
      context.stroke();
      // Check
      context.beginPath();
      context.moveTo(cx - s * 0.16, cy + s * 0.02);
      context.lineTo(cx - s * 0.04, cy + s * 0.16);
      context.lineTo(cx + s * 0.18, cy - s * 0.12);
      context.stroke();
      break;
    }

    case "proofreader": {
      // Magnifying glass with letter "A"
      context.beginPath();
      context.arc(cx - s * 0.08, cy - s * 0.08, s * 0.28, 0, Math.PI * 2);
      context.stroke();
      // Handle
      context.beginPath();
      context.moveTo(cx + s * 0.12, cy + s * 0.12);
      context.lineTo(cx + s * 0.3, cy + s * 0.3);
      context.stroke();
      // Letter inside
      context.font = `700 ${s * 0.26}px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("A", cx - s * 0.08, cy - s * 0.08);
      break;
    }

    case "rawProvider": {
      // Package / box with lid
      // Box body
      context.beginPath();
      context.moveTo(x + s * 0.14, y + s * 0.38);
      context.lineTo(x + s * 0.5, y + s * 0.22);
      context.lineTo(x + s * 0.86, y + s * 0.38);
      context.lineTo(x + s * 0.86, y + s * 0.72);
      context.lineTo(x + s * 0.5, y + s * 0.88);
      context.lineTo(x + s * 0.14, y + s * 0.72);
      context.closePath();
      context.stroke();
      // Top flap lines
      context.beginPath();
      context.moveTo(x + s * 0.14, y + s * 0.38);
      context.lineTo(x + s * 0.5, y + s * 0.54);
      context.lineTo(x + s * 0.86, y + s * 0.38);
      context.moveTo(x + s * 0.5, y + s * 0.54);
      context.lineTo(x + s * 0.5, y + s * 0.88);
      context.stroke();
      break;
    }

    case "uploader": {
      // Upload tray + upward arrow
      // Tray
      context.beginPath();
      context.moveTo(x + s * 0.16, y + s * 0.62);
      context.lineTo(x + s * 0.16, y + s * 0.82);
      context.lineTo(x + s * 0.84, y + s * 0.82);
      context.lineTo(x + s * 0.84, y + s * 0.62);
      context.stroke();
      // Arrow shaft
      context.beginPath();
      context.moveTo(cx, y + s * 0.62);
      context.lineTo(cx, y + s * 0.18);
      context.stroke();
      // Arrow head
      context.beginPath();
      context.moveTo(cx - s * 0.18, y + s * 0.34);
      context.lineTo(cx, y + s * 0.16);
      context.lineTo(cx + s * 0.18, y + s * 0.34);
      context.stroke();
      break;
    }
  }

  context.restore();
}

/* ------------------------------------------------------------------ */
/*  Shared drawing                                                    */
/* ------------------------------------------------------------------ */

function drawBackground(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  image: HTMLImageElement | null,
  width: number,
  height: number,
): void {
  drawCoverGradientBackground(context, project, image, width, height);
  context.save();
  context.globalAlpha = 0.16;
  context.fillStyle = project.accent;
  context.beginPath();
  context.moveTo(0, height * 0.07);
  context.lineTo(width * 0.72, 0);
  context.lineTo(width * 0.55, height);
  context.lineTo(0, height * 0.9);
  context.closePath();
  context.fill();
  context.globalAlpha = 0.1;
  context.fillRect(width * 0.8, 0, width * 0.2, height);
  context.restore();
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  project: CreditProject,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.save();
  context.shadowColor = "rgba(0,0,0,0.55)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 14;
  roundedRect(context, x, y, width, height, 22);
  context.fillStyle = "#111";
  context.fill();
  context.restore();

  context.save();
  roundedRect(context, x, y, width, height, 22);
  context.clip();
  if (image) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) * (project.coverFocusX / 100);
    const sourceY = (image.naturalHeight - sourceHeight) * (project.coverFocusY / 100);
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  } else {
    context.fillStyle = "#25252b";
    context.fillRect(x, y, width, height);
    context.fillStyle = "#d1d5db";
    context.font = "700 28px Arial";
    context.textAlign = "center";
    context.fillText("UPLOAD A COVER", x + width / 2, y + height / 2);
  }
  context.restore();
}

function drawTitle(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  textAlign: CanvasTextAlign = "left",
): number {
  const title = project.manga?.title || "Manga title";
  context.fillStyle = project.foreground;
  context.textAlign = textAlign;
  context.font = `900 ${fontSize}px "${project.titleFontFamily}"`;
  const lines = wrapText(context, title.toUpperCase(), x, y, maxWidth, fontSize * 1.12, 3);
  if (project.manga?.altTitle) {
    context.globalAlpha = 0.76;
    context.font = `500 ${Math.max(18, fontSize * 0.42)}px "${project.titleFontFamily}"`;
    wrapText(context, project.manga.altTitle, x, y + lines * fontSize * 1.12 + 8, maxWidth, fontSize * 0.55, 2);
    context.globalAlpha = 1;
    return y + lines * fontSize * 1.12 + fontSize * 0.9;
  }
  return y + lines * fontSize * 1.12;
}

function drawCredits(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  x: number,
  y: number,
  width: number,
  fontSize: number,
): void {
  let top = y;
  for (const [role, label] of CREDIT_ROLES) {
    const name = project.credits[role].trim();
    if (!name) continue;

    const iconSize = Math.max(34, fontSize * 1.15);
    drawRoleIcon(context, role, x, top - fontSize * 0.28, iconSize, project.accent);

    context.fillStyle = project.accent;
    context.font = `800 ${fontSize * 0.72}px "${project.fontFamily}"`;
    context.textAlign = "left";
    context.fillText(label.toUpperCase(), x + fontSize * 1.45, top, width - fontSize * 1.5);

    context.fillStyle = project.foreground;
    context.font = `700 ${fontSize}px "${project.fontFamily}"`;
    const lines = wrapText(
      context,
      name,
      x + fontSize * 1.45,
      top + fontSize * 1.05,
      width - fontSize * 1.2,
      fontSize * 1.1,
      2,
    );
    top += fontSize * (2.15 + Math.max(0, lines - 1) * 0.85);
  }
  if (!CREDIT_ROLES.some(([role]) => project.credits[role].trim())) {
    context.fillStyle = project.foreground;
    context.globalAlpha = 0.75;
    context.font = `500 ${fontSize}px "${project.fontFamily}"`;
    context.fillText("Add team credits to preview them here.", x, top);
    context.globalAlpha = 1;
  }
}

function drawFooter(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  width: number,
  height: number,
): void {
  const y = height - 90;
  context.fillStyle = project.foreground;
  context.textAlign = "left";
  context.font = `800 19px "${project.fontFamily}"`;
  const author = project.manga?.author || "—";
  const artist = project.manga?.artist || "—";
  context.fillText(`AUTHOR  ${author}`, width * 0.06, y + 8, width * 0.55);
  context.fillText(`ARTIST  ${artist}`, width * 0.06, y + 36, width * 0.55);
  drawSocialLinksGrid(context, project, 40, 1130, width - 80);
}

function drawLogo(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  image: HTMLImageElement | null,
): void {
  if (image) {
    const maxWidth = 250;
    const maxHeight = 58;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    context.drawImage(image, 66, 40, image.naturalWidth * scale, image.naturalHeight * scale);
    return;
  }
  context.fillStyle = project.accent;
  context.font = `900 30px "${project.fontFamily}"`;
  context.textAlign = "left";
  context.fillText((project.logoText || "MIKOROKU").toUpperCase(), 66, 78);
}

/* ------------------------------------------------------------------ */
/*  IMPACT TEMPLATE                                                   */
/* ------------------------------------------------------------------ */

function drawImpactBackground(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  image: HTMLImageElement | null,
): void {
  drawCoverGradientBackground(context, project, image, BASE_WIDTH, BASE_HEIGHT);

  const vignette = context.createRadialGradient(
    BASE_WIDTH / 2,
    BASE_HEIGHT * 0.4,
    120,
    BASE_WIDTH / 2,
    BASE_HEIGHT * 0.45,
    BASE_WIDTH * 0.85,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.45)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
}

function drawImpactLogo(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  image: HTMLImageElement | null,
): void {
  const x = 40;
  const y = 10;

  if (image) {
    const scale = Math.min(170 / image.naturalWidth, 58 / image.naturalHeight);
    context.drawImage(image, x, y, image.naturalWidth * scale, image.naturalHeight * scale);
    return;
  }

  context.save();
  context.translate(x * 0.4, y * 0.4);
  context.scale(0.6, 0.6);
  context.fillStyle = project.accent;
  context.beginPath();
  context.moveTo(x + 42, y);
  context.lineTo(x + 82, y + 22);
  context.lineTo(x + 82, y + 68);
  context.lineTo(x + 42, y + 91);
  context.lineTo(x + 2, y + 68);
  context.lineTo(x + 2, y + 22);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(255,255,255,0.15)";
  context.beginPath();
  context.moveTo(x + 42, y + 6);
  context.lineTo(x + 74, y + 24);
  context.lineTo(x + 74, y + 64);
  context.lineTo(x + 42, y + 82);
  context.lineTo(x + 10, y + 64);
  context.lineTo(x + 10, y + 24);
  context.closePath();
  context.fill();

  context.fillStyle = project.foreground;
  context.font = `900 48px "${project.fontFamily}"`;
  context.textAlign = "center";
  context.fillText("M", x + 42, y + 62);

  context.textAlign = "left";
  context.font = `900 30px "${project.fontFamily}"`;
  context.fillText((project.logoText || "MIKOROKU").toUpperCase(), x + 96, y + 44, 220);
  context.fillStyle = project.highlight;
  context.font = `700 14px "${project.fontFamily}"`;
  context.fillText("MANGA TRANSLATION", x + 98, y + 70, 215);
  context.restore();
}

function drawImpactTitle(context: CanvasRenderingContext2D, project: CreditProject): number {
  const title = project.manga?.title || "MANGA TITLE";
  context.save();
  const titleX = BASE_WIDTH / 2;
  const titleY = 136;
  const titleWidth = BASE_WIDTH - 120;
  let fontSize = 46;
  let lineHeight = fontSize * 1.12;
  context.textAlign = "center";
  context.font = `400 ${fontSize}px "${project.titleFontFamily}"`;
  context.letterSpacing = "1.5px";
  let lines = wrapText(context, title.toUpperCase(), titleX, titleY, titleWidth, lineHeight, 100, false);
  while (lines > 3 && fontSize > 30) {
    fontSize = Math.max(30, fontSize - 2);
    lineHeight = fontSize * 1.12;
    context.font = `400 ${fontSize}px "${project.titleFontFamily}"`;
    lines = wrapText(context, title.toUpperCase(), titleX, titleY, titleWidth, lineHeight, 100, false);
  }

  const boxY = 78;
  const altTitleGap = -16;
  let altLines = 0;
  if (project.manga?.altTitle) {
    context.font = `500 18px "${project.titleFontFamily}"`;
    altLines = wrapText(
      context,
      project.manga.altTitle,
      titleX + 2,
      titleY + lines * lineHeight + altTitleGap,
      titleWidth - 4,
      22,
      100,
      false,
    );
  }
  const boxHeight =
    titleY -
    boxY +
    lines * lineHeight +
    (altLines ? altTitleGap + altLines * 22 + 12 : 12);
  roundedRect(context, 40, boxY, BASE_WIDTH - 80, boxHeight, 12);
  context.fillStyle = "rgba(255,255,255,0.06)";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.16)";
  context.lineWidth = 1.5;
  context.stroke();

  context.fillStyle = project.foreground;
  context.font = `400 ${fontSize}px "${project.titleFontFamily}"`;
  context.letterSpacing = "1.5px";
  wrapText(context, title.toUpperCase(), titleX, titleY, titleWidth, lineHeight, 100);

  if (project.manga?.altTitle && altLines) {
    context.globalAlpha = 0.78;
    context.font = `500 18px "${project.titleFontFamily}"`;
    wrapText(
      context,
      project.manga.altTitle,
      titleX + 2,
      titleY + lines * lineHeight + altTitleGap,
      titleWidth - 4,
      22,
      100,
    );
  }

  context.restore();
  return boxY + boxHeight;
}

function drawImpactCredits(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = width / 380;
  const panelX = 0;
  const panelY = 0;
  const panelW = 380;
  const panelH = 570;

  context.save();
  context.translate(x, y);
  context.scale(scale, height / panelH);
  roundedRect(context, panelX, panelY, panelW, panelH, 18);
  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fill();

  const topGlow = context.createLinearGradient(panelX, panelY, panelX, panelY + 80);
  topGlow.addColorStop(0, "rgba(255,255,255,0.08)");
  topGlow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = topGlow;
  roundedRect(context, panelX, panelY, panelW, 80, 18);
  context.fill();

  context.fillStyle = project.highlight;
  context.font = `800 15px "${project.fontFamily}"`;
  context.textAlign = "left";
  context.fillText("CREDITS", panelX + 28, panelY + 36);

  CREDIT_ROLES.forEach(([role, label], index) => {
    const yPos = panelY + 72 + index * 60;
    const name = project.credits[role].trim() || "—";

    drawRoleIcon(context, role, panelX + 25, yPos - 7, 38, project.accent);

    context.fillStyle = "rgba(255,255,255,0.5)";
    context.font = `700 14px "${project.fontFamily}"`;
    context.textAlign = "left";
    context.fillText(label.toUpperCase(), panelX + 76, yPos + 4);

    context.fillStyle = project.highlight;
    context.font = `400 24px "${project.fontFamily}"`;
    context.fillText(name, panelX + 76, yPos + 32, panelW - 100);
  });
  context.restore();
}

function drawSocialIcon(
  context: CanvasRenderingContext2D,
  kind: SocialIconKind,
  x: number,
  y: number,
  size: number,
): void {
  const colors: Record<string, string> = {
    discord: "#5865F2",
    facebook: "#1877F2",
    trakteer: "#EF4444",
    paypal: "#003087",
    website: "#0F766E",
  };
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  const logo = socialLogoCache.get(kind);
  if (logo && logo.complete && logo.naturalWidth > 0) {
    context.save();
    context.shadowColor = "rgba(0,0,0,0.35)";
    context.shadowBlur = 5;
    context.shadowOffsetY = 2;
    const logoSize = size * (kind === "facebook" ? 1.25 : 1);
    context.drawImage(
      logo,
      x + (size - logoSize) / 2,
      y + (size - logoSize) / 2,
      logoSize,
      logoSize,
    );
    context.restore();
    return;
  }

  context.save();
  context.shadowColor = "rgba(0,0,0,0.35)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 3;
  context.fillStyle = colors[kind];
  context.beginPath();
  context.arc(cx, cy, r, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = "transparent";

  context.fillStyle = "#ffffff";
  context.strokeStyle = "#ffffff";
  context.lineWidth = Math.max(1.6, size * 0.065);
  context.lineCap = "round";
  context.lineJoin = "round";

  if (kind === "discord") {
    const s = size;
    context.beginPath();
    context.moveTo(cx - s * 0.28, cy - s * 0.08);
    context.bezierCurveTo(cx - s * 0.28, cy - s * 0.22, cx - s * 0.18, cy - s * 0.28, cx, cy - s * 0.28);
    context.bezierCurveTo(cx + s * 0.18, cy - s * 0.28, cx + s * 0.28, cy - s * 0.22, cx + s * 0.28, cy - s * 0.08);
    context.lineTo(cx + s * 0.28, cy + s * 0.08);
    context.bezierCurveTo(cx + s * 0.28, cy + s * 0.18, cx + s * 0.2, cy + s * 0.26, cx + s * 0.1, cy + s * 0.26);
    context.lineTo(cx + s * 0.04, cy + s * 0.18);
    context.lineTo(cx - s * 0.04, cy + s * 0.18);
    context.lineTo(cx - s * 0.1, cy + s * 0.26);
    context.bezierCurveTo(cx - s * 0.2, cy + s * 0.26, cx - s * 0.28, cy + s * 0.18, cx - s * 0.28, cy + s * 0.08);
    context.closePath();
    context.fill();

    context.fillStyle = colors.discord;
    context.beginPath();
    context.ellipse(cx - s * 0.1, cy - s * 0.02, s * 0.055, s * 0.07, 0, 0, Math.PI * 2);
    context.ellipse(cx + s * 0.1, cy - s * 0.02, s * 0.055, s * 0.07, 0, 0, Math.PI * 2);
    context.fill();
  } else if (kind === "facebook") {
    context.font = `900 ${size * 0.62}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("f", cx + size * 0.02, cy + size * 0.02);
  } else if (kind === "trakteer") {
    const s = size;
    context.beginPath();
    context.moveTo(cx - s * 0.18, cy - s * 0.02);
    context.lineTo(cx - s * 0.14, cy + s * 0.2);
    context.quadraticCurveTo(cx, cy + s * 0.26, cx + s * 0.14, cy + s * 0.2);
    context.lineTo(cx + s * 0.18, cy - s * 0.02);
    context.closePath();
    context.fill();
    context.beginPath();
    context.ellipse(cx, cy - s * 0.02, s * 0.2, s * 0.06, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(cx + s * 0.22, cy + s * 0.06, s * 0.09, -Math.PI * 0.4, Math.PI * 0.7);
    context.stroke();
    context.beginPath();
    context.moveTo(cx - s * 0.06, cy - s * 0.12);
    context.quadraticCurveTo(cx - s * 0.1, cy - s * 0.2, cx - s * 0.04, cy - s * 0.26);
    context.moveTo(cx + s * 0.04, cy - s * 0.12);
    context.quadraticCurveTo(cx + s * 0.08, cy - s * 0.2, cx + s * 0.02, cy - s * 0.26);
    context.stroke();
  } else if (kind === "paypal") {
    context.font = `900 ${size * 0.52}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("P", cx, cy + size * 0.02);
  } else if (kind === "website") {
    const s = size;
    context.lineWidth = Math.max(1.5, s * 0.06);
    context.beginPath();
    context.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(cx, cy, s * 0.28, s * 0.11, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(cx, cy, s * 0.12, s * 0.28, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(cx, cy - s * 0.28);
    context.lineTo(cx, cy + s * 0.28);
    context.stroke();
  }

  context.restore();
}

function drawImpactFooter(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  coverWidth: number,
): void {
  const author = project.manga?.author || "—";
  const artist = project.manga?.artist || "—";
  const footerOffset = 24;

  context.fillStyle = "rgba(255,255,255,0.08)";
  roundedRect(context, 40, 1010 + footerOffset, coverWidth, 72, 12);
  context.fill();

  context.textAlign = "left";
  context.fillStyle = "rgba(255,255,255,0.55)";
  context.font = `700 13px "${project.fontFamily}"`;
  context.fillText("AUTHOR", 58, 1038 + footerOffset);
  context.fillText("ARTIST", 58, 1068 + footerOffset);

  context.fillStyle = project.foreground;
  context.font = `800 18px "${project.fontFamily}"`;
  context.fillText(author, 130, 1038 + footerOffset, coverWidth - 150);
  context.fillText(artist, 130, 1068 + footerOffset, coverWidth - 150);

  context.fillStyle = project.highlight;
  context.font = `900 22px "${project.fontFamily}"`;
  context.fillText(
    project.discord ? "JOIN OUR DISCORD TO GET DAILY UPDATES" : "FOLLOW US FOR MORE UPDATES",
    40,
    1130 + footerOffset,
    700,
  );

  drawSocialLinksGrid(context, project, 40, 1155 + footerOffset, 1000);
}

function drawSocialLinksGrid(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  x: number,
  y: number,
  width: number,
): void {
  const links = [
    { kind: "discord" as const, label: "DISCORD", value: project.discord },
    { kind: "facebook" as const, label: "FACEBOOK", value: project.facebook },
    { kind: "trakteer" as const, label: "TRAKTEER", value: project.trakteer },
    { kind: "paypal" as const, label: "PAYPAL", value: project.paypal },
    { kind: "website" as const, label: "WEBSITE", value: project.website },
    { kind: "website" as const, label: "ALT WEBSITE", value: project.websiteAlternative },
  ].filter((link) => link.value.trim());
  if (links.length === 0) return;

  const columnGap = 14;
  const rowGap = 14;
  const columns = Math.min(3, links.length);
  const cardWidth = (width - columnGap * (columns - 1)) / columns;
  const cardHeight = 84;

  links.forEach((link, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cardX = x + column * (cardWidth + columnGap);
    const cardY = y + row * (cardHeight + rowGap);

    roundedRect(context, cardX, cardY, cardWidth, cardHeight, 10);
    context.fillStyle = "rgba(255,255,255,0.08)";
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.18)";
    context.lineWidth = 1.5;
    context.stroke();

    drawSocialIcon(context, link.kind, cardX + 12, cardY + 21, 40);

    context.fillStyle = project.foreground;
    context.textAlign = "left";
    context.font = `800 15px "${project.fontFamily}"`;
    context.fillText(link.label, cardX + 62, cardY + 34, cardWidth - 74);

    context.fillStyle = project.highlight;
    context.font = `600 17px "${project.fontFamily}"`;
    context.fillText(link.value, cardX + 62, cardY + 60, cardWidth - 74);
  });
}

function drawMinimalTemplate(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  image: HTMLImageElement | null,
  logo: HTMLImageElement | null,
): void {
  drawCoverGradientBackground(context, project, image, BASE_WIDTH, MINIMAL_HEIGHT);
  context.fillStyle = "rgba(0,0,0,0.12)";
  context.fillRect(0, 0, BASE_WIDTH, MINIMAL_HEIGHT);

  if (logo) {
    const scale = Math.min(150 / logo.naturalWidth, 48 / logo.naturalHeight);
    const logoWidth = logo.naturalWidth * scale;
    const logoHeight = logo.naturalHeight * scale;
    context.drawImage(logo, (BASE_WIDTH - logoWidth) / 2, 28, logoWidth, logoHeight);
  } else {
    context.fillStyle = project.foreground;
    context.textAlign = "center";
    context.font = `700 24px "${project.fontFamily}"`;
    context.fillText((project.logoText || "MIKOROKU").toUpperCase(), BASE_WIDTH / 2, 58);
  }

  const titleBottom = drawMinimalTitle(context, project);
  const coverBottomLimit = 700;
  const coverY = Math.max(220, titleBottom + 14);
  const coverWidth = Math.min(300, Math.max(180, ((coverBottomLimit - coverY) * 2) / 3));
  const coverHeight = coverWidth * 1.5;
  const coverBottom = coverY + coverHeight;
  const coverX = (BASE_WIDTH - coverWidth) / 2;
  drawCover(context, image, project, coverX, coverY, coverWidth, coverHeight);

  const author = project.manga?.author || "—";
  const artist = project.manga?.artist || "—";
  context.fillStyle = "rgba(255,255,255,0.78)";
  context.textAlign = "center";
  context.font = `500 18px "${project.fontFamily}"`;
  context.fillText(`AUTHOR  ${author}     ·     ARTIST  ${artist}`, BASE_WIDTH / 2, coverBottom + 27, BASE_WIDTH - 100);

  const creditSideWidth = (BASE_WIDTH - 120 - coverWidth - 48) / 2;
  drawMinimalSideCredits(
    context,
    project,
    60,
    coverY,
    creditSideWidth,
    coverHeight,
    ["translator", "typesetter", "cleaner", "redrawer"],
  );
  drawMinimalSideCredits(
    context,
    project,
    coverX + coverWidth + 24,
    coverY,
    creditSideWidth,
    coverHeight,
    ["qualityChecker", "proofreader", "rawProvider", "uploader"],
  );
  drawMinimalLinks(context, project, 60, 770, BASE_WIDTH - 120);
}

function drawMinimalTitle(context: CanvasRenderingContext2D, project: CreditProject): number {
  const title = project.manga?.title || "MANGA TITLE";
  const width = BASE_WIDTH - 100;
  const titleY = 110;
  let fontSize = 40;
  let lineHeight = fontSize * 1.12;
  context.textAlign = "center";
  context.font = `400 ${fontSize}px "${project.titleFontFamily}"`;
  let lines = wrapText(context, title.toUpperCase(), BASE_WIDTH / 2, titleY, width, lineHeight, 100, false);

  while (lines > 2 && fontSize > 28) {
    fontSize -= 2;
    lineHeight = fontSize * 1.12;
    context.font = `400 ${fontSize}px "${project.titleFontFamily}"`;
    lines = wrapText(context, title.toUpperCase(), BASE_WIDTH / 2, titleY, width, lineHeight, 100, false);
  }

  context.fillStyle = project.foreground;
  context.font = `400 ${fontSize}px "${project.titleFontFamily}"`;
  wrapText(context, title.toUpperCase(), BASE_WIDTH / 2, titleY, width, lineHeight, 100);
  let bottom = titleY + lines * lineHeight;

  if (project.manga?.altTitle) {
    context.globalAlpha = 0.75;
    context.font = `400 15px "${project.titleFontFamily}"`;
    const altLines = wrapText(
      context,
      project.manga.altTitle,
      BASE_WIDTH / 2,
      bottom + 12,
      width,
      20,
      100,
    );
    context.globalAlpha = 1;
    bottom += 8 + altLines * 20;
  }
  return bottom;
}

function drawMinimalSideCredits(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  x: number,
  y: number,
  width: number,
  height: number,
  roles: readonly CreditRole[],
): void {
  const slots = 4;
  const rowHeight = height / slots;
  const cardHeight = Math.min(72, rowHeight - 12);

  roles.forEach((role, index) => {
    const label = CREDIT_ROLES.find(([creditRole]) => creditRole === role)?.[1] ?? role;
    const name = project.credits[role].trim() || "—";
    const cardY = y + index * rowHeight + (rowHeight - cardHeight) / 2;
    roundedRect(context, x + 7, cardY, width - 14, cardHeight, 9);
    context.fillStyle = "rgba(255,255,255,0.07)";
    context.fill();

    drawRoleIcon(context, role, x + 19, cardY + (cardHeight - 36) / 2, 36, project.accent);
    context.textAlign = "left";
    context.fillStyle = "rgba(255,255,255,0.62)";
    context.font = `600 15px "${project.fontFamily}"`;
    context.fillText(label.toUpperCase(), x + 65, cardY + cardHeight / 2 - 3, width - 78);
    context.fillStyle = project.foreground;
    context.font = `400 20px "${project.fontFamily}"`;
    context.fillText(name, x + 65, cardY + cardHeight / 2 + 23, width - 78);
  });
}

function drawMinimalLinks(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  x: number,
  y: number,
  width: number,
): void {
  const links = [
    { kind: "discord" as const, label: "DISCORD", value: project.discord },
    { kind: "facebook" as const, label: "FACEBOOK", value: project.facebook },
    { kind: "trakteer" as const, label: "TRAKTEER", value: project.trakteer },
    { kind: "paypal" as const, label: "PAYPAL", value: project.paypal },
    { kind: "website" as const, label: "WEBSITE", value: project.website },
    { kind: "website" as const, label: "ALT WEBSITE", value: project.websiteAlternative },
  ].filter((link) => link.value.trim());
  if (!links.length) return;

  const columns = 2;
  const columnGap = 12;
  const rowGap = 12;
  const cardWidth = (width - columnGap * (columns - 1)) / columns;
  const cardHeight = 82;
  links.forEach((link, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cardX = x + column * (cardWidth + columnGap);
    const cardY = y + row * (cardHeight + rowGap);
    roundedRect(context, cardX, cardY, cardWidth, cardHeight, 9);
    context.fillStyle = "rgba(255,255,255,0.08)";
    context.fill();

    drawSocialIcon(context, link.kind, cardX + 12, cardY + 20, 40);
    context.textAlign = "left";
    context.fillStyle = project.foreground;
    context.font = `700 16px "${project.fontFamily}"`;
    context.fillText(link.label, cardX + 62, cardY + 35, cardWidth - 74);
    context.fillStyle = project.highlight;
    context.font = `400 17px "${project.fontFamily}"`;
    context.fillText(link.value, cardX + 62, cardY + 60, cardWidth - 74);
  });
}

function drawDramaticSplit(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  image: HTMLImageElement | null,
  logo: HTMLImageElement | null,
): void {
  drawCoverGradientBackground(context, project, image, BASE_WIDTH, SPLIT_HEIGHT);

  const coverX = 42;
  const coverY = 48;
  const coverWidth = 270;
  const coverHeight = 405;
  const contentX = 340;
  const contentWidth = BASE_WIDTH - contentX - 40;

  drawCover(context, image, project, coverX, coverY, coverWidth, coverHeight);
  drawDramaticSplitAuthor(context, project, coverX, coverY + coverHeight + 25, coverWidth);
  drawDramaticSplitLogo(context, project, logo, contentX, 18, contentWidth);

  const titleBottom = drawTitle(context, project, contentX, 90, contentWidth - 8, 30, "left");
  const creditsY = Math.max(220, titleBottom + 12);
  const roleRows = drawDramaticSplitCredits(context, project, contentX, creditsY, contentWidth);
  const roleHeight = roleRows ? roleRows * 48 + (roleRows - 1) * 8 : 32;
  const linksY = Math.max(350, creditsY + roleHeight + 14);
  drawDramaticSplitLinks(context, project, contentX, linksY, contentWidth);
}

function drawDramaticSplitLogo(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  logo: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
): void {
  if (logo) {
    const scale = Math.min(180 / logo.naturalWidth, 42 / logo.naturalHeight);
    const logoWidth = logo.naturalWidth * scale;
    const logoHeight = logo.naturalHeight * scale;
    context.drawImage(logo, x, y, logoWidth, logoHeight);
    return;
  }

  context.fillStyle = project.foreground;
  context.font = `800 23px "${project.fontFamily}"`;
  context.textAlign = "left";
  context.fillText((project.logoText || "MIKOROKU").toUpperCase(), x, y + 29, width);
}

function drawDramaticSplitAuthor(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  x: number,
  y: number,
  width: number,
): void {
  const fields = [
    { label: "AUTHOR", value: project.manga?.author || "—" },
    { label: "ARTIST", value: project.manga?.artist || "—" },
  ];

  fields.forEach((field, index) => {
    const fieldWidth = width / fields.length;
    const fieldX = x + index * fieldWidth;
    context.textAlign = "left";
    context.fillStyle = "rgba(255,255,255,0.68)";
    context.font = `700 10px "${project.fontFamily}"`;
    context.fillText(field.label, fieldX, y, fieldWidth);
    context.fillStyle = project.foreground;
    context.font = `500 14px "${project.fontFamily}"`;
    context.fillText(field.value, fieldX, y + 19, fieldWidth);
  });
}

function drawDramaticSplitCredits(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  x: number,
  y: number,
  width: number,
): number {
  const entries = CREDIT_ROLES;
  const columns = 3;
  const gap = 8;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = 48;
  entries.forEach(([role, label], index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cardX = x + column * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);

    roundedRect(context, cardX, cardY, cardWidth, cardHeight, 9);
    context.fillStyle = "rgba(255,255,255,0.12)";
    context.fill();
    drawRoleIcon(context, role, cardX + 9, cardY + 10, 28, project.foreground);

    context.textAlign = "left";
    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = `700 11px "${project.fontFamily}"`;
    context.fillText(label.toUpperCase(), cardX + 45, cardY + 18, cardWidth - 53);
    context.fillStyle = project.foreground;
    context.font = `600 15px "${project.fontFamily}"`;
    context.fillText(project.credits[role].trim() || "—", cardX + 45, cardY + 37, cardWidth - 53);
  });

  return Math.ceil(entries.length / columns);
}

function drawDramaticSplitLinks(
  context: CanvasRenderingContext2D,
  project: CreditProject,
  x: number,
  y: number,
  width: number,
): void {
  const links = [
    { kind: "discord" as const, label: "DISCORD", value: project.discord },
    { kind: "facebook" as const, label: "FACEBOOK", value: project.facebook },
    { kind: "trakteer" as const, label: "TRAKTEER", value: project.trakteer },
    { kind: "paypal" as const, label: "PAYPAL", value: project.paypal },
    { kind: "website" as const, label: "WEBSITE", value: project.website },
    { kind: "website" as const, label: "ALT WEBSITE", value: project.websiteAlternative },
  ].filter((link) => link.value.trim());

  const columns = 3;
  const gap = 8;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = 50;
  links.forEach((link, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cardX = x + column * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);

    roundedRect(context, cardX, cardY, cardWidth, cardHeight, 9);
    context.fillStyle = "rgba(255,255,255,0.08)";
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.16)";
    context.lineWidth = 1;
    context.stroke();
    drawSocialIcon(context, link.kind, cardX + 9, cardY + 11, 28);

    context.textAlign = "left";
    context.fillStyle = project.foreground;
    context.font = `700 11px "${project.fontFamily}"`;
    context.fillText(link.label, cardX + 44, cardY + 20, cardWidth - 52);
    context.fillStyle = project.highlight;
    context.font = `400 13px "${project.fontFamily}"`;
    context.fillText(link.value, cardX + 44, cardY + 37, cardWidth - 52);
  });
}

/* ------------------------------------------------------------------ */
/*  Main render                                                       */
/* ------------------------------------------------------------------ */

export async function renderCreditCard(
  canvas: HTMLCanvasElement,
  project: CreditProject,
  signal?: AbortSignal,
): Promise<void> {
  const { width, height } = getCreditDimensions(project.format, project.template);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is not supported in this browser.");

  const [, image, logo] = await Promise.all([
    document.fonts.load(`400 48px "${project.titleFontFamily}"`),
    project.coverSource ? loadCover(project.coverSource) : Promise.resolve(null),
    project.logoSource ? loadCover(project.logoSource).catch(() => null) : Promise.resolve(null),
    loadSocialLogos(), // load logo sosial asli
  ]);
  if (signal?.aborted) return;

  const scaleX = width / BASE_WIDTH;
  const logicalHeight =
    project.template === "split"
      ? SPLIT_HEIGHT
      : project.template === "minimal"
        ? MINIMAL_HEIGHT
        : BASE_HEIGHT;
  const scaleY = height / logicalHeight;
  context.save();
  context.scale(scaleX, scaleY);

  if (project.template === "impact") {
    drawImpactBackground(context, project, image);
    drawImpactLogo(context, project, logo);
    const titleBottom = drawImpactTitle(context, project);
    const sideMargin = 40;
    const columnGap = 20;
    const cardY = Math.max(300, titleBottom + 20);
    const availableHeight = Math.max(1, 1010 - cardY);
    const maxCardWidthByHeight = (availableHeight * scaleY) / (scaleX * 1.5);
    const cardWidth = Math.min((BASE_WIDTH - sideMargin * 2 - columnGap) / 2, maxCardWidthByHeight);
    const cardHeight = cardWidth * 1.5 * (scaleX / scaleY);
    const creditsX = sideMargin + cardWidth + columnGap;
    drawCover(context, image, project, sideMargin, cardY, cardWidth, cardHeight);
    drawImpactCredits(context, project, creditsX, cardY, cardWidth, cardHeight);
    drawImpactFooter(context, project, cardWidth);
  } else if (project.template === "split") {
    drawDramaticSplit(context, project, image, logo);
  } else if (project.template === "minimal") {
    drawMinimalTemplate(context, project, image, logo);
  } else {
    drawBackground(context, project, image, BASE_WIDTH, BASE_HEIGHT);
    drawLogo(context, project, logo);

    drawTitle(context, project, 66, 145, 920, 48);
    drawCover(context, image, project, 66, 320, 430, 700);
    context.fillStyle = "rgba(0,0,0,0.35)";
    roundedRect(context, 530, 320, 490, 700, 18);
    context.fill();
    context.fillStyle = project.highlight;
    context.font = `800 16px "${project.fontFamily}"`;
    context.textAlign = "left";
    context.fillText("CREDITS", 560, 365);
    drawCredits(context, project, 560, 415, 430, 27);
    drawFooter(context, project, BASE_WIDTH, BASE_HEIGHT);
  }

  context.restore();
}
