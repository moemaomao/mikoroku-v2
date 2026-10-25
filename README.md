# Mikoroku v2

Private rewrite of **Mikoroku** — personal manga & novel reading platform (Bahasa Indonesia).

Built with **Next.js App Router** and deployed on **Cloudflare Workers** using `@opennextjs/cloudflare`.

**Live site:** [https://mikoroku.top](https://mikoroku.top)

> This is a **private personal project**. Not open source. All rights reserved.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS 4 |
| Deploy | Cloudflare Workers + OpenNext |
| Database / Auth | Firebase (Auth + Firestore) |
| Cache | Cloudflare KV (`NEXT_INC_CACHE_KV`, `MIKOROKU_V2_CACHE`) |
| Image Upload | ImgBB |
| Rich Text | Quill |
| ZIP Download | JSZip |
| Cron | Cloudflare Cron Triggers (`*/20 * * * *`) |

---

## Features

### Reader
- Manga reader (page mode & scroll mode)
- Novel reader (font, column, auto-scroll, text-to-speech)
- Chapter navigation (prev/next)
- Download chapter as ZIP
- Report chapter
- Emoji reaction & comment widget (Hakoroku)
- Bookmark & History

### Catalog & Navigation
- Homepage with manga catalog
- Manga List / Hentai List / Genre List
- Series detail page
- Search
- Announcements

### User
- Login (Firebase Auth)
- Profile settings (badge + game-role preset)
- Bookmark page
- Commission form

### Admin Panel (`/admin`)
- Firebase sign-in
- Searchable manga catalogue (Firestore + GitHub)
- Edit manga metadata
- Chapter management (upload, reorder, preview, delete)
- Rich text editor (Quill) for descriptions & novels
- Upload cover / thumbnail / chapter pages (ImgBB)
- Chapter reports
- Summary rebuild
- Firestore backup
- Advertisement settings
- Moderation tools

### Others
- Global Settings
- Legal pages (About, Privacy, Terms, DMCA)
- Community widgets
- Advertisement manager
- Legacy URL redirects to Next.js routes

---

## Project Structure

```
mikoroku-v2/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin panel + moderation
│   ├── announcements/
│   ├── api/blogger/chapters/     # API route for Blogger chapters
│   ├── bookmark/
│   ├── catalog/
│   ├── commission/
│   ├── genre-list/
│   ├── global-settings/
│   ├── hentai-list/
│   ├── login/
│   ├── manga/                    # Manga reader routes
│   ├── manga-list/
│   ├── novel/[slug]/[chapter]/  # Novel reader
│   ├── series/                   # Series detail
│   ├── settings/
│   ├── about/, dmca/, privacy/, terms/
│   ├── layout.tsx
│   ├── page.tsx                  # Homepage
│   └── ... (shared components)
│
├── lib/                          # Shared utilities & helpers
├── public/                       # Static assets
│   └── assets/
│       ├── icons/
│       └── hakoroku/             # Avatar frames, etc.
│
├── scripts/                      # Utility scripts
├── custom-worker.ts              # Cloudflare Worker entry
├── open-next.config.ts
├── wrangler.jsonc                # Cloudflare config
├── next.config.ts
└── package.json
```

---

## Development

```bash
# Install dependencies
npm install

# Run local development server
npm run dev
```

---

## Cloudflare Deployment

1. Authenticate Wrangler:
   ```bash
   npx wrangler login
   ```

2. Preview locally (OpenNext + Workers):
   ```bash
   npm run preview
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

### Cloudflare Workers Git Integration
Use this build command:

```bash
npm run cf:build
```

Do **not** use `npm run build` for Workers — it only produces a standalone Next.js app.

### Important Config (`wrangler.jsonc`)
- **Main entry:** `./custom-worker.ts`
- **KV Namespaces:** `NEXT_INC_CACHE_KV` + `MIKOROKU_V2_CACHE`
- **Cron:** every 20 minutes (warm cache)
- **Warm URL:** `https://mikoroku.top`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js development server |
| `npm run build` | Standalone Next.js build |
| `npm run cf:build` | OpenNext build for Cloudflare |
| `npm run preview` | Build + local Workers preview |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run upload` | Build + upload (without full deploy) |
| `npm run cf-typegen` | Generate Cloudflare Env types |

---

## Notes

- Some legacy integrations (Firebase header/footer, comment widget, etc.) still run via browser scripts while being fully migrated to the App Router.
- Old image asset URLs redirect to the new locations under `public/assets/`.
- Full admin panel is available at `/admin` (App Router). Legacy HTML fallback exists at `public/pages/admin.html`.

---

## License

**Private project.**  
All rights reserved. Not open source. Do not use, copy, or redistribute without explicit permission.
```
