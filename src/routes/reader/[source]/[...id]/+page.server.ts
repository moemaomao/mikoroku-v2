/**
 * Chapter Reader Page - Server Load Function
 */

import { getSource } from '$lib/server/sources';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import debug from '$lib/utils/debug';

/** Prefix manga path per source yang chapter-nya di root (/{slug}-chapter-N) */
const ROOT_CHAPTER_PREFIX: Record<string, string> = {
	komiku: '/manga',
	komikindo: '/komik',
	mangaindo: '/manga'
};

/**
 * Parse nomor chapter dari path/teks.
 * Support: chapter-12, chapter-1.5, chapter-1-5
 */
function parseChapterNum(input: string): number | null {
	const m =
		input.match(/chapter-(\d+)(?:[.-](\d+))?/i) ||
		input.match(/(?:^|\/)(\d+)(?:[.-](\d+))?(?:\/|$)/);
	if (!m) return null;
	if (m[2] != null) return parseFloat(`${m[1]}.${m[2]}`);
	return parseFloat(m[1]);
}

/**
 * /slug-name-chapter-12.5  →  { slug: "slug-name", num: 12.5 }
 * /slug-name-chapter-1-2   →  { slug: "slug-name", num: 1.2 }
 */
function parseRootChapter(chapterId: string): { slug: string; num: number } | null {
	const m = chapterId.match(/^\/(.+)-chapter-(\d+(?:[.-]\d+)?)\/?$/i);
	if (!m?.[1]) return null;
	const num = parseChapterNum(`chapter-${m[2]}`);
	if (num == null) return null;
	return { slug: m[1], num };
}

/** Resolve manga id dari chapter id */
/** Resolve manga id dari chapter id */
async function resolveMangaId(
	source: string,
	chapterId: string,
	adapter: ReturnType<typeof getSource>
): Promise<string> {
	// Source dengan chapter di root: /{slug}-chapter-N → /{prefix}/{slug}
	const prefix = ROOT_CHAPTER_PREFIX[source];
	if (prefix) {
		const parsed = parseRootChapter(chapterId);
		if (parsed) return `${prefix}/${parsed.slug}`;

		const fallback = chapterId.replace(/-chapter-\d+(?:[.-]\d+)?\/?$/i, '');
		if (fallback !== chapterId && fallback.length > 1) {
			return `${prefix}/${fallback.replace(/^\//, '')}`;
		}
	}

	// Hierarchical: /manga-slug/chapter-1  →  /manga-slug
	const hierarchical = chapterId.replace(
		/\/(chapter|ch|episode|ep)[-/_]?[\d.-]*\/?$/i,
		''
	);
	if (hierarchical !== chapterId && hierarchical.length > 1) {
		return hierarchical;
	}

	// Weloma / Hitomi-style: scrape link /m/...
	if (source === 'weloma' || chapterId.startsWith('/c/')) {
		try {
			const base = (adapter as { baseUrl?: string }).baseUrl || 'https://weloma.net';
			const path = chapterId.startsWith('http') ? chapterId : `${base}${chapterId}`;
			const res = await fetch(path, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Referer: base
				}
			});
			if (res.ok) {
				const html = await res.text();
				const m = html.match(/href="(\/m\/[A-Za-z0-9]+)"/i);
				if (m?.[1]) return m[1];
			}
		} catch (e) {
			debug.error('[Reader] Failed to resolve Weloma mangaId from chapter:', e);
		}
	}

	// ZonaTMO / TMO: /view_uploads/{id} → ambil link /library/manga/... dari HTML
	if (
		source === 'zonatmo' ||
		chapterId.includes('/view_uploads/') ||
		chapterId.includes('/viewer/')
	) {
		try {
			const base =
				(adapter as { baseUrl?: string }).baseUrl || 'https://zonatmo.org';
			const path = chapterId.startsWith('http')
				? chapterId
				: `${base}${chapterId.startsWith('/') ? '' : '/'}${chapterId}`;

			const res = await fetch(path, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Referer: base,
					'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
				},
				redirect: 'follow'
			});

			if (res.ok) {
				const html = await res.text();
				// Link kembali ke halaman manga
				const m =
					html.match(/href=["']((?:https?:\/\/[^"']*)?\/library\/manga\/\d+\/[^"'?#]+)/i) ||
					html.match(/["'](\/library\/manga\/\d+\/[^"'?#]+)["']/i);
				if (m?.[1]) {
					let mid = m[1];
					if (mid.startsWith('http')) {
						try {
							mid = new URL(mid).pathname;
						} catch {
							/* keep */
						}
					}
					if (!mid.startsWith('/')) mid = `/${mid}`;
					debug.log?.(`[Reader] zonatmo resolved mangaId=${mid} from ${chapterId}`);
					return mid.split('?')[0].replace(/\/+$/, '');
				}
			}
		} catch (e) {
			debug.error('[Reader] Failed to resolve ZonaTMO mangaId from chapter:', e);
		}
	}

	return hierarchical;
}

/** Cari index chapter saat ini di list (id exact → endsWith → nomor) */
function findChapterIndex(
	chapters: { id: string; number?: number }[],
	chapterId: string
): number {
	if (!chapters.length) return -1;

	const norm = (s: string) =>
		`/${(s || '').replace(/^\/+/, '').replace(/\/+$/, '').split('?')[0]}`;

	const target = norm(chapterId);

	let idx = chapters.findIndex((ch) => norm(ch.id) === target);
	if (idx !== -1) return idx;

	// endsWith / includes (view_uploads/123 vs /view_uploads/123)
	idx = chapters.findIndex((ch) => {
		const a = norm(ch.id);
		return a === target || a.endsWith(target) || target.endsWith(a);
	});
	if (idx !== -1) return idx;

	// match by numeric upload id: /view_uploads/1058772
	const uploadId = target.match(/\/view_uploads\/(\d+)/i)?.[1];
	if (uploadId) {
		idx = chapters.findIndex((ch) => norm(ch.id).includes(`/view_uploads/${uploadId}`));
		if (idx !== -1) return idx;
	}

	const n = parseChapterNum(chapterId);
	if (n == null) return -1;
	return chapters.findIndex((ch) => Math.abs((ch.number ?? 0) - n) < 0.001);
}

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const { source, id } = params;
	const chapterId = `/${id}`;

	try {
		const adapter = getSource(source);
		const mangaId = await resolveMangaId(source, chapterId, adapter);
		const mangaSlug = mangaId.startsWith('/') ? mangaId.slice(1) : mangaId;

		const [pages, mangaDetails] = await Promise.all([
			adapter.getChapterPages(chapterId),
			adapter.getMangaDetails(mangaId).catch((e) => {
				debug.error(`[Reader] Failed to fetch manga details for ${mangaId}:`, e);
				return null;
			})
		]);

		if (!pages || pages.length === 0) {
			throw error(404, { message: 'Chapter not found or has no pages' });
		}

		// oldest → newest (prev = index-1, next = index+1)
		const chapters = [...(mangaDetails?.chapters || [])].sort(
			(a, b) => (a.number ?? 0) - (b.number ?? 0)
		);

		const currentChapterIndex = findChapterIndex(chapters, chapterId);
		const currentChapter =
			currentChapterIndex >= 0 ? chapters[currentChapterIndex] : null;
		const prevChapter =
			currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
		const nextChapter =
			currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1
				? chapters[currentChapterIndex + 1]
				: null;

		setHeaders({
			'Cache-Control':
				'public, max-age=3600, s-maxage=86400, stale-while-revalidate=300'
		});

		return {
			pages,
			source,
			chapterId,
			mangaInfo: mangaDetails
				? {
						id: mangaDetails.id,
						title: mangaDetails.title,
						cover: mangaDetails.cover,
						slug: mangaSlug
					}
				: {
						id: mangaId,
						title: mangaSlug.replace(/-/g, ' '),
						cover: '',
						slug: mangaSlug
					},
			chapters,
			currentChapter,
			prevChapter,
			nextChapter
		};
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		debug.error(`Failed to fetch chapter ${chapterId} from ${source}:`, e);
		throw error(404, { message: 'Chapter not found' });
	}
};