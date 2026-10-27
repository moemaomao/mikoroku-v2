# Mikoroku OG Hybrid — Instalasi

Paket ini memindahkan generate OG image ke **Vercel**, supaya Cloudflare Workers tidak kena Error 1102 (resource limits).

## Isi paket

```
mikoroku-og-hybrid/
├── og-service/              ← deploy ke Vercel
│   ├── app/api/og/route.tsx
│   ├── package.json
│   └── ...
├── mikoroku-v2-patch/       ← copy ke repo mikoroku-v2
│   ├── lib/og-remote.ts
│   ├── app/og/chapter/...
│   ├── app/og/series/...
│   ├── app/og/manga/...
│   └── wrangler.snippet.jsonc
└── INSTALL.md               ← file ini
```

---

## Langkah 1 — Deploy OG service ke Vercel

1. Buat repo baru (atau folder) dari `og-service/`.
2. Import ke Vercel: https://vercel.com/new
3. Environment Variables:
   - `OG_API_KEY` = string rahasia panjang (contoh: `openssl rand -hex 24`)
4. Deploy.
5. Catat URL, contoh: `https://mikoroku-og.vercel.app`

Test:
```bash
curl -H "x-og-key: RAHASIA_KAMU" \
  "https://mikoroku-og.vercel.app/api/og?title=Test&label=Manga" \
  -o test.png
```

---

## Langkah 2 — Patch mikoroku-v2

Dari folder `mikoroku-v2-patch/`, copy file ke root repo mikoroku-v2:

| Sumber (patch) | Tujuan (repo kamu) |
|----------------|--------------------|
| `lib/og-remote.ts` | `lib/og-remote.ts` |
| `app/og/chapter/[slug]/[chapter]/route.tsx` | `app/og/chapter/[slug]/[chapter]/route.tsx` |
| `app/og/series/[slug]/route.tsx` | `app/og/series/[slug]/route.tsx` |
| `app/og/manga/[slug]/[chapter]/route.ts` | `app/og/manga/[slug]/[chapter]/route.ts` |

Overwrite file yang sudah ada.

---

## Langkah 3 — Env Cloudflare Workers

Di `wrangler.jsonc`, pastikan ada:

```jsonc
"vars": {
  "WARM_BASE_URL": "https://mikoroku.top",
  "OG_SERVICE_URL": "https://mikoroku-og.vercel.app/api/og"
}
```

Ganti URL jika domain Vercel kamu beda.

Lalu set secret (wajib sama dengan Vercel):

```bash
npx wrangler secret put OG_API_KEY
```

---

## Langkah 4 — Deploy mikoroku-v2

```bash
npm run deploy
# atau sesuai script yang biasa kamu pakai
```

---

## Verifikasi

1. Buka langsung:
   `https://mikoroku.top/og/manga/ore-no-level-up-ga-okashi/48.5`
2. Harus dapat PNG, bukan Error 1102.
3. Share link chapter ke Discord/Telegram — preview OG harus muncul.
4. Request kedua harus lebih cepat (KV cache HIT).

---

## Troubleshooting

| Gejala | Cek |
|--------|-----|
| 401 dari OG service | `OG_API_KEY` Workers ≠ Vercel |
| Timeout / OG unavailable | URL `OG_SERVICE_URL` salah atau Vercel cold start |
| Masih 1102 | Pastikan route OG sudah memakai `fetchRemoteOgPng`, bukan `ImageResponse` lokal |
| Cover tidak muncul | Cover URL harus `http(s)`; cek log Vercel |

---

## Catatan

- `lib/og-image.tsx` di mikoroku-v2 **boleh tetap ada** (tidak dipakai route OG lagi).
- Generate berat hanya di Vercel Edge; Workers hanya proxy + KV cache.
- Free tier Vercel cukup untuk traffic share biasa.
