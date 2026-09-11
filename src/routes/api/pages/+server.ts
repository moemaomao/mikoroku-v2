import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSource } from '$lib/server/sources';

export const GET: RequestHandler = async ({ url }) => {
	const source = url.searchParams.get('source');
	const chapterId = url.searchParams.get('chapterId');
	const start = Math.max(0, parseInt(url.searchParams.get('start') || '0', 10));
	const count = Math.min(Math.max(1, parseInt(url.searchParams.get('count') || '40', 10)), 60);

	if (!source || !chapterId) {
		throw error(400, 'source and chapterId are required');
	}

	try {
		const adapter = getSource(source);

		// E-Hentai punya method range khusus
		if (source === 'ehentai' && typeof (adapter as any).getChapterPagesRange === 'function') {
			const result = await (adapter as any).getChapterPagesRange(chapterId, start, count);
			return json(result);
		}

		// Source lain
		const allPages = await adapter.getChapterPages(chapterId);
		const sliced = allPages.slice(start, start + count);

		return json({
			pages: sliced,
			total: allPages.length,
			hasMore: start + count < allPages.length
		});
	} catch (e: any) {
		console.error('[api/pages] error:', e);
		throw error(500, e?.message || 'Failed to load pages');
	}
};