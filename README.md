# Mikoroku Next.js

Next.js App Router deployment target: Cloudflare Workers through
`@opennextjs/cloudflare`.

The homepage, manga details, bookmarks, catalogues, legal/information pages,
commission form, profile settings, and manga/novel readers are rendered by the
Next.js App Router. Existing browser scripts still provide shared Firebase,
header, and footer integrations while those site-wide integrations are migrated.
Legacy page URLs redirect to their Next.js routes where applicable.

The admin panel is available in the App Router at `/admin`, with the original
page retained at `/pages/admin.html` as a fallback. It includes Firebase
sign-in, a searchable Firestore/GitHub manga catalogue with cover cards, manga
metadata editing, and per-manga chapter management with reorder controls.
Metadata descriptions and novel chapter content use Quill. Covers, chapter
thumbnails, and multiple chapter pages can be uploaded directly from files;
chapter page images can also be previewed, sorted, reordered, and removed.
Image uploads continue to use the existing ImgBB integration.

The panel also includes chapter reports, summary rebuilds, and Firestore
backups. Genres & Tags currently summarizes values from manga metadata rather
than providing a separate taxonomy editor. Other moderation and utility pages
remain in `public/`.

The migrated readers retain chapter navigation, manga page/scroll modes,
chapter ZIP downloads and reports, comment and emoji widgets, and novel font,
column, auto-scroll, and text-to-speech controls. Profile settings use the full
legacy badge and game-role preset lists.

## Project structure

`app/` contains the App Router entry points, feature UI, and feature styles.
Feature directories such as `admin/`, `bookmark/`, `catalog/`, `commission/`,
`manga/`, `novel/`, `series/`, and `settings/` contain their route `page.tsx` alongside
the implementation. Shared UI lives directly in `app/`, and non-UI helpers
live in `lib/`. Image assets are grouped under `public/assets/` (`icons/` and
`hakoroku/`); other static files remain under `public/`. Previous image URLs
redirect to their new locations.

## Development

From this directory:

```sh
npm install
npm run dev
```

## Cloudflare

Authenticate Wrangler with the intended Cloudflare account, then run:

```sh
npm run preview
npm run deploy
```

For a Cloudflare Workers Git deployment, set the build command to
`npm run cf:build` so OpenNext generates `.open-next/` before Wrangler deploys
the Worker. Do not use `npm run build` as the Workers build command; it only
builds the standalone Next.js app.
