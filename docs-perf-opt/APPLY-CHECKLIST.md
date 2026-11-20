# Checklist apply + verifikasi

## Sebelum deploy

- [ ] Backup `app/series/[slug]/page.tsx`, `detail-page-client.tsx`, `loading.tsx`
- [ ] Copy file dari pack ini
- [ ] Sesuaikan path import (`SiteHeader`, `BannerAdSlot`, catalog json, dll)
- [ ] Integrasikan patch di `detail-page-content.tsx` (lihat PATCH-detail-page-content.md)
- [ ] Pastikan `getChapterSummaries` tidak memanggil Blogger full di setiap request server
- [ ] Homepage: pakai `SeriesCardPrefetch` (hover only dulu)

## Setelah deploy

- [ ] Buka homepage (cold)
- [ ] Klik 1 manga → ukur waktu sampai cover + judul muncul (target < 500ms perceived)
- [ ] DevTools Network: hitung request ke `/api/blogger/chapters` dan `/api/catalog/*`
- [ ] Scroll homepage cepat → pastikan tidak ada flood prefetch
- [ ] Cloudflare Workers → Metrics: Requests / 24h, Errors, CPU
- [ ] Ulangi di mobile / throttled 3G

## Jika masih kena Error 1027

1. Matikan sementara semua prefetch (`prefetchOnHover={false}`)
2. Cek apakah cron warm + traffic tinggi
3. Cek client yang retry tanpa backoff
4. Naikkan plan Workers **atau** kurangi subrequest per page view
5. Pastikan chapter cache di KV benar-benar hit (bukan miss terus)

## Target kuota (aturan praktis)

| Aksi | Budget kasar |
|------|----------------|
| Prefetch concurrent | ≤ 2 |
| Prefetch per slug cooldown | ≥ 30 detik |
| Server chapter fetch timeout | ≤ 400 ms |
| `full=1` chapter | Hanya di reader / explicit expand |
| Firestore Listen | Setelah `state === "ready"` |
