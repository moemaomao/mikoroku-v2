# Patch notes: `app/series/detail-page-content.tsx`

File asli ~3000 baris — jangan diganti bulk. Terapkan perubahan berikut secara manual.

## 1. Terima initial props

Ubah signature komponen:

```tsx
type DetailPageContentProps = {
  slug: string;
  initialManga?: SeriesManga | null;
  initialChapters?: SeriesChapterSummary[];
  initialChapterSource?: "blogger" | "blogger2" | "firestore" | "cache";
};

export default function DetailPageContent({
  slug,
  initialManga = null,
  initialChapters = [],
  initialChapterSource = "cache",
}: DetailPageContentProps) {
```

Import type dari `../../lib/series-data` (atau path yang sesuai).

## 2. Seed state dari initial data (hindari loading kosong)

```tsx
const [manga, setManga] = useState<Manga | null>(() =>
  initialManga ? (initialManga as Manga) : null,
);
const [state, setState] = useState<DetailState>(() =>
  initialManga ? "ready" : "loading",
);
const [chapters, setChapters] = useState<Chapter[]>(() =>
  (initialChapters as Chapter[]) || [],
);
const [chapterState, setChapterState] = useState<"loading" | "ready" | "error">(
  () => (initialChapters.length > 0 ? "ready" : "loading"),
);
const [source, setSource] = useState<ChapterSource>(
  () => (initialChapterSource as ChapterSource) || "blogger",
);
```

Dengan ini, first paint sudah menampilkan cover + judul + (kalau ada) chapter list dari server.

## 3. Jangan reset ke loading kalau initial data sudah ada

Di `useEffect` yang memanggil `loadManga`:

```tsx
useEffect(() => {
  let controller = new AbortController();
  // ...

  const loadCurrentManga = (force = false) => {
    // PENTING: jangan setState("loading") jika sudah punya data
    if (!force && !manga && !initialManga) {
      setState("loading");
    }
    // ... loadManga(...)
  };

  loadCurrentManga(false);
  // ...
}, [slug]);
```

Sama untuk chapter loader: jika `initialChapters.length > 0`, mulai dari `ready` dan hanya refresh di background.

## 4. Chapter fetch — hemat request

- Jangan otomatis `full=1` di first load detail.
- Pakai list ringkas dulu (num, title, date).
- `full=1` hanya saat user klik chapter / buka reader.
- Hormati cache lokal `chapters_${slug}` dan shared chapter cache.

Contoh guard:

```tsx
const hasLocalCache = Boolean(
  typeof localStorage !== "undefined" && localStorage.getItem(`chapters_${slug}`),
);

if (initialChapters.length > 0 || hasLocalCache) {
  // tampilkan dulu, refresh background
} else {
  setChapterState("loading");
  // fetch summary only
}
```

## 5. Tunda side-effect berat

Pindahkan ke setelah `state === "ready"`:

- Firebase Listen / comment count
- Recommendation sidebar data
- Bookmark sync yang non-critical
- Ads yang di bawah fold

Pola:

```tsx
useEffect(() => {
  if (state !== "ready") return;
  // comment count, etc.
}, [state, slug]);
```

## 6. Hapus / kurangi dynamic ssr:false di parent

Sudah ditangani di `detail-page-client.tsx` versi opt. Pastikan tidak ada `ssr: false` yang memaksa blank sampai chunk selesai.

## 7. Prefetch dari homepage

Ganti `<Link href={/series/...}>` di kartu manga dengan:

```tsx
import SeriesCardPrefetch from "../series/series-card-prefetch";

<SeriesCardPrefetch slug={item.slug}>
  {/* cover + title */}
</SeriesCardPrefetch>
```

Default: prefetch on hover saja (aman). `prefetchOnVisible` optional dan lebih agresif.

---

Setelah patch, test:

1. Cold load homepage → klik manga → first paint harus ada cover/judul (bukan spinner penuh 2s).
2. Network: tidak ada puluhan `/api/blogger/chapters` saat scroll homepage.
3. Workers Metrics: request rate stabil, tidak spike ke limit.