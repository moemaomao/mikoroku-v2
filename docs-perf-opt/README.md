# Mikoroku v2 – Performance Optimization Pack

Fokus: navigasi homepage → series detail terasa instan **tanpa** meledakkan Cloudflare Workers request (Error 1027).

## Apa yang diubah

| File | Perubahan |
|------|-----------|
| `app/series/[slug]/page.tsx` | Server Component mengambil metadata + chapter list ringkas dari cache/KV. Kirim `initialData` ke client. |
| `app/series/detail-page-client.tsx` | Terima `initialManga` / `initialChapters`. Dynamic import tetap ada tapi **bukan** `ssr: false` penuh. Skeleton tampil segera. |
| `app/series/detail-page-content.tsx` | (patch notes) Gunakan initial data, kurangi waterfall, tunda Firebase/widgets. |
| `app/series/loading.tsx` | Skeleton mirip layout asli (cover + judul + chapter placeholders). |
| `lib/series-data.ts` | Helper server-side: baca catalog + chapter cache dengan fallback aman. |
| `lib/prefetch-budget.ts` | Prefetch terbatas (max concurrent + debounce) supaya tidak flood request. |
| `app/series/series-card-prefetch.tsx` | Contoh komponen kartu yang prefetch aman saat hover/visible. |

## Cara apply

1. Backup dulu file asli.
2. Copy file dari zip ini ke struktur project yang sama.
3. Sesuaikan import path jika beda.
4. Pastikan `MIKOROKU_V2_CACHE` / catalog metadata sudah jalan (sudah ada di project).
5. Deploy → pantau Workers Metrics (Requests, Errors, CPU).

## Prinsip yang dipakai

- **First paint berisi data** (SSR / initial props), bukan spinner kosong.
- **Chapter list ringkas** dulu; `full=1` hanya saat perlu.
- **Prefetch ber-budget** (bukan semua kartu sekaligus).
- Side-effect berat (Firestore Listen, comment, recommendation) ditunda setelah konten utama ready.
- Hindari loop retry tanpa backoff.

## Yang **tidak** termasuk

- Seluruh source code private repo.
- Perubahan admin panel, reader chapter images, widget Svelte, dll.
- Config Cloudflare / secrets.

Kalau setelah apply masih kena rate limit, cek Metrics → biasanya prefetch atau `/api/blogger/chapters` yang dipanggil terlalu sering.