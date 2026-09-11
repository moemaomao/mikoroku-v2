/**
 * Chapter Reader Page - Server Load Function
 */

import { getSource } from '$lib/server/sources';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import debug from '$lib/utils/debug';

/** Resolve manga id from chapter id */
async function resolveMangaId(
	source: string,
	chapterId: string,
	adapter: ReturnType<typeof getSource>
): Promise<string> {
	// ── MangaKatana: /manga/slug.id/c123 ────────────────────────────────
	const mk = chapterId.match(/^(\/manga\/[^/]+)\/c[\d.]+\/?$/i);
	if (mk?.[1]) return mk[1];

	// ── Komiku special case ──────────────────────────────────────────────
	// Chapter format: /slug-name-chapter-28
	// Manga format  : /manga/slug-name
	if (source === 'komiku') {
		const m = chapterId.match(/^\/(.+)-chapter-(\d+(?:\.\d+)?)\/?$/i);
		if (m?.[1]) {
			return `/manga/${m[1]}`;
		}

		const fallback = chapterId.replace(/-chapter-\d+(?:\.\d+)?\/?$/i, '');
		if (fallback !== chapterId && fallback.length > 1) {
			const slug = fallback.replace(/^\//, '');
			return `/manga/${slug}`;
		}
	}

	// ── Standard hierarchical: /manga-slug/chapter-1 atau /ch-1 ─────────
	const hierarchical = chapterId.replace(
		/\/(chapter|ch|episode|ep|c)[-/_]?[\d.]+\/?$/i,
		''
	);
	if (hierarchical !== chapterId && hierarchical.length > 1) {
		return hierarchical;
	}

	// ── Weloma / Hitomi-style ────────────────────────────────────────────
	if (source === 'weloma' || chapterId.startsWith('/c/')) {
		try {
			const base = (adapter as any).baseUrl || 'https://weloma.net';
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

	return hierarchical;
}

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const { source, id } = params;

	// [...id] catch-all → full path with leading slash
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

		// Sort by number ascending (oldest → newest) for consistent prev/next
		const chapters = [...(mangaDetails?.chapters || [])].sort(
			(a, b) => (a.number ?? 0) - (b.number ?? 0)
		);

		// Match current chapter
let currentChapterIndex = chapters.findIndex((ch) => ch.id === chapterId);

if (currentChapterIndex === -1 && chapters.length > 0) {
	currentChapterIndex = chapters.findIndex(
		(ch) => ch.id.endsWith(chapterId) || chapterId.endsWith(ch.id)
	);
}


if (currentChapterIndex === -1 && chapters.length > 0) {
	const numMatch =
		chapterId.match(/\/c(\d+(?:\.\d+)?)\/?$/i) ||
		chapterId.match(/chapter[-_/]?(\d+(?:\.\d+)?)\/?$/i) || 
		chapterId.match(/(\d+(?:\.\d+)?)\/?$/);                
	if (numMatch) {
		const n = parseFloat(numMatch[1]);
		currentChapterIndex = chapters.findIndex(
			(ch) => Math.abs((ch.number ?? 0) - n) < 0.001
		);
	}
}

		const currentChapter = chapters[currentChapterIndex] ?? null;

		// Sorted ascending: prev = lower index, next = higher index
		const prevChapter =
			currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
		const nextChapter =
			currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1
				? chapters[currentChapterIndex + 1]
				: null;

		setHeaders({
			'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=300'
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
