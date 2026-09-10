// @ts-nocheck
/**
 * Sources Page - List all available manga sources
 */

import { getAllSources } from '$lib/server/sources';
import type { PageServerLoad } from './$types';

export const load = async ({ setHeaders }: Parameters<PageServerLoad>[0]) => {
	const sources = getAllSources();

	setHeaders({
		'Cache-Control': 'public, max-age=3600'
	});

	return {
		sources: sources.map((s) => ({
			id: s.id,
			name: s.name,
			baseUrl: s.baseUrl
		}))
	};
};
