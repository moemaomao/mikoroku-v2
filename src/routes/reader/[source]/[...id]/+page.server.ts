/**
 * Chapter Reader Page - Server Load Function
 */

import { getSource } from '$lib/server/sources';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import debug from '$lib/utils/debug';

/** Resolve manga id from chapter id (Weloma uses /c/xxx independent of /m/xxx) */
async function resolveMangaId(
	source: string,
	chapterId: string,
	adapter: ReturnType<typeof getSource>
): Promise<string> {
	// Standard hierarchical paths: /manga-slug/chapter-1
	const hierarchical = chapterId.replace(/\/(chapter|ch|episode|ep)[-/_]?.+$/i, '');
	if (hierarchical !== chapterId && hierarchical.length > 1) {
		return hierarchical;
	}

	// Weloma / Hitomi-style: independent chapter ids
	if (source === 'weloma' || chapterId.startsWith('/c/')) {
		try {
			// fetch chapter HTML via getChapterPages path logic — use public fetch of parent link
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

		// Still not found: match by number in path / title
		if (currentChapterIndex === -1 && chapters.length > 0) {
			const numMatch = chapterId.match(/(\d+(?:\.\d+)?)\s*$/);
			if (numMatch) {
				const n = parseFloat(numMatch[1]);
				currentChapterIndex = chapters.findIndex((ch) => ch.number === n);
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
