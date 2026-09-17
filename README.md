# Mikoroku v2 (Rokuyomu)

Multi-source manga & comics reader built with **SvelteKit**, deployed on **Cloudflare Workers**.

Aggregates latest updates and search results from many sources (manga, manhwa, manhua, doujin, hentai, etc.) in one place.

## Features

- Multi-source browsing & search
- Manga detail page (cover, description, genres, chapter list)
- Chapter reader
- Bookmark & reading history
- Language / type filters
- Cloudflare Workers KV caching (reduce rate limits & speed up responses)
- Dark / light theme
- Report broken source / chapter
- Deployed as Cloudflare Worker (`rokuyomu`)

## Tech Stack

- **SvelteKit** + Svelte 5
- **TypeScript**
- **Tailwind CSS** v4
- **Cloudflare Workers** + **Workers KV** (`MIKOROKU_CACHE`)
- **Cheerio** (scraping / parsing)
- **Firebase** (auth / data if used)
- **pnpm** as package manager

## Sources

Dozens of adapters under `src/lib/server/sources/impl/`, including:

- Asura, MangaDex, MangaFire, Flame Comics, WestManga, Kiryuu, Komikindo, Mangaindo, …
- Hitomi, Nhentai, Hentaifox, AsmHentai, DoujinDesu, …
- And many more Indonesian & international sources

See `src/lib/server/sources/index.ts` for the full registry.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Cloudflare account (for deploy & KV)
