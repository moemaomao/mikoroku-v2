# MikoRoku Credit Generator

The generator UI, Canvas renderer, templates, metadata adapter, styling, and local storage live in this directory. The MikoRoku Admin app exposes the tool at `/admin/credit-generator` and checks the existing Admin Firebase session plus the existing admin-email allowlist.

## Development

Install dependencies once from the repository root, then run the Next.js app and the isolated Vite tool in separate terminals:

```powershell
npm run dev
npm --prefix tools/credit-generator run dev
```

Open `http://127.0.0.1:4173` for isolated generator work. Its `/api` and `/catalog` requests proxy to the Next.js app on port 3000.

## Build and deployment

Build the standalone development/preview bundle with:

```powershell
npm --prefix tools/credit-generator run build
npm --prefix tools/credit-generator run preview
```

The Admin route imports the same generator source directly, so the normal `npm run build` or `npm run cf:build` includes it in the existing MikoRoku deployment. Do not deploy the standalone `dist` folder as a replacement Admin app; the protected Admin route is the integrated production entry point.

## Data and persistence

- Manga metadata and cover URLs come from the existing `/api/catalog/metadata` endpoint, with `/catalog/metadata.json` as a fallback, through `src/metadata-sync/mikoroku-catalog.ts`. Refresh sends a no-cache request. The tool does not read or write the database directly.
- A selected Admin manga can be passed as `?slug=...`; standalone mode also supports searching the same catalog.
- Manual cover uploads are supported as a fallback.
- The default MikoRoku Impact template uses a bold poster composition, uploaded team/web logo, and editable Discord, Facebook, Trakteer, PayPal, and website links with locally rendered icons.
- Manga titles default to the bundled Oswald font and can be changed independently of the rest of the poster typography.
- Dramatic Split exports use a 2:1 landscape canvas (1120 × 560 standard or 2240 × 1120 high resolution).
- Minimal exports use a square canvas (844 × 844 standard or 1688 × 1688 high resolution); the other templates retain portrait dimensions.
- Portrait exports use an 844 × 1200 standard canvas or a 1688 × 2400 high-resolution canvas.
- Its background can use a blurred version of the selected cover; choose cover or color-only mode and tune blur, gradient strength, accent, and background colors in the Design panel.
- Team presets, draft settings, and saved projects use their own IndexedDB database and stores (`mikoroku-credit-generator`), separate from Admin data.
- Rendering and PNG/JPG export happen locally in Canvas. External covers are requested through the existing image proxy; if a source cannot be exported, upload its image manually.
