import mikorokuLogo from "../../../public/assets/icons/mikoroku.png";

export const CREDIT_ROLES = [
  ["translator", "Translator"],
  ["typesetter", "Typesetter"],
  ["cleaner", "Cleaner"],
  ["redrawer", "Redrawer"],
  ["qualityChecker", "Quality checker"],
  ["proofreader", "Proofreader"],
  ["rawProvider", "Raw provider"],
  ["uploader", "Uploader"],
] as const;

export type CreditRole = (typeof CREDIT_ROLES)[number][0];
export type CreditTemplate = "impact" | "split" | "minimal";
export type CreditFormat = "standard" | "high";

export function normalizeCreditTemplate(template: unknown): CreditTemplate {
  return template === "split" || template === "minimal" || template === "impact"
    ? template
    : "impact";
}

export type MangaMetadata = {
  slug: string;
  title: string;
  altTitle: string;
  author: string;
  artist: string;
  cover: string;
  covers: string[];
};

export type CreditProject = {
  id: string;
  name: string;
  manga: MangaMetadata | null;
  coverSource: string;
  template: CreditTemplate;
  format: CreditFormat;
  accent: string;
  highlight: string;
  background: string;
  useCoverBackground: boolean;
  coverBackgroundBlur: number;
  coverGradientOpacity: number;
  foreground: string;
  fontFamily: string;
  titleFontFamily: string;
  logoText: string;
  logoSource: string;
  discord: string;
  facebook: string;
  trakteer: string;
  paypal: string;
  website: string;
  credits: Record<CreditRole, string>;
  coverFocusX: number;
  coverFocusY: number;
};

export type TeamPreset = {
  id: string;
  name: string;
  credits: Record<CreditRole, string>;
};

export const FORMAT_DIMENSIONS: Record<CreditFormat, { width: number; height: number }> = {
  standard: { width: 1125, height: 1600 },
  high: { width: 2250, height: 3200 },
};

const SPLIT_FORMAT_DIMENSIONS: Record<CreditFormat, { width: number; height: number }> = {
  standard: { width: 1120, height: 560 },
  high: { width: 2240, height: 1120 },
};

export function getCreditDimensions(
  format: CreditFormat,
  template: CreditTemplate,
): { width: number; height: number } {
  const { width, height } = FORMAT_DIMENSIONS[format];
  if (template === "split") return SPLIT_FORMAT_DIMENSIONS[format];
  return { width, height: template === "minimal" ? width : height };
}

const mikorokuLogoSource = typeof mikorokuLogo === "string" ? mikorokuLogo : mikorokuLogo.src;

export function createEmptyProject(): CreditProject {
  return {
    id: "",
    name: "Untitled credit",
    manga: null,
    coverSource: "",
    template: "impact",
    format: "standard",
    accent: "#ffffff",
    highlight: "#ffe53b",
    background: "#08090c",
    useCoverBackground: true,
    coverBackgroundBlur: 24,
    coverGradientOpacity: 100,
    foreground: "#ffffff",
    fontFamily: "Arial",
    titleFontFamily: "Oswald",
    logoText: "MIKOROKU",
    logoSource: mikorokuLogoSource,
    discord: "https://discord.gg/kkt669knaG",
    facebook: "mikoroku",
    trakteer: "https://trakteer.id/mikorokuscan",
    paypal: "https://www.paypal.me/moemaomao",
    website: "https://mikoroku.com",
    credits: {
      translator: "m6",
      typesetter: "m6",
      cleaner: "moemaomao",
      redrawer: "moemaomao",
      qualityChecker: "",
      proofreader: "",
      rawProvider: "",
      uploader: "",
    },
    coverFocusX: 50,
    coverFocusY: 50,
  };
}
