// @ts-nocheck
/**
 * Home Page - Server Load
 * Soft-fail + timeout agar Workers free tidak 500/1102 terus
 */

import { getAllSources, getSource } from '$lib/server/sources';
import type { PageServerLoad } from './$types';

const LOAD_TIMEOUT_MS = 8000;
const MAX_MANGAS = 40;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error('load_timeout')), ms);
		promise
			.then((v) => {
				clearTimeout(t);
				resolve(v);
			})
			.catch((e) => {
				clearTimeout(t);
				reject(e);
			});
	});
}

export const load = async ({ url, setHeaders, depends }: Parameters<PageServerLoad>[0]) => {
	const sourceId = url.searchParams.get('source') || 'asura';
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const query = (url.searchParams.get('q') || '').trim();
	
	// Tangkap parameter lang dan type dari URL
	const lang = url.searchParams.get('lang') || 'all';
	const type = url.searchParams.get('type') || 'all';

	depends(`browse:${sourceId}`);

	// Selalu return shape yang valid (supaya +page.svelte tidak crash)
	const sources = getAllSources().map((s) => ({ id: s.id, name: s.name }));
	let mangas: any[] = [];

	try {
		const adapter = getSource(sourceId);

		// Opsi 1: Jika fungsi di adapter kamu menerima object filter (Rekomendasi)
		const fetchPromise = query
			? adapter.searchManga(query, { page: pageNum, lang, type })
			: adapter.getLatestManga(pageNum, { lang, type });

		const result = await withTimeout(fetchPromise, LOAD_TIMEOUT_MS);
		let list = Array.isArray(result) ? result : [];

		// Opsi 2 (Fallback): Jika adapter belum mendukung filter internal,
		// lakukan filter manual di memori berdasarkan tipe/bahasa jika datanya ada
		if (lang !== 'all') {
			list = list.filter((m: any) => 
				m.lang?.toLowerCase() === lang.toLowerCase() || 
				m.language?.toLowerCase() === lang.toLowerCase()
			);
		}

		if (type !== 'all') {
			list = list.filter((m: any) => 
				m.type?.toLowerCase() === type.toLowerCase()
			);
		}

		mangas = list.slice(0, MAX_MANGAS);
	} catch (e) {
		console.error('[Browse] load failed:', e);
		mangas = [];
	}

	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
	});

	return {
		mangas,
		sources,
		currentSource: sourceId,
		currentPage: pageNum,
		searchQuery: query,
		selectedLang: lang,
		selectedType: type
	};
};
