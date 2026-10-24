export const AD_PLACEMENTS = [
  { value: "site-top", label: "Bagian atas halaman publik" },
  { value: "home-sidebar", label: "Sidebar beranda" },
  { value: "home-after-list", label: "Di antara daftar beranda" },
  { value: "series-before-chapters", label: "Detail seri, sebelum daftar chapter" },
  { value: "reader-before-content", label: "Reader, sebelum halaman baca" },
  { value: "reader-after-content", label: "Reader, setelah halaman baca" },
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number]["value"];

export type Advertisement = {
  id: string;
  name: string;
  type: "global" | "page";
  enabled: boolean;
  code: string;
  pathPattern: string;
  placement: AdPlacement;
  height: number;
};

export const LEGACY_HOME_BANNER_CODE = `<script>
(function(settings) {
  var script = document.createElement("script");
  script.settings = settings || {};
  script.src = "//gummy-debt.com/b/XwVes.dqGml/0/YyWrcj/OeUmG9yuTZZUYlmkuPzTHcozVNEjfQPz-MXj-EotbNjznMk2dNKD/M/yQN/QU";
  script.async = true;
  script.referrerPolicy = "no-referrer-when-downgrade";
  document.body.appendChild(script);
})({});
</script>`;

export const DEFAULT_ADVERTISEMENTS: Advertisement[] = [
  {
    id: "legacy-home-banner",
    name: "Banner beranda lama",
    type: "page",
    enabled: true,
    code: LEGACY_HOME_BANNER_CODE,
    pathPattern: "/",
    placement: "home-sidebar",
    height: 250,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAdPlacement(value: unknown): value is AdPlacement {
  return AD_PLACEMENTS.some((placement) => placement.value === value);
}

export function parseAdvertisements(value: unknown): Advertisement[] {
  if (!Array.isArray(value)) {
    throw new Error("Data iklan harus berupa daftar.");
  }

  return value.map((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      !entry.id ||
      typeof entry.name !== "string" ||
      (entry.type !== "global" && entry.type !== "page") ||
      typeof entry.enabled !== "boolean" ||
      typeof entry.code !== "string" ||
      typeof entry.pathPattern !== "string" ||
      !isAdPlacement(entry.placement) ||
      typeof entry.height !== "number" ||
      !Number.isInteger(entry.height) ||
      entry.height < 100 ||
      entry.height > 800
    ) {
      throw new Error(`Konfigurasi iklan nomor ${index + 1} tidak valid.`);
    }

    return {
      id: entry.id,
      name: entry.name,
      type: entry.type,
      enabled: entry.enabled,
      code: entry.code,
      pathPattern: entry.pathPattern,
      placement: entry.placement,
      height: entry.height,
    };
  });
}

export function pathMatchesPattern(path: string, pattern: string): boolean {
  const normalizedPath = path.split(/[?#]/, 1)[0] || "/";
  const normalizedPattern = pattern.trim().startsWith("/")
    ? pattern.trim().split(/[?#]/, 1)[0]
    : `/${pattern.trim().split(/[?#]/, 1)[0]}`;
  const expression = normalizedPattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${expression}$`).test(normalizedPath);
}
